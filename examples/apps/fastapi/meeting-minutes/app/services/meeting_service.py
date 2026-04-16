"""Service for meeting management business logic."""
from typing import List, Optional
from pathlib import Path
from datetime import datetime
from fastapi import UploadFile, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.meeting_repository import MeetingRepository
from app.repositories.template_repository import TemplateRepository
from app.core.ai_service import AIService
from app.schemas import (
    MeetingCreate,
    MeetingUpdate,
    Meeting,
    AssociationCreate,
    Association,
    FilledData
)
from app.utils.validation import validate_ai_template_constraint, validate_filled_data


class MeetingService:
    """Service for managing meeting operations."""
    
    def __init__(
        self,
        session: AsyncSession,
        storage_path: str
    ):
        """
        Initialize the meeting service.
        
        Args:
            session: Async SQLAlchemy session
            storage_path: Base path for file storage
        """
        self.meeting_repo = MeetingRepository(session, storage_path)
        self.template_repo = TemplateRepository(session, storage_path)
        self.ai_service = AIService()
        self.storage_path = storage_path
    
    async def create_meeting(
        self,
        title: str,
        meeting_datetime: datetime,
        recording: Optional[UploadFile] = None
    ) -> Meeting:
        """
        Create a new meeting.
        
        Args:
            title: Meeting title
            meeting_datetime: Meeting date and time
            recording: Optional recording file
            
        Returns:
            Created meeting instance
        """
        meeting_data = MeetingCreate(title=title, datetime=meeting_datetime)
        
        # Create meeting record first to get ID
        meeting = await self.meeting_repo.create(meeting_data)
        
        # Save recording if provided
        if recording:
            try:
                storage_dir = self.meeting_repo.get_storage_path(meeting.id)
                storage_dir.mkdir(parents=True, exist_ok=True)
                
                # Determine file extension
                file_ext = Path(recording.filename).suffix if recording.filename else ".mp3"
                recording_path = storage_dir / f"{meeting.id}_recording{file_ext}"
                
                # Write file contents
                contents = await recording.read()
                with open(recording_path, "wb") as f:
                    f.write(contents)
                
                # Update meeting with recording path
                meeting.recording_path = str(recording_path)
                await self.meeting_repo.session.commit()
                await self.meeting_repo.session.refresh(meeting)
                
            except Exception as e:
                # Clean up on error
                if recording_path.exists():
                    recording_path.unlink()
                raise HTTPException(status_code=500, detail=f"Failed to save recording: {str(e)}")
        
        return meeting
    
    async def get_meeting(self, meeting_id: int) -> Meeting:
        """
        Retrieve meeting by ID.
        
        Args:
            meeting_id: Meeting identifier
            
        Returns:
            Meeting instance
            
        Raises:
            HTTPException: If meeting not found
        """
        meeting = await self.meeting_repo.get_by_id(meeting_id)
        
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        return meeting
    
    async def list_meetings(self) -> List[Meeting]:
        """
        List all meetings.
        
        Returns:
            List of all meetings
        """
        return await self.meeting_repo.list_all()
    
    async def update_meeting(
        self,
        meeting_id: int,
        meeting_data: MeetingUpdate
    ) -> Meeting:
        """
        Update meeting metadata.
        
        Args:
            meeting_id: Meeting identifier
            meeting_data: Updated meeting data
            
        Returns:
            Updated meeting instance
            
        Raises:
            HTTPException: If meeting not found
        """
        meeting = await self.meeting_repo.update(meeting_id, meeting_data)
        
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        return meeting
    
    async def delete_meeting(self, meeting_id: int) -> None:
        """
        Delete meeting and associated files.
        
        Args:
            meeting_id: Meeting identifier
            
        Raises:
            HTTPException: If meeting not found
        """
        deleted = await self.meeting_repo.delete(meeting_id)
        
        if not deleted:
            raise HTTPException(status_code=404, detail="Meeting not found")
    
    async def associate_template(
        self,
        meeting_id: int,
        association_data: AssociationCreate
    ) -> Association:
        """
        Associate a template with a meeting.
        
        Args:
            meeting_id: Meeting identifier
            association_data: Association creation data
            
        Returns:
            Created association instance
            
        Raises:
            HTTPException: If meeting/template not found or constraint violated
        """
        # Validate meeting exists
        meeting = await self.meeting_repo.get_by_id(meeting_id)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        # Validate template exists
        template = await self.template_repo.get_by_id(association_data.template_id)
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Get existing associations
        existing_associations = await self.meeting_repo.get_associations(meeting_id)
        
        # Validate AI template constraint
        await validate_ai_template_constraint(
            meeting_id,
            template.population_type,
            existing_associations
        )
        
        # Create association
        try:
            association = await self.meeting_repo.add_template_association(
                meeting_id,
                association_data.template_id,
                association_data.order_index
            )
            
            # Reload with template data
            association = await self.meeting_repo.get_association(
                meeting_id,
                association_data.template_id
            )
            
            return association
            
        except Exception as e:
            # Handle unique constraint violations
            if "uq_meeting_template" in str(e):
                raise HTTPException(
                    status_code=400,
                    detail="Template is already associated with this meeting"
                )
            elif "uq_meeting_order" in str(e):
                raise HTTPException(
                    status_code=400,
                    detail="Order index is already used for this meeting"
                )
            raise HTTPException(status_code=500, detail=f"Failed to create association: {str(e)}")
    
    async def remove_template_association(
        self,
        meeting_id: int,
        template_id: int
    ) -> None:
        """
        Remove template association from a meeting.
        
        Args:
            meeting_id: Meeting identifier
            template_id: Template identifier
            
        Raises:
            HTTPException: If association not found
        """
        removed = await self.meeting_repo.remove_template_association(meeting_id, template_id)
        
        if not removed:
            raise HTTPException(status_code=404, detail="Association not found")
    
    async def generate_ai_data(self, meeting_id: int) -> FilledData:
        """
        Generate AI data for meeting's AI template.
        
        Args:
            meeting_id: Meeting identifier
            
        Returns:
            Generated filled data
            
        Raises:
            HTTPException: If no AI template or recording missing
        """
        # Get meeting
        meeting = await self.meeting_repo.get_by_id(meeting_id)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        # Check recording exists
        if not meeting.recording_path:
            raise HTTPException(
                status_code=400,
                detail="Meeting has no recording. Recording is required for AI data generation"
            )
        
        # Get associations
        associations = await self.meeting_repo.get_associations(meeting_id)
        
        # Find AI template
        ai_association = None
        for assoc in associations:
            if assoc.template.population_type == "ai":
                ai_association = assoc
                break
        
        if not ai_association:
            raise HTTPException(
                status_code=400,
                detail="Meeting has no AI template associated"
            )
        
        # Generate data
        filled_data = await self.ai_service.generate_data(
            meeting.recording_path,
            ai_association.template.jinja_shape
        )
        
        # Store filled data
        await self.meeting_repo.update_filled_data(
            meeting_id,
            ai_association.template_id,
            filled_data
        )
        
        return filled_data
    
    async def submit_manual_data(
        self,
        meeting_id: int,
        template_id: int,
        filled_data: FilledData
    ) -> None:
        """
        Submit manual data for a template.
        
        Args:
            meeting_id: Meeting identifier
            template_id: Template identifier
            filled_data: Data to fill template variables
            
        Raises:
            HTTPException: If association not found or data invalid
        """
        # Get association
        association = await self.meeting_repo.get_association(meeting_id, template_id)
        if not association:
            raise HTTPException(status_code=404, detail="Template association not found")
        
        # Get template to validate data
        template = await self.template_repo.get_by_id(template_id)
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Validate data against Jinja shape
        validate_filled_data(filled_data, template.jinja_shape)
        
        # Store filled data
        await self.meeting_repo.update_filled_data(meeting_id, template_id, filled_data)
    
    async def get_filled_data(
        self,
        meeting_id: int,
        template_id: int
    ) -> Optional[FilledData]:
        """
        Get current filled data for a template.
        
        Args:
            meeting_id: Meeting identifier
            template_id: Template identifier
            
        Returns:
            Filled data or None if not set
            
        Raises:
            HTTPException: If association not found
        """
        association = await self.meeting_repo.get_association(meeting_id, template_id)
        if not association:
            raise HTTPException(status_code=404, detail="Template association not found")
        
        return association.filled_data
    
    async def get_associations(self, meeting_id: int) -> List[Association]:
        """
        Get all template associations for a meeting.
        
        Args:
            meeting_id: Meeting identifier
            
        Returns:
            List of associations
            
        Raises:
            HTTPException: If meeting not found
        """
        # Validate meeting exists
        meeting = await self.meeting_repo.get_by_id(meeting_id)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        return await self.meeting_repo.get_associations(meeting_id)
