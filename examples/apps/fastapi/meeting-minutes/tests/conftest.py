"""Pytest configuration and shared fixtures."""
import pytest
import pytest_asyncio
import asyncio
from pathlib import Path
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import JSON, event
from sqlalchemy.dialects.postgresql import JSONB
from app.models import Base
from app.config import get_settings


# Get settings
settings = get_settings()


@pytest.fixture(scope="session")
def event_loop():
    """Create an event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def test_engine():
    """Create a test database engine using SQLite for testing."""
    # Use SQLite for testing (in-memory)
    test_db_url = "sqlite+aiosqlite:///:memory:"
    
    engine = create_async_engine(
        test_db_url,
        echo=False,
        pool_pre_ping=True
    )
    
    # Replace JSONB with JSON for SQLite compatibility
    @event.listens_for(Base.metadata, "before_create")
    def _set_json_type(target, connection, **kw):
        """Replace JSONB with JSON for SQLite."""
        for table in target.tables.values():
            for column in table.columns:
                if isinstance(column.type, JSONB):
                    column.type = JSON()
    
    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    # Drop all tables after tests
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create a test database session."""
    async_session_maker = async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False
    )
    
    async with async_session_maker() as session:
        yield session
        await session.rollback()


@pytest.fixture
def temp_storage(tmp_path) -> Path:
    """Create a temporary storage directory for test files."""
    storage_path = tmp_path / "uploads"
    storage_path.mkdir(parents=True, exist_ok=True)
    
    # Create subdirectories
    (storage_path / "templates").mkdir(exist_ok=True)
    (storage_path / "meetings").mkdir(exist_ok=True)
    (storage_path / "documents").mkdir(exist_ok=True)
    
    return storage_path
