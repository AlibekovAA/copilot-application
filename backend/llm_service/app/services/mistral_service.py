from typing import Any

import httpx
from fastapi import status

from app.core import get_settings
from app.prompts import get_system_prompt
from app.utils import log


class MistralService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.api_key = self.settings.MISTRAL_API_KEY
        self.model = self.settings.MISTRAL_MODEL
        self.base_url = self.settings.MISTRAL_BASE_URL
        self.timeout = self.settings.MISTRAL_TIMEOUT

        if not self.api_key:
            log.warning("MISTRAL_API_KEY not configured. Please set it in .env file.")

        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=self.timeout,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
        )

    async def generate(
        self,
        prompt: str,
        domain: str = "general",
        history_messages: list[dict[str, str]] | None = None,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        **kwargs: Any,
    ) -> str:
        if not self.api_key:
            raise ValueError("MISTRAL_API_KEY not configured. Please set it in .env file.")

        try:
            system_prompt = get_system_prompt(domain)

            log.info(
                f"Generating response with Mistral model: {self.model}, domain: {domain}, prompt length: {len(prompt)},"
                f"history messages: {len(history_messages) if history_messages else 0}"
            )

            messages = [{"role": "system", "content": system_prompt}]

            if history_messages:
                messages.extend(history_messages)

            messages.append({"role": "user", "content": prompt})

            payload = {
                "model": self.model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
                **kwargs,
            }

            response = await self.client.post("/chat/completions", json=payload)
            response.raise_for_status()

            data = response.json()
            choices = data.get("choices", [])

            if not choices:
                log.warning("Empty choices in Mistral API response")
                return "Sorry, unable to generate response."

            generated_text: str = str(choices[0].get("message", {}).get("content", ""))

            if not generated_text:
                log.warning("Empty content in Mistral API response")
                return "Sorry, unable to generate response."

            log.info(f"Successfully generated response, length: {len(generated_text)}")
            log.debug(f"Mistral response: {generated_text[:200]}...")

            return generated_text.strip()

        except httpx.TimeoutException as e:
            log.error(f"Mistral API request timeout: {e}")
            raise ValueError("Timeout waiting for response from Mistral AI") from e
        except httpx.HTTPStatusError as e:
            error_text = e.response.text
            status_code = e.response.status_code
            log.error(f"Mistral API HTTP error: {status_code} - {error_text}")

            if status_code == status.HTTP_401_UNAUTHORIZED:
                raise ValueError("Invalid API key Mistral AI") from e
            if status_code == status.HTTP_429_TOO_MANY_REQUESTS:
                raise ValueError("Request limit exceeded Mistral AI") from e
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
                "messages": [{"role": "user", "content": "test"}],
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
