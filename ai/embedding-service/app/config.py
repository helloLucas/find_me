from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=False)

    service_name: str = Field(default="lucas-embedding-service", alias="SERVICE_NAME")
    app_env: str = Field(default="local", alias="APP_ENV")
    app_host: str = Field(default="0.0.0.0", alias="APP_HOST")
    app_port: int = Field(default=8101, alias="APP_PORT")

    gms_base_url: str = Field(default="https://gms.*****.io/gmsapi", alias="GMS_BASE_URL")
    gms_key: str = Field(default="", alias="GMS_KEY")
    gms_embedding_model: str = Field(default="gemini-embedding-001", alias="GMS_EMBEDDING_MODEL")
    gms_timeout_seconds: float = Field(default=20.0, alias="GMS_TIMEOUT_SECONDS")

    embed_max_batch_size: int = Field(default=32, alias="EMBED_MAX_BATCH_SIZE")
    embed_max_concurrency: int = Field(default=8, alias="EMBED_MAX_CONCURRENCY")


@lru_cache
def get_settings() -> Settings:
    return Settings()
