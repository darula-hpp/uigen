"""FastAPI dependencies for the Meeting Minutes Backend."""
from app.dependencies.auth import get_current_user, optional_user

__all__ = ["get_current_user", "optional_user"]
