#!/usr/bin/env python3
import argparse
import asyncio
import http
import json
import logging
import secrets
import statistics
import string
import sys
import traceback
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from time import perf_counter, time

import aiohttp


logger = logging.getLogger(__name__)


MAX_PERCENT = 100
PERCENT_MULTIPLIER = 100.0
MAX_ERROR_BODY_LENGTH = 100
HTTP_SUCCESS_MIN = http.HTTPStatus.OK
HTTP_SUCCESS_MAX = http.HTTPStatus.MULTIPLE_CHOICES


def generate_test_password(length: int = 12) -> str:
    chars = string.ascii_letters + string.digits
    return "".join(secrets.choice(chars) for _ in range(length))


def percentile(sorted_values: list[float], p: float) -> float:
    if not sorted_values:
        return 0.0
    if p <= 0:
        return sorted_values[0]
    if p >= MAX_PERCENT:
        return sorted_values[-1]
    k = int(len(sorted_values) * p / MAX_PERCENT)
    k = min(max(k, 0), len(sorted_values) - 1)
    return sorted_values[k]


@dataclass
class RequestResult:
    endpoint: str
    status_code: int
    response_time: float
    error: str | None = None
    timestamp: float = field(default_factory=time)


@dataclass
class Metrics:
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    status_codes: Counter = field(default_factory=Counter)
    errors: Counter = field(default_factory=Counter)
    endpoint_metrics: dict[str, list[float]] = field(default_factory=lambda: defaultdict(list))
    start_time: float = field(default_factory=time)
    end_time: float | None = None

    def add_result(self, result: RequestResult):
        self.total_requests += 1
        self.endpoint_metrics[result.endpoint].append(result.response_time)
        self.status_codes[result.status_code] += 1

        if HTTP_SUCCESS_MIN <= result.status_code < HTTP_SUCCESS_MAX and result.error is None:
            self.successful_requests += 1
        else:
            self.failed_requests += 1
            if result.error:
                self.errors[result.error] += 1

    def get_statistics(self) -> dict:
        duration = (self.end_time or time()) - self.start_time
        duration = max(duration, 0.0)
        rps = self.total_requests / duration if duration > 0 else 0.0

        response_times = [elapsed for times in self.endpoint_metrics.values() for elapsed in times]
        sorted_response_times = sorted(response_times)

        stats: dict[str, object] = {
            "duration_seconds": duration,
            "total_requests": self.total_requests,
            "successful_requests": self.successful_requests,
            "failed_requests": self.failed_requests,
            "success_rate": (
                self.successful_requests / self.total_requests * PERCENT_MULTIPLIER if self.total_requests > 0 else 0.0
            ),
            "requests_per_second": rps,
            "status_codes": dict(self.status_codes),
            "errors": dict(self.errors),
            "endpoint_metrics": {},
        }

        endpoint_stats: dict[str, dict[str, float]] = {}

        for endpoint, times in self.endpoint_metrics.items():
            count = len(times)
            if count == 0:
                endpoint_stats[endpoint] = {
                    "count": 0,
                    "min": 0.0,
                    "max": 0.0,
                    "mean": 0.0,
                    "p95": 0.0,
                    "p99": 0.0,
                    "rps": 0.0,
                }
                continue

            sorted_times = sorted(times)
            endpoint_stats[endpoint] = {
                "count": count,
                "min": min(times),
                "max": max(times),
                "mean": statistics.mean(times),
                "p95": percentile(sorted_times, 95.0),
                "p99": percentile(sorted_times, 99.0),
                "rps": count / duration if duration > 0 else 0.0,
            }

        stats["endpoint_metrics"] = endpoint_stats

        if response_times:
            stats["response_time"] = {
                "min": min(response_times),
                "max": max(response_times),
                "mean": statistics.mean(response_times),
                "median": statistics.median(response_times),
                "p50": percentile(sorted_response_times, 50.0),
                "p75": percentile(sorted_response_times, 75.0),
                "p90": percentile(sorted_response_times, 90.0),
                "p95": percentile(sorted_response_times, 95.0),
                "p99": percentile(sorted_response_times, 99.0),
                "std_dev": statistics.stdev(response_times) if len(response_times) > 1 else 0.0,
            }
        else:
            stats["response_time"] = {
                "min": 0.0,
                "max": 0.0,
                "mean": 0.0,
                "median": 0.0,
                "p50": 0.0,
                "p75": 0.0,
                "p90": 0.0,
                "p95": 0.0,
                "p99": 0.0,
                "std_dev": 0.0,
            }

        return stats


class LoadTester:
    def __init__(
        self,
        base_url: str,
        jwt_token: str | None,
        concurrent_users: int,
        duration: int,
        ramp_up: int = 0,
        think_time: float = 0.1,
        go_backend_url: str | None = None,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.jwt_token = jwt_token
        self.go_backend_url = (go_backend_url or "http://localhost:8080").rstrip("/")
        self.concurrent_users = concurrent_users
        self.duration = duration
        self.ramp_up = ramp_up
        self.think_time = think_time
        self.metrics = Metrics()
        self.session: aiohttp.ClientSession | None = None
        self.running = False

    @property
    def auth_headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.jwt_token}"} if self.jwt_token else {}

    def create_session(self) -> None:
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30, connect=10),
            connector=aiohttp.TCPConnector(limit=0, limit_per_host=100),
        )

    async def close_session(self) -> None:
        if self.session is not None and not self.session.closed:
            await self.session.close()

    async def _make_request(
        self,
        method: str,
        url: str,
        json_payload: dict[str, object] | None = None,
        form_data: aiohttp.FormData | None = None,
        endpoint: str = "",
        expected_status: int = 200,
    ) -> tuple[RequestResult, dict]:
        if self.session is None:
            raise RuntimeError("HTTP session is not initialized")
        started = perf_counter()
        result = RequestResult(endpoint=endpoint, status_code=0, response_time=0.0)
        response_body = {}
        try:
            result.status_code, body = await self._read_response(method, url, json_payload, form_data)
        except TimeoutError:
            result.error = "Timeout"
        except (aiohttp.ClientError, OSError) as error:
            result.error = str(error)
        else:
            if result.status_code != expected_status:
                result.error = f"Status {result.status_code}: {body[:MAX_ERROR_BODY_LENGTH]}"
            else:
                try:
                    response_body = json.loads(body)
                except json.JSONDecodeError:
                    result.error = "Invalid JSON response"
                else:
                    if not isinstance(response_body, dict):
                        response_body = {}
                        result.error = "Response is not a JSON object"
        finally:
            result.response_time = perf_counter() - started
        return result, response_body

    async def _read_response(
        self,
        method: str,
        url: str,
        json_payload: dict[str, object] | None,
        form_data: aiohttp.FormData | None,
    ) -> tuple[int, str]:
        if self.session is None:
            raise RuntimeError("HTTP session is not initialized")
        async with self.session.request(
            method,
            url,
            json=json_payload,
            data=form_data,
            headers=self.auth_headers,
        ) as response:
            return response.status, await response.text()

    async def create_conversation(self, user_id: int) -> int | None:
        result, response_body = await self._make_request(
            "POST",
            f"{self.base_url}/conversations",
            json_payload={"title": f"Load Test Conversation {user_id}", "business_context": "Testing"},
            endpoint="/conversations",
            expected_status=201,
        )
        conversation_id = response_body.get("conversation_id")
        if result.error is None and (not isinstance(conversation_id, int) or isinstance(conversation_id, bool)):
            result.error = "Invalid conversation ID"
        self.metrics.add_result(result)
        return conversation_id if result.error is None else None

    async def send_chat_message(self, conversation_id: int, message: str, domain: str = "general") -> None:
        form = aiohttp.FormData()
        form.add_field("conversation_id", str(conversation_id))
        form.add_field("message", message)
        form.add_field("domain", domain)
        result, response_body = await self._make_request(
            "POST",
            f"{self.base_url}/chat",
            form_data=form,
            endpoint="/chat",
        )
        if result.error is None and (
            response_body.get("status") != "success"
            or response_body.get("conversation_id") != conversation_id
            or not isinstance(response_body.get("response"), str)
            or not isinstance(response_body.get("message_id"), int)
        ):
            result.error = "Invalid chat response"
        self.metrics.add_result(result)

    async def get_conversations(self) -> None:
        result, response_body = await self._make_request(
            "GET",
            f"{self.base_url}/conversations?limit=50&offset=0",
            endpoint="/conversations",
        )
        if result.error is None and (
            not isinstance(response_body.get("conversations"), list) or not isinstance(response_body.get("total"), int)
        ):
            result.error = "Invalid conversations response"
        self.metrics.add_result(result)

    async def get_messages(self, conversation_id: int) -> None:
        result, response_body = await self._make_request(
            "GET",
            f"{self.base_url}/conversations/{conversation_id}/messages?limit=100&offset=0",
            endpoint="/conversations/{id}/messages",
        )
        if result.error is None and (
            response_body.get("conversation_id") != conversation_id
            or not isinstance(response_body.get("messages"), list)
        ):
            result.error = "Invalid messages response"
        self.metrics.add_result(result)

    async def health_check(self) -> None:
        result, response_body = await self._make_request("GET", f"{self.base_url}/health", endpoint="/health")
        if result.error is None and response_body.get("status") != "ok":
            result.error = "Invalid health response"
        self.metrics.add_result(result)

    async def user_workload(self, user_id: int) -> None:
        if self.ramp_up > 0:
            await asyncio.sleep(user_id * self.ramp_up / self.concurrent_users)
        if not self.running:
            return
        conversation_id = await self.create_conversation(user_id)
        if conversation_id is None:
            return
        cycle = 0
        while self.running:
            await self.send_chat_message(conversation_id, "Hello, how are you?", "general")
            if cycle % 10 == 0:
                await self.health_check()
            if cycle % 5 == 0:
                await self.get_conversations()
                await self.get_messages(conversation_id)
            cycle += 1
            if self.think_time > 0:
                await asyncio.sleep(self.think_time)

    async def get_jwt_token_from_go_backend(self) -> str:
        credentials = {"email": f"loadtest_{secrets.token_hex(12)}@test.com", "password": generate_test_password()}
        result, response_body = await self._make_request(
            "POST",
            f"{self.go_backend_url}/register",
            json_payload={**credentials, "name": "Load Test User"},
            endpoint="/register",
            expected_status=201,
        )
        token = response_body.get("token")
        if result.error is not None or not isinstance(token, str) or not token:
            raise RuntimeError(f"Unable to obtain JWT from Go backend: {result.error or 'missing token'}")
        return token

    async def run(self) -> None:
        self.create_session()
        tasks: list[asyncio.Task[None]] = []
        try:
            if not self.jwt_token:
                self.jwt_token = await self.get_jwt_token_from_go_backend()
            availability, response_body = await self._make_request("GET", f"{self.base_url}/health")
            if availability.error is not None or response_body.get("status") != "ok":
                raise RuntimeError(f"LLM service is unavailable: {availability.error or 'invalid health response'}")
            self.running = True
            self.metrics.start_time = time()
            tasks = [asyncio.create_task(self.user_workload(index)) for index in range(self.concurrent_users)]
            await asyncio.sleep(self.duration)
        finally:
            self.running = False
            try:
                outcomes = await asyncio.gather(*tasks, return_exceptions=True)
                failures = [outcome for outcome in outcomes if isinstance(outcome, Exception)]
                for failure in failures:
                    logger.error("User workload failed: %s", failure)
                if failures:
                    raise ExceptionGroup("User workloads failed", failures)
            finally:
                self.metrics.end_time = time()
                await self.close_session()

    def get_results(self) -> dict:
        return self.metrics.get_statistics()


async def main():
    parser = argparse.ArgumentParser(description="Нагрузочное тестирование LLM Service")
    parser.add_argument(
        "--url",
        type=str,
        default="http://localhost:8000",
        help="Базовый URL сервера (по умолчанию: http://localhost:8000)",
    )
    parser.add_argument(
        "--jwt-token",
        type=str,
        default=None,
        help="JWT токен для аутентификации (если не указан, будет получен автоматически через Go бекенд)",
    )
    parser.add_argument(
        "--go-backend-url",
        type=str,
        default="http://localhost:8080",
        help="URL Go бекенда для получения JWT токена (по умолчанию: http://localhost:8080)",
    )
    parser.add_argument(
        "--users",
        type=int,
        default=10,
        help="Количество concurrent пользователей (по умолчанию: 10)",
    )
    parser.add_argument(
        "--duration",
        type=int,
        default=60,
        help="Длительность теста в секундах (по умолчанию: 60)",
    )
    parser.add_argument(
        "--ramp-up",
        type=int,
        default=0,
        help="Время ramp-up в секундах (по умолчанию: 0)",
    )
    parser.add_argument(
        "--think-time",
        type=float,
        default=0.1,
        help="Пауза между циклами пользователя в секундах (по умолчанию: 0.1)",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="results.json",
        help="Имя файла для сохранения результатов в JSON (по умолчанию: results.json)",
    )

    args = parser.parse_args()
    if args.users <= 0 or args.duration <= 0 or args.ramp_up < 0 or args.think_time < 0:
        parser.error("users and duration must be positive; ramp-up and think-time must be non-negative")

    tester = LoadTester(
        base_url=args.url,
        jwt_token=args.jwt_token,
        concurrent_users=args.users,
        duration=args.duration,
        ramp_up=args.ramp_up,
        think_time=args.think_time,
        go_backend_url=args.go_backend_url,
    )

    try:
        await tester.run()
        stats = tester.get_results()
        logger.info(
            "Load test completed: requests=%s, success_rate=%.2f%%", stats["total_requests"], stats["success_rate"]
        )
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(stats, f, indent=2, ensure_ascii=False)
    except KeyboardInterrupt:
        tester.running = False
        stats = tester.get_results()
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(stats, f, indent=2, ensure_ascii=False)
        sys.exit(1)
    except Exception as error:
        logger.exception("Load test failed")
        error_info = {"error": str(error), "traceback": traceback.format_exc(), "metrics": tester.get_results()}
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(error_info, f, indent=2, ensure_ascii=False)
        sys.exit(1)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    asyncio.run(main())
