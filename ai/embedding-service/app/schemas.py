from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator


class EmbeddingRequest(BaseModel):
    input: str | list[str] = Field(..., description="A single text or a list of texts to embed.")
    model: str | None = Field(default=None, description="Embedding model name. Defaults to gemini-embedding-001.")
    task_type: str | None = Field(
        default=None,
        description="Optional task type passed to Gemini API (for example RETRIEVAL_DOCUMENT).",
    )
    title: str | None = Field(default=None, description="Optional title when task_type is RETRIEVAL_DOCUMENT.")
    output_dimensionality: int | None = Field(
        default=None,
        ge=1,
        description="Optional reduced output dimensionality.",
    )

    @model_validator(mode="after")
    def validate_input(self) -> "EmbeddingRequest":
        texts = [self.input] if isinstance(self.input, str) else self.input
        if not texts:
            raise ValueError("input must contain at least one text")
        for idx, text in enumerate(texts):
            if not isinstance(text, str):
                raise ValueError(f"input[{idx}] must be a string")
            if not text.strip():
                raise ValueError(f"input[{idx}] must not be empty")
        return self


class SingleEmbedRequest(BaseModel):
    text: str = Field(..., min_length=1)
    model: str | None = None
    task_type: str | None = None
    title: str | None = None
    output_dimensionality: int | None = Field(default=None, ge=1)


class EmbeddingItem(BaseModel):
    object: str = "embedding"
    index: int
    embedding: list[float]


class UsageInfo(BaseModel):
    prompt_tokens: int = 0
    total_tokens: int = 0


class EmbeddingResponse(BaseModel):
    object: str = "list"
    model: str
    data: list[EmbeddingItem]
    usage: UsageInfo
    metadata: dict[str, Any] = Field(default_factory=dict)


class UpstreamEmbeddingResult(BaseModel):
    embedding: list[float]
    prompt_tokens: int = 0
    total_tokens: int = 0
    raw: dict[str, Any] = Field(default_factory=dict)


class HintDocumentInput(BaseModel):
    doc_id: str = Field(..., min_length=1)
    doc_type: Literal["node_guide", "transition_rule", "knowledge", "es_signal"] = "knowledge"
    chapter_id: str = Field(..., min_length=1)
    from_node_id: str | None = None
    action_type: str | None = None
    title: str | None = None
    expected_input_norm: str | None = None
    content: str = Field(..., min_length=1)
    tags: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class HintDocumentEmbedRequest(BaseModel):
    documents: list[HintDocumentInput]
    model: str | None = None
    output_dimensionality: int | None = Field(default=None, ge=1)

    @model_validator(mode="after")
    def validate_documents(self) -> "HintDocumentEmbedRequest":
        if not self.documents:
            raise ValueError("documents must contain at least one item")
        return self


class HintDocumentEmbeddingItem(BaseModel):
    doc_id: str
    doc_type: str
    chapter_id: str
    from_node_id: str | None = None
    action_type: str | None = None
    text: str
    embedding: list[float]
    metadata: dict[str, Any] = Field(default_factory=dict)


class HintDocumentEmbedResponse(BaseModel):
    model: str
    usage: UsageInfo
    items: list[HintDocumentEmbeddingItem]


class RecentActionInput(BaseModel):
    action_type: str = Field(..., min_length=1)
    input_value_norm: str | None = None
    result: Literal["SUCCESS", "FAIL"] | str
    from_node_id: str | None = None


class EsSignalInput(BaseModel):
    node_fail_rate: float | None = None
    node_avg_fail_count: float | None = None
    hint_request_rate: float | None = None
    repeated_wrong_inputs: list[str] = Field(default_factory=list)
    top_wrong_inputs: list[str] = Field(default_factory=list)
    success_path_actions: list[str] = Field(default_factory=list)


class HintQueryEmbedRequest(BaseModel):
    chapter_id: str = Field(..., min_length=1)
    from_node_id: str = Field(..., min_length=1)
    action_type: str | None = None
    current_input: str | None = None
    fail_count_after_action: int = 0
    expected_action_type: str | None = None
    expected_input_hint: str | None = None
    recent_actions: list[RecentActionInput] = Field(default_factory=list)
    es_signal: EsSignalInput | None = None
    extra_context: list[str] = Field(default_factory=list)
    model: str | None = None
    output_dimensionality: int | None = Field(default=None, ge=1)


class HintQueryEmbedResponse(BaseModel):
    model: str
    text: str
    embedding: list[float]
    usage: UsageInfo
