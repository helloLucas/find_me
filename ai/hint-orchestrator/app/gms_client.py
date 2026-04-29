from __future__ import annotations

from pathlib import Path
from typing import Any

import httpx

from app.config import Settings

_PROMPT_PATH = Path(__file__).resolve().parent / "prompts" / "lucas_developer_prompt.txt"
_FALLBACK_DEVELOPER_PROMPT = "너는 한국어로 답변하며, 반드시 JSON 객체만 출력한다."


class GmsLlmClient:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._http = httpx.AsyncClient(timeout=httpx.Timeout(settings.gms_timeout_seconds))
        self._developer_prompt = self._load_developer_prompt()

    async def close(self) -> None:
        await self._http.aclose()

    async def generate_text(self, prompt: str) -> str:
        base = self._settings.gms_base_url.rstrip("/")
        path = self._settings.gms_openai_chat_path.lstrip("/")
        url = f"{base}/{path}"

        payload: dict[str, Any] = {
            "model": self._settings.gms_llm_model,
            "messages": [
                {"role": "developer", "content": self._developer_prompt},
                {"role": "user", "content": prompt},
            ],
            "max_completion_tokens": self._settings.gms_max_output_tokens,
            "response_format": {"type": "json_object"},
        }
        if not self._is_gpt5_family(self._settings.gms_llm_model):
            payload["temperature"] = self._settings.gms_temperature

        response = await self._http.post(
            url,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self._settings.gms_key}",
            },
            json=payload,
        )
        response.raise_for_status()
        body = response.json()
        return _extract_chat_text(body)

    async def embed_text(self, text: str, output_dimensionality: int | None = None) -> list[float]:
        model = self._settings.gms_embedding_model.removeprefix("models/")
        base = self._settings.gms_base_url.rstrip("/")
        url = f"{base}/generativelanguage.googleapis.com/v1beta/models/{model}:embedContent"

        payload: dict[str, Any] = {
            "model": f"models/{model}",
            "content": {"parts": [{"text": text}]},
            "taskType": "RETRIEVAL_QUERY",
        }
        if output_dimensionality is not None:
            payload["outputDimensionality"] = output_dimensionality

        response = await self._http.post(
            url,
            headers={
                "Content-Type": "application/json",
                "x-goog-api-key": self._settings.gms_key,
            },
            json=payload,
        )
        response.raise_for_status()
        body = response.json()
        values = ((body.get("embedding") or {}).get("values")) or []
        if not values:
            return []
        return [float(v) for v in values]

    def _load_developer_prompt(self) -> str:
        try:
            text = _PROMPT_PATH.read_text(encoding="utf-8").strip()
            return text or _FALLBACK_DEVELOPER_PROMPT
        except OSError:
            return _FALLBACK_DEVELOPER_PROMPT

    @staticmethod
    def _is_gpt5_family(model: str) -> bool:
        return model.strip().lower().startswith("gpt-5")


def _extract_chat_text(body: dict[str, Any]) -> str:
    choices = body.get("choices") or []
    if not choices:
        return ""

    message = (choices[0] or {}).get("message") or {}
    content = message.get("content")
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, dict):
                text = item.get("text")
                if isinstance(text, str) and text.strip():
                    parts.append(text)
        return "\n".join(parts).strip()
    return ""
