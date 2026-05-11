"""Application configuration using pydantic-settings."""
from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import ConfigDict, model_validator

_ENV_FILE = Path(__file__).parent.parent / ".env"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    model_config = ConfigDict(env_file=str(_ENV_FILE), case_sensitive=True, extra="ignore")
    
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/meeting_minutes"
    UPLOAD_DIR: str = "/data/uploads"
    MAX_UPLOAD_SIZE: int = 50 * 1024 * 1024  # 50MB
    LIBREOFFICE_PATH: str = "soffice"

    # Authentication
    JWT_SECRET: str = ""
    JWT_EXPIRATION_HOURS: int = 24
    BCRYPT_ROUNDS: int = 12

    # OAuth Configuration
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/oauth/google/callback"
    
    # SPA Configuration
    SPA_URL: str = "http://localhost:4400"  # UIGen dev server URL

    @model_validator(mode="after")
    def validate_jwt_secret(self) -> "Settings":
        if not self.JWT_SECRET:
            raise ValueError("JWT_SECRET must not be empty")
        return self
    
    @model_validator(mode="after")
    def validate_oauth_settings(self) -> "Settings":
        if not self.GOOGLE_CLIENT_ID:
            raise ValueError("GOOGLE_CLIENT_ID must not be empty")
        if not self.GOOGLE_CLIENT_SECRET:
            raise ValueError("GOOGLE_CLIENT_SECRET must not be empty")
        return self


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Create a global settings instance for convenience
settings = get_settings()
