"""Validation utilities for file uploads and data validation."""
from typing import Dict, Any
from fastapi import UploadFile, HTTPException
from jsonschema import validate, ValidationError as JsonSchemaValidationError
from app.schemas import JinjaShape, FilledData


def validate_docx_file(file: UploadFile) -> None:
    """
    Validate that uploaded file is a .docx file.
    
    Args:
        file: Uploaded file to validate
        
    Raises:
        HTTPException: If file is not a valid .docx file
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    
    if not file.filename.endswith('.docx'):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only .docx files are accepted"
        )
    
    # Check content type if available
    if file.content_type and not file.content_type in [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/octet-stream'  # Some browsers send this for .docx
    ]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid content type: {file.content_type}. Expected .docx file"
        )


def validate_filled_data(filled_data: FilledData, jinja_shape: JinjaShape) -> None:
    """
    Validate that filled data conforms to the Jinja_Shape schema.
    
    Args:
        filled_data: Data to validate
        jinja_shape: JSON schema to validate against
        
    Raises:
        HTTPException: If data does not conform to schema
    """
    try:
        validate(instance=filled_data, schema=jinja_shape)
    except JsonSchemaValidationError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Data validation failed: {e.message}"
        )


async def validate_ai_template_constraint(
    meeting_id: int,
    template_population_type: str,
    existing_associations: list
) -> None:
    """
    Validate that only one AI template can be associated with a meeting.
    
    Args:
        meeting_id: Meeting identifier
        template_population_type: Population type of template being added
        existing_associations: List of existing template associations
        
    Raises:
        HTTPException: If constraint is violated
    """
    if template_population_type == "ai":
        # Check if an AI template is already associated
        for assoc in existing_associations:
            if assoc.template.population_type == "ai":
                raise HTTPException(
                    status_code=400,
                    detail="Meeting already has an AI template associated. Only one AI template per meeting is allowed"
                )
