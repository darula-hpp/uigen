"""
Property-based tests for JWT token merchant identity.

These tests use Hypothesis to verify universal properties across randomized inputs.

Feature: vendly, Property 4: JWT Token Merchant Identity
"""
import pytest
import jwt as pyjwt
from hypothesis import given, strategies as st, settings, assume

from app.services.auth_service import AuthService
from app.exceptions import AuthenticationError


# ------------------------------------------------------------------
# Strategies
# ------------------------------------------------------------------

# Merchant IDs are positive integers (database primary keys start at 1)
merchant_ids = st.integers(min_value=1, max_value=2_147_483_647)

# JWT secret keys: at least 32 printable ASCII characters
jwt_secrets = st.text(
    alphabet=st.characters(
        whitelist_categories=("Ll", "Lu", "Nd"),
        whitelist_characters="!@#$%^&*",
    ),
    min_size=32,
    max_size=128,
)

# Expiration durations in minutes (positive, reasonable range)
expiration_minutes = st.integers(min_value=1, max_value=10_080)  # 1 min to 1 week


# ------------------------------------------------------------------
# Property 4: JWT Token Merchant Identity
# **Validates: Requirements 2.4**
# ------------------------------------------------------------------


class TestJWTTokenMerchantIdentity:
    """
    Property 4: JWT Token Merchant Identity
    **Validates: Requirements 2.4**

    For any valid merchant authentication, the issued JWT token SHALL contain
    the merchant identifier in its payload, and decoding the token SHALL recover
    the exact same merchant identifier.
    """

    @pytest.mark.property
    @settings(max_examples=100)
    @given(merchant_id=merchant_ids, secret=jwt_secrets, expiry=expiration_minutes)
    def test_token_encodes_and_recovers_exact_merchant_id(
        self, merchant_id: int, secret: str, expiry: int
    ):
        """
        For any merchant_id, generating a token and then validating it
        SHALL return the exact same merchant_id.

        **Validates: Requirements 2.4**
        """
        service = AuthService(secret_key=secret, expiration_minutes=expiry)

        token = service.create_token(merchant_id)
        recovered_id = service.validate_token(token)

        assert recovered_id == merchant_id, (
            f"Expected merchant_id {merchant_id} but recovered {recovered_id}"
        )

    @pytest.mark.property
    @settings(max_examples=100)
    @given(merchant_id=merchant_ids, secret=jwt_secrets)
    def test_token_payload_contains_sub_claim(
        self, merchant_id: int, secret: str
    ):
        """
        The JWT payload SHALL explicitly contain a 'sub' claim equal to the
        string representation of the merchant identifier.

        **Validates: Requirements 2.4**
        """
        service = AuthService(secret_key=secret)

        token = service.create_token(merchant_id)

        # Decode without verification to inspect raw payload
        payload = pyjwt.decode(
            token,
            options={"verify_signature": False},
            algorithms=[service._algorithm],
        )

        assert "sub" in payload, "JWT payload must contain 'sub' claim"
        assert payload["sub"] == str(merchant_id), (
            f"JWT 'sub' claim '{payload['sub']}' "
            f"does not match str(merchant_id) '{str(merchant_id)}'"
        )

    @pytest.mark.property
    @settings(max_examples=100)
    @given(merchant_id=merchant_ids, secret=jwt_secrets)
    def test_token_sub_claim_round_trips_to_int(
        self, merchant_id: int, secret: str
    ):
        """
        The 'sub' claim stored as a string SHALL be convertible back to the
        original integer merchant_id without loss.

        **Validates: Requirements 2.4**
        """
        service = AuthService(secret_key=secret)

        token = service.create_token(merchant_id)

        payload = pyjwt.decode(
            token,
            options={"verify_signature": False},
            algorithms=[service._algorithm],
        )

        recovered = int(payload["sub"])
        assert recovered == merchant_id, (
            f"int(sub) {recovered} does not equal original merchant_id {merchant_id}"
        )

    @pytest.mark.property
    @settings(max_examples=100)
    @given(
        merchant_id=merchant_ids,
        secret=jwt_secrets,
        wrong_secret=jwt_secrets,
    )
    def test_token_signed_with_different_secret_is_rejected(
        self, merchant_id: int, secret: str, wrong_secret: str
    ):
        """
        A token signed with one secret SHALL be rejected when validated
        against a different secret, ensuring cryptographic integrity.

        **Validates: Requirements 2.4**
        """
        assume(secret != wrong_secret)

        signer = AuthService(secret_key=secret)
        verifier = AuthService(secret_key=wrong_secret)

        token = signer.create_token(merchant_id)

        with pytest.raises(AuthenticationError):
            verifier.validate_token(token)

    @pytest.mark.property
    @settings(max_examples=100)
    @given(
        merchant_id_a=merchant_ids,
        merchant_id_b=merchant_ids,
        secret=jwt_secrets,
    )
    def test_distinct_merchant_ids_produce_distinct_tokens(
        self, merchant_id_a: int, merchant_id_b: int, secret: str
    ):
        """
        Tokens generated for two different merchant IDs SHALL be distinct,
        ensuring no identity collision.

        **Validates: Requirements 2.4**
        """
        assume(merchant_id_a != merchant_id_b)

        service = AuthService(secret_key=secret)

        token_a = service.create_token(merchant_id_a)
        token_b = service.create_token(merchant_id_b)

        assert token_a != token_b, (
            f"Tokens for merchant_id {merchant_id_a} and {merchant_id_b} must be distinct"
        )

        # Cross-validation: each token must decode to its own merchant_id
        assert service.validate_token(token_a) == merchant_id_a
        assert service.validate_token(token_b) == merchant_id_b
