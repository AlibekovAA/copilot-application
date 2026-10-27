import asyncio
from typing import Any

import httpx
from fastapi import HTTPException, status

from app.core import get_settings
from app.utils import log


class MistralService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.api_key = self.settings.MISTRAL_API_KEY
        self.model = self.settings.MISTRAL_MODEL
        self.base_url = self.settings.MISTRAL_BASE_URL
        self.timeout = self.settings.MISTRAL_TIMEOUT
        self.mock_mode = self.settings.MOCK_MISTRAL

        if self.mock_mode:
            log.info("MistralService running in MOCK mode - LLM API calls will be simulated")
        else:
            if not self.api_key:
                log.error("MISTRAL_API_KEY not configured. Please set it in .env file.")
                raise ValueError("MISTRAL_API_KEY not configured. Service cannot start without it.")

            limits = httpx.Limits(
                max_keepalive_connections=20,
                max_connections=50,
                keepalive_expiry=30.0,
            )

            self.client = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=self.timeout,
                limits=limits,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
            )

    async def generate(
        self,
        prompt: str,
        system_prompt: str,
        history_messages: list[dict[str, str]] | None = None,
        temperature: float = 0.5,
        max_tokens: int = 5000,
        **kwargs: Any,
    ) -> str:
        if self.mock_mode:
            mock_response = (
                f"Это мок-ответ для нагрузочного тестирования. "
                f"Получен промпт длиной {len(prompt)} символов. "
                f"История содержит {len(history_messages) if history_messages else 0} сообщений. "
                f"Системный промпт: {system_prompt[:50]}..."
            )
            log.debug(f"Mock response generated: {len(mock_response)} chars")
            return mock_response

        try:
            return await self._request_completion(
                prompt,
                system_prompt,
                history_messages,
                temperature,
                max_tokens,
                **kwargs,
            )

        except httpx.TimeoutException as e:
            log.error(f"Mistral API timeout: {e}")
            raise HTTPException(status.HTTP_504_GATEWAY_TIMEOUT, "Timeout waiting for Mistral AI") from e
        except httpx.HTTPStatusError as e:
            error_text = e.response.text
            status_code = e.response.status_code
            log.error(f"Mistral API error: {status_code} - {error_text}")

            if status_code == status.HTTP_429_TOO_MANY_REQUESTS:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Request limit exceeded for the configured Mistral model. Please retry later.",
                    headers={"Retry-After": e.response.headers.get("Retry-After", "1")},
                ) from e
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Mistral AI request failed") from e
        except httpx.RequestError as e:
            log.error(f"Mistral connection failed: {e}")
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Unable to contact Mistral AI") from e
        except (RuntimeError, ConnectionError, OSError) as e:
            log.error(f"Unexpected error in Mistral service: {e}")
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Mistral AI request failed") from e

    async def _request_completion(
        self,
        prompt: str,
        system_prompt: str,
        history_messages: list[dict[str, str]] | None,
        temperature: float,
        max_tokens: int,
        **kwargs: Any,
    ) -> str:
        log.debug(
            f"Generating with model: {self.model}, "
            f"prompt: {len(prompt)} chars, history: {len(history_messages) if history_messages else 0}"
        )

        messages = [{"role": "system", "content": system_prompt}]

        if history_messages:
            messages.extend(history_messages)

        current_question = f"[ТЕКУЩИЙ ВОПРОС - ОТВЕТЬ ТОЛЬКО НА НЕГО]\n{prompt}"
        messages.append({"role": "user", "content": current_question})

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            **kwargs,
        }

        response = await self.client.post("/chat/completions", json=payload)
        response.raise_for_status()

        try:
            data = response.json()
        except ValueError as e:
            log.error(f"Failed to parse Mistral API response as JSON: {e}; body={response.text}")
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Invalid JSON from Mistral AI") from e
        choices = data.get("choices", [])

        if not choices:
            log.warning("Empty choices in Mistral API response")
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Empty response from Mistral AI")

        generated_text: str = str(choices[0].get("message", {}).get("content", ""))

        if not generated_text:
            log.warning("Empty content in Mistral API response")
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Empty response from Mistral AI")

        log.debug(f"Generated: {len(generated_text)} chars")

        return generated_text.strip()

    async def close(self, timeout: float = 10.0) -> None:
        if self.mock_mode:
            return
        try:
            await asyncio.wait_for(self.client.aclose(), timeout=timeout)
        except TimeoutError:
            log.warning("Mistral HTTP client close timeout, connections will be closed on object destruction")
