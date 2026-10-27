#!/usr/bin/env python3
import argparse
import asyncio
import json
import logging
import statistics
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from time import perf_counter, time
from typing import Dict, List, Optional

import aiohttp


logger = logging.getLogger(__name__)


def percentile(sorted_values: List[float], p: float) -> float:
    if not sorted_values:
        return 0.0
    if p <= 0:
        return sorted_values[0]
    if p >= 100:
        return sorted_values[-1]
    k = int(len(sorted_values) * p / 100)
    k = min(max(k, 0), len(sorted_values) - 1)
    return sorted_values[k]


@dataclass
class RequestResult:
    endpoint: str
    status_code: int
    response_time: float
    error: Optional[str] = None
    timestamp: float = field(default_factory=time)


@dataclass
class Metrics:
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    status_codes: Counter = field(default_factory=Counter)
    errors: Counter = field(default_factory=Counter)
    endpoint_metrics: Dict[str, List[float]] = field(default_factory=lambda: defaultdict(list))
    endpoint_status_metrics: Dict[str, Dict[int, List[float]]] = field(
        default_factory=lambda: defaultdict(lambda: defaultdict(list))
    )
    start_time: float = field(default_factory=time)
    end_time: Optional[float] = None

    def add_result(self, result: RequestResult):
        self.total_requests += 1
        self.endpoint_metrics[result.endpoint].append(result.response_time)
        self.endpoint_status_metrics[result.endpoint][result.status_code].append(result.response_time)
        self.status_codes[result.status_code] += 1

        if 200 <= result.status_code < 300 and result.error is None:
            self.successful_requests += 1
        else:
            self.failed_requests += 1
            if result.error:
                self.errors[result.error] += 1

    def get_statistics(self) -> Dict:
        duration = (self.end_time or time()) - self.start_time
        duration = max(duration, 0.0)
        rps = self.total_requests / duration if duration > 0 else 0.0
        response_times = [response_time for times in self.endpoint_metrics.values() for response_time in times]
        sorted_response_times = sorted(response_times)

        stats = {
            "duration_seconds": duration,
            "total_requests": self.total_requests,
            "successful_requests": self.successful_requests,
            "failed_requests": self.failed_requests,
            "success_rate": (self.successful_requests / self.total_requests * 100.0)
            if self.total_requests > 0
            else 0.0,
            "requests_per_second": rps,
            "status_codes": dict(self.status_codes),
            "errors": dict(self.errors),
            "endpoint_metrics": {},
            "endpoint_status_metrics": {},
        }

        for endpoint, times in self.endpoint_metrics.items():
            count = len(times)
            if count == 0:
                stats["endpoint_metrics"][endpoint] = {
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
            stats["endpoint_metrics"][endpoint] = {
                "count": count,
                "min": min(times),
                "max": max(times),
                "mean": statistics.mean(times),
                "p95": percentile(sorted_times, 95.0),
                "p99": percentile(sorted_times, 99.0),
                "rps": count / duration if duration > 0 else 0.0,
            }

        for endpoint, statuses in self.endpoint_status_metrics.items():
            stats["endpoint_status_metrics"][endpoint] = {}
            for status_code, times in statuses.items():
                sorted_times = sorted(times)
                count = len(times)
                stats["endpoint_status_metrics"][endpoint][str(status_code)] = {
                    "count": count,
                    "mean": statistics.mean(times),
                    "p95": percentile(sorted_times, 95.0),
                    "p99": percentile(sorted_times, 99.0),
                    "rps": count / duration if duration > 0 else 0.0,
                }

        if response_times:
            middle = len(sorted_response_times) // 2
            median = sorted_response_times[middle]
            if len(sorted_response_times) % 2 == 0:
                median = (sorted_response_times[middle - 1] + median) / 2

            stats["response_time"] = {
                "min": min(response_times),
                "max": max(response_times),
                "mean": statistics.mean(response_times),
                "median": median,
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
        concurrent_users: int,
        duration: int,
        ramp_up: int = 0,
        think_time: float = 0.1,
        change_password_every: int = 0,
    ):
        self.base_url = base_url.rstrip("/")
        self.concurrent_users = concurrent_users
        self.duration = duration
        self.ramp_up = ramp_up
        self.think_time = max(think_time, 0.0)
        self.change_password_every = change_password_every
        self.metrics = Metrics()
        self.session: Optional[aiohttp.ClientSession] = None
        self.running = False
        self.users_data: Dict[int, Dict[str, str]] = {}

    async def create_session(self):
        timeout = aiohttp.ClientTimeout(total=30, connect=10)
        connector = aiohttp.TCPConnector(limit=0)
        self.session = aiohttp.ClientSession(timeout=timeout, connector=connector)

    async def close_session(self):
        if self.session and not self.session.closed:
            await self.session.close()

    async def request(
        self,
        method: str,
        endpoint: str,
        payload: dict[str, str] | None = None,
        token: str | None = None,
        expected_status: int = 200,
    ) -> tuple[RequestResult, dict[str, object]]:
        if self.session is None:
            raise RuntimeError("HTTP session is not initialized")

        headers = {"Authorization": f"Bearer {token}"} if token else {}
        started = perf_counter()
        result = RequestResult(endpoint=endpoint, status_code=0, response_time=0.0)
        response_body = {}
        try:
            async with self.session.request(
                method, f"{self.base_url}{endpoint}", json=payload, headers=headers
            ) as response:
                result.status_code = response.status
                body = await response.text()
                if response.status != expected_status:
                    result.error = f"Status {response.status}: {body[:100]}"
                else:
                    try:
                        response_body = json.loads(body)
                        if not isinstance(response_body, dict):
                            response_body = {}
                            result.error = "Response is not a JSON object"
                    except json.JSONDecodeError:
                        result.error = "Invalid JSON response"
        except asyncio.TimeoutError:
            result.error = "Timeout"
        except aiohttp.ClientError as error:
            result.error = str(error)
        finally:
            result.response_time = perf_counter() - started
        return result, response_body

    async def authenticate(self, endpoint: str, payload: dict[str, str]) -> str | None:
        expected_status = 201 if endpoint == "/register" else 200
        result, response_body = await self.request("POST", endpoint, payload, expected_status=expected_status)
        token = response_body.get("token")
        user = response_body.get("user")
        if result.error is None and (
            not isinstance(token, str) or not token
            or not isinstance(user, dict)
            or not isinstance(user.get("id"), int)
            or isinstance(user.get("id"), bool)
            or user.get("email") != payload["email"]
            or not isinstance(user.get("name"), str)
        ):
            result.error = "Invalid authentication response"
        self.metrics.add_result(result)
        return token if result.error is None else None

    async def register_user(self, user_id: int) -> str | None:
        email = f"loadtest_{user_id}_{int(time() * 1000)}@test.com"
        password = "test_password_123"
        token = await self.authenticate(
            "/register", {"email": email, "password": password, "name": f"Load Test User {user_id}"}
        )
        if token:
            self.users_data[user_id] = {"email": email, "password": password}
        return token

    async def login_user(self, email: str, password: str) -> str | None:
        return await self.authenticate("/login", {"email": email, "password": password})

    async def get_profile(self, token: str) -> None:
        result, response_body = await self.request("GET", "/api/profile", token=token)
        if result.error is None and (
            not isinstance(response_body.get("user_id"), int)
            or isinstance(response_body.get("user_id"), bool)
            or not isinstance(response_body.get("email"), str)
        ):
            result.error = "Invalid profile response"
        self.metrics.add_result(result)

    async def health_check(self) -> None:
        result, response_body = await self.request("GET", "/health")
        if result.error is None and response_body.get("status") != "ok":
            result.error = "Invalid health response"
        self.metrics.add_result(result)

    async def change_password(self, user_id: int, token: str, cycle: int) -> None:
        user = self.users_data[user_id]
        new_password = f"test_password_{user_id}_{cycle}"
        result, response_body = await self.request(
            "POST", "/api/change-password",
            {"old_password": user["password"], "new_password": new_password}, token=token,
        )
        if result.error is None and response_body.get("message") != "password updated successfully":
            result.error = "Invalid password change response"
        self.metrics.add_result(result)
        if result.error is None:
            user["password"] = new_password

    async def user_workload(self, user_id: int):
        if self.ramp_up > 0 and self.concurrent_users > 0:
            delay = user_id * (self.ramp_up / self.concurrent_users)
            await asyncio.sleep(delay)

        token = await self.register_user(user_id)
        if not token:
            return

        health_check_counter = 0
        while self.running:
            if user_id in self.users_data:
                user_data = self.users_data[user_id]
                login_token = await self.login_user(user_data["email"], user_data["password"])
                if login_token:
                    await self.get_profile(login_token)

            await self.get_profile(token)

            health_check_counter += 1
            if self.change_password_every and health_check_counter % self.change_password_every == 0:
                await self.change_password(user_id, token, health_check_counter)
            if health_check_counter % 10 == 0:
                await self.health_check()

            if self.think_time > 0:
                await asyncio.sleep(self.think_time)

    async def check_server_availability(self) -> bool:
        if not self.session:
            return False

        try:
            async with self.session.get(
                f"{self.base_url}/health", timeout=aiohttp.ClientTimeout(total=5),
            ) as response:
                return response.status == 200 and (await response.json()).get("status") == "ok"
        except (aiohttp.ClientError, asyncio.TimeoutError, ValueError, AttributeError) as error:
            logger.warning("Server availability check failed: %s", error)
            return False

    async def run(self):
        await self.create_session()

        if not await self.check_server_availability():
            await self.close_session()
            raise RuntimeError(f"Сервер недоступен по адресу {self.base_url}")

        self.running = True
        self.metrics.start_time = time()

        tasks = [asyncio.create_task(self.user_workload(i)) for i in range(self.concurrent_users)]

        try:
            await asyncio.sleep(self.duration)
        finally:
            self.running = False
            outcomes = await asyncio.gather(*tasks, return_exceptions=True)
            for outcome in outcomes:
                if isinstance(outcome, BaseException):
                    logger.error("User workload failed: %s", outcome)
            failures = [outcome for outcome in outcomes if isinstance(outcome, Exception)]
            self.metrics.end_time = time()
            await self.close_session()
        if failures:
            raise ExceptionGroup("User workloads failed", failures)

    def get_results(self):
        return self.metrics.get_statistics()


async def main():
    parser = argparse.ArgumentParser(description="Нагрузочное тестирование Go бекенда")
    parser.add_argument(
        "--url",
        type=str,
        default="http://localhost:8080",
        help="Базовый URL сервера (по умолчанию: http://localhost:8080)",
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
        default=None,
        help="Имя файла для сохранения результатов (без расширения, по умолчанию: load_test_<timestamp>.json)",
    )

    parser.add_argument(
        "--change-password-every", type=int, default=0,
        help="Change password every N user cycles; 0 disables this scenario",
    )
    args = parser.parse_args()
    if args.users <= 0 or args.duration <= 0 or args.ramp_up < 0 or args.think_time < 0 or args.change_password_every < 0:
        parser.error("users and duration must be positive; delays and change-password-every must be non-negative")

    tester = LoadTester(
        base_url=args.url,
        concurrent_users=args.users,
        duration=args.duration,
        ramp_up=args.ramp_up,
        think_time=args.think_time,
        change_password_every=args.change_password_every,
    )

    try:
        await tester.run()
        stats = tester.get_results()
        logger.info("Load test completed: requests=%s, success_rate=%.2f%%", stats["total_requests"], stats["success_rate"])

        if args.output:
            output_file = args.output if args.output.endswith(".json") else f"{args.output}.json"
        else:
            timestamp = int(time())
            output_file = f"load_test_{timestamp}.json"

        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(stats, f, indent=2, ensure_ascii=False)
    except KeyboardInterrupt:
        tester.running = False
        stats = tester.get_results()

        if args.output:
            output_file = args.output if args.output.endswith(".json") else f"{args.output}.json"
        else:
            timestamp = int(time())
            output_file = f"load_test_{timestamp}.json"

        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(stats, f, indent=2, ensure_ascii=False)
        sys.exit(1)
    except Exception as e:
        logger.exception("Load test failed")
        error_result = {
            "error": str(e),
            "error_type": type(e).__name__,
        }

        if args.output:
            output_file = args.output if args.output.endswith(".json") else f"{args.output}.json"
        else:
            timestamp = int(time())
            output_file = f"load_test_error_{timestamp}.json"

        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(error_result, f, indent=2, ensure_ascii=False)
        sys.exit(1)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    asyncio.run(main())
