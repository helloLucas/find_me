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
    gms_llm_model: str = Field(default="gpt-5-mini", alias="GMS_LLM_MODEL")
    gms_openai_chat_path: str = Field(
        default="api.openai.com/v1/chat/completions", alias="GMS_OPENAI_CHAT_PATH"
    )
    gms_timeout_seconds: float = Field(default=20.0, alias="GMS_TIMEOUT_SECONDS")
    gms_max_output_tokens: int = Field(default=1536, alias="GMS_MAX_OUTPUT_TOKENS")
    gms_temperature: float = Field(default=0.2, alias="GMS_TEMPERATURE")
    gms_embedding_model: str = Field(default="gemini-embedding-001", alias="GMS_EMBEDDING_MODEL")
    gms_embedding_output_dimensionality: int = Field(default=1536, alias="GMS_EMBEDDING_OUTPUT_DIMENSIONALITY")

    pg_host: str = Field(default="localhost", alias="PG_HOST")
    pg_port: int = Field(default=5432, alias="PG_PORT")
    pg_db: str = Field(default="lucas_db", alias="PG_DB")
    pg_user: str = Field(default="lucas_admin", alias="PG_USER")
    pg_password: str = Field(default="", alias="PG_PASSWORD")

    retrieve_default_search_top_k: int = Field(default=10, alias="RETRIEVE_DEFAULT_SEARCH_TOP_K")
    retrieve_default_evidence_limit: int = Field(default=3, alias="RETRIEVE_DEFAULT_EVIDENCE_LIMIT")
    retrieve_default_min_similarity: float = Field(default=0.70, alias="RETRIEVE_DEFAULT_MIN_SIMILARITY")

    hint_level_medium_fail_threshold: int = Field(default=3, alias="HINT_LEVEL_MEDIUM_FAIL_THRESHOLD")
    hint_level_strong_fail_threshold: int = Field(default=6, alias="HINT_LEVEL_STRONG_FAIL_THRESHOLD")

    vector_source_filter: str = Field(default="story_transitions", alias="VECTOR_SOURCE_FILTER")
    vector_knowledge_kind_filter: str = Field(
        default="next_node_answer", alias="VECTOR_KNOWLEDGE_KIND_FILTER"
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
