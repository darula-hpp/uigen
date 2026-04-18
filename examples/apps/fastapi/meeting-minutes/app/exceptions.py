"""Custom exceptions for the Meeting Minutes Backend."""


class InvalidTemplateError(Exception):
    """Raised when a template is invalid or contains no Jinja2 variables."""
    pass


class RenderError(Exception):
    """Raised when template rendering fails."""
    pass


class ConversionError(Exception):
    """Raised when PDF conversion fails."""
    pass


class MergeError(Exception):
    """Raised when PDF merging fails."""
    pass


class AuthenticationError(Exception):
    """Raised when authentication fails."""
    pass


class TokenExpiredError(AuthenticationError):
    """Raised when a JWT token has expired."""
    pass


class InvalidTokenError(AuthenticationError):
    """Raised when a JWT token is invalid or malformed."""
    pass
