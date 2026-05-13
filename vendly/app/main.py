"""
Main FastAPI application entry point.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import init_db
from app.error_handlers import register_exception_handlers
import logging

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events.
    """
    # Startup
    logger.info("Starting Vendly Platform...")
    await init_db()
    logger.info("Database initialized")
    
    # TODO: Initialize background jobs when implemented
    # if settings.enable_background_jobs:
    #     await start_background_jobs()
    
    yield
    
    # Shutdown
    logger.info("Shutting down Vendly Platform...")


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    debug=settings.debug,
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register exception handlers
register_exception_handlers(app)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


# TODO: Include routers when implemented
# from app.routers import auth, merchants, transactions, products, commissions, webhooks
# app.include_router(auth.router, prefix=f"{settings.api_v1_prefix}/auth", tags=["auth"])
# app.include_router(merchants.router, prefix=f"{settings.api_v1_prefix}/merchants", tags=["merchants"])
# app.include_router(transactions.router, prefix=f"{settings.api_v1_prefix}/transactions", tags=["transactions"])
# app.include_router(products.router, prefix=f"{settings.api_v1_prefix}/products", tags=["products"])
# app.include_router(commissions.router, prefix=f"{settings.api_v1_prefix}/commissions", tags=["commissions"])
# app.include_router(webhooks.router, prefix=f"{settings.api_v1_prefix}/webhooks", tags=["webhooks"])
