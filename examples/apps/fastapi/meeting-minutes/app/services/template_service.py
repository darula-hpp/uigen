"""Service for template management business logic."""
from typing import List, Optional
from pathlib import Path
from fastapi import UploadFile, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.template_repository import TemplateRepository
from app.core.template_parser import TemplateParser
from app.schemas import TemplateCreate, Template, PopulationType
from app.utils.validation import validate_docx_file
from app.exceptions import InvalidTemplateError


class TemplateService:
    """Service for managing template operations."""
    
    def __init__(
        self,
        session: AsyncSession,
        storage_path: str
    ):
        """
        Initialize the template service.
        
        Args:
            session: Async SQLAlchemy session
            storage_path: Base path for file storage
        """
        self.repository = TemplateRepository(session, storage_path)
        self.parser = TemplateParser()
        self.storage_path = storage_path
    
    async def upload_template(
        self,
        user_id: int,
        file: UploadFile,
        name: str,
        population_type: PopulationType
    ) -> Template:
        """
        Upload and process a new template.
        
        Args:
            user_id: User identifier who owns the template
            file: Uploaded .docx file
            name: Template name
            population_type: How template will be populated (ai or manual)
            
        Returns:
            Created template instance
            
        Raises:
            HTTPException: If file is invalid or processing fails
        """
        # Validate file type
        validate_docx_file(file)
        
        # Create template record first to get ID
        template_data = TemplateCreate(name=name, population_type=population_type)
        
        # Create temporary template to get ID (we'll update file_path after saving)
        temp_template = await self.repository.create(
            user_id=user_id,
            name=template_data.name,
            population_type=template_data.population_type,
            file_path="",  # Temporary, will update
            jinja_shape={}  # Temporary, will update
        )
        
        try:
            # Save file to storage
            storage_dir = self.repository.get_template_storage_path(temp_template.id)
            storage_dir.mkdir(parents=True, exist_ok=True)
            
            file_path = storage_dir / f"{temp_template.id}_original.docx"
            
            # Write file contents
            contents = await file.read()
            with open(file_path, "wb") as f:
                f.write(contents)
            
            # Extract Jinja2 variables
            try:
                jinja_shape = await self.parser.extract_variables(str(file_path))
            except InvalidTemplateError as e:
                # Clean up file and database record
                file_path.unlink()
                storage_dir.rmdir()
                await self.repository.delete(temp_template.id)
                raise HTTPException(status_code=400, detail=str(e))
            
            # Update template with file path and jinja shape
            temp_template.file_path = str(file_path)
            temp_template.jinja_shape = jinja_shape
            await self.repository.session.commit()
            await self.repository.session.refresh(temp_template)
            
            return temp_template
            
        except HTTPException:
            raise
        except Exception as e:
            # Clean up on error
            if file_path.exists():
                file_path.unlink()
            if storage_dir.exists() and not any(storage_dir.iterdir()):
                storage_dir.rmdir()
            await self.repository.delete(temp_template.id)
            raise HTTPException(status_code=500, detail=f"Failed to process template: {str(e)}")
    
    async def get_template(self, template_id: int, user_id: Optional[int] = None) -> Template:
        """
        Retrieve template by ID.
        
        Args:
            template_id: Template identifier
            user_id: Optional user identifier to verify ownership
            
        Returns:
            Template instance
            
        Raises:
            HTTPException: If template not found
        """
        template = await self.repository.get_by_id(template_id, user_id)
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        return template
    
    async def list_templates(self, user_id: Optional[int] = None) -> List[Template]:
        """
        List all templates.
        
        Args:
            user_id: Optional user identifier to filter by ownership
        
        Returns:
            List of all templates
        """
        return await self.repository.list_all(user_id)
    
    async def delete_template(self, template_id: int, user_id: Optional[int] = None) -> None:
        """
        Delete template and associated files.
        
        Args:
            template_id: Template identifier
            user_id: Optional user identifier to verify ownership
            
        Raises:
            HTTPException: If template not found
        """
        deleted = await self.repository.delete(template_id, user_id)
        
        if not deleted:
            raise HTTPException(status_code=404, detail="Template not found")
