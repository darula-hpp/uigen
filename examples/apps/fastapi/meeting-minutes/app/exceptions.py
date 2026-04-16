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
