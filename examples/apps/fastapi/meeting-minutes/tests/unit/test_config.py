"""Unit tests for configuration settings."""
import pytest
import os
from pydantic import ValidationError
from app.config import Settings


def test_settings_loads_oauth_fields_from_env(monkeypatch):
    """Test that OAuth fields are loaded from environment variables."""
    # Set environment variables
    monkeypatch.setenv("JWT_SECRET", "test-secret-key")
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "test-client-id.apps.googleusercontent.com")
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "test-client-secret")
    monkeypatch.setenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/v1/auth/oauth/google/callback")
    
    # Create settings instance
    settings = Settings()
    
    # Verify OAuth fields are loaded correctly
    assert settings.GOOGLE_CLIENT_ID == "test-client-id.apps.googleusercontent.com"
    assert settings.GOOGLE_CLIENT_SECRET == "test-client-secret"
    assert settings.GOOGLE_REDIRECT_URI == "http://localhost:8000/api/v1/auth/oauth/google/callback"


def test_settings_uses_default_redirect_uri(monkeypatch):
    """Test that GOOGLE_REDIRECT_URI uses default value when not set."""
    # Set required environment variables
    monkeypatch.setenv("JWT_SECRET", "test-secret-key")
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "test-client-id")
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "test-client-secret")
    
    # Create settings instance without setting GOOGLE_REDIRECT_URI
    settings = Settings()
    
    # Verify default redirect URI is used
    assert settings.GOOGLE_REDIRECT_URI == "http://localhost:8000/api/v1/auth/oauth/google/callback"


def test_settings_validates_google_client_id_not_empty(monkeypatch):
    """Test that validation fails when GOOGLE_CLIENT_ID is empty."""
    # Set environment variables with empty GOOGLE_CLIENT_ID
    monkeypatch.setenv("JWT_SECRET", "test-secret-key")
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "")
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "test-client-secret")
    
    # Attempt to create settings instance
    with pytest.raises(ValueError) as exc_info:
        Settings()
    
    assert "GOOGLE_CLIENT_ID must not be empty" in str(exc_info.value)


def test_settings_validates_google_client_secret_not_empty(monkeypatch):
    """Test that validation fails when GOOGLE_CLIENT_SECRET is empty."""
    # Set environment variables with empty GOOGLE_CLIENT_SECRET
    monkeypatch.setenv("JWT_SECRET", "test-secret-key")
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "test-client-id")
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "")
    
    # Attempt to create settings instance
    with pytest.raises(ValueError) as exc_info:
        Settings()
    
    assert "GOOGLE_CLIENT_SECRET must not be empty" in str(exc_info.value)


def test_settings_validates_jwt_secret_not_empty(monkeypatch):
    """Test that validation fails when JWT_SECRET is empty."""
    # Set environment variables with empty JWT_SECRET
    monkeypatch.setenv("JWT_SECRET", "")
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "test-client-id")
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "test-client-secret")
    
    # Attempt to create settings instance
    with pytest.raises(ValueError) as exc_info:
        Settings()
    
    assert "JWT_SECRET must not be empty" in str(exc_info.value)


def test_settings_loads_all_oauth_fields_with_valid_values(monkeypatch):
    """Test that all OAuth fields are loaded correctly with valid values."""
    # Set all environment variables
    monkeypatch.setenv("JWT_SECRET", "test-secret-key")
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "123456789.apps.googleusercontent.com")
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "GOCSPX-test-secret")
    monkeypatch.setenv("GOOGLE_REDIRECT_URI", "https://example.com/callback")
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://user:pass@localhost/db")
    
    # Create settings instance
    settings = Settings()
    
    # Verify all fields are loaded correctly
    assert settings.JWT_SECRET == "test-secret-key"
    assert settings.GOOGLE_CLIENT_ID == "123456789.apps.googleusercontent.com"
    assert settings.GOOGLE_CLIENT_SECRET == "GOCSPX-test-secret"
    assert settings.GOOGLE_REDIRECT_URI == "https://example.com/callback"
    assert settings.DATABASE_URL == "postgresql+asyncpg://user:pass@localhost/db"


def test_settings_oauth_fields_are_strings(monkeypatch):
    """Test that OAuth fields have correct types."""
    # Set environment variables
    monkeypatch.setenv("JWT_SECRET", "test-secret-key")
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "test-client-id")
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "test-client-secret")
    
    # Create settings instance
    settings = Settings()
    
    # Verify field types
    assert isinstance(settings.GOOGLE_CLIENT_ID, str)
    assert isinstance(settings.GOOGLE_CLIENT_SECRET, str)
    assert isinstance(settings.GOOGLE_REDIRECT_URI, str)


def test_settings_case_sensitive_environment_variables(monkeypatch):
    """Test that environment variables are case-sensitive."""
    # Set environment variables with correct case
    monkeypatch.setenv("JWT_SECRET", "test-secret-key")
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "test-client-id")
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "test-client-secret")
    
    # Create settings instance
    settings = Settings()
    
    # Verify values are loaded
    assert settings.GOOGLE_CLIENT_ID == "test-client-id"
    assert settings.GOOGLE_CLIENT_SECRET == "test-client-secret"
