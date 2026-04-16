"""Service for document generation business logic."""
from typing import List
from pathlib import Path
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.meeting_repository import MeetingRepository
from app.repositories.document_repository import DocumentRepository
from app.core.document_generator import DocumentGenerator
from app.core.pdf_converter import PDFConverter
from app.core.pdf_merger import PDFMerger
from app.schemas import GeneratedDocumentSchema
from app.exceptions import RenderError, ConversionError, MergeError


class DocumentService:
    """Service for managing document generation operations."""
    
    def __init__(
        self,
        session: AsyncSession,
        storage_path: str
    ):
        """
        Initialize the document service.
        
        Args:
            session: Async SQLAlchemy session
            storage_path: Base path for file storage
        """
        self.meeting_repo = MeetingRepository(session, storage_path)
        self.document_repo = DocumentRepository(session, storage_path)
        self.generator = DocumentGenerator()
        self.pdf_converter = PDFConverter()
        self.pdf_merger = PDFMerger()
        self.storage_path = storage_path
    
    async def generate_documents(self, meeting_id: int) -> List[GeneratedDocumentSchema]:
        """
        Generate all documents for a meeting.
        
        Args:
            meeting_id: Meeting identifier
            
        Returns:
            List of generated document records
            
        Raises:
            HTTPException: If meeting not found or filled data missing
        """
        # Get meeting with associations
        meeting = await self.meeting_repo.get_by_id(meeting_id, load_associations=True)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        # Get associations
        associations = await self.meeting_repo.get_associations(meeting_id)
        
        if not associations:
            raise HTTPException(
                status_code=400,
                detail="Meeting has no template associations"
            )
        
        # Validate all templates have filled data
        missing_data = []
        for assoc in associations:
            if not assoc.filled_data:
                missing_data.append(assoc.template.name)
        
        if missing_data:
            raise HTTPException(
                status_code=400,
                detail=f"Missing filled data for templates: {', '.join(missing_data)}"
            )
        
        # Generate documents
        generated_docs = []
        storage_dir = self.document_repo.get_storage_path(meeting_id)
        storage_dir.mkdir(parents=True, exist_ok=True)
        
        for assoc in associations:
            try:
                # Generate output path
                output_filename = f"{meeting_id}_{assoc.template_id}_generated.docx"
                output_path = storage_dir / output_filename
                
                # Render template
                rendered_path = await self.generator.render_template(
                    assoc.template.file_path,
                    assoc.filled_data,
                    str(output_path)
                )
                
                # Create or update document record
                existing_doc = await self.document_repo.get_by_meeting_and_template(
                    meeting_id,
                    assoc.template_id
                )
                
                if existing_doc:
                    # Update existing record
                    existing_doc.docx_path = rendered_path
                    await self.document_repo.session.commit()
                    await self.document_repo.session.refresh(existing_doc)
                    generated_docs.append(existing_doc)
                else:
                    # Create new record
                    doc = await self.document_repo.create(
                        meeting_id,
                        assoc.template_id,
                        rendered_path
                    )
                    generated_docs.append(doc)
                
            except RenderError as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to render template '{assoc.template.name}': {str(e)}"
                )
            except Exception as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to generate document for template '{assoc.template.name}': {str(e)}"
                )
        
        return generated_docs
    
    async def convert_to_pdfs(self, meeting_id: int) -> List[GeneratedDocumentSchema]:
        """
        Convert all meeting documents to PDF.
        
        Args:
            meeting_id: Meeting identifier
            
        Returns:
            List of document records with PDF paths
            
        Raises:
            HTTPException: If documents not found or conversion fails
        """
        # Get generated documents
        documents = await self.document_repo.get_by_meeting_id(meeting_id)
        
        if not documents:
            raise HTTPException(
                status_code=404,
                detail="No generated documents found for this meeting. Generate documents first"
            )
        
        # Convert each document to PDF
        storage_dir = self.document_repo.get_storage_path(meeting_id)
        
        for doc in documents:
            try:
                # Check if docx file exists
                if not Path(doc.docx_path).exists():
                    raise HTTPException(
                        status_code=404,
                        detail=f"Document file not found: {doc.docx_path}"
                    )
                
                # Convert to PDF
                pdf_path = await self.pdf_converter.convert_to_pdf(
                    doc.docx_path,
                    str(storage_dir)
                )
                
                # Update document record with PDF path
                await self.document_repo.update_pdf_path(
                    meeting_id,
                    doc.template_id,
                    pdf_path
                )
                
            except ConversionError as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to convert document to PDF: {str(e)}"
                )
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to process PDF conversion: {str(e)}"
                )
        
        # Reload documents with updated PDF paths
        return await self.document_repo.get_by_meeting_id(meeting_id)
    
    async def get_merged_pdf(self, meeting_id: int) -> bytes:
        """
        Get merged PDF for all meeting documents.
        
        Args:
            meeting_id: Meeting identifier
            
        Returns:
            Merged PDF file bytes
            
        Raises:
            HTTPException: If PDFs not found or merge fails
        """
        # Get associations to determine order
        associations = await self.meeting_repo.get_associations(meeting_id)
        
        if not associations:
            raise HTTPException(
                status_code=404,
                detail="Meeting has no template associations"
            )
        
        # Get generated documents
        documents = await self.document_repo.get_by_meeting_id(meeting_id)
        
        if not documents:
            raise HTTPException(
                status_code=404,
                detail="No generated documents found. Generate and convert documents first"
            )
        
        # Create mapping of template_id to document
        doc_map = {doc.template_id: doc for doc in documents}
        
        # Build list of PDF paths in order
        pdf_paths = []
        missing_pdfs = []
        
        for assoc in associations:
            doc = doc_map.get(assoc.template_id)
            if not doc or not doc.pdf_path:
                missing_pdfs.append(assoc.template.name)
            else:
                if not Path(doc.pdf_path).exists():
                    missing_pdfs.append(assoc.template.name)
                else:
                    pdf_paths.append(doc.pdf_path)
        
        if missing_pdfs:
            raise HTTPException(
                status_code=404,
                detail=f"Missing PDF files for templates: {', '.join(missing_pdfs)}"
            )
        
        if not pdf_paths:
            raise HTTPException(
                status_code=404,
                detail="No PDF files available to merge"
            )
        
        # Merge PDFs
        try:
            storage_dir = self.document_repo.get_storage_path(meeting_id)
            merged_path = storage_dir / f"{meeting_id}_merged.pdf"
            
            await self.pdf_merger.merge_pdfs(pdf_paths, str(merged_path))
            
            # Read and return merged PDF
            with open(merged_path, "rb") as f:
                return f.read()
                
        except MergeError as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to merge PDFs: {str(e)}"
            )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to process PDF merge: {str(e)}"
            )
