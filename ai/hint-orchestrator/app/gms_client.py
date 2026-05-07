from __future__ import annotations

from pathlib import Path
from typing import Any

import httpx

from app.config import Settings

_PROMPT_PATH = Path(__file__).resolve().parent / "prompts" / "lucas_developer_prompt.txt"
_FALLBACK_DEVELOPER_PROMPT = "You must answer in Korean and output exactly one JSON object."


class GmsLlmClient:
    """
    Hybrid client:
    - LLM path: OpenAI or Gemini by provider
    - Router path: OpenAI or Gemini by provider
    - Embedding path: Gemini
    """

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._http = httpx.AsyncClient(timeout=httpx.Timeout(settings.gms_timeout_seconds))
        self._developer_prompt = self._load_developer_prompt()

    async def close(self) -> None:
        await self._http.aclose()

    async def generate_text(self, prompt: str, *, model_name: str | None = None) -> str:
        provider = _normalize_provider(self._settings.gms_llm_provider)
        selected_model = model_name or self._settings.gms_llm_model
        return await self._chat(
            provider=provider,
            model_name=selected_model,
            developer_prompt=self._developer_prompt,
            user_prompt=prompt,
            max_output_tokens=self._settings.gms_max_output_tokens,
            reasoning_effort=self._settings.gms_llm_reasoning_effort,
            force_json=True,
        )

    async def classify_message(
        self,
        user_message: str,
        *,
        chapter_code: str | None = None,
        from_node_code: str | None = None,
        action_type: str | None = None,
        fail_count_after_action: int = 0,
    ) -> str:
        developer_prompt = (
            "Route classifier. Output one JSON object only. "
            "Allowed labels: message_type=hint_question|lore_question|other. "
            "Rules: progress-solving question=>hint_question; lore/world/story question=>lore_question; "
            "small talk/abuse/unrelated/answer-only request=>other; ambiguous=>hint_question."
        )
        user_prompt = (
            f"c={chapter_code or '-'}\n"
            f"n={from_node_code or '-'}\n"
            f"a={action_type or '-'}\n"
            f"f={fail_count_after_action}\n"
            f"m={user_message}\n"
            'json={"message_type":"hint_question|lore_question|other","route_decision":"RAG_HINT|BLOCKED_NON_HINT"}'
        )

        provider = _normalize_provider(self._settings.gms_router_provider or self._settings.gms_llm_provider)
        return await self._chat(
            provider=provider,
            model_name=self._settings.gms_router_model,
            developer_prompt=developer_prompt,
            user_prompt=user_prompt,
            max_output_tokens=self._settings.gms_router_max_output_tokens,
            reasoning_effort=self._settings.gms_router_reasoning_effort,
            force_json=True,
        )

    async def _chat(
        self,
        *,
        provider: str,
        model_name: str,
        developer_prompt: str,
        user_prompt: str,
        max_output_tokens: int,
        reasoning_effort: str | None,
        force_json: bool,
    ) -> str:
        if provider == "gemini":
            return await self._chat_gemini(
                model_name=model_name,
                developer_prompt=developer_prompt,
                user_prompt=user_prompt,
                max_output_tokens=max_output_tokens,
                force_json=force_json,
            )

        return await self._chat_openai(
            model_name=model_name,
            developer_prompt=developer_prompt,
            user_prompt=user_prompt,
            max_output_tokens=max_output_tokens,
            reasoning_effort=reasoning_effort,
            force_json=force_json,
        )

    async def _chat_openai(
        self,
        *,
        model_name: str,
        developer_prompt: str,
        user_prompt: str,
        max_output_tokens: int,
        reasoning_effort: str | None,
        force_json: bool,
    ) -> str:
        payload: dict[str, Any] = {
            "model": model_name,
            "messages": [
                {"role": "developer", "content": developer_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "max_completion_tokens": max_output_tokens,
        }
        if force_json:
            payload["response_format"] = {"type": "json_object"}

        if self._is_gpt5_family(model_name):
            effort = _normalize_reasoning_effort(reasoning_effort)
            if effort:
                payload["reasoning_effort"] = effort
        else:
            payload["temperature"] = self._settings.gms_temperature

        base = self._settings.gms_base_url.rstrip("/")
        path = self._settings.gms_openai_chat_path.lstrip("/")
        url = f"{base}/{path}"

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
        return _extract_openai_chat_text(body)

    async def _chat_gemini(
        self,
        *,
        model_name: str,
        developer_prompt: str,
        user_prompt: str,
        max_output_tokens: int,
        force_json: bool,
    ) -> str:
        normalized_model = model_name.removeprefix("models/")
        base = self._settings.gms_base_url.rstrip("/")
        url = f"{base}/generativelanguage.googleapis.com/v1beta/models/{normalized_model}:generateContent"

        generation_config: dict[str, Any] = {
            "maxOutputTokens": max_output_tokens,
            "temperature": self._settings.gms_temperature,
        }
        if force_json:
            generation_config["responseMimeType"] = "application/json"

        payload: dict[str, Any] = {
            "systemInstruction": {"parts": [{"text": developer_prompt}]},
            "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
            "generationConfig": generation_config,
        }

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
        return _extract_gemini_text(body)

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


def _normalize_provider(raw: str | None) -> str:
    value = (raw or "").strip().lower()
    if value in {"gemini", "google"}:
        return "gemini"
    return "openai"


def _normalize_reasoning_effort(raw: str | None) -> str | None:
    value = (raw or "").strip().lower()
    if value in {"low", "medium", "high"}:
        return value
    return None


def _extract_openai_chat_text(body: dict[str, Any]) -> str:
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


def _extract_gemini_text(body: dict[str, Any]) -> str:
    candidates = body.get("candidates") or []
    if not candidates:
        return ""

    content = (candidates[0] or {}).get("content") or {}
    parts = content.get("parts") or []
    if not isinstance(parts, list):
        return ""

    text_parts: list[str] = []
    for part in parts:
        if not isinstance(part, dict):
            continue
        text = part.get("text")
        if isinstance(text, str) and text.strip():
            text_parts.append(text)
    return "\n".join(text_parts).strip()
