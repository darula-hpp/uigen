"""Property-based tests for AI Service data generation conformance.

Feature: meeting-minutes-backend
Property 7: AI Data Generation Conformance

**Validates: Requirements 5.2, 5.4**

For any Jinja_Shape schema, the AI_Service SHALL generate Filled_Data that 
validates successfully against the schema.

This test suite uses Hypothesis to generate random JSON schemas and verifies that:
1. The AI Service generates data for any valid JSON schema
2. The generated data validates against the provided schema
3. The data structure matches the schema structure (objects, arrays, primitives)
4. All required properties are present in the generated data
"""
import pytest
from hypothesis import given, strategies as st, settings, HealthCheck, assume
from faker import Faker
from app.core.ai_service import AIService
from jsonschema import validate, ValidationError as JsonSchemaValidationError
from typing import Dict, Any


# Hypothesis strategies for generating JSON schemas

@st.composite
def json_schema_string_property(draw):
    """Generate a JSON schema for a string property."""
    return {"type": "string"}


@st.composite
def json_schema_number_property(draw):
    """Generate a JSON schema for a number/integer property."""
    type_name = draw(st.sampled_from(["number", "integer"]))
    return {"type": type_name}


@st.composite
def json_schema_boolean_property(draw):
    """Generate a JSON schema for a boolean property."""
    return {"type": "boolean"}


@st.composite
def json_schema_array_property(draw, max_depth=2):
    """Generate a JSON schema for an array property."""
    # Limit recursion depth
    if max_depth <= 0:
        items_schema = draw(st.sampled_from([
            {"type": "string"},
            {"type": "number"},
            {"type": "boolean"}
        ]))
    else:
        items_schema = draw(json_schema_property(max_depth=max_depth - 1))
    
    return {
        "type": "array",
        "items": items_schema
    }


@st.composite
def json_schema_object_property(draw, max_depth=2):
    """Generate a JSON schema for an object property with nested properties."""
    # Limit recursion depth
    if max_depth <= 0:
        # At max depth, only use primitive types
        num_props = draw(st.integers(min_value=1, max_value=3))
        properties = {}
        required = []
        
        for i in range(num_props):
            prop_name = f"prop_{i}"
            prop_schema = draw(st.sampled_from([
                {"type": "string"},
                {"type": "number"},
                {"type": "boolean"}
            ]))
            properties[prop_name] = prop_schema
            required.append(prop_name)
        
        return {
            "type": "object",
            "properties": properties,
            "required": required
        }
    
    # Generate 1-4 properties for the object
    num_props = draw(st.integers(min_value=1, max_value=4))
    properties = {}
    required = []
    
    for i in range(num_props):
        prop_name = f"prop_{i}"
        prop_schema = draw(json_schema_property(max_depth=max_depth - 1))
        properties[prop_name] = prop_schema
        required.append(prop_name)
    
    return {
        "type": "object",
        "properties": properties,
        "required": required
    }


@st.composite
def json_schema_property(draw, max_depth=2):
    """Generate a JSON schema property of any type."""
    if max_depth <= 0:
        # At max depth, only primitives
        return draw(st.sampled_from([
            {"type": "string"},
            {"type": "number"},
            {"type": "integer"},
            {"type": "boolean"}
        ]))
    
    property_type = draw(st.sampled_from([
        "string", "number", "integer", "boolean", "array", "object"
    ]))
    
    if property_type == "string":
        return {"type": "string"}
    elif property_type in ["number", "integer"]:
        return {"type": property_type}
    elif property_type == "boolean":
        return {"type": "boolean"}
    elif property_type == "array":
        return draw(json_schema_array_property(max_depth=max_depth))
    else:  # object
        return draw(json_schema_object_property(max_depth=max_depth))


@st.composite
def jinja_shape_strategy(draw, max_depth=2):
    """
    Generate a valid Jinja_Shape (JSON schema) with random structure.
    
    This generates schemas with:
    - 1-5 top-level properties
    - Mix of primitive types (string, number, boolean)
    - Arrays with various item types
    - Nested objects (up to max_depth levels)
    - Required fields
    """
    # Generate 1-5 top-level properties
    num_properties = draw(st.integers(min_value=1, max_value=5))
    
    properties = {}
    required = []
    
    for i in range(num_properties):
        prop_name = f"field_{i}"
        prop_schema = draw(json_schema_property(max_depth=max_depth))
        properties[prop_name] = prop_schema
        required.append(prop_name)
    
    return {
        "type": "object",
        "properties": properties,
        "required": required
    }


@st.composite
def simple_jinja_shape_strategy(draw):
    """Generate a simple Jinja_Shape with only primitive types."""
    num_properties = draw(st.integers(min_value=1, max_value=5))
    
    properties = {}
    required = []
    
    for i in range(num_properties):
        prop_name = f"field_{i}"
        prop_type = draw(st.sampled_from(["string", "number", "integer", "boolean"]))
        properties[prop_name] = {"type": prop_type}
        required.append(prop_name)
    
    return {
        "type": "object",
        "properties": properties,
        "required": required
    }


@st.composite
def array_jinja_shape_strategy(draw):
    """Generate a Jinja_Shape with array properties."""
    num_arrays = draw(st.integers(min_value=1, max_value=3))
    
    properties = {}
    required = []
    
    for i in range(num_arrays):
        prop_name = f"items_{i}"
        item_type = draw(st.sampled_from(["string", "number", "boolean", "object"]))
        
        if item_type == "object":
            items_schema = {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "value": {"type": "number"}
                },
                "required": ["name", "value"]
            }
        else:
            items_schema = {"type": item_type}
        
        properties[prop_name] = {
            "type": "array",
            "items": items_schema
        }
        required.append(prop_name)
    
    return {
        "type": "object",
        "properties": properties,
        "required": required
    }


@st.composite
def nested_jinja_shape_strategy(draw):
    """Generate a Jinja_Shape with nested object structures."""
    # Create a nested structure with 2-3 levels
    depth = draw(st.integers(min_value=2, max_value=3))
    
    def create_nested_object(current_depth):
        if current_depth <= 0:
            # Leaf level - primitive types
            return {
                "type": "object",
                "properties": {
                    "value": {"type": "string"}
                },
                "required": ["value"]
            }
        
        # Intermediate level - can have nested objects
        num_props = draw(st.integers(min_value=1, max_value=2))
        properties = {}
        required = []
        
        for i in range(num_props):
            prop_name = f"level_{current_depth}_prop_{i}"
            if i == 0 and current_depth > 1:
                # First property is nested
                properties[prop_name] = create_nested_object(current_depth - 1)
            else:
                # Other properties are primitives
                prop_type = draw(st.sampled_from(["string", "number", "boolean"]))
                properties[prop_name] = {"type": prop_type}
            required.append(prop_name)
        
        return {
            "type": "object",
            "properties": properties,
            "required": required
        }
    
    root_obj = create_nested_object(depth)
    
    return {
        "type": "object",
        "properties": {
            "root": root_obj
        },
        "required": ["root"]
    }


# Property Tests

@pytest.mark.asyncio
@given(jinja_shape=simple_jinja_shape_strategy())
@settings(
    max_examples=100,
    deadline=None,
    suppress_health_check=[HealthCheck.function_scoped_fixture]
)
async def test_ai_data_generation_simple_types_conformance(jinja_shape):
    """
    Property 7: AI Data Generation Conformance - Simple Types
    
    **Validates: Requirements 5.2, 5.4**
    
    For any Jinja_Shape schema with simple primitive types (string, number, boolean),
    the AI_Service SHALL generate Filled_Data that validates successfully against 
    the schema.
    """
    # Create AI service with a fresh Faker instance
    faker_instance = Faker()
    ai_service = AIService(faker_instance)
    
    # Generate data conforming to the schema
    filled_data = await ai_service.generate_data("dummy_recording.mp3", jinja_shape)
    
    # Verify all required properties are present
    required_props = jinja_shape.get("required", [])
    for prop in required_props:
        assert prop in filled_data, f"Required property '{prop}' missing from generated data"
    
    # Validate generated data against the schema
    # This should not raise a ValidationError
    try:
        validate(instance=filled_data, schema=jinja_shape)
    except JsonSchemaValidationError as e:
        pytest.fail(f"Generated data does not conform to schema: {e.message}")


@pytest.mark.asyncio
@given(jinja_shape=array_jinja_shape_strategy())
@settings(
    max_examples=100,
    deadline=None,
    suppress_health_check=[HealthCheck.function_scoped_fixture]
)
async def test_ai_data_generation_array_conformance(jinja_shape):
    """
    Property 7: AI Data Generation Conformance - Array Types
    
    **Validates: Requirements 5.2, 5.4**
    
    For any Jinja_Shape schema with array properties, the AI_Service SHALL 
    generate Filled_Data with arrays that validate successfully against the schema.
    """
    # Create AI service with a fresh Faker instance
    faker_instance = Faker()
    ai_service = AIService(faker_instance)
    
    # Generate data conforming to the schema
    filled_data = await ai_service.generate_data("dummy_recording.mp3", jinja_shape)
    
    # Verify all required properties are present
    required_props = jinja_shape.get("required", [])
    for prop in required_props:
        assert prop in filled_data, f"Required property '{prop}' missing from generated data"
    
    # Verify arrays are actually lists
    for prop_name, prop_schema in jinja_shape["properties"].items():
        if prop_schema.get("type") == "array":
            assert isinstance(filled_data[prop_name], list), \
                f"Property '{prop_name}' should be a list but is {type(filled_data[prop_name])}"
            assert len(filled_data[prop_name]) > 0, \
                f"Array property '{prop_name}' should not be empty"
    
    # Validate generated data against the schema
    try:
        validate(instance=filled_data, schema=jinja_shape)
    except JsonSchemaValidationError as e:
        pytest.fail(f"Generated data does not conform to schema: {e.message}")


@pytest.mark.asyncio
@given(jinja_shape=nested_jinja_shape_strategy())
@settings(
    max_examples=100,
    deadline=None,
    suppress_health_check=[HealthCheck.function_scoped_fixture]
)
async def test_ai_data_generation_nested_object_conformance(jinja_shape):
    """
    Property 7: AI Data Generation Conformance - Nested Objects
    
    **Validates: Requirements 5.2, 5.4**
    
    For any Jinja_Shape schema with nested object structures, the AI_Service SHALL 
    generate Filled_Data with nested objects that validate successfully against 
    the schema.
    """
    # Create AI service with a fresh Faker instance
    faker_instance = Faker()
    ai_service = AIService(faker_instance)
    
    # Generate data conforming to the schema
    filled_data = await ai_service.generate_data("dummy_recording.mp3", jinja_shape)
    
    # Verify all required properties are present
    required_props = jinja_shape.get("required", [])
    for prop in required_props:
        assert prop in filled_data, f"Required property '{prop}' missing from generated data"
    
    # Verify nested objects are actually dictionaries
    def verify_nested_structure(data, schema, path=""):
        """Recursively verify nested object structure."""
        if schema.get("type") == "object" and "properties" in schema:
            assert isinstance(data, dict), \
                f"Expected object at '{path}' but got {type(data)}"
            
            for prop_name, prop_schema in schema["properties"].items():
                full_path = f"{path}.{prop_name}" if path else prop_name
                
                if prop_name in schema.get("required", []):
                    assert prop_name in data, \
                        f"Required property '{full_path}' missing"
                
                if prop_name in data:
                    verify_nested_structure(data[prop_name], prop_schema, full_path)
    
    verify_nested_structure(filled_data, jinja_shape)
    
    # Validate generated data against the schema
    try:
        validate(instance=filled_data, schema=jinja_shape)
    except JsonSchemaValidationError as e:
        pytest.fail(f"Generated data does not conform to schema: {e.message}")


@pytest.mark.asyncio
@given(jinja_shape=jinja_shape_strategy(max_depth=2))
@settings(
    max_examples=100,
    deadline=None,
    suppress_health_check=[HealthCheck.function_scoped_fixture]
)
async def test_ai_data_generation_mixed_types_conformance(jinja_shape):
    """
    Property 7: AI Data Generation Conformance - Mixed Types
    
    **Validates: Requirements 5.2, 5.4**
    
    For any Jinja_Shape schema with mixed types (primitives, arrays, nested objects),
    the AI_Service SHALL generate Filled_Data that validates successfully against 
    the schema.
    
    This is the most comprehensive test that generates random schemas with various
    combinations of types and verifies the AI service can handle them all.
    """
    # Create AI service with a fresh Faker instance
    faker_instance = Faker()
    ai_service = AIService(faker_instance)
    
    # Generate data conforming to the schema
    filled_data = await ai_service.generate_data("dummy_recording.mp3", jinja_shape)
    
    # Verify all required properties are present
    required_props = jinja_shape.get("required", [])
    for prop in required_props:
        assert prop in filled_data, f"Required property '{prop}' missing from generated data"
    
    # Verify the structure matches the schema
    def verify_type_conformance(data, schema, path=""):
        """Recursively verify data conforms to schema types."""
        schema_type = schema.get("type")
        
        if schema_type == "string":
            assert isinstance(data, str), \
                f"Expected string at '{path}' but got {type(data)}"
        
        elif schema_type in ["number", "integer"]:
            assert isinstance(data, (int, float)), \
                f"Expected number at '{path}' but got {type(data)}"
        
        elif schema_type == "boolean":
            assert isinstance(data, bool), \
                f"Expected boolean at '{path}' but got {type(data)}"
        
        elif schema_type == "array":
            assert isinstance(data, list), \
                f"Expected array at '{path}' but got {type(data)}"
            
            items_schema = schema.get("items", {})
            for i, item in enumerate(data):
                item_path = f"{path}[{i}]"
                verify_type_conformance(item, items_schema, item_path)
        
        elif schema_type == "object":
            assert isinstance(data, dict), \
                f"Expected object at '{path}' but got {type(data)}"
            
            properties = schema.get("properties", {})
            for prop_name, prop_schema in properties.items():
                full_path = f"{path}.{prop_name}" if path else prop_name
                
                if prop_name in data:
                    verify_type_conformance(data[prop_name], prop_schema, full_path)
    
    verify_type_conformance(filled_data, jinja_shape)
    
    # Validate generated data against the schema using jsonschema
    try:
        validate(instance=filled_data, schema=jinja_shape)
    except JsonSchemaValidationError as e:
        pytest.fail(f"Generated data does not conform to schema: {e.message}\nSchema: {jinja_shape}\nData: {filled_data}")


@pytest.mark.asyncio
@given(jinja_shape=jinja_shape_strategy(max_depth=3))
@settings(
    max_examples=50,
    deadline=None,
    suppress_health_check=[HealthCheck.function_scoped_fixture]
)
async def test_ai_data_generation_deep_nesting_conformance(jinja_shape):
    """
    Property 7: AI Data Generation Conformance - Deep Nesting
    
    **Validates: Requirements 5.2, 5.4**
    
    For any Jinja_Shape schema with deep nesting (up to 3 levels), the AI_Service 
    SHALL generate Filled_Data that validates successfully against the schema.
    
    This test verifies the AI service can handle complex nested structures.
    """
    # Create AI service with a fresh Faker instance
    faker_instance = Faker()
    ai_service = AIService(faker_instance)
    
    # Generate data conforming to the schema
    filled_data = await ai_service.generate_data("dummy_recording.mp3", jinja_shape)
    
    # Verify all required properties are present at the top level
    required_props = jinja_shape.get("required", [])
    for prop in required_props:
        assert prop in filled_data, f"Required property '{prop}' missing from generated data"
    
    # Validate generated data against the schema
    try:
        validate(instance=filled_data, schema=jinja_shape)
    except JsonSchemaValidationError as e:
        pytest.fail(f"Generated data does not conform to schema: {e.message}")


@pytest.mark.asyncio
async def test_ai_data_generation_empty_schema():
    """
    Property 7: AI Data Generation Conformance - Empty Schema
    
    **Validates: Requirements 5.2, 5.4**
    
    For an empty Jinja_Shape schema (no properties), the AI_Service SHALL 
    generate an empty Filled_Data object.
    """
    faker_instance = Faker()
    ai_service = AIService(faker_instance)
    
    jinja_shape = {
        "type": "object",
        "properties": {}
    }
    
    filled_data = await ai_service.generate_data("dummy_recording.mp3", jinja_shape)
    
    assert filled_data == {}, "Empty schema should produce empty data"
    
    # Validate against schema
    validate(instance=filled_data, schema=jinja_shape)


@pytest.mark.asyncio
@given(
    num_properties=st.integers(min_value=1, max_value=10)
)
@settings(
    max_examples=50,
    deadline=None,
    suppress_health_check=[HealthCheck.function_scoped_fixture]
)
async def test_ai_data_generation_all_required_fields_present(num_properties):
    """
    Property 7: AI Data Generation Conformance - Required Fields
    
    **Validates: Requirements 5.2, 5.4**
    
    For any Jinja_Shape schema with required fields, the AI_Service SHALL 
    generate Filled_Data that includes all required fields.
    """
    faker_instance = Faker()
    ai_service = AIService(faker_instance)
    
    # Create a schema with all fields marked as required
    properties = {}
    required = []
    
    for i in range(num_properties):
        prop_name = f"required_field_{i}"
        properties[prop_name] = {"type": "string"}
        required.append(prop_name)
    
    jinja_shape = {
        "type": "object",
        "properties": properties,
        "required": required
    }
    
    filled_data = await ai_service.generate_data("dummy_recording.mp3", jinja_shape)
    
    # Verify all required fields are present
    for prop in required:
        assert prop in filled_data, f"Required field '{prop}' missing from generated data"
        assert filled_data[prop] is not None, f"Required field '{prop}' is None"
    
    # Validate against schema
    validate(instance=filled_data, schema=jinja_shape)


@pytest.mark.asyncio
@given(
    array_length=st.integers(min_value=1, max_value=10)
)
@settings(
    max_examples=50,
    deadline=None,
    suppress_health_check=[HealthCheck.function_scoped_fixture]
)
async def test_ai_data_generation_array_items_conform(array_length):
    """
    Property 7: AI Data Generation Conformance - Array Items
    
    **Validates: Requirements 5.2, 5.4**
    
    For any Jinja_Shape schema with array properties, the AI_Service SHALL 
    generate arrays where each item conforms to the items schema.
    """
    faker_instance = Faker()
    ai_service = AIService(faker_instance)
    
    jinja_shape = {
        "type": "object",
        "properties": {
            "items": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "integer"},
                        "name": {"type": "string"}
                    },
                    "required": ["id", "name"]
                }
            }
        },
        "required": ["items"]
    }
    
    filled_data = await ai_service.generate_data("dummy_recording.mp3", jinja_shape)
    
    # Verify array exists and has items
    assert "items" in filled_data
    assert isinstance(filled_data["items"], list)
    assert len(filled_data["items"]) > 0
    
    # Verify each item conforms to the items schema
    for i, item in enumerate(filled_data["items"]):
        assert isinstance(item, dict), f"Item {i} should be an object"
        assert "id" in item, f"Item {i} missing 'id' field"
        assert "name" in item, f"Item {i} missing 'name' field"
        assert isinstance(item["id"], int), f"Item {i} 'id' should be an integer"
        assert isinstance(item["name"], str), f"Item {i} 'name' should be a string"
    
    # Validate against schema
    validate(instance=filled_data, schema=jinja_shape)
