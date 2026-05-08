from typing import Any

from pydantic import AliasChoices, BaseModel, ConfigDict, Field


class EvidenceItem(BaseModel):
    model_config = ConfigDict(extra="ignore")

    knowledge_id: int | None = Field(default=None, validation_alias=AliasChoices("knowledge_id", "knowledgeId"))
    transition_id: int | None = Field(default=None, validation_alias=AliasChoices("transition_id", "transitionId"))
    to_node_code: str | None = Field(default=None, validation_alias=AliasChoices("to_node_code", "toNodeCode"))
    action_type: str | None = Field(default=None, validation_alias=AliasChoices("action_type", "actionType"))
    similarity: float | None = None
    cosine_distance: float | None = Field(default=None, validation_alias=AliasChoices("cosine_distance", "cosineDistance"))
    priority_rank: int | None = Field(default=None, validation_alias=AliasChoices("priority_rank", "priorityRank"))
    priority: int | None = None
    candidate_count: int | None = Field(
        default=None, validation_alias=AliasChoices("candidate_count", "candidateCount")
    )
    content: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class EsSignalInput(BaseModel):
    model_config = ConfigDict(extra="ignore")

    total_action_count: int | None = Field(
        default=None, validation_alias=AliasChoices("total_action_count", "totalActionCount")
    )
    fail_action_count: int | None = Field(default=None, validation_alias=AliasChoices("fail_action_count", "failActionCount"))
    node_fail_rate: float | None = Field(default=None, validation_alias=AliasChoices("node_fail_rate", "nodeFailRate"))
    hint_request_rate: float | None = Field(
        default=None, validation_alias=AliasChoices("hint_request_rate", "hintRequestRate")
    )
    top_wrong_inputs: list[str] = Field(
        default_factory=list, validation_alias=AliasChoices("top_wrong_inputs", "topWrongInputs")
    )


class HintGenerateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    session_id: str = Field(validation_alias=AliasChoices("session_id", "sessionId"))
    user_id: int = Field(validation_alias=AliasChoices("user_id", "userId"))
    chapter_code: str = Field(validation_alias=AliasChoices("chapter_code", "chapterCode"))
    from_node_code: str = Field(validation_alias=AliasChoices("from_node_code", "fromNodeCode"))
    action_type: str | None = Field(default=None, validation_alias=AliasChoices("action_type", "actionType"))
    user_message: str | None = Field(default=None, validation_alias=AliasChoices("user_message", "userMessage"))
    fail_count_after_action: int = Field(
        default=0, validation_alias=AliasChoices("fail_count_after_action", "failCountAfterAction")
    )
    repeat_count_after_action: int = Field(
        default=0, validation_alias=AliasChoices("repeat_count_after_action", "repeatCountAfterAction")
    )
    selected_phase: str | None = Field(default=None, validation_alias=AliasChoices("selected_phase", "selectedPhase"))
    low_confidence: bool = Field(default=False, validation_alias=AliasChoices("low_confidence", "lowConfidence"))
    query_text: str | None = Field(default=None, validation_alias=AliasChoices("query_text", "queryText"))
    evidences: list[EvidenceItem] = Field(default_factory=list)
    es_signal: EsSignalInput | None = Field(default=None, validation_alias=AliasChoices("es_signal", "esSignal"))


class HintGenerateResponse(BaseModel):
    hint_text: str
    hint_level: str
    model: str


class HintRetrieveRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    session_id: str = Field(validation_alias=AliasChoices("session_id", "sessionId"))
    chapter_id: str = Field(validation_alias=AliasChoices("chapter_id", "chapterId"))
    from_node_id: str = Field(validation_alias=AliasChoices("from_node_id", "fromNodeId"))
    action_type: str | None = Field(default=None, validation_alias=AliasChoices("action_type", "actionType"))
    current_input: str | None = Field(default=None, validation_alias=AliasChoices("current_input", "currentInput"))
    user_message: str | None = Field(default=None, validation_alias=AliasChoices("user_message", "userMessage"))
    fail_count_after_action: int = Field(
        default=0, validation_alias=AliasChoices("fail_count_after_action", "failCountAfterAction")
    )
    expected_action_type: str | None = Field(
        default=None, validation_alias=AliasChoices("expected_action_type", "expectedActionType")
    )
    recent_actions: list[dict[str, Any]] = Field(
        default_factory=list, validation_alias=AliasChoices("recent_actions", "recentActions")
    )
    extra_context: list[str] = Field(default_factory=list, validation_alias=AliasChoices("extra_context", "extraContext"))
    es_signal: dict[str, Any] | None = Field(default=None, validation_alias=AliasChoices("es_signal", "esSignal"))
    search_top_k: int | None = Field(default=None, validation_alias=AliasChoices("search_top_k", "searchTopK"))
    evidence_limit: int | None = Field(default=None, validation_alias=AliasChoices("evidence_limit", "evidenceLimit"))
    min_similarity: float | None = Field(default=None, validation_alias=AliasChoices("min_similarity", "minSimilarity"))
    output_dimensionality: int | None = Field(
        default=None, validation_alias=AliasChoices("output_dimensionality", "outputDimensionality")
    )


class HintRetrieveResponse(BaseModel):
    message_type: str
    route_decision: str
    selected_phase: str
    low_confidence: bool
    query_vector_dimension: int
    query_text: str
    candidate_count: int
    repeat_count_after_action: int
    stress_score: int
    hint_level: str
    evidences: list[EvidenceItem]
