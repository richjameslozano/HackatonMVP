from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    lark_verification_token: str = "5QUyXj2SETuDUQtr7pJaLcwiPua7bSmP"
    cors_origins: str = "http://localhost:5173"
    max_connections: int = 50

    # Cache configuration
    cache_ttl_seconds: int = 300
    cache_max_records_per_table: int = 10_000

    # Write queue configuration
    batch_flush_interval_seconds: int = 10
    write_queue_max_size: int = 1000
    max_flush_retries: int = 3
    batch_size_limit: int = 500

    # Lark API credentials (moved from frontend)
    lark_app_id: str = ""
    lark_app_secret: str = ""
    lark_base_app_token: str = ""
    lark_base_url: str = "https://open.larksuite.com/open-apis"

    # Table configuration
    configured_tables: str = ""  # comma-separated table_ids

    # Frontend auth
    api_shared_secret: str = ""

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
    }

    @field_validator("cache_ttl_seconds", "batch_flush_interval_seconds")
    @classmethod
    def validate_time_range(cls, v: int) -> int:
        if v < 1 or v > 86400:
            raise ValueError("Value must be between 1 and 86400 seconds")
        return v

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS_ORIGINS comma-separated string into a list."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def configured_tables_list(self) -> list[str]:
        """Parse configured_tables comma-separated string into a list."""
        return [t.strip() for t in self.configured_tables.split(",") if t.strip()]


settings = Settings()
