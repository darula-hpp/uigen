"""Template repository for database operations."""
from typing import Optional, List
from pathlib import Path
import shutil

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Template
from app.schemas import TemplateCreate, PopulationType


class TemplateRepository:
    """Repository for template data access operations."""
    
    def __init__(self, session: AsyncSession, storage_path: str = "/data/uploads"):
        """
        Initialize template repository.
        
        Args:
            session: Async database session
            storage_path: Base path for file storage
        """
        self.session = session
        self.storage_path = Path(storage_path)
        self.templates_dir = self.storage_path / "templates"
        self.templates_dir.mkdir(parents=True, exist_ok=True)
    
    async def create(
        self,
        user_id: int,
        name: str,
        population_type: PopulationType,
        file_path: str,
        jinja_shape: dict
    ) -> Template:
        """
        Create a new template record.
        
        Args:
            user_id: User identifier who owns the template
            name: Template name
            population_type: Population type (ai or manual)
            file_path: Path to stored template file
            jinja_shape: JSON schema of template variables
            
        Returns:
            Template: Created template instance
        """
        template = Template(
            user_id=user_id,
            name=name,
            population_type=population_type.value,
            file_path=file_path,
            jinja_shape=jinja_shape
        )
        
        self.session.add(template)
        await self.session.flush()
        await self.session.refresh(template)
        
        return template
    
    async def get_by_id(self, template_id: int, user_id: Optional[int] = None) -> Optional[Template]:
        """
        Retrieve a template by ID.
        
        Args:
            template_id: Template identifier
            user_id: Optional user identifier to filter by ownership
            
        Returns:
            Optional[Template]: Template instance or None if not found
        """
        query = select(Template).where(Template.id == template_id)
        
        if user_id is not None:
            query = query.where(Template.user_id == user_id)
        
        result = await self.session.execute(query)
        return result.scalar_one_or_none()
    
    async def list_all(self, user_id: Optional[int] = None) -> List[Template]:
        """
        List all templates.
        
        Args:
            user_id: Optional user identifier to filter by ownership
        
        Returns:
            List[Template]: List of all template instances
        """
        query = select(Template)
        
        if user_id is not None:
            query = query.where(Template.user_id == user_id)
        
        result = await self.session.execute(query)
        return list(result.scalars().all())
    
    async def delete(self, template_id: int, user_id: Optional[int] = None) -> bool:
        """
        Delete a template record and associated files.
        
        Args:
            template_id: Template identifier
            user_id: Optional user identifier to verify ownership
            
        Returns:
            bool: True if deleted, False if not found
        """
        template = await self.get_by_id(template_id, user_id)
        
        if not template:
            return False
        
        # Delete associated files
        template_dir = self.templates_dir / str(template_id)
        if template_dir.exists():
            shutil.rmtree(template_dir)
        
        # Delete database record
        await self.session.delete(template)
        await self.session.flush()
        
        return True
    
    def get_template_storage_path(self, template_id: int) -> Path:
        """
        Get the storage directory path for a template.
        
        Args:
            template_id: Template identifier
            
        Returns:
            Path: Directory path for template files
        """
        template_dir = self.templates_dir / str(template_id)
        template_dir.mkdir(parents=True, exist_ok=True)
        return template_dir
    
    def get_template_file_path(self, template_id: int) -> Path:
        """
        Get the file path for a template's .docx file.
        
        Args:
            template_id: Template identifier
            
        Returns:
            Path: Full path to template .docx file
        """
        return self.get_template_storage_path(template_id) / f"{template_id}_original.docx"
