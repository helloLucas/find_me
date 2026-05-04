from __future__ import annotations

from typing import Any

import httpx

from app.config import Settings
from app.schemas import UpstreamEmbeddingResult


class GmsEmbeddingClient:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._http = httpx.AsyncClient(
            timeout=httpx.Timeout(settings.gms_timeout_seconds),
            headers={
                "Content-Type": "application/json",
                "x-goog-api-key": settings.gms_key,
            },
        )

    async def close(self) -> None:
        await self._http.aclose()

    async def embed_text(
        self,
        text: str,
        model: str,
        task_type: str | None = None,
        title: str | None = None,
        output_dimensionality: int | None = None,
    ) -> UpstreamEmbeddingResult:
        normalized_model = model.removeprefix("models/")
        url = (
            f"{self._settings.gms_base_url}/generativelanguage.googleapis.com/"
            f"v1beta/models/{normalized_model}:embedContent"
        )

        payload: dict[str, Any] = {
            "model": f"models/{normalized_model}",
            "content": {"parts": [{"text": text}]},
        }
        if task_type:
            payload["taskType"] = task_type
        if title:
            payload["title"] = title
        if output_dimensionality:
            payload["outputDimensionality"] = output_dimensionality

        response = await self._http.post(url, json=payload)
        response.raise_for_status()
        body = response.json()

        values = ((body.get("embedding") or {}).get("values")) or []
        if not values:
            raise ValueError(f"Empty embedding returned by GMS for model={normalized_model}")
        usage = body.get("usageMetadata") or {}

        return UpstreamEmbeddingResult(
            embedding=values,
            prompt_tokens=int(usage.get("promptTokenCount", 0) or 0),
            total_tokens=int(usage.get("totalTokenCount", 0) or 0),
            raw=body,
        )

    async def get_key_info(self) -> dict[str, Any]:
        url = f"{self._settings.gms_base_url}/key-info"
        response = await self._http.get(
            url,
            headers={
                "authorization": f"Bearer {self._settings.gms_key}",
                "Content-Type": "application/json",
            },
        )
        response.raise_for_status()
        return response.json()
