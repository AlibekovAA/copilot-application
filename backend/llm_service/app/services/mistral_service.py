from typing import Any

import httpx
from fastapi import HTTPException, status

from app.core import get_settings
from app.utils import log


DEFAULT_ERROR_RESPONSE = "Sorry, unable to generate response."


class MistralService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.api_key = self.settings.MISTRAL_API_KEY
        self.model = self.settings.MISTRAL_MODEL
        self.base_url = self.settings.MISTRAL_BASE_URL
        self.timeout = self.settings.MISTRAL_TIMEOUT

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
        try:
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
                raise ValueError("Invalid JSON in response from Mistral AI") from e
            choices = data.get("choices", [])

            if not choices:
                log.warning("Empty choices in Mistral API response")
                return DEFAULT_ERROR_RESPONSE

            generated_text: str = str(choices[0].get("message", {}).get("content", ""))

            if not generated_text:
                log.warning("Empty content in Mistral API response")
                return DEFAULT_ERROR_RESPONSE

            log.debug(f"Generated: {len(generated_text)} chars")

            return generated_text.strip()

        except httpx.TimeoutException as e:
            log.error(f"Mistral API timeout: {e}")
            raise ValueError("Timeout waiting for response from Mistral AI") from e
        except httpx.HTTPStatusError as e:
            error_text = e.response.text
            status_code = e.response.status_code
            log.error(f"Mistral API error: {status_code} - {error_text}")

            if status_code == status.HTTP_401_UNAUTHORIZED:
                raise ValueError("Invalid API key Mistral AI") from e
            if status_code == status.HTTP_429_TOO_MANY_REQUESTS:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Request limit exceeded for the configured Mistral model. Please retry later.",
                ) from e
            if status_code == status.HTTP_400_BAD_REQUEST:
                raise ValueError(f"Error in request to Mistral AI: {error_text}") from e

            raise ValueError(f"Error when contacting Mistral AI: {status_code}") from e
        except Exception as e:
            log.error(f"Unexpected error in Mistral service: {e}")
            raise ValueError(f"Unexpected error in Mistral service: {e!s}") from e

    async def health_check(self) -> bool:
        if not self.api_key:
            log.warning("Cannot perform health check: MISTRAL_API_KEY not set")
            return False

        try:
            payload = {
                "model": self.model,
                "messages": [
                    {"role": "system", "content": "You are a helpful assistant."},
                    {"role": "user", "content": "test"},
                ],
                "max_tokens": 5,
            }

            response = await self.client.post(
                "/chat/completions",
                json=payload,
                timeout=5.0,
            )
            response.raise_for_status()
            log.info("Mistral AI health check passed")
            return True
        except (httpx.HTTPError, ValueError) as e:
            log.warning(f"Mistral AI health check failed: {e}")
            return False

    async def __aenter__(self) -> "MistralService":
        return self

    async def __aexit__(self, exc_type: object, exc_val: object, exc_tb: object) -> None:
        await self.client.aclose()

    async def close(self) -> None:
        await self.client.aclose()
