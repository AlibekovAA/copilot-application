#!/usr/bin/env python3
import argparse
import asyncio
import json
import statistics
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from time import time
from typing import Dict, List, Optional

import aiohttp


def percentile(values: List[float], p: float) -> float:
    if not values:
        return 0.0
    if p <= 0:
        return min(values)
    if p >= 100:
        return max(values)
    sorted_values = sorted(values)
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
    response_times: List[float] = field(default_factory=list)
    status_codes: Counter = field(default_factory=Counter)
    errors: Counter = field(default_factory=Counter)
    endpoint_metrics: Dict[str, List[float]] = field(default_factory=lambda: defaultdict(list))
    start_time: float = field(default_factory=time)
    end_time: Optional[float] = None

    def add_result(self, result: RequestResult):
        self.total_requests += 1
        self.response_times.append(result.response_time)
        self.endpoint_metrics[result.endpoint].append(result.response_time)
        self.status_codes[result.status_code] += 1

        if 200 <= result.status_code < 300:
            self.successful_requests += 1
        else:
            self.failed_requests += 1
            if result.error:
                self.errors[result.error] += 1

    def get_statistics(self) -> Dict:
        duration = (self.end_time or time()) - self.start_time
        duration = max(duration, 0.0)
        rps = self.total_requests / duration if duration > 0 else 0.0

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

            stats["endpoint_metrics"][endpoint] = {
                "count": count,
                "min": min(times),
                "max": max(times),
                "mean": statistics.mean(times),
                "p95": percentile(times, 95.0),
                "p99": percentile(times, 99.0),
                "rps": count / duration if duration > 0 else 0.0,
            }

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
        concurrent_users: int,
        duration: int,
        ramp_up: int = 0,
        think_time: float = 0.1,
    ):
        self.base_url = base_url.rstrip("/")
        self.concurrent_users = concurrent_users
        self.duration = duration
        self.ramp_up = ramp_up
        self.think_time = max(think_time, 0.0)
        self.metrics = Metrics()
        self.session: Optional[aiohttp.ClientSession] = None
        self.running = False
        self.users_data: List[Dict[str, str]] = []
        self.tokens: Dict[int, Optional[str]] = {}

    async def create_session(self):
        timeout = aiohttp.ClientTimeout(total=30, connect=10)
        connector = aiohttp.TCPConnector(limit=0)
        self.session = aiohttp.ClientSession(timeout=timeout, connector=connector)

    async def close_session(self):
        if self.session and not self.session.closed:
            await self.session.close()

    async def register_user(self, user_id: int) -> Optional[str]:
        if not self.session:
            return None

        email = f"loadtest_{user_id}_{int(time() * 1000)}@test.com"
        password = "test_password_123"
        name = f"Load Test User {user_id}"

        payload = {"email": email, "password": password, "name": name}

        start_time = time()
        token: Optional[str] = None
        try:
            async with self.session.post(
                f"{self.base_url}/register",
                json=payload,
                headers={"Content-Type": "application/json"},
            ) as response:
                response_time = time() - start_time
                body = await response.text()

                result = RequestResult(
                    endpoint="/register",
                    status_code=response.status,
                    response_time=response_time,
                )

                if response.status == 201:
                    try:
                        data = await response.json()
                        token = data.get("token")
                        if token:
                            self.tokens[user_id] = token
                            self.users_data.append({"email": email, "password": password, "user_id": user_id})
                        else:
                            result.error = "Token is missing"
                    except (json.JSONDecodeError, KeyError, TypeError):
                        result.error = "Failed to parse token"
                else:
                    result.error = f"Status {response.status}: {body[:100]}"

                self.metrics.add_result(result)
                return token
        except asyncio.TimeoutError:
            result = RequestResult(
                endpoint="/register",
                status_code=0,
                response_time=time() - start_time,
                error="Timeout",
            )
            self.metrics.add_result(result)
            return None
        except Exception as e:
            result = RequestResult(
                endpoint="/register",
                status_code=0,
                response_time=time() - start_time,
                error=str(e),
            )
            self.metrics.add_result(result)
            return None

    async def login_user(self, email: str, password: str) -> Optional[str]:
        if not self.session:
            return None

        payload = {"email": email, "password": password}

        start_time = time()
        token: Optional[str] = None
        try:
            async with self.session.post(
                f"{self.base_url}/login",
                json=payload,
                headers={"Content-Type": "application/json"},
            ) as response:
                response_time = time() - start_time
                body = await response.text()

                result = RequestResult(
                    endpoint="/login",
                    status_code=response.status,
                    response_time=response_time,
                )

                if response.status == 200:
                    try:
                        data = await response.json()
                        token = data.get("token")
                        if not token:
                            result.error = "Token is missing"
                    except (json.JSONDecodeError, KeyError, TypeError):
                        result.error = "Failed to parse token"
                else:
                    result.error = f"Status {response.status}: {body[:100]}"

                self.metrics.add_result(result)
                return token
        except asyncio.TimeoutError:
            result = RequestResult(
                endpoint="/login",
                status_code=0,
                response_time=time() - start_time,
                error="Timeout",
            )
            self.metrics.add_result(result)
            return None
        except Exception as e:
            result = RequestResult(
                endpoint="/login",
                status_code=0,
                response_time=time() - start_time,
                error=str(e),
            )
            self.metrics.add_result(result)
            return None

    async def get_profile(self, token: str):
        if not self.session:
            return

        headers = {"Authorization": f"Bearer {token}"}

        start_time = time()
        try:
            async with self.session.get(
                f"{self.base_url}/api/profile",
                headers=headers,
            ) as response:
                response_time = time() - start_time
                body = await response.text()

                result = RequestResult(
                    endpoint="/api/profile",
                    status_code=response.status,
                    response_time=response_time,
                )

                if response.status != 200:
                    result.error = f"Status {response.status}: {body[:100]}"

                self.metrics.add_result(result)
        except asyncio.TimeoutError:
            result = RequestResult(
                endpoint="/api/profile",
                status_code=0,
                response_time=time() - start_time,
                error="Timeout",
            )
            self.metrics.add_result(result)
        except Exception as e:
            result = RequestResult(
                endpoint="/api/profile",
                status_code=0,
                response_time=time() - start_time,
                error=str(e),
            )
            self.metrics.add_result(result)

    async def health_check(self):
        if not self.session:
            return

        start_time = time()
        try:
            async with self.session.get(f"{self.base_url}/health") as response:
                response_time = time() - start_time

                result = RequestResult(
                    endpoint="/health",
                    status_code=response.status,
                    response_time=response_time,
                )

                if response.status != 200:
                    result.error = f"Status {response.status}"

                self.metrics.add_result(result)
        except Exception as e:
            result = RequestResult(
                endpoint="/health",
                status_code=0,
                response_time=time() - start_time,
                error=str(e),
            )
            self.metrics.add_result(result)

    async def user_workload(self, user_id: int):
        if self.ramp_up > 0 and self.concurrent_users > 0:
            delay = user_id * (self.ramp_up / self.concurrent_users)
            await asyncio.sleep(delay)

        token = await self.register_user(user_id)
        if not token:
            return

        health_check_counter = 0
        while self.running:
            if self.users_data:
                user_data = self.users_data[user_id % len(self.users_data)]
                login_token = await self.login_user(user_data["email"], user_data["password"])
                if login_token:
                    await self.get_profile(login_token)

            await self.get_profile(token)

            health_check_counter += 1
            if health_check_counter % 10 == 0:
                await self.health_check()

            if self.think_time > 0:
                await asyncio.sleep(self.think_time)

    async def check_server_availability(self) -> bool:
        if not self.session:
            return False

        try:
            async with self.session.get(
                f"{self.base_url}/health",
                timeout=aiohttp.ClientTimeout(total=5),
            ) as response:
                return response.status == 200
        except Exception:
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
            await asyncio.gather(*tasks, return_exceptions=True)
            self.metrics.end_time = time()
            await self.close_session()

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

    args = parser.parse_args()

    tester = LoadTester(
        base_url=args.url,
        concurrent_users=args.users,
        duration=args.duration,
        ramp_up=args.ramp_up,
        think_time=args.think_time,
    )

    try:
        await tester.run()
        stats = tester.get_results()

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
        error_result = {
            "error": str(e),
            "error_type": type(e).__name__,
        }

        if args.output:
            output_file = args.output if args.output.endswith(".json") else f"{args.output}.json"
        else:
            timestamp = int(time)
            output_file = f"load_test_error_{timestamp}.json"

        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(error_result, f, indent=2, ensure_ascii=False)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
