"""Repository for template data access."""
from typing import List, Optional
from pathlib import Path
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Template
from app.schemas import TemplateCreate


class TemplateRepository:
    """Repository for managing template persistence."""
    
    def __init__(self, session: AsyncSession, storage_path: str):
        """
        Initialize the template repository.
        
        Args:
            session: Async SQLAlchemy session
            storage_path: Base path for file storage
        """
        self.session = session
        self.storage_path = storage_path
    
    async def create(
        self,
        template_data: TemplateCreate,
        file_path: str,
        jinja_shape: dict
    ) -> Template:
        """
        Create a new template record.
        
        Args:
            template_data: Template creation data
            file_path: Path where template file is stored
            jinja_shape: JSON schema of template variables
            
        Returns:
            Created template instance
        """
        template = Template(
            name=template_data.name,
            population_type=template_data.population_type.value,
            file_path=file_path,
            jinja_shape=jinja_shape
        )
        
        self.session.add(template)
        await self.session.commit()
        await self.session.refresh(template)
        
        return template
    
    async def get_by_id(self, template_id: int) -> Optional[Template]:
        """
        Retrieve template by ID.
        
        Args:
            template_id: Template identifier
            
        Returns:
            Template instance or None if not found
        """
        result = await self.session.execute(
            select(Template).where(Template.id == template_id)
        )
        return result.scalar_one_or_none()
    
    async def list_all(self) -> List[Template]:
        """
        List all templates.
        
        Returns:
            List of all template instances
        """
        result = await self.session.execute(select(Template))
        return list(result.scalars().all())
    
    async def delete(self, template_id: int) -> bool:
        """
        Delete template record and associated files.
        
        Args:
            template_id: Template identifier
            
        Returns:
            True if deleted, False if not found
        """
        template = await self.get_by_id(template_id)
        
        if not template:
            return False
        
        # Delete file from storage
        file_path = Path(template.file_path)
        if file_path.exists():
            file_path.unlink()
        
        # Delete template directory if empty
        template_dir = file_path.parent
        if template_dir.exists() and not any(template_dir.iterdir()):
            template_dir.rmdir()
        
        # Delete database record
        await self.session.delete(template)
        await self.session.commit()
        
        return True
    
    def get_storage_path(self, template_id: int) -> Path:
        """
        Get storage path for a template.
        
        Args:
            template_id: Template identifier
            
        Returns:
            Path object for template storage directory
        """
        return Path(self.storage_path) / "templates" / str(template_id)
