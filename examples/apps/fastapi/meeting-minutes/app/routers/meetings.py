"""API routes for meeting management."""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, UploadFile, File, Form, Body, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.config import get_settings
from app.services.meeting_service import MeetingService
from app.schemas import (
    Meeting,
    MeetingUpdate,
    AssociationCreate,
    Association,
    DataSubmission,
    FilledData
)
from app.dependencies.auth import get_current_user
from app.models import User

router = APIRouter(prefix="/api/v1/meetings", tags=["meetings"])


@router.post("", response_model=Meeting, status_code=status.HTTP_201_CREATED)
async def create_meeting(
    title: str = Form(...),
    datetime: datetime = Form(...),
    recording: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new meeting.
    
    Args:
        title: Meeting title
        datetime: Meeting date and time
        recording: Optional audio recording file
        db: Database session
        current_user: Authenticated user
        
    Returns:
        Created meeting
    """
    settings = get_settings()
    service = MeetingService(db, settings.UPLOAD_DIR)
    return await service.create_meeting(current_user.id, title, datetime, recording)


@router.get("", response_model=List[Meeting])
async def list_meetings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all meetings.
    
    Args:
        db: Database session
        current_user: Authenticated user
        
    Returns:
        List of all meetings owned by the user
    """
    settings = get_settings()
    service = MeetingService(db, settings.UPLOAD_DIR)
    return await service.list_meetings(current_user.id)


@router.get("/{meeting_id}", response_model=Meeting)
async def get_meeting(
    meeting_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get meeting by ID.
    
    Args:
        meeting_id: Meeting identifier
        db: Database session
        current_user: Authenticated user
        
    Returns:
        Meeting details
    """
    settings = get_settings()
    service = MeetingService(db, settings.UPLOAD_DIR)
    return await service.get_meeting(meeting_id, current_user.id)


@router.put("/{meeting_id}", response_model=Meeting)
async def update_meeting(
    meeting_id: int,
    meeting_data: MeetingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update meeting metadata.
    
    Args:
        meeting_id: Meeting identifier
        meeting_data: Updated meeting data
        db: Database session
        current_user: Authenticated user
        
    Returns:
        Updated meeting
    """
    settings = get_settings()
    service = MeetingService(db, settings.UPLOAD_DIR)
    return await service.update_meeting(meeting_id, meeting_data, current_user.id)


@router.delete("/{meeting_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_meeting(
    meeting_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a meeting.
    
    Args:
        meeting_id: Meeting identifier
        db: Database session
        current_user: Authenticated user
        
    Returns:
        No content on success
    """
    settings = get_settings()
    service = MeetingService(db, settings.UPLOAD_DIR)
    await service.delete_meeting(meeting_id, current_user.id)


# Template Association Endpoints

@router.post("/{meeting_id}/templates", response_model=Association, status_code=status.HTTP_201_CREATED)
async def associate_template(
    meeting_id: int,
    association_data: AssociationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Associate a template with a meeting.
    
    Args:
        meeting_id: Meeting identifier
        association_data: Template ID and order index
        db: Database session
        current_user: Authenticated user
        
    Returns:
        Created association
    """
    settings = get_settings()
    service = MeetingService(db, settings.UPLOAD_DIR)
    # Verify user owns the meeting
    await service.get_meeting(meeting_id, current_user.id)
    return await service.associate_template(meeting_id, association_data)


@router.delete("/{meeting_id}/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_template_association(
    meeting_id: int,
    template_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Remove template association from a meeting.
    
    Args:
        meeting_id: Meeting identifier
        template_id: Template identifier
        db: Database session
        current_user: Authenticated user
        
    Returns:
        No content on success
    """
    settings = get_settings()
    service = MeetingService(db, settings.UPLOAD_DIR)
    # Verify user owns the meeting
    await service.get_meeting(meeting_id, current_user.id)
    await service.remove_template_association(meeting_id, template_id)


@router.get("/{meeting_id}/templates", response_model=List[Association])
async def get_template_associations(
    meeting_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all template associations for a meeting.
    
    Args:
        meeting_id: Meeting identifier
        db: Database session
        current_user: Authenticated user
        
    Returns:
        List of template associations
    """
    settings = get_settings()
    service = MeetingService(db, settings.UPLOAD_DIR)
    # Verify user owns the meeting
    await service.get_meeting(meeting_id, current_user.id)
    return await service.get_associations(meeting_id)


# Data Generation Endpoints

@router.post("/{meeting_id}/generate-ai-data", response_model=FilledData)
async def generate_ai_data(
    meeting_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate AI data for meeting's AI template.
    
    Args:
        meeting_id: Meeting identifier
        db: Database session
        current_user: Authenticated user
        
    Returns:
        Generated filled data
    """
    settings = get_settings()
    service = MeetingService(db, settings.UPLOAD_DIR)
    # Verify user owns the meeting
    await service.get_meeting(meeting_id, current_user.id)
    return await service.generate_ai_data(meeting_id)


@router.post("/{meeting_id}/templates/{template_id}/data", status_code=status.HTTP_200_OK)
async def submit_manual_data(
    meeting_id: int,
    template_id: int,
    data_submission: DataSubmission,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Submit manual data for a template.
    
    Args:
        meeting_id: Meeting identifier
        template_id: Template identifier
        data_submission: Filled data for template variables
        db: Database session
        current_user: Authenticated user
        
    Returns:
        Success message
    """
    settings = get_settings()
    service = MeetingService(db, settings.UPLOAD_DIR)
    # Verify user owns the meeting
    await service.get_meeting(meeting_id, current_user.id)
    await service.submit_manual_data(meeting_id, template_id, data_submission.filled_data)
    return {"message": "Data submitted successfully"}


@router.get("/{meeting_id}/templates/{template_id}/data", response_model=FilledData)
async def get_filled_data(
    meeting_id: int,
    template_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get current filled data for a template.
    
    Args:
        meeting_id: Meeting identifier
        template_id: Template identifier
        db: Database session
        current_user: Authenticated user
        
    Returns:
        Filled data or empty object if not set
    """
    settings = get_settings()
    service = MeetingService(db, settings.UPLOAD_DIR)
    # Verify user owns the meeting
    await service.get_meeting(meeting_id, current_user.id)
    filled_data = await service.get_filled_data(meeting_id, template_id)
    return filled_data if filled_data else {}
