"""PDF converter for converting Word documents to PDF using LibreOffice."""
import asyncio
from pathlib import Path
from app.exceptions import ConversionError


class PDFConverter:
    """Converter for transforming Word documents to PDF format."""
    
    async def convert_to_pdf(self, docx_path: str, output_dir: str) -> str:
        """
        Convert a .docx file to PDF using LibreOffice headless.
        
        Args:
            docx_path: Path to .docx file
            output_dir: Directory for output PDF
            
        Returns:
            str: Path to generated PDF
            
        Raises:
            ConversionError: If LibreOffice conversion fails
        """
        try:
            # Ensure output directory exists
            output_path = Path(output_dir)
            output_path.mkdir(parents=True, exist_ok=True)
            
            # Build LibreOffice command
            cmd = [
                "soffice",
                "--headless",
                "--convert-to", "pdf",
                "--outdir", output_dir,
                docx_path
            ]
            
            # Execute LibreOffice conversion asynchronously
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                error_msg = stderr.decode() if stderr else "Unknown error"
                raise ConversionError(f"LibreOffice conversion failed: {error_msg}")
            
            # Determine output filename
            base_name = Path(docx_path).stem
            pdf_path = Path(output_dir) / f"{base_name}.pdf"
            
            # Verify the PDF was created
            if not pdf_path.exists():
                raise ConversionError(f"PDF file was not created at expected path: {pdf_path}")
            
            return str(pdf_path)
            
        except ConversionError:
            raise
        except Exception as e:
            raise ConversionError(f"Failed to convert document to PDF: {str(e)}")
