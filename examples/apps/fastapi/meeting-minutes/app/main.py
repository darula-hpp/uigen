"""FastAPI application entry point."""
from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.database import engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manage application lifespan.
    
    Handles startup and shutdown events.
    """
    # Startup: wait for database connection
    async with engine.begin() as conn:
        # Database tables are created via Alembic migrations
        pass
    
    yield
    
    # Shutdown: cleanup resources
    await engine.dispose()


app = FastAPI(
    title="Meeting Minutes Backend",
    description="Automated meeting minutes document generation API",
    version="1.0.0",
    lifespan=lifespan
)


@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "Meeting Minutes Backend API"}


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}
