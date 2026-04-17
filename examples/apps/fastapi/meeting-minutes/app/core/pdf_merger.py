"""PDF merger for combining multiple PDF files in specified order."""
import asyncio
from pathlib import Path
from typing import List
from pypdf import PdfWriter
from app.exceptions import MergeError


class PDFMerger:
    """Merger for combining multiple PDF files into one."""
    
    async def merge_pdfs(self, pdf_paths: List[str], output_path: str) -> str:
        """
        Merge multiple PDF files into one.
        
        Args:
            pdf_paths: List of PDF file paths in desired order
            output_path: Path for merged PDF
            
        Returns:
            str: Path to merged PDF
            
        Raises:
            MergeError: If merging fails
        """
        try:
            # Validate input list is not empty
            if not pdf_paths:
                raise MergeError("Cannot merge empty list of PDFs")
            
            # Validate input files exist
            for pdf_path in pdf_paths:
                if not Path(pdf_path).exists():
                    raise MergeError(f"PDF file not found: {pdf_path}")
            
            # Run in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(
                None, self._merge_sync, pdf_paths, output_path
            )
        except MergeError:
            raise
        except Exception as e:
            raise MergeError(f"Failed to merge PDFs: {str(e)}")
    
    def _merge_sync(self, pdf_paths: List[str], output_path: str) -> str:
        """
        Synchronous helper for PDF merging.
        
        Args:
            pdf_paths: List of PDF file paths in desired order
            output_path: Path for merged PDF
            
        Returns:
            str: Path to merged PDF
        """
        # Ensure output directory exists
        output_dir = Path(output_path).parent
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Create writer and append PDFs in order
        writer = PdfWriter()
        
        for pdf_path in pdf_paths:
            writer.append(pdf_path)
        
        # Write merged PDF
        with open(output_path, 'wb') as output_file:
            writer.write(output_file)
        
        return output_path
