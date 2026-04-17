"""Export OpenAPI specification from FastAPI app."""
import json
import yaml
from pathlib import Path
from app.main import app


def export_openapi():
    """Export OpenAPI spec to JSON and YAML formats."""
    # Get OpenAPI schema from FastAPI
    openapi_schema = app.openapi()
    
    # Export to JSON
    json_path = Path("openapi.json")
    with open(json_path, "w") as f:
        json.dump(openapi_schema, f, indent=2)
    print(f"✓ Exported OpenAPI spec to {json_path}")
    
    # Export to YAML
    yaml_path = Path("openapi.yaml")
    with open(yaml_path, "w") as f:
        yaml.dump(openapi_schema, f, sort_keys=False, allow_unicode=True)
    print(f"✓ Exported OpenAPI spec to {yaml_path}")
    
    # Print summary
    print(f"\n📊 API Summary:")
    print(f"   Title: {openapi_schema['info']['title']}")
    print(f"   Version: {openapi_schema['info']['version']}")
    print(f"   Endpoints: {len(openapi_schema['paths'])} paths")
    print(f"   Schemas: {len(openapi_schema['components']['schemas'])} models")
    
    print(f"\n🌐 View documentation:")
    print(f"   Swagger UI: http://localhost:8000/docs")
    print(f"   ReDoc: http://localhost:8000/redoc")


if __name__ == "__main__":
    export_openapi()
