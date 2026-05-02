"""Unit tests for UserUpdate Pydantic schema validation.

Tests Requirements 2.6 and 2.7:
- Username pattern validation (alphanumeric and underscores)
- Min/max length constraints (username: 3-50 chars, email: max 255 chars)
"""
import pytest
from pydantic import ValidationError

from app.schemas import UserUpdate


class TestUserUpdateValidation:
    """Test suite for UserUpdate schema validation rules."""

    def test_valid_username_and_email(self):
        """Test UserUpdate accepts valid username and email."""
        data = UserUpdate(username="validuser123", email="test@example.com")
        
        assert data.username == "validuser123"
        assert data.email == "test@example.com"

    def test_valid_username_only(self):
        """Test UserUpdate accepts valid username without email."""
        data = UserUpdate(username="validuser")
        
        assert data.username == "validuser"
        assert data.email is None

    def test_valid_email_only(self):
        """Test UserUpdate accepts valid email without username."""
        data = UserUpdate(email="test@example.com")
        
        assert data.username is None
        assert data.email == "test@example.com"

    def test_both_fields_optional(self):
        """Test UserUpdate accepts empty update (both fields None)."""
        data = UserUpdate()
        
        assert data.username is None
        assert data.email is None

    def test_username_with_underscores(self):
        """Test username accepts underscores (Requirement 2.6)."""
        data = UserUpdate(username="user_name_123")
        
        assert data.username == "user_name_123"

    def test_username_alphanumeric_only(self):
        """Test username accepts alphanumeric characters (Requirement 2.6)."""
        data = UserUpdate(username="User123")
        
        assert data.username == "User123"

    def test_username_min_length(self):
        """Test username minimum length of 3 characters (Requirement 2.7)."""
        data = UserUpdate(username="abc")
        
        assert data.username == "abc"

    def test_username_max_length(self):
        """Test username maximum length of 50 characters (Requirement 2.7)."""
        username = "a" * 50
        data = UserUpdate(username=username)
        
        assert data.username == username
        assert len(data.username) == 50

    def test_username_too_short(self):
        """Test username rejects values shorter than 3 characters (Requirement 2.7)."""
        with pytest.raises(ValidationError) as exc_info:
            UserUpdate(username="ab")
        
        errors = exc_info.value.errors()
        assert len(errors) == 1
        assert errors[0]["loc"] == ("username",)
        assert "at least 3 characters" in errors[0]["msg"]

    def test_username_too_long(self):
        """Test username rejects values longer than 50 characters (Requirement 2.7)."""
        username = "a" * 51
        
        with pytest.raises(ValidationError) as exc_info:
            UserUpdate(username=username)
        
        errors = exc_info.value.errors()
        assert len(errors) == 1
        assert errors[0]["loc"] == ("username",)
        assert "at most 50 characters" in errors[0]["msg"]

    def test_username_with_spaces(self):
        """Test username rejects spaces (Requirement 2.6)."""
        with pytest.raises(ValidationError) as exc_info:
            UserUpdate(username="user name")
        
        errors = exc_info.value.errors()
        assert len(errors) == 1
        assert errors[0]["loc"] == ("username",)
        assert "letters, numbers, and underscores" in errors[0]["msg"]

    def test_username_with_hyphens(self):
        """Test username rejects hyphens (Requirement 2.6)."""
        with pytest.raises(ValidationError) as exc_info:
            UserUpdate(username="user-name")
        
        errors = exc_info.value.errors()
        assert len(errors) == 1
        assert errors[0]["loc"] == ("username",)
        assert "letters, numbers, and underscores" in errors[0]["msg"]

    def test_username_with_special_characters(self):
        """Test username rejects special characters (Requirement 2.6)."""
        invalid_usernames = [
            "user@name",
            "user#name",
            "user$name",
            "user%name",
            "user&name",
            "user*name",
            "user!name",
            "user.name",
            "user,name",
        ]
        
        for username in invalid_usernames:
            with pytest.raises(ValidationError) as exc_info:
                UserUpdate(username=username)
            
            errors = exc_info.value.errors()
            assert len(errors) == 1
            assert errors[0]["loc"] == ("username",)
            assert "letters, numbers, and underscores" in errors[0]["msg"]

    def test_email_valid_format(self):
        """Test email accepts valid email formats."""
        valid_emails = [
            "test@example.com",
            "user.name@example.com",
            "user+tag@example.co.uk",
            "user_123@test-domain.com",
        ]
        
        for email in valid_emails:
            data = UserUpdate(email=email)
            assert data.email == email

    def test_email_invalid_format(self):
        """Test email rejects invalid email formats."""
        invalid_emails = [
            "notanemail",
            "@example.com",
            "user@",
            "user @example.com",
            "user@example",
        ]
        
        for email in invalid_emails:
            with pytest.raises(ValidationError) as exc_info:
                UserUpdate(email=email)
            
            errors = exc_info.value.errors()
            assert len(errors) == 1
            assert errors[0]["loc"] == ("email",)

    def test_email_max_length(self):
        """Test email maximum length constraint (Requirement 2.7).
        
        Note: EmailStr validator enforces RFC 5321 max length of 254 characters,
        which is stricter than our 255 character constraint.
        """
        # Create email with 254 characters (RFC 5321 limit)
        local_part = "a" * (254 - len("@example.com"))
        email = f"{local_part}@example.com"
        
        data = UserUpdate(email=email)
        assert data.email == email
        assert len(data.email) == 254

    def test_email_too_long(self):
        """Test email rejects values longer than RFC 5321 limit (Requirement 2.7).
        
        Note: EmailStr validator enforces RFC 5321 max length of 254 characters.
        """
        # Create email with 255 characters (exceeds RFC 5321 limit)
        local_part = "a" * (255 - len("@example.com"))
        email = f"{local_part}@example.com"
        
        with pytest.raises(ValidationError) as exc_info:
            UserUpdate(email=email)
        
        errors = exc_info.value.errors()
        assert len(errors) == 1
        assert errors[0]["loc"] == ("email",)
        # EmailStr validator provides its own error message
        assert "too long" in errors[0]["msg"].lower()

    def test_username_empty_string(self):
        """Test username rejects empty string."""
        with pytest.raises(ValidationError) as exc_info:
            UserUpdate(username="")
        
        errors = exc_info.value.errors()
        assert len(errors) == 1
        assert errors[0]["loc"] == ("username",)

    def test_email_empty_string(self):
        """Test email rejects empty string."""
        with pytest.raises(ValidationError) as exc_info:
            UserUpdate(email="")
        
        errors = exc_info.value.errors()
        assert len(errors) == 1
        assert errors[0]["loc"] == ("email",)

    def test_username_only_underscores(self):
        """Test username accepts only underscores (valid per Requirement 2.6)."""
        data = UserUpdate(username="___")
        
        assert data.username == "___"

    def test_username_only_numbers(self):
        """Test username accepts only numbers (valid per Requirement 2.6)."""
        data = UserUpdate(username="123")
        
        assert data.username == "123"

    def test_username_mixed_case(self):
        """Test username preserves case (Requirement 2.6)."""
        data = UserUpdate(username="UserName123")
        
        assert data.username == "UserName123"

    def test_multiple_validation_errors(self):
        """Test multiple validation errors are reported together."""
        with pytest.raises(ValidationError) as exc_info:
            UserUpdate(username="ab", email="invalid")
        
        errors = exc_info.value.errors()
        assert len(errors) == 2
        
        # Check username error
        username_error = next(e for e in errors if e["loc"] == ("username",))
        assert "at least 3 characters" in username_error["msg"]
        
        # Check email error
        email_error = next(e for e in errors if e["loc"] == ("email",))
        assert "email" in email_error["msg"].lower()
