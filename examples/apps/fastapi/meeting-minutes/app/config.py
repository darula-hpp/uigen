"""Application configuration using pydantic-settings."""
from pydantic_settings import BaseSettings
from pydantic import ConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    model_config = ConfigDict(env_file=".env", case_sensitive=True, extra="ignore")
    
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/meeting_minutes"
    UPLOAD_DIR: str = "/data/uploads"
    MAX_UPLOAD_SIZE: int = 50 * 1024 * 1024  # 50MB
    LIBREOFFICE_PATH: str = "soffice"


settings = Settings()
