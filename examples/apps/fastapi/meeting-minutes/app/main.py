"""FastAPI application entry point."""
from pathlib import Path
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
from app.database import engine
from app.config import get_settings
from app.routers import templates, meetings, documents
from app.exceptions import InvalidTemplateError, RenderError, ConversionError, MergeError


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manage application lifespan.
    
    Handles startup and shutdown events.
    """
    # Startup: create upload directories
    settings = get_settings()
    upload_dir = Path(settings.UPLOAD_DIR)
    (upload_dir / "templates").mkdir(parents=True, exist_ok=True)
    (upload_dir / "meetings").mkdir(parents=True, exist_ok=True)
    (upload_dir / "documents").mkdir(parents=True, exist_ok=True)
    
    # Wait for database connection
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


# Exception Handlers

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions with consistent error format."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code
        }
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle Pydantic validation errors."""
    errors = []
    for error in exc.errors():
        errors.append({
            "field": ".".join(str(loc) for loc in error["loc"]),
            "message": error["msg"],
            "type": error["type"]
        })
    
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "error": "Validation failed",
            "status_code": 400,
            "details": errors
        }
    )


@app.exception_handler(InvalidTemplateError)
async def invalid_template_exception_handler(request: Request, exc: InvalidTemplateError):
    """Handle invalid template errors."""
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "error": str(exc),
            "status_code": 400
        }
    )


@app.exception_handler(RenderError)
async def render_exception_handler(request: Request, exc: RenderError):
    """Handle template rendering errors."""
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": f"Template rendering failed: {str(exc)}",
            "status_code": 500
        }
    )


@app.exception_handler(ConversionError)
async def conversion_exception_handler(request: Request, exc: ConversionError):
    """Handle PDF conversion errors."""
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": f"PDF conversion failed: {str(exc)}",
            "status_code": 500
        }
    )


@app.exception_handler(MergeError)
async def merge_exception_handler(request: Request, exc: MergeError):
    """Handle PDF merge errors."""
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": f"PDF merge failed: {str(exc)}",
            "status_code": 500
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected errors."""
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal server error",
            "status_code": 500,
            "details": str(exc)
        }
    )


# Include Routers
app.include_router(templates.router)
app.include_router(meetings.router)
app.include_router(documents.router)


# Root Endpoints

@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "Meeting Minutes Backend API"}


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}
