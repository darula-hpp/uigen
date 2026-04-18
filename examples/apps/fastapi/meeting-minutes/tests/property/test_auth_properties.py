"""Property-based tests for authentication business logic."""
from datetime import datetime, timedelta, timezone
import jwt
from hypothesis import given, strategies as st, settings
from app.services.auth_service import AuthService
from app.config import Settings


# Property 1: Password Hashing Round-Trip (Positive)
# For any valid password, hashing the password then verifying it with the same password SHALL return True.

@given(password=st.text(min_size=8, max_size=72).filter(lambda p: len(p.encode("utf-8")) <= 72))
@settings(max_examples=20, deadline=None)
def test_property_password_hash_round_trip_positive(password: str):
    """
    Property 1: Password Hashing Round-Trip (Positive)
    
    For any valid password (8-72 characters), hashing it and then verifying 
    the original password against the hash SHALL return True.
    
    **Validates: Requirements 15.1, 9.1**
    """
    # Create mock settings for auth tests (password operations don't need database)
    mock_settings = Settings(
        JWT_SECRET="test-secret-key-for-testing-only",
        JWT_EXPIRATION_HOURS=24,
        BCRYPT_ROUNDS=12
    )
    
    # Create service without database session (password operations don't need it)
    service = AuthService(session=None, settings=mock_settings)
    
    # Hash the password
    hashed = service.hash_password(password)
    
    # Verify the same password against the hash
    assert service.verify_password(password, hashed) is True


# Property 2: Password Hashing Round-Trip (Negative)
# For any two distinct valid passwords, hashing one and verifying the other against that hash SHALL return False.

@given(
    p1=st.text(min_size=8, max_size=72).filter(lambda p: len(p.encode("utf-8")) <= 72),
    p2=st.text(min_size=8, max_size=72).filter(lambda p: len(p.encode("utf-8")) <= 72)
)
@settings(max_examples=20, deadline=None)
def test_property_password_hash_round_trip_negative(p1: str, p2: str):
    """
    Property 2: Password Hashing Round-Trip (Negative)
    
    For any two distinct valid passwords, hashing one and verifying the other 
    against that hash SHALL return False.
    
    **Validates: Requirements 15.2**
    """
    # Skip if passwords are the same
    if p1 == p2:
        return
    
    # Create mock settings for auth tests
    mock_settings = Settings(
        JWT_SECRET="test-secret-key-for-testing-only",
        JWT_EXPIRATION_HOURS=24,
        BCRYPT_ROUNDS=12
    )
    
    # Create service without database session
    service = AuthService(session=None, settings=mock_settings)
    
    # Hash the first password
    hashed = service.hash_password(p1)
    
    # Verify the second (different) password against the hash
    assert service.verify_password(p2, hashed) is False


# Property 3: JWT Token Round-Trip
# For any valid user ID, generating a token then validating it SHALL return the same user ID.

@given(user_id=st.integers(min_value=1, max_value=10_000_000))
@settings(max_examples=20, deadline=None)
def test_property_jwt_token_round_trip(user_id: int):
    """
    Property 3: JWT Token Round-Trip
    
    For any valid user ID (positive integer), generating an access token and 
    then validating that token SHALL return the same user ID.
    
    **Validates: Requirements 16.1, 3.5, 2.4**
    """
    # Create mock settings for auth tests
    mock_settings = Settings(
        JWT_SECRET="test-secret-key-for-testing-only",
        JWT_EXPIRATION_HOURS=24,
        BCRYPT_ROUNDS=12
    )
    
    # Create service without database session (token operations don't need it)
    service = AuthService(session=None, settings=mock_settings)
    
    # Generate an access token
    token = service.create_access_token(user_id)
    
    # Validate the token and extract user ID
    returned_id = service.validate_token(token)
    
    # Assert the returned user ID matches the original
    assert returned_id == user_id


# Property 4: Expired Token Rejection
# For any token generated with a past expiration timestamp, validating that token SHALL raise an authentication error.

@given(user_id=st.integers(min_value=1, max_value=10_000_000))
@settings(max_examples=20, deadline=None)
def test_property_expired_token_rejection(user_id: int):
    """
    Property 4: Expired Token Rejection
    
    For any token generated with a past expiration timestamp, validating that 
    token SHALL raise an authentication error.
    
    **Validates: Requirements 16.2, 3.7, 10.2**
    """
    from app.exceptions import AuthenticationError
    
    # Create mock settings for auth tests
    mock_settings = Settings(
        JWT_SECRET="test-secret-key-for-testing-only",
        JWT_EXPIRATION_HOURS=24,
        BCRYPT_ROUNDS=12
    )
    
    # Create service without database session
    service = AuthService(session=None, settings=mock_settings)
    
    # Manually create an expired token
    utcnow = datetime.now(timezone.utc)
    expired_payload = {
        "sub": str(user_id),
        "exp": utcnow - timedelta(seconds=1),  # Expired 1 second ago
        "iat": utcnow - timedelta(seconds=2),
        "type": "access"
    }
    expired_token = jwt.encode(expired_payload, mock_settings.JWT_SECRET, algorithm="HS256")
    
    # Attempt to validate the expired token
    try:
        service.validate_token(expired_token)
        # If we reach here, the test failed (token should have been rejected)
        assert False, "Expected AuthenticationError for expired token"
    except AuthenticationError:
        # Expected behavior - token was rejected
        pass


# Property 5: Tampered Token Rejection
# For any valid token, modifying any character in the signature segment SHALL cause validation to raise an authentication error.

@given(
    user_id=st.integers(min_value=1, max_value=10_000_000),
    char_index=st.integers(min_value=0, max_value=20)  # Will be modulo'd to fit signature length
)
@settings(max_examples=20, deadline=None)
def test_property_tampered_token_rejection(user_id: int, char_index: int):
    """
    Property 5: Tampered Token Rejection
    
    For any valid token, modifying any character in the signature segment SHALL 
    cause validation to raise an authentication error.
    
    **Validates: Requirements 16.3, 3.6**
    """
    from app.exceptions import AuthenticationError
    
    # Create mock settings for auth tests
    mock_settings = Settings(
        JWT_SECRET="test-secret-key-for-testing-only",
        JWT_EXPIRATION_HOURS=24,
        BCRYPT_ROUNDS=12
    )
    
    # Create service without database session
    service = AuthService(session=None, settings=mock_settings)
    
    # Generate a valid token
    token = service.create_access_token(user_id)
    
    # Split the token into parts (header.payload.signature)
    parts = token.split(".")
    assert len(parts) == 3, "JWT should have 3 parts"
    
    # Tamper with the signature (last part)
    signature = parts[2]
    if len(signature) == 0:
        # Edge case: empty signature (shouldn't happen with valid JWT)
        return
    
    # Replace one character in the signature
    index = char_index % len(signature)
    signature_list = list(signature)
    # Replace with a different character (toggle between 'A' and 'B')
    signature_list[index] = 'B' if signature_list[index] != 'B' else 'A'
    tampered_signature = ''.join(signature_list)
    
    # Reconstruct the tampered token
    tampered_token = f"{parts[0]}.{parts[1]}.{tampered_signature}"
    
    # Attempt to validate the tampered token
    try:
        service.validate_token(tampered_token)
        # If we reach here, the test failed (token should have been rejected)
        assert False, "Expected AuthenticationError for tampered token"
    except AuthenticationError:
        # Expected behavior - token was rejected
        pass
