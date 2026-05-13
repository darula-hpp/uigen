"""
Authentication service for Vendly platform.

Handles JWT token generation/validation and password hashing/verification.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt

from app.config import settings
from app.exceptions import AuthenticationError


class AuthService:
    """
    Service for merchant authentication operations.

    Responsibilities:
    - JWT token generation and validation
    - Password hashing and verification
    - Token expiration management
    """

    def __init__(
        self,
        secret_key: Optional[str] = None,
        algorithm: Optional[str] = None,
        expiration_minutes: Optional[int] = None,
    ):
        """
        Initialize the authentication service.

        Args:
            secret_key: JWT signing secret. Defaults to settings.jwt_secret_key.
            algorithm: JWT algorithm. Defaults to settings.jwt_algorithm.
            expiration_minutes: Token TTL in minutes. Defaults to settings.jwt_expiration_minutes.
        """
        self._secret_key = secret_key or settings.jwt_secret_key
        self._algorithm = algorithm or settings.jwt_algorithm
        self._expiration_minutes = (
            expiration_minutes
            if expiration_minutes is not None
            else settings.jwt_expiration_minutes
        )

    # ------------------------------------------------------------------
    # Password operations
    # ------------------------------------------------------------------

    def hash_password(self, password: str) -> str:
        """
        Hash a plain-text password using bcrypt (12 rounds).

        Args:
            password: Plain-text password.

        Returns:
            Bcrypt hash string.
        """
        password_bytes = password.encode("utf-8")
        salt = bcrypt.gensalt(rounds=12)
        hashed = bcrypt.hashpw(password_bytes, salt)
        return hashed.decode("utf-8")

    def verify_password(self, password: str, password_hash: str) -> bool:
        """
        Verify a plain-text password against a bcrypt hash.

        Args:
            password: Plain-text password to verify.
            password_hash: Stored bcrypt hash.

        Returns:
            True if the password matches, False otherwise.
        """
        try:
            return bcrypt.checkpw(
                password.encode("utf-8"),
                password_hash.encode("utf-8"),
            )
        except Exception:
            return False

    # ------------------------------------------------------------------
    # Token operations
    # ------------------------------------------------------------------

    def create_token(self, merchant_id: int) -> str:
        """
        Generate a signed JWT token for a merchant.

        The payload includes:
        - ``sub``: merchant identifier (as string)
        - ``iat``: issued-at timestamp
        - ``exp``: expiration timestamp

        Args:
            merchant_id: The merchant's unique identifier.

        Returns:
            Encoded JWT token string.
        """
        now = datetime.now(timezone.utc)
        payload = {
            "sub": str(merchant_id),
            "iat": now,
            "exp": now + timedelta(minutes=self._expiration_minutes),
        }
        return jwt.encode(payload, self._secret_key, algorithm=self._algorithm)

    def validate_token(self, token: str) -> int:
        """
        Validate a JWT token and return the merchant identifier.

        Args:
            token: JWT token string.

        Returns:
            Merchant ID extracted from the token payload.

        Raises:
            AuthenticationError: If the token is expired, invalid, or malformed.
        """
        try:
            payload = jwt.decode(
                token,
                self._secret_key,
                algorithms=[self._algorithm],
            )
            return int(payload["sub"])
        except jwt.ExpiredSignatureError:
            raise AuthenticationError(
                "Token has expired",
                details={"reason": "expired"},
            )
        except jwt.PyJWTError:
            raise AuthenticationError(
                "Invalid token",
                details={"reason": "invalid"},
            )

    # ------------------------------------------------------------------
    # High-level authentication
    # ------------------------------------------------------------------

    async def authenticate_merchant(
        self,
        stored_password_hash: str,
        provided_password: str,
        merchant_id: int,
    ) -> str:
        """
        Verify credentials and issue a JWT token.

        Args:
            stored_password_hash: The bcrypt hash stored for the merchant.
            provided_password: The plain-text password supplied by the merchant.
            merchant_id: The merchant's unique identifier.

        Returns:
            Signed JWT token string.

        Raises:
            AuthenticationError: If the password does not match.
        """
        if not self.verify_password(provided_password, stored_password_hash):
            raise AuthenticationError("Invalid credentials")
        return self.create_token(merchant_id)
