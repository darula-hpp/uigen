"""API routes for template management."""
from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.config import get_settings
from app.services.template_service import TemplateService
from app.schemas import Template, PopulationType
from app.dependencies.auth import get_current_user
from app.models import User

router = APIRouter(prefix="/api/v1/templates", tags=["templates"])


@router.post("", response_model=Template, status_code=status.HTTP_201_CREATED)
async def upload_template(
    file: UploadFile = File(...),
    name: str = Form(...),
    population_type: PopulationType = Form(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a new template.
    
    Args:
        file: Word document (.docx) with Jinja2 variables
        name: Template name
        population_type: How template will be populated (ai or manual)
        db: Database session
        current_user: Authenticated user
        
    Returns:
        Created template with extracted Jinja2 schema
    """
    settings = get_settings()
    service = TemplateService(db, settings.UPLOAD_DIR)
    return await service.upload_template(current_user.id, file, name, population_type)


@router.get("", response_model=List[Template])
async def list_templates(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all templates.
    
    Args:
        db: Database session
        current_user: Authenticated user
        
    Returns:
        List of all templates owned by the user
    """
    settings = get_settings()
    service = TemplateService(db, settings.UPLOAD_DIR)
    return await service.list_templates(current_user.id)


@router.get("/{template_id}", response_model=Template)
async def get_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get template by ID.
    
    Args:
        template_id: Template identifier
        db: Database session
        current_user: Authenticated user
        
    Returns:
        Template details
    """
    settings = get_settings()
    service = TemplateService(db, settings.UPLOAD_DIR)
    return await service.get_template(template_id, current_user.id)


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a template.
    
    Args:
        template_id: Template identifier
        db: Database session
        current_user: Authenticated user
        
    Returns:
        No content on success
    """
    settings = get_settings()
    service = TemplateService(db, settings.UPLOAD_DIR)
    await service.delete_template(template_id, current_user.id)
