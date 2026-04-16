"""AI Service for generating fake data conforming to Jinja2 schema using faker."""
from typing import Dict, Any
from faker import Faker
from app.schemas import JinjaShape, FilledData


class AIService:
    """Service for generating fake data that conforms to Jinja2 template schemas."""
    
    def __init__(self, faker_instance: Faker = None):
        """
        Initialize the AI Service.
        
        Args:
            faker_instance: Optional Faker instance for testing. Creates new instance if not provided.
        """
        self.faker = faker_instance if faker_instance is not None else Faker()
    
    async def generate_data(
        self, recording_path: str, jinja_shape: JinjaShape
    ) -> FilledData:
        """
        Generate fake data matching the Jinja2 schema.
        
        Args:
            recording_path: Path to meeting recording (unused in mock implementation)
            jinja_shape: JSON schema describing required data structure
            
        Returns:
            FilledData: JSON object with generated values that conform to the schema
        """
        # In a real implementation, this would process the recording
        # For now, we generate fake data based on the schema
        
        if not jinja_shape or "properties" not in jinja_shape:
            return {}
        
        filled_data = {}
        properties = jinja_shape.get("properties", {})
        
        for prop_name, prop_spec in properties.items():
            filled_data[prop_name] = self._generate_value_for_type(prop_spec)
        
        return filled_data
    
    def _generate_value_for_type(self, type_spec: Dict[str, Any]) -> Any:
        """
        Generate appropriate faker data for a type specification.
        
        Args:
            type_spec: JSON schema type specification
            
        Returns:
            Generated value matching the type specification
        """
        type_name = type_spec.get("type")
        
        if type_name == "string":
            return self.faker.sentence()
        
        elif type_name == "number" or type_name == "integer":
            return self.faker.random_int(min=0, max=1000)
        
        elif type_name == "boolean":
            return self.faker.boolean()
        
        elif type_name == "array":
            # Generate a list of items
            items_spec = type_spec.get("items", {"type": "object"})
            # Generate 2-5 items for the array
            array_length = self.faker.random_int(min=2, max=5)
            return [self._generate_value_for_type(items_spec) for _ in range(array_length)]
        
        elif type_name == "object":
            # Generate nested object with properties
            obj = {}
            properties = type_spec.get("properties", {})
            for prop_name, prop_spec in properties.items():
                obj[prop_name] = self._generate_value_for_type(prop_spec)
            return obj
        
        else:
            # Default to string for unknown types
            return self.faker.sentence()
