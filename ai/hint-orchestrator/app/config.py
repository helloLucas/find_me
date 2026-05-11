from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=False)

    service_name: str = Field(default="lucas-hint-orchestrator", alias="SERVICE_NAME")
    app_env: str = Field(default="local", alias="APP_ENV")
    app_host: str = Field(default="0.0.0.0", alias="APP_HOST")
    app_port: int = Field(default=8201, alias="APP_PORT")

    gms_base_url: str = Field(default="https://gms.ssafy.io/gmsapi", alias="GMS_BASE_URL")
    gms_key: str = Field(default="", alias="GMS_KEY")
    gms_llm_provider: str = Field(default="openai", alias="GMS_LLM_PROVIDER")
    gms_router_provider: str = Field(default="openai", alias="GMS_ROUTER_PROVIDER")
    gms_llm_model: str = Field(default="gpt-5-mini", alias="GMS_LLM_MODEL")
    gms_light_llm_model: str = Field(default="gpt-5-mini", alias="GMS_LIGHT_LLM_MODEL")
    gms_command_usage_llm_model: str = Field(
        default="gpt-5-mini", alias="GMS_COMMAND_USAGE_LLM_MODEL"
    )
    gms_router_model: str = Field(default="gpt-5-mini", alias="GMS_ROUTER_MODEL")
    gms_openai_chat_path: str = Field(
        default="api.openai.com/v1/chat/completions", alias="GMS_OPENAI_CHAT_PATH"
    )
    gms_timeout_seconds: float = Field(default=30.0, alias="GMS_TIMEOUT_SECONDS")
    gms_max_output_tokens: int = Field(default=2048, alias="GMS_MAX_OUTPUT_TOKENS")
    gms_router_max_output_tokens: int = Field(default=96, alias="GMS_ROUTER_MAX_OUTPUT_TOKENS")
    gms_temperature: float = Field(default=0.2, alias="GMS_TEMPERATURE")
    gms_router_reasoning_effort: str = Field(default="low", alias="GMS_ROUTER_REASONING_EFFORT")
    gms_llm_reasoning_effort: str = Field(default="low", alias="GMS_LLM_REASONING_EFFORT")
    gms_embedding_model: str = Field(default="gemini-embedding-001", alias="GMS_EMBEDDING_MODEL")
    gms_embedding_output_dimensionality: int = Field(default=1536, alias="GMS_EMBEDDING_OUTPUT_DIMENSIONALITY")

    pg_host: str = Field(default="localhost", alias="PG_HOST")
    pg_port: int = Field(default=5432, alias="PG_PORT")
    pg_db: str = Field(default="lucas_db", alias="PG_DB")
    pg_user: str = Field(default="lucas_admin", alias="PG_USER")
    pg_password: str = Field(default="", alias="PG_PASSWORD")

    redis_host: str = Field(alias="REDIS_HOST")
    redis_port: int = Field(alias="REDIS_PORT")
    redis_password: str = Field(alias="REDIS_PASSWORD")

    retrieve_default_search_top_k: int = Field(alias="RETRIEVE_DEFAULT_SEARCH_TOP_K")
    retrieve_default_evidence_limit: int = Field(alias="RETRIEVE_DEFAULT_EVIDENCE_LIMIT")
    retrieve_default_min_similarity: float = Field(alias="RETRIEVE_DEFAULT_MIN_SIMILARITY")
    retrieve_evidence_limit_light: int = Field(default=2, alias="RETRIEVE_EVIDENCE_LIMIT_LIGHT")
    retrieve_evidence_limit_medium: int = Field(default=2, alias="RETRIEVE_EVIDENCE_LIMIT_MEDIUM")
    retrieve_evidence_limit_strong: int = Field(default=3, alias="RETRIEVE_EVIDENCE_LIMIT_STRONG")

    hint_stress_fail_weight: int = Field(alias="HINT_STRESS_FAIL_WEIGHT")
    hint_stress_repeat_weight: int = Field(alias="HINT_STRESS_REPEAT_WEIGHT")
    hint_level_medium_stress_threshold: int = Field(alias="HINT_LEVEL_MEDIUM_STRESS_THRESHOLD")
    hint_level_strong_stress_threshold: int = Field(alias="HINT_LEVEL_STRONG_STRESS_THRESHOLD")
    hint_repeat_similarity_threshold: float = Field(alias="HINT_REPEAT_SIMILARITY_THRESHOLD")
    hint_repeat_ttl_seconds: int = Field(alias="HINT_REPEAT_TTL_SECONDS")
    hint_repeat_sliding_ttl: bool = Field(default=True, alias="HINT_REPEAT_SLIDING_TTL")

    vector_source_filter: str = Field(default="story_transitions", alias="VECTOR_SOURCE_FILTER")
    vector_knowledge_kind_filter: str = Field(
        default="next_node_answer", alias="VECTOR_KNOWLEDGE_KIND_FILTER"
    )

    hint_user_message_max_length: int = Field(default=200, alias="HINT_USER_MESSAGE_MAX_LENGTH")

    hint_command_usage_routing_enabled: bool = Field(
        default=False, alias="HINT_COMMAND_USAGE_ROUTING_ENABLED"
    )
    hint_command_usage_embed_resolver_enabled: bool = Field(
        default=False, alias="HINT_COMMAND_USAGE_EMBED_RESOLVER_ENABLED"
    )
    hint_command_usage_candidate_top_k: int = Field(
        default=20, alias="HINT_COMMAND_USAGE_CANDIDATE_TOP_K"
    )
    hint_command_usage_high_confidence: float = Field(
        default=0.62, alias="HINT_COMMAND_USAGE_HIGH_CONFIDENCE"
    )
    hint_command_usage_medium_confidence: float = Field(
        default=0.48, alias="HINT_COMMAND_USAGE_MEDIUM_CONFIDENCE"
    )

    hint_runtime_pattern_rerank_enabled: bool = Field(
        default=True, alias="HINT_RUNTIME_PATTERN_RERANK_ENABLED"
    )
    hint_runtime_pattern_cache_size: int = Field(
        default=4000, alias="HINT_RUNTIME_PATTERN_CACHE_SIZE"
    )
    hint_runtime_pattern_cache_ttl_seconds: int = Field(
        default=86400, alias="HINT_RUNTIME_PATTERN_CACHE_TTL_SECONDS"
    )
    hint_status_file_bootstrap_enabled: bool = Field(
        default=False, alias="HINT_STATUS_FILE_BOOTSTRAP_ENABLED"
    )
    hint_status_file_bootstrap_nodes: str = Field(
        default="CH3_PORT_DISCOVERED,CH3_RELAY_EMPTY_RESPONSE,CH3_RELAY_STATUS_VIEW,CH3_PEOPLE_VIEWED,CH3_MONITOR_VIEWED",
        alias="HINT_STATUS_FILE_BOOTSTRAP_NODES",
    )
    hint_status_file_bootstrap_message: str = Field(
        default="터미널 말고 너의 컴퓨터 어딘가에 내가 파일을 전송했어. 일반적인 방식으로 전송할 수 없어서 꼼수를 써뒀으니 확인해봐.",
        alias="HINT_STATUS_FILE_BOOTSTRAP_MESSAGE",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
