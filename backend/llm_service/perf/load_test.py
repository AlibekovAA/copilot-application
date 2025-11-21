#!/usr/bin/env python3
import argparse
import asyncio
import http
import json
import secrets
import statistics
import string
import sys
import traceback
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from time import time

import aiohttp


MAX_PERCENT = 100
PERCENT_MULTIPLIER = 100.0
MAX_ERROR_BODY_LENGTH = 100
HTTP_SUCCESS_MIN = http.HTTPStatus.OK
HTTP_SUCCESS_MAX = http.HTTPStatus.MULTIPLE_CHOICES


def generate_test_password(length: int = 12) -> str:
    chars = string.ascii_letters + string.digits
    return "".join(secrets.choice(chars) for _ in range(length))


def percentile(values: list[float], p: float) -> float:
    if not values:
        return 0.0
    if p <= 0:
        return min(values)
    if p >= MAX_PERCENT:
        return max(values)
    sorted_values = sorted(values)
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
    response_times: list[float] = field(default_factory=list)
    status_codes: Counter = field(default_factory=Counter)
    errors: Counter = field(default_factory=Counter)
    endpoint_metrics: dict[str, list[float]] = field(default_factory=lambda: defaultdict(list))
    start_time: float = field(default_factory=time)
    end_time: float | None = None

    def add_result(self, result: RequestResult):
        self.total_requests += 1
        self.response_times.append(result.response_time)
        self.endpoint_metrics[result.endpoint].append(result.response_time)
        self.status_codes[result.status_code] += 1

        if HTTP_SUCCESS_MIN <= result.status_code < HTTP_SUCCESS_MAX:
            self.successful_requests += 1
        else:
            self.failed_requests += 1
            if result.error:
                self.errors[result.error] += 1

    def get_statistics(self) -> dict:
        duration = (self.end_time or time()) - self.start_time
        duration = max(duration, 0.0)
        rps = self.total_requests / duration if duration > 0 else 0.0

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

            endpoint_stats[endpoint] = {
                "count": count,
                "min": min(times),
                "max": max(times),
                "mean": statistics.mean(times),
                "p95": percentile(times, 95.0),
                "p99": percentile(times, 99.0),
                "rps": count / duration if duration > 0 else 0.0,
            }

        stats["endpoint_metrics"] = endpoint_stats

        if self.response_times:
            stats["response_time"] = {
                "min": min(self.response_times),
                "max": max(self.response_times),
                "mean": statistics.mean(self.response_times),
                "median": statistics.median(self.response_times),
                "p50": percentile(self.response_times, 50.0),
                "p75": percentile(self.response_times, 75.0),
                "p90": percentile(self.response_times, 90.0),
                "p95": percentile(self.response_times, 95.0),
                "p99": percentile(self.response_times, 99.0),
                "std_dev": statistics.stdev(self.response_times) if len(self.response_times) > 1 else 0.0,
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
    ):
        self.base_url = base_url.rstrip("/")
        self.jwt_token = jwt_token
        self.go_backend_url = (go_backend_url or "http://localhost:8080").rstrip("/")
        self.concurrent_users = concurrent_users
        self.duration = duration
        self.ramp_up = ramp_up
        self.think_time = max(think_time, 0.0)
        self.metrics = Metrics()
        self.session: aiohttp.ClientSession | None = None
        self.running = False
        self.conversation_ids: dict[int, int] = {}

    @property
    def auth_headers(self) -> dict[str, str]:
        if not self.jwt_token:
            return {}
        return {"Authorization": f"Bearer {self.jwt_token}"}

    async def create_session(self):
        timeout = aiohttp.ClientTimeout(total=30, connect=10)
        connector = aiohttp.TCPConnector(limit=0, limit_per_host=100)
        self.session = aiohttp.ClientSession(timeout=timeout, connector=connector)

    async def close_session(self):
        if self.session and not self.session.closed:
            await self.session.close()

    async def _make_request(
        self,
        method: str,
        url: str,
        json_payload: dict | None = None,
        form_data: aiohttp.FormData | None = None,
        endpoint: str = "",
    ) -> RequestResult:
        if not self.session:
            return RequestResult(endpoint=endpoint, status_code=0, response_time=0.0, error="No session")

        start_time = time()
        result: RequestResult | None = None

        try:
            if method == "POST" and json_payload:
                async with self.session.post(url, json=json_payload, headers=self.auth_headers) as response:
                    response_time = time() - start_time
                    result = RequestResult(endpoint=endpoint, status_code=response.status, response_time=response_time)
                    if not (HTTP_SUCCESS_MIN <= response.status < HTTP_SUCCESS_MAX):
                        body = await response.text()
                        result.error = f"Status {response.status}: {body[:MAX_ERROR_BODY_LENGTH]}"
            elif method == "POST" and form_data:
                async with self.session.post(url, data=form_data, headers=self.auth_headers) as response:
                    response_time = time() - start_time
                    result = RequestResult(endpoint=endpoint, status_code=response.status, response_time=response_time)
                    if not (HTTP_SUCCESS_MIN <= response.status < HTTP_SUCCESS_MAX):
                        body = await response.text()
                        result.error = f"Status {response.status}: {body[:MAX_ERROR_BODY_LENGTH]}"
            elif method == "GET":
                async with self.session.get(url, headers=self.auth_headers) as response:
                    response_time = time() - start_time
                    result = RequestResult(endpoint=endpoint, status_code=response.status, response_time=response_time)
                    if not (HTTP_SUCCESS_MIN <= response.status < HTTP_SUCCESS_MAX):
                        body = await response.text()
                        result.error = f"Status {response.status}: {body[:MAX_ERROR_BODY_LENGTH]}"
            else:
                result = RequestResult(
                    endpoint=endpoint, status_code=0, response_time=time() - start_time, error="Invalid method"
                )
        except TimeoutError:
            result = RequestResult(endpoint=endpoint, status_code=0, response_time=time() - start_time, error="Timeout")
        except (aiohttp.ClientError, OSError, ConnectionError, ValueError) as e:
            result = RequestResult(endpoint=endpoint, status_code=0, response_time=time() - start_time, error=str(e))

        return (
            result
            if result is not None
            else RequestResult(
                endpoint=endpoint, status_code=0, response_time=time() - start_time, error="Unknown error"
            )
        )

    async def create_conversation(self, user_id: int) -> int | None:
        payload = {
            "title": f"Load Test Conversation {user_id}",
            "business_context": "Testing",
        }
        result = await self._make_request(
            "POST", f"{self.base_url}/conversations", json_payload=payload, endpoint="/conversations"
        )
        self.metrics.add_result(result)

        if result.status_code == http.HTTPStatus.CREATED and self.session:
            start_time = time()
            try:
                async with self.session.post(
                    f"{self.base_url}/conversations",
                    json=payload,
                    headers=self.auth_headers,
                ) as response:
                    data = await response.json()
                    conv_id = data.get("conversation_id")
                    if conv_id is not None:
                        conversation_id = int(conv_id)
                        self.conversation_ids[user_id] = conversation_id
                        return conversation_id
                    else:
                        result.error = "Conversation ID is missing"
                        return None
            except (json.JSONDecodeError, KeyError, TypeError, ValueError) as e:
                result.error = f"Failed to parse conversation ID: {e!s}"
                return None
            except (aiohttp.ClientError, OSError, ConnectionError) as e:
                self.metrics.add_result(
                    RequestResult(
                        endpoint="/conversations", status_code=0, response_time=time() - start_time, error=str(e)
                    )
                )
                return None
        return None

    async def send_chat_message(self, conversation_id: int, message: str, domain: str = "general"):
        data = aiohttp.FormData()
        data.add_field("conversation_id", str(conversation_id))
        data.add_field("message", message)
        data.add_field("domain", domain)
        result = await self._make_request("POST", f"{self.base_url}/chat", form_data=data, endpoint="/chat")
        self.metrics.add_result(result)

    async def get_conversations(self):
        result = await self._make_request(
            "GET", f"{self.base_url}/conversations?limit=50&offset=0", endpoint="/conversations"
        )
        self.metrics.add_result(result)

    async def get_messages(self, conversation_id: int):
        result = await self._make_request(
            "GET", f"{self.base_url}/conversations/{conversation_id}/messages", endpoint="/conversations/{id}/messages"
        )
        self.metrics.add_result(result)

    async def health_check(self):
        result = await self._make_request("GET", f"{self.base_url}/health", endpoint="/health")
        self.metrics.add_result(result)

    async def user_workload(self, user_id: int):
        try:
            if self.ramp_up > 0 and self.concurrent_users > 0:
                delay = user_id * (self.ramp_up / self.concurrent_users)
                await asyncio.sleep(delay)
        except asyncio.CancelledError:
            return

        try:
            conversation_id = await self.create_conversation(user_id)
            if not conversation_id:
                return
        except (aiohttp.ClientError, OSError, ConnectionError, ValueError) as e:
            self.metrics.add_result(
                RequestResult(
                    endpoint="/conversations",
                    status_code=0,
                    response_time=0.0,
                    error=f"User {user_id} failed to create conversation: {e!s}",
                )
            )
            return None

        health_check_counter = 0
        while self.running:
            try:
                await self.send_chat_message(conversation_id, "Hello, how are you?", "general")

                if health_check_counter % 10 == 0:
                    await self.health_check()

                if health_check_counter % 5 == 0:
                    await self.get_conversations()
                    await self.get_messages(conversation_id)

                health_check_counter += 1

                if self.think_time > 0:
                    await asyncio.sleep(self.think_time)
            except asyncio.CancelledError:
                break
            except (TimeoutError, aiohttp.ClientError, OSError, ConnectionError, ValueError) as e:
                self.metrics.add_result(
                    RequestResult(
                        endpoint="user_request",
                        status_code=0,
                        response_time=0.0,
                        error=f"User {user_id} request failed: {e!s}",
                    )
                )
                continue
            except json.JSONDecodeError as e:
                self.metrics.add_result(
                    RequestResult(
                        endpoint="user_request",
                        status_code=0,
                        response_time=0.0,
                        error=f"User {user_id} JSON parse error: {e!s}",
                    )
                )
                continue

    async def _login_user(self, email: str, password: str) -> str | None:
        if not self.session:
            return None
        try:
            async with self.session.post(
                f"{self.go_backend_url}/login",
                json={"email": email, "password": password},
                headers={"Content-Type": "application/json"},
                timeout=aiohttp.ClientTimeout(total=10),
            ) as login_response:
                if login_response.status == http.HTTPStatus.OK:
                    login_data = await login_response.json()
                    token = login_data.get("token")
                    if token:
                        return str(token)
        except (
            TimeoutError,
            aiohttp.ClientError,
            OSError,
            ConnectionError,
            ValueError,
            KeyError,
            TypeError,
            json.JSONDecodeError,
        ):
            pass
        return None

    async def get_jwt_token_from_go_backend(self) -> str | None:
        if not self.session:
            return None

        password = generate_test_password()
        email = f"loadtest_{int(time() * 1000)}@test.com"
        name = "Load Test User"

        try:
            async with self.session.post(
                f"{self.go_backend_url}/register",
                json={"email": email, "password": password, "name": name},
                headers={"Content-Type": "application/json"},
                timeout=aiohttp.ClientTimeout(total=10),
            ) as response:
                if response.status == http.HTTPStatus.CREATED:
                    data = await response.json()
                    token = data.get("token")
                    if token:
                        return str(token)

                if response.status == http.HTTPStatus.CONFLICT:
                    return await self._login_user(email, password)
        except (
            TimeoutError,
            aiohttp.ClientError,
            OSError,
            ConnectionError,
            ValueError,
            KeyError,
            TypeError,
            json.JSONDecodeError,
        ):
            pass
        return None

    async def check_server_availability(self) -> bool:
        if not self.session:
            return False
        try:
            async with self.session.get(
                f"{self.base_url}/health",
                timeout=aiohttp.ClientTimeout(total=5),
            ) as response:
                return response.status == http.HTTPStatus.OK
        except (TimeoutError, aiohttp.ClientError, OSError, ConnectionError):
            return False
        return False

    async def run(self):
        await self.create_session()

        if not self.jwt_token:
            token = await self.get_jwt_token_from_go_backend()
            if not token:
                await self.close_session()
                sys.exit(1)
            self.jwt_token = token

        if not await self.check_server_availability():
            await self.close_session()
            sys.exit(1)

        self.running = True
        self.metrics.start_time = time()

        tasks = [asyncio.create_task(self.user_workload(i)) for i in range(self.concurrent_users)]

        try:
            await asyncio.sleep(self.duration)
        finally:
            self.running = False
            await asyncio.gather(*tasks, return_exceptions=True)
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
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(stats, f, indent=2, ensure_ascii=False)
    except KeyboardInterrupt:
        tester.running = False
        stats = tester.get_results()
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(stats, f, indent=2, ensure_ascii=False)
        sys.exit(1)
    except (TimeoutError, aiohttp.ClientError, OSError, ConnectionError, ValueError, RuntimeError) as e:
        error_info = {
            "error": str(e),
            "traceback": traceback.format_exc(),
        }
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(error_info, f, indent=2, ensure_ascii=False)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
