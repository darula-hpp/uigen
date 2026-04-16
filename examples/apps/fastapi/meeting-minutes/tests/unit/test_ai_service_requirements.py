"""Test AI Service against specific requirements from the design document."""
import pytest
from faker import Faker
from app.core.ai_service import AIService
from jsonschema import validate


@pytest.fixture
def ai_service():
    """Provide an AI service instance."""
    return AIService(Faker())


@pytest.mark.asyncio
async def test_requirement_5_2_accepts_recording_path_and_jinja_shape(ai_service):
    """
    Requirement 5.2: AI_Service SHALL accept the recording file path and Jinja_Shape as inputs.
    """
    recording_path = "/path/to/recording.mp3"
    jinja_shape = {
        "type": "object",
        "properties": {
            "title": {"type": "string"}
        }
    }
    
    # Should not raise an exception
    filled_data = await ai_service.generate_data(recording_path, jinja_shape)
    assert filled_data is not None


@pytest.mark.asyncio
async def test_requirement_5_3_uses_faker_library(ai_service):
    """
    Requirement 5.3: AI_Service SHALL generate fake data conforming to the template Jinja_Shape using the faker library.
    """
    # Verify that the service uses faker by checking the instance
    assert isinstance(ai_service.faker, Faker)


@pytest.mark.asyncio
async def test_requirement_5_4_returns_filled_data_matching_schema(ai_service):
    """
    Requirement 5.4: AI_Service SHALL return a Filled_Data JSON object with values matching the Jinja_Shape schema.
    """
    jinja_shape = {
        "type": "object",
        "properties": {
            "meeting_title": {"type": "string"},
            "attendee_count": {"type": "integer"},
            "is_completed": {"type": "boolean"},
            "action_items": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "description": {"type": "string"},
                        "assignee": {"type": "string"}
                    }
                }
            }
        },
        "required": ["meeting_title", "attendee_count", "is_completed", "action_items"]
    }
    
    filled_data = await ai_service.generate_data("dummy_path", jinja_shape)
    
    # Validate that the filled data conforms to the schema
    validate(instance=filled_data, schema=jinja_shape)
    
    # Verify all required fields are present
    assert "meeting_title" in filled_data
    assert "attendee_count" in filled_data
    assert "is_completed" in filled_data
    assert "action_items" in filled_data


def test_faker_mapping_string_to_sentence(ai_service):
    """
    Design Document: Map string → faker.sentence()
    """
    value = ai_service._generate_value_for_type({"type": "string"})
    assert isinstance(value, str)
    # Faker sentences typically end with a period and have multiple words
    assert len(value) > 0


def test_faker_mapping_number_to_random_int(ai_service):
    """
    Design Document: Map number → faker.random_int()
    """
    value = ai_service._generate_value_for_type({"type": "number"})
    assert isinstance(value, int)
    assert 0 <= value <= 1000


def test_faker_mapping_boolean_to_boolean(ai_service):
    """
    Design Document: Map boolean → faker.boolean()
    """
    value = ai_service._generate_value_for_type({"type": "boolean"})
    assert isinstance(value, bool)


def test_handles_arrays_recursively(ai_service):
    """
    Design Document: Handle arrays recursively
    """
    array_spec = {
        "type": "array",
        "items": {
            "type": "array",
            "items": {"type": "string"}
        }
    }
    
    value = ai_service._generate_value_for_type(array_spec)
    assert isinstance(value, list)
    assert len(value) >= 2
    
    # Each item should be an array of strings
    for item in value:
        assert isinstance(item, list)
        for nested_item in item:
            assert isinstance(nested_item, str)


def test_handles_nested_objects_recursively(ai_service):
    """
    Design Document: Handle nested objects recursively
    """
    nested_spec = {
        "type": "object",
        "properties": {
            "level1": {
                "type": "object",
                "properties": {
                    "level2": {
                        "type": "object",
                        "properties": {
                            "level3": {"type": "string"}
                        }
                    }
                }
            }
        }
    }
    
    value = ai_service._generate_value_for_type(nested_spec)
    assert isinstance(value, dict)
    assert "level1" in value
    assert isinstance(value["level1"], dict)
    assert "level2" in value["level1"]
    assert isinstance(value["level1"]["level2"], dict)
    assert "level3" in value["level1"]["level2"]
    assert isinstance(value["level1"]["level2"]["level3"], str)


@pytest.mark.asyncio
async def test_recording_path_unused_in_mock(ai_service):
    """
    Design Document: recording_path is unused in mock implementation
    """
    jinja_shape = {
        "type": "object",
        "properties": {
            "title": {"type": "string"}
        }
    }
    
    # Should produce the same type of result regardless of recording path
    result1 = await ai_service.generate_data("path1.mp3", jinja_shape)
    result2 = await ai_service.generate_data("path2.mp3", jinja_shape)
    result3 = await ai_service.generate_data("", jinja_shape)
    
    # All should have the same structure (though values may differ due to faker randomness)
    assert "title" in result1
    assert "title" in result2
    assert "title" in result3


@pytest.mark.asyncio
async def test_complex_real_world_schema(ai_service):
    """
    Test with a complex real-world meeting minutes schema.
    """
    jinja_shape = {
        "type": "object",
        "properties": {
            "meeting_title": {"type": "string"},
            "date": {"type": "string"},
            "attendees": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "role": {"type": "string"},
                        "present": {"type": "boolean"}
                    }
                }
            },
            "agenda_items": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "topic": {"type": "string"},
                        "duration": {"type": "integer"},
                        "notes": {"type": "string"}
                    }
                }
            },
            "decisions": {
                "type": "array",
                "items": {"type": "string"}
            },
            "action_items": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "task": {"type": "string"},
                        "assignee": {"type": "string"},
                        "due_date": {"type": "string"},
                        "priority": {"type": "integer"}
                    }
                }
            },
            "next_meeting": {
                "type": "object",
                "properties": {
                    "date": {"type": "string"},
                    "time": {"type": "string"},
                    "location": {"type": "string"}
                }
            }
        }
    }
    
    filled_data = await ai_service.generate_data("recording.mp3", jinja_shape)
    
    # Validate against schema
    validate(instance=filled_data, schema=jinja_shape)
    
    # Verify structure
    assert isinstance(filled_data["attendees"], list)
    assert isinstance(filled_data["agenda_items"], list)
    assert isinstance(filled_data["decisions"], list)
    assert isinstance(filled_data["action_items"], list)
    assert isinstance(filled_data["next_meeting"], dict)
    
    # Verify nested structures
    if len(filled_data["attendees"]) > 0:
        assert "name" in filled_data["attendees"][0]
        assert "role" in filled_data["attendees"][0]
        assert "present" in filled_data["attendees"][0]
