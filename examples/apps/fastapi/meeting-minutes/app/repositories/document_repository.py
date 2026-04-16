"""Repository for generated document data access."""
from typing import List, Optional
from pathlib import Path
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import GeneratedDocument


class DocumentRepository:
    """Repository for managing generated document persistence."""
    
    def __init__(self, session: AsyncSession, storage_path: str):
        """
        Initialize the document repository.
        
        Args:
            session: Async SQLAlchemy session
            storage_path: Base path for file storage
        """
        self.session = session
        self.storage_path = storage_path
    
    async def create(
        self,
        meeting_id: int,
        template_id: int,
        docx_path: str
    ) -> GeneratedDocument:
        """
        Create a new generated document record.
        
        Args:
            meeting_id: Meeting identifier
            template_id: Template identifier
            docx_path: Path to generated .docx file
            
        Returns:
            Created document instance
        """
        document = GeneratedDocument(
            meeting_id=meeting_id,
            template_id=template_id,
            docx_path=docx_path
        )
        
        self.session.add(document)
        await self.session.commit()
        await self.session.refresh(document)
        
        return document
    
    async def get_by_meeting_id(self, meeting_id: int) -> List[GeneratedDocument]:
        """
        Get all generated documents for a meeting.
        
        Args:
            meeting_id: Meeting identifier
            
        Returns:
            List of document instances
        """
        result = await self.session.execute(
            select(GeneratedDocument).where(
                GeneratedDocument.meeting_id == meeting_id
            )
        )
        return list(result.scalars().all())
    
    async def get_by_meeting_and_template(
        self,
        meeting_id: int,
        template_id: int
    ) -> Optional[GeneratedDocument]:
        """
        Get a specific generated document.
        
        Args:
            meeting_id: Meeting identifier
            template_id: Template identifier
            
        Returns:
            Document instance or None if not found
        """
        result = await self.session.execute(
            select(GeneratedDocument).where(
                GeneratedDocument.meeting_id == meeting_id,
                GeneratedDocument.template_id == template_id
            )
        )
        return result.scalar_one_or_none()
    
    async def update_pdf_path(
        self,
        meeting_id: int,
        template_id: int,
        pdf_path: str
    ) -> Optional[GeneratedDocument]:
        """
        Update PDF path for a generated document.
        
        Args:
            meeting_id: Meeting identifier
            template_id: Template identifier
            pdf_path: Path to generated PDF file
            
        Returns:
            Updated document instance or None if not found
        """
        document = await self.get_by_meeting_and_template(meeting_id, template_id)
        
        if not document:
            return None
        
        document.pdf_path = pdf_path
        await self.session.commit()
        await self.session.refresh(document)
        
        return document
    
    def get_storage_path(self, meeting_id: int) -> Path:
        """
        Get storage path for meeting documents.
        
        Args:
            meeting_id: Meeting identifier
            
        Returns:
            Path object for document storage directory
        """
        return Path(self.storage_path) / "documents" / str(meeting_id)
