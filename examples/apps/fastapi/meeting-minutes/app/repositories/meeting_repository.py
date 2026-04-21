"""Repository for meeting data access."""
from typing import List, Optional
from pathlib import Path
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Meeting, MeetingTemplateAssociation
from app.schemas import MeetingCreate, MeetingUpdate


class MeetingRepository:
    """Repository for managing meeting persistence."""
    
    def __init__(self, session: AsyncSession, storage_path: str):
        """
        Initialize the meeting repository.
        
        Args:
            session: Async SQLAlchemy session
            storage_path: Base path for file storage
        """
        self.session = session
        self.storage_path = storage_path
    
    async def create(
        self,
        user_id: int,
        meeting_data: MeetingCreate,
        recording_path: Optional[str] = None
    ) -> Meeting:
        """
        Create a new meeting record.
        
        Args:
            user_id: User identifier who owns the meeting
            meeting_data: Meeting creation data
            recording_path: Optional path to recording file
            
        Returns:
            Created meeting instance
        """
        meeting = Meeting(
            user_id=user_id,
            title=meeting_data.title,
            datetime=meeting_data.datetime,
            recording_path=recording_path
        )
        
        self.session.add(meeting)
        await self.session.commit()
        await self.session.refresh(meeting)
        
        return meeting
    
    async def get_by_id(self, meeting_id: int, load_associations: bool = False, user_id: Optional[int] = None) -> Optional[Meeting]:
        """
        Retrieve meeting by ID.
        
        Args:
            meeting_id: Meeting identifier
            load_associations: Whether to eagerly load template associations
            user_id: Optional user identifier to filter by ownership
            
        Returns:
            Meeting instance or None if not found
        """
        query = select(Meeting).where(Meeting.id == meeting_id)
        
        if user_id is not None:
            query = query.where(Meeting.user_id == user_id)
        
        if load_associations:
            query = query.options(
                selectinload(Meeting.associations).selectinload(MeetingTemplateAssociation.template)
            )
        
        result = await self.session.execute(query)
        return result.scalar_one_or_none()
    
    async def list_all(self, user_id: Optional[int] = None) -> List[Meeting]:
        """
        List all meetings.
        
        Args:
            user_id: Optional user identifier to filter by ownership
        
        Returns:
            List of all meeting instances
        """
        query = select(Meeting)
        
        if user_id is not None:
            query = query.where(Meeting.user_id == user_id)
        
        result = await self.session.execute(query)
        return list(result.scalars().all())
    
    async def update(self, meeting_id: int, meeting_data: MeetingUpdate, user_id: Optional[int] = None) -> Optional[Meeting]:
        """
        Update meeting metadata.
        
        Args:
            meeting_id: Meeting identifier
            meeting_data: Updated meeting data
            user_id: Optional user identifier to verify ownership
            
        Returns:
            Updated meeting instance or None if not found
        """
        meeting = await self.get_by_id(meeting_id, user_id=user_id)
        
        if not meeting:
            return None
        
        # Update fields if provided
        if meeting_data.title is not None:
            meeting.title = meeting_data.title
        if meeting_data.datetime is not None:
            meeting.datetime = meeting_data.datetime
        
        await self.session.commit()
        await self.session.refresh(meeting)
        
        return meeting
    
    async def delete(self, meeting_id: int, user_id: Optional[int] = None) -> bool:
        """
        Delete meeting record and associated files.
        
        Args:
            meeting_id: Meeting identifier
            user_id: Optional user identifier to verify ownership
            
        Returns:
            True if deleted, False if not found
        """
        meeting = await self.get_by_id(meeting_id, user_id=user_id)
        
        if not meeting:
            return False
        
        # Delete recording file if exists
        if meeting.recording_path:
            recording_path = Path(meeting.recording_path)
            if recording_path.exists():
                recording_path.unlink()
        
        # Delete meeting directory if exists
        meeting_dir = self.get_storage_path(meeting_id)
        if meeting_dir.exists():
            # Remove all files in directory
            for file_path in meeting_dir.iterdir():
                if file_path.is_file():
                    file_path.unlink()
            # Remove directory if empty
            if not any(meeting_dir.iterdir()):
                meeting_dir.rmdir()
        
        # Delete database record (cascades to associations and documents)
        await self.session.delete(meeting)
        await self.session.commit()
        
        return True
    
    async def add_template_association(
        self,
        meeting_id: int,
        template_id: int,
        order_index: int
    ) -> MeetingTemplateAssociation:
        """
        Associate a template with a meeting.
        
        Args:
            meeting_id: Meeting identifier
            template_id: Template identifier
            order_index: Order index for document generation
            
        Returns:
            Created association instance
        """
        association = MeetingTemplateAssociation(
            meeting_id=meeting_id,
            template_id=template_id,
            order_index=order_index
        )
        
        self.session.add(association)
        await self.session.commit()
        await self.session.refresh(association)
        
        return association
    
    async def remove_template_association(
        self,
        meeting_id: int,
        template_id: int
    ) -> bool:
        """
        Remove template association from a meeting.
        
        Args:
            meeting_id: Meeting identifier
            template_id: Template identifier
            
        Returns:
            True if removed, False if not found
        """
        result = await self.session.execute(
            select(MeetingTemplateAssociation).where(
                MeetingTemplateAssociation.meeting_id == meeting_id,
                MeetingTemplateAssociation.template_id == template_id
            )
        )
        association = result.scalar_one_or_none()
        
        if not association:
            return False
        
        await self.session.delete(association)
        await self.session.commit()
        
        return True
    
    async def get_associations(
        self,
        meeting_id: int
    ) -> List[MeetingTemplateAssociation]:
        """
        Get all template associations for a meeting.
        
        Args:
            meeting_id: Meeting identifier
            
        Returns:
            List of association instances with templates loaded
        """
        result = await self.session.execute(
            select(MeetingTemplateAssociation)
            .where(MeetingTemplateAssociation.meeting_id == meeting_id)
            .options(selectinload(MeetingTemplateAssociation.template))
            .order_by(MeetingTemplateAssociation.order_index)
        )
        return list(result.scalars().all())
    
    async def get_association(
        self,
        meeting_id: int,
        template_id: int
    ) -> Optional[MeetingTemplateAssociation]:
        """
        Get a specific template association.
        
        Args:
            meeting_id: Meeting identifier
            template_id: Template identifier
            
        Returns:
            Association instance or None if not found
        """
        result = await self.session.execute(
            select(MeetingTemplateAssociation).where(
                MeetingTemplateAssociation.meeting_id == meeting_id,
                MeetingTemplateAssociation.template_id == template_id
            )
        )
        return result.scalar_one_or_none()
    
    async def update_filled_data(
        self,
        meeting_id: int,
        template_id: int,
        filled_data: dict
    ) -> Optional[MeetingTemplateAssociation]:
        """
        Update filled data for a template association.
        
        Args:
            meeting_id: Meeting identifier
            template_id: Template identifier
            filled_data: Data to fill template variables
            
        Returns:
            Updated association or None if not found
        """
        association = await self.get_association(meeting_id, template_id)
        
        if not association:
            return None
        
        association.filled_data = filled_data
        await self.session.commit()
        await self.session.refresh(association)
        
        return association
    
    def get_storage_path(self, meeting_id: int) -> Path:
        """
        Get storage path for a meeting.
        
        Args:
            meeting_id: Meeting identifier
            
        Returns:
            Path object for meeting storage directory
        """
        return Path(self.storage_path) / "meetings" / str(meeting_id)
