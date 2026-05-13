"""
Unit tests for AuthService.

Covers:
- Password hashing and verification
- JWT token generation (merchant ID in payload)
- JWT token expiration handling
- Invalid / malformed token rejection

Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
"""
import time
from datetime import timedelta

import pytest

from app.exceptions import AuthenticationError
from app.services.auth_service import AuthService

# A 32-character secret that satisfies the minimum length requirement.
_SECRET = "test-secret-key-that-is-long-enough"
_ALGORITHM = "HS256"


def _make_service(expiration_minutes: int = 60) -> AuthService:
    """Return an AuthService configured for testing."""
    return AuthService(
        secret_key=_SECRET,
        algorithm=_ALGORITHM,
        expiration_minutes=expiration_minutes,
    )


# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------


class TestHashPassword:
    """Tests for AuthService.hash_password."""

    def test_returns_non_empty_string(self):
        """Hashing a password produces a non-empty string."""
        service = _make_service()
        result = service.hash_password("mypassword")
        assert isinstance(result, str)
        assert len(result) > 0

    def test_hash_differs_from_plain_text(self):
        """The hash must not equal the original password."""
        service = _make_service()
        password = "plaintext123"
        assert service.hash_password(password) != password

    def test_same_password_produces_different_hashes(self):
        """bcrypt uses a random salt, so two hashes of the same password differ."""
        service = _make_service()
        password = "samepassword"
        hash1 = service.hash_password(password)
        hash2 = service.hash_password(password)
        assert hash1 != hash2

    def test_hash_starts_with_bcrypt_prefix(self):
        """bcrypt hashes always start with the $2b$ prefix."""
        service = _make_service()
        result = service.hash_password("anypassword")
        assert result.startswith("$2b$") or result.startswith("$2a$")


# ---------------------------------------------------------------------------
# Password verification
# ---------------------------------------------------------------------------


class TestVerifyPassword:
    """Tests for AuthService.verify_password."""

    def test_correct_password_returns_true(self):
        """verify_password returns True when the password matches the hash."""
        service = _make_service()
        password = "correct_password"
        hashed = service.hash_password(password)
        assert service.verify_password(password, hashed) is True

    def test_wrong_password_returns_false(self):
        """verify_password returns False when the password does not match."""
        service = _make_service()
        hashed = service.hash_password("correct_password")
        assert service.verify_password("wrong_password", hashed) is False

    def test_empty_password_against_hash_returns_false(self):
        """An empty string does not match a hash of a non-empty password."""
        service = _make_service()
        hashed = service.hash_password("nonempty")
        assert service.verify_password("", hashed) is False

    def test_garbage_hash_returns_false(self):
        """A malformed hash string does not raise; it returns False."""
        service = _make_service()
        assert service.verify_password("password", "not-a-valid-hash") is False

    def test_hash_and_verify_roundtrip(self):
        """hash_password followed by verify_password is a consistent roundtrip."""
        service = _make_service()
        passwords = ["short", "a" * 72, "unicode_\u00e9_password", "P@ssw0rd!"]
        for pwd in passwords:
            hashed = service.hash_password(pwd)
            assert service.verify_password(pwd, hashed) is True, (
                f"Roundtrip failed for password: {pwd!r}"
            )


# ---------------------------------------------------------------------------
# Token generation
# ---------------------------------------------------------------------------


class TestCreateToken:
    """Tests for AuthService.create_token."""

    def test_returns_non_empty_string(self):
        """create_token returns a non-empty string."""
        service = _make_service()
        token = service.create_token(merchant_id=42)
        assert isinstance(token, str)
        assert len(token) > 0

    def test_token_contains_merchant_id_in_payload(self):
        """The decoded token payload contains the correct merchant ID."""
        import jwt as pyjwt

        service = _make_service()
        merchant_id = 99
        token = service.create_token(merchant_id=merchant_id)
        payload = pyjwt.decode(token, _SECRET, algorithms=[_ALGORITHM])
        assert payload["sub"] == str(merchant_id)

    def test_different_merchant_ids_produce_different_tokens(self):
        """Tokens for different merchant IDs are distinct."""
        service = _make_service()
        token_a = service.create_token(merchant_id=1)
        token_b = service.create_token(merchant_id=2)
        assert token_a != token_b

    def test_token_has_expiration_claim(self):
        """The token payload includes an 'exp' claim."""
        import jwt as pyjwt

        service = _make_service(expiration_minutes=30)
        token = service.create_token(merchant_id=1)
        payload = pyjwt.decode(token, _SECRET, algorithms=[_ALGORITHM])
        assert "exp" in payload

    def test_token_has_issued_at_claim(self):
        """The token payload includes an 'iat' claim."""
        import jwt as pyjwt

        service = _make_service()
        token = service.create_token(merchant_id=1)
        payload = pyjwt.decode(token, _SECRET, algorithms=[_ALGORITHM])
        assert "iat" in payload


# ---------------------------------------------------------------------------
# Token validation
# ---------------------------------------------------------------------------


class TestValidateToken:
    """Tests for AuthService.validate_token."""

    def test_valid_token_returns_merchant_id(self):
        """validate_token returns the correct integer merchant ID."""
        service = _make_service()
        merchant_id = 7
        token = service.create_token(merchant_id=merchant_id)
        assert service.validate_token(token) == merchant_id

    def test_roundtrip_preserves_merchant_id(self):
        """create_token -> validate_token recovers the exact same merchant ID."""
        service = _make_service()
        for mid in [1, 100, 99999]:
            token = service.create_token(merchant_id=mid)
            assert service.validate_token(token) == mid

    def test_expired_token_raises_authentication_error(self):
        """An expired token raises AuthenticationError."""
        # Use a negative expiration so the token is immediately expired.
        service = _make_service(expiration_minutes=-1)
        token = service.create_token(merchant_id=5)
        with pytest.raises(AuthenticationError) as exc_info:
            service.validate_token(token)
        assert exc_info.value.error_code == "AUTHENTICATION_ERROR"

    def test_expired_token_error_details_contain_reason(self):
        """The AuthenticationError for an expired token includes 'expired' in details."""
        service = _make_service(expiration_minutes=-1)
        token = service.create_token(merchant_id=5)
        with pytest.raises(AuthenticationError) as exc_info:
            service.validate_token(token)
        assert exc_info.value.details.get("reason") == "expired"

    def test_invalid_token_raises_authentication_error(self):
        """A completely invalid token string raises AuthenticationError."""
        service = _make_service()
        with pytest.raises(AuthenticationError) as exc_info:
            service.validate_token("this.is.not.a.jwt")
        assert exc_info.value.error_code == "AUTHENTICATION_ERROR"

    def test_tampered_token_raises_authentication_error(self):
        """A token with a modified signature raises AuthenticationError."""
        service = _make_service()
        token = service.create_token(merchant_id=3)
        # Flip the last character to corrupt the signature.
        tampered = token[:-1] + ("A" if token[-1] != "A" else "B")
        with pytest.raises(AuthenticationError):
            service.validate_token(tampered)

    def test_token_signed_with_different_secret_rejected(self):
        """A token signed with a different secret is rejected."""
        service_a = _make_service()
        service_b = AuthService(
            secret_key="completely-different-secret-key-32chars",
            algorithm=_ALGORITHM,
            expiration_minutes=60,
        )
        token = service_a.create_token(merchant_id=10)
        with pytest.raises(AuthenticationError):
            service_b.validate_token(token)

    def test_empty_string_raises_authentication_error(self):
        """An empty string raises AuthenticationError."""
        service = _make_service()
        with pytest.raises(AuthenticationError):
            service.validate_token("")

    def test_none_like_garbage_raises_authentication_error(self):
        """A random garbage string raises AuthenticationError."""
        service = _make_service()
        with pytest.raises(AuthenticationError):
            service.validate_token("aaaa.bbbb.cccc")


# ---------------------------------------------------------------------------
# authenticate_merchant (high-level)
# ---------------------------------------------------------------------------


class TestAuthenticateMerchant:
    """Tests for AuthService.authenticate_merchant."""

    @pytest.mark.asyncio
    async def test_valid_credentials_return_token(self):
        """Correct credentials produce a non-empty JWT token."""
        service = _make_service()
        password = "secure_password"
        hashed = service.hash_password(password)
        token = await service.authenticate_merchant(
            stored_password_hash=hashed,
            provided_password=password,
            merchant_id=1,
        )
        assert isinstance(token, str)
        assert len(token) > 0

    @pytest.mark.asyncio
    async def test_returned_token_contains_merchant_id(self):
        """The token returned by authenticate_merchant encodes the merchant ID."""
        service = _make_service()
        password = "secure_password"
        hashed = service.hash_password(password)
        merchant_id = 42
        token = await service.authenticate_merchant(
            stored_password_hash=hashed,
            provided_password=password,
            merchant_id=merchant_id,
        )
        assert service.validate_token(token) == merchant_id

    @pytest.mark.asyncio
    async def test_wrong_password_raises_authentication_error(self):
        """Wrong password raises AuthenticationError."""
        service = _make_service()
        hashed = service.hash_password("correct_password")
        with pytest.raises(AuthenticationError):
            await service.authenticate_merchant(
                stored_password_hash=hashed,
                provided_password="wrong_password",
                merchant_id=1,
            )

    @pytest.mark.asyncio
    async def test_wrong_password_does_not_return_token(self):
        """No token is returned when authentication fails."""
        service = _make_service()
        hashed = service.hash_password("correct_password")
        result = None
        try:
            result = await service.authenticate_merchant(
                stored_password_hash=hashed,
                provided_password="wrong_password",
                merchant_id=1,
            )
        except AuthenticationError:
            pass
        assert result is None
