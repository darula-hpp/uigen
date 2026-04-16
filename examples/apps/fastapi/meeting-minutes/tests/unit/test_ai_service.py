"""Unit tests for AI Service."""
import pytest
from faker import Faker
from app.core.ai_service import AIService
from jsonschema import validate, ValidationError


@pytest.fixture
def ai_service():
    """Provide an AI service instance with a seeded Faker for reproducibility."""
    faker_instance = Faker()
    Faker.seed(42)  # Seed for reproducible tests
    return AIService(faker_instance)


@pytest.mark.asyncio
async def test_generate_data_simple_string(ai_service):
    """Test generating data for a simple string variable."""
    jinja_shape = {
        "type": "object",
        "properties": {
            "title": {"type": "string"}
        },
        "required": ["title"]
    }
    
    filled_data = await ai_service.generate_data("dummy_path", jinja_shape)
    
    assert "title" in filled_data
    assert isinstance(filled_data["title"], str)
    assert len(filled_data["title"]) > 0


@pytest.mark.asyncio
async def test_generate_data_multiple_types(ai_service):
    """Test generating data for multiple variable types."""
    jinja_shape = {
        "type": "object",
        "properties": {
            "title": {"type": "string"},
            "count": {"type": "number"},
            "is_active": {"type": "boolean"}
        },
        "required": ["title", "count", "is_active"]
    }
    
    filled_data = await ai_service.generate_data("dummy_path", jinja_shape)
    
    assert "title" in filled_data
    assert isinstance(filled_data["title"], str)
    
    assert "count" in filled_data
    assert isinstance(filled_data["count"], int)
    
    assert "is_active" in filled_data
    assert isinstance(filled_data["is_active"], bool)


@pytest.mark.asyncio
async def test_generate_data_array(ai_service):
    """Test generating data for array variables."""
    jinja_shape = {
        "type": "object",
        "properties": {
            "items": {
                "type": "array",
                "items": {"type": "object"}
            }
        },
        "required": ["items"]
    }
    
    filled_data = await ai_service.generate_data("dummy_path", jinja_shape)
    
    assert "items" in filled_data
    assert isinstance(filled_data["items"], list)
    assert len(filled_data["items"]) >= 2
    assert len(filled_data["items"]) <= 5


@pytest.mark.asyncio
async def test_generate_data_nested_object(ai_service):
    """Test generating data for nested object structures."""
    jinja_shape = {
        "type": "object",
        "properties": {
            "user": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "age": {"type": "number"}
                },
                "required": ["name", "age"]
            }
        },
        "required": ["user"]
    }
    
    filled_data = await ai_service.generate_data("dummy_path", jinja_shape)
    
    assert "user" in filled_data
    assert isinstance(filled_data["user"], dict)
    assert "name" in filled_data["user"]
    assert isinstance(filled_data["user"]["name"], str)
    assert "age" in filled_data["user"]
    assert isinstance(filled_data["user"]["age"], int)


@pytest.mark.asyncio
async def test_generate_data_array_of_objects(ai_service):
    """Test generating data for arrays of objects with properties."""
    jinja_shape = {
        "type": "object",
        "properties": {
            "attendees": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "email": {"type": "string"}
                    },
                    "required": ["name", "email"]
                }
            }
        },
        "required": ["attendees"]
    }
    
    filled_data = await ai_service.generate_data("dummy_path", jinja_shape)
    
    assert "attendees" in filled_data
    assert isinstance(filled_data["attendees"], list)
    assert len(filled_data["attendees"]) >= 2
    
    for attendee in filled_data["attendees"]:
        assert isinstance(attendee, dict)
        assert "name" in attendee
        assert isinstance(attendee["name"], str)
        assert "email" in attendee
        assert isinstance(attendee["email"], str)


@pytest.mark.asyncio
async def test_generate_data_deeply_nested(ai_service):
    """Test generating data for deeply nested structures."""
    jinja_shape = {
        "type": "object",
        "properties": {
            "company": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "departments": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string"},
                                "head": {"type": "string"}
                            },
                            "required": ["name", "head"]
                        }
                    }
                },
                "required": ["name", "departments"]
            }
        },
        "required": ["company"]
    }
    
    filled_data = await ai_service.generate_data("dummy_path", jinja_shape)
    
    assert "company" in filled_data
    assert "name" in filled_data["company"]
    assert "departments" in filled_data["company"]
    assert isinstance(filled_data["company"]["departments"], list)
    
    for dept in filled_data["company"]["departments"]:
        assert "name" in dept
        assert "head" in dept


@pytest.mark.asyncio
async def test_generate_data_validates_against_schema(ai_service):
    """Test that generated data validates against the provided schema."""
    jinja_shape = {
        "type": "object",
        "properties": {
            "title": {"type": "string"},
            "count": {"type": "integer"},
            "active": {"type": "boolean"},
            "tags": {
                "type": "array",
                "items": {"type": "string"}
            }
        },
        "required": ["title", "count", "active", "tags"]
    }
    
    filled_data = await ai_service.generate_data("dummy_path", jinja_shape)
    
    # This should not raise a ValidationError
    validate(instance=filled_data, schema=jinja_shape)


@pytest.mark.asyncio
async def test_generate_data_empty_schema(ai_service):
    """Test generating data for an empty schema."""
    jinja_shape = {
        "type": "object",
        "properties": {}
    }
    
    filled_data = await ai_service.generate_data("dummy_path", jinja_shape)
    
    assert filled_data == {}


@pytest.mark.asyncio
async def test_generate_data_integer_type(ai_service):
    """Test that integer type is handled correctly."""
    jinja_shape = {
        "type": "object",
        "properties": {
            "count": {"type": "integer"}
        },
        "required": ["count"]
    }
    
    filled_data = await ai_service.generate_data("dummy_path", jinja_shape)
    
    assert "count" in filled_data
    assert isinstance(filled_data["count"], int)


@pytest.mark.asyncio
async def test_generate_data_unknown_type_defaults_to_string(ai_service):
    """Test that unknown types default to string generation."""
    jinja_shape = {
        "type": "object",
        "properties": {
            "unknown_field": {"type": "unknown_type"}
        },
        "required": ["unknown_field"]
    }
    
    filled_data = await ai_service.generate_data("dummy_path", jinja_shape)
    
    assert "unknown_field" in filled_data
    assert isinstance(filled_data["unknown_field"], str)


def test_generate_value_for_type_string(ai_service):
    """Test generating a string value."""
    value = ai_service._generate_value_for_type({"type": "string"})
    assert isinstance(value, str)
    assert len(value) > 0


def test_generate_value_for_type_number(ai_service):
    """Test generating a number value."""
    value = ai_service._generate_value_for_type({"type": "number"})
    assert isinstance(value, int)
    assert 0 <= value <= 1000


def test_generate_value_for_type_boolean(ai_service):
    """Test generating a boolean value."""
    value = ai_service._generate_value_for_type({"type": "boolean"})
    assert isinstance(value, bool)


def test_generate_value_for_type_array(ai_service):
    """Test generating an array value."""
    value = ai_service._generate_value_for_type({
        "type": "array",
        "items": {"type": "string"}
    })
    assert isinstance(value, list)
    assert 2 <= len(value) <= 5
    assert all(isinstance(item, str) for item in value)


def test_generate_value_for_type_object(ai_service):
    """Test generating an object value."""
    value = ai_service._generate_value_for_type({
        "type": "object",
        "properties": {
            "name": {"type": "string"},
            "age": {"type": "number"}
        }
    })
    assert isinstance(value, dict)
    assert "name" in value
    assert "age" in value
    assert isinstance(value["name"], str)
    assert isinstance(value["age"], int)
