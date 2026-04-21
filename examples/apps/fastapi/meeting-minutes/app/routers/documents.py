"""API routes for document generation."""
from typing import List
from fastapi import APIRouter, Depends, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.config import get_settings
from app.services.document_service import DocumentService
from app.services.meeting_service import MeetingService
from app.schemas import GeneratedDocumentSchema
from app.dependencies.auth import get_current_user
from app.models import User

router = APIRouter(prefix="/api/v1/meetings", tags=["documents"])


@router.post("/{meeting_id}/generate-documents", response_model=List[GeneratedDocumentSchema])
async def generate_documents(
    meeting_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate Word documents for all templates in a meeting.
    
    Args:
        meeting_id: Meeting identifier
        db: Database session
        current_user: Authenticated user
        
    Returns:
        List of generated document records
    """
    settings = get_settings()
    # Verify user owns the meeting
    meeting_service = MeetingService(db, settings.UPLOAD_DIR)
    await meeting_service.get_meeting(meeting_id, current_user.id)
    
    service = DocumentService(db, settings.UPLOAD_DIR)
    return await service.generate_documents(meeting_id)


@router.post("/{meeting_id}/convert-to-pdf", response_model=List[GeneratedDocumentSchema])
async def convert_to_pdf(
    meeting_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Convert all meeting documents to PDF format.
    
    Args:
        meeting_id: Meeting identifier
        db: Database session
        current_user: Authenticated user
        
    Returns:
        List of document records with PDF paths
    """
    settings = get_settings()
    # Verify user owns the meeting
    meeting_service = MeetingService(db, settings.UPLOAD_DIR)
    await meeting_service.get_meeting(meeting_id, current_user.id)
    
    service = DocumentService(db, settings.UPLOAD_DIR)
    return await service.convert_to_pdfs(meeting_id)


@router.get("/{meeting_id}/download-pdf")
async def download_merged_pdf(
    meeting_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Download merged PDF of all meeting documents.
    
    Args:
        meeting_id: Meeting identifier
        db: Database session
        current_user: Authenticated user
        
    Returns:
        Merged PDF file
    """
    settings = get_settings()
    # Verify user owns the meeting
    meeting_service = MeetingService(db, settings.UPLOAD_DIR)
    await meeting_service.get_meeting(meeting_id, current_user.id)
    
    service = DocumentService(db, settings.UPLOAD_DIR)
    pdf_bytes = await service.get_merged_pdf(meeting_id)
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=meeting_{meeting_id}_minutes.pdf"
        }
    )
