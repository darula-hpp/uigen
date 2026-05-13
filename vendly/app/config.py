"""
Configuration management for Vendly platform.
Loads settings from environment variables with validation.
"""
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, PostgresDsn, field_validator


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    app_name: str = "Vendly Platform"
    app_version: str = "1.0.0"
    debug: bool = False
    environment: str = Field(default="development", pattern="^(development|testing|production)$")
    
    # Database
    database_url: PostgresDsn = Field(
        default="postgresql+asyncpg://vendly:vendly@localhost:5432/vendly",
        description="PostgreSQL database connection URL"
    )
    
    # JWT Authentication
    jwt_secret_key: str = Field(
        ...,
        min_length=32,
        description="Secret key for JWT token signing (min 32 characters)"
    )
    jwt_algorithm: str = "HS256"
    jwt_expiration_minutes: int = Field(default=60, gt=0)
    
    # Stripe Payment
    stripe_api_key: str = Field(..., description="Stripe API secret key")
    stripe_webhook_secret: str = Field(..., description="Stripe webhook signing secret")
    
    # Background Jobs
    enable_background_jobs: bool = True
    monthly_payout_day: int = Field(default=1, ge=1, le=28)
    monthly_payout_hour: int = Field(default=0, ge=0, le=23)
    
    # API Configuration
    api_v1_prefix: str = "/api/v1"
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000", "http://localhost:8000"])
    
    # Logging
    log_level: str = Field(default="INFO", pattern="^(DEBUG|INFO|WARNING|ERROR|CRITICAL)$")
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )
    
    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        """Parse CORS origins from string or list."""
        if isinstance(v, str):
            # Handle JSON array format
            if v.startswith("["):
                import json
                try:
                    return json.loads(v)
                except json.JSONDecodeError:
                    pass
            # Handle comma-separated format
            return [origin.strip() for origin in v.split(",")]
        return v
    
    @field_validator("database_url")
    @classmethod
    def validate_database_url(cls, v: PostgresDsn) -> str:
        """Convert PostgresDsn to string for SQLAlchemy."""
        return str(v)


# Global settings instance
settings = Settings()
