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
        payload: dict[str, Any] = {
            "model": self._settings.gms_llm_model,
            "messages": [
                {"role": "developer", "content": self._developer_prompt},
                {"role": "user", "content": prompt},
            ],
            "max_completion_tokens": self._settings.gms_max_output_tokens,
            "response_format": {"type": "json_object"},
        }
        return await self._chat(payload, self._settings.gms_llm_model)

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
            "너는 게임 힌트 라우팅 분류기다. 반드시 JSON 객체 하나만 출력한다. "
            "허용 라벨: message_type=hint_question|lore_question|other, "
            "route_decision=RAG_HINT|BLOCKED_NON_HINT. "
            "규칙: 게임 진행/현재 단계 해결 요청이면 hint_question. "
            "세계관/설정/스토리 설명 요청이면 lore_question. "
            "욕설/잡담/무관 질문/정답만 달라는 요청은 other. "
            "애매하면 hint_question으로 분류한다."
        )
        context_lines = [
            f"chapter_code={chapter_code or '-'}",
            f"from_node_code={from_node_code or '-'}",
            f"action_type={action_type or '-'}",
            f"fail_count_after_action={fail_count_after_action}",
            f"user_message={user_message}",
            "출력 JSON 스키마:",
            '{"message_type":"hint_question|lore_question|other","route_decision":"RAG_HINT|BLOCKED_NON_HINT"}',
        ]
        user_prompt = "\n".join(context_lines)

        payload: dict[str, Any] = {
            "model": self._settings.gms_router_model,
            "messages": [
                {"role": "developer", "content": developer_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "max_completion_tokens": self._settings.gms_router_max_output_tokens,
            "response_format": {"type": "json_object"},
        }
        return await self._chat(payload, self._settings.gms_router_model)

    async def _chat(self, payload: dict[str, Any], model_name: str) -> str:
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
