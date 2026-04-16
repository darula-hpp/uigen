"""Document generator for rendering Jinja2 templates with filled data."""
import asyncio
from pathlib import Path
from docxtpl import DocxTemplate
from app.exceptions import RenderError
from app.schemas import FilledData


class DocumentGenerator:
    """Generator for rendering Word templates with filled data."""
    
    async def render_template(
        self, template_path: str, filled_data: FilledData, output_path: str
    ) -> str:
        """
        Render a Word template with filled data.
        
        Args:
            template_path: Path to template .docx file
            filled_data: JSON object with variable values
            output_path: Path for rendered document
            
        Returns:
            str: Path to rendered document
            
        Raises:
            RenderError: If rendering fails
        """
        try:
            # Run in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(
                None, self._render_sync, template_path, filled_data, output_path
            )
        except Exception as e:
            raise RenderError(f"Failed to render template: {str(e)}")
    
    def _render_sync(
        self, template_path: str, filled_data: FilledData, output_path: str
    ) -> str:
        """
        Synchronous helper for template rendering.
        
        Args:
            template_path: Path to template .docx file
            filled_data: JSON object with variable values
            output_path: Path for rendered document
            
        Returns:
            str: Path to rendered document
        """
        # Ensure output directory exists
        output_dir = Path(output_path).parent
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Load template and render
        doc = DocxTemplate(template_path)
        doc.render(filled_data)
        doc.save(output_path)
        
        return output_path
