"""Tests to verify project setup and configuration."""
import pytest
from app.config import settings
from app.main import app


def test_settings_loaded():
    """Test that settings are loaded correctly."""
    assert settings.DATABASE_URL is not None
    assert settings.UPLOAD_DIR == "/data/uploads"
    assert settings.MAX_UPLOAD_SIZE == 50 * 1024 * 1024
    assert settings.LIBREOFFICE_PATH == "soffice"


def test_fastapi_app_created():
    """Test that FastAPI app is created with correct configuration."""
    assert app.title == "Meeting Minutes Backend"
    assert app.version == "1.0.0"
    assert app.description == "Automated meeting minutes document generation API"


def test_database_url_format():
    """Test that database URL has correct format for async operations."""
    assert "postgresql+asyncpg://" in settings.DATABASE_URL


@pytest.mark.asyncio
async def test_root_endpoint():
    """Test that root endpoint returns expected response."""
    from fastapi.testclient import TestClient
    
    client = TestClient(app)
    response = client.get("/")
    
    assert response.status_code == 200
    assert response.json() == {"message": "Meeting Minutes Backend API"}


@pytest.mark.asyncio
async def test_health_endpoint():
    """Test that health check endpoint returns expected response."""
    from fastapi.testclient import TestClient
    
    client = TestClient(app)
    response = client.get("/health")
    
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}
