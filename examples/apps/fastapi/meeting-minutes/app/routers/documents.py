"""API routes for document generation."""
from typing import List
from fastapi import APIRouter, Depends, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.config import get_settings
from app.services.document_service import DocumentService
from app.schemas import GeneratedDocumentSchema

router = APIRouter(prefix="/api/v1/meetings", tags=["documents"])


@router.post("/{meeting_id}/generate-documents", response_model=List[GeneratedDocumentSchema])
async def generate_documents(
    meeting_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Generate Word documents for all templates in a meeting.
    
    Args:
        meeting_id: Meeting identifier
        db: Database session
        
    Returns:
        List of generated document records
    """
    settings = get_settings()
    service = DocumentService(db, settings.UPLOAD_DIR)
    return await service.generate_documents(meeting_id)


@router.post("/{meeting_id}/convert-to-pdf", response_model=List[GeneratedDocumentSchema])
async def convert_to_pdf(
    meeting_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Convert all meeting documents to PDF format.
    
    Args:
        meeting_id: Meeting identifier
        db: Database session
        
    Returns:
        List of document records with PDF paths
    """
    settings = get_settings()
    service = DocumentService(db, settings.UPLOAD_DIR)
    return await service.convert_to_pdfs(meeting_id)


@router.get("/{meeting_id}/download-pdf")
async def download_merged_pdf(
    meeting_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Download merged PDF of all meeting documents.
    
    Args:
        meeting_id: Meeting identifier
        db: Database session
        
    Returns:
        Merged PDF file
    """
    settings = get_settings()
    service = DocumentService(db, settings.UPLOAD_DIR)
    pdf_bytes = await service.get_merged_pdf(meeting_id)
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=meeting_{meeting_id}_minutes.pdf"
        }
    )
