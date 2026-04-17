"""Unit tests for PDF converter."""
import pytest
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch
from app.core.pdf_converter import PDFConverter
from app.exceptions import ConversionError


@pytest.mark.asyncio
async def test_convert_to_pdf_success(temp_storage):
    """Test successful PDF conversion."""
    converter = PDFConverter()
    
    # Create a mock docx file
    docx_path = temp_storage / "test.docx"
    docx_path.write_text("test content")
    
    output_dir = temp_storage / "output"
    expected_pdf_path = output_dir / "test.pdf"
    
    # Mock the subprocess execution
    mock_process = MagicMock()
    mock_process.returncode = 0
    mock_process.communicate = AsyncMock(return_value=(b"", b""))
    
    with patch('asyncio.create_subprocess_exec', return_value=mock_process) as mock_exec:
        # Create the expected PDF file to simulate successful conversion
        output_dir.mkdir(parents=True, exist_ok=True)
        expected_pdf_path.write_text("PDF content")
        
        result = await converter.convert_to_pdf(str(docx_path), str(output_dir))
        
        # Verify the command was called correctly
        mock_exec.assert_called_once()
        call_args = mock_exec.call_args[0]
        assert call_args[0] == "soffice"
        assert "--headless" in call_args
        assert "--convert-to" in call_args
        assert "pdf" in call_args
        assert "--outdir" in call_args
        assert str(output_dir) in call_args
        assert str(docx_path) in call_args
        
        # Verify the result
        assert result == str(expected_pdf_path)
        assert Path(result).exists()


@pytest.mark.asyncio
async def test_convert_to_pdf_libreoffice_failure(temp_storage):
    """Test PDF conversion when LibreOffice fails."""
    converter = PDFConverter()
    
    docx_path = temp_storage / "test.docx"
    docx_path.write_text("test content")
    
    output_dir = temp_storage / "output"
    
    # Mock a failed subprocess execution
    mock_process = MagicMock()
    mock_process.returncode = 1
    mock_process.communicate = AsyncMock(return_value=(b"", b"LibreOffice error"))
    
    with patch('asyncio.create_subprocess_exec', return_value=mock_process):
        with pytest.raises(ConversionError) as exc_info:
            await converter.convert_to_pdf(str(docx_path), str(output_dir))
        
        assert "LibreOffice conversion failed" in str(exc_info.value)
        assert "LibreOffice error" in str(exc_info.value)


@pytest.mark.asyncio
async def test_convert_to_pdf_missing_output_file(temp_storage):
    """Test PDF conversion when output file is not created."""
    converter = PDFConverter()
    
    docx_path = temp_storage / "test.docx"
    docx_path.write_text("test content")
    
    output_dir = temp_storage / "output"
    
    # Mock successful subprocess but don't create the PDF file
    mock_process = MagicMock()
    mock_process.returncode = 0
    mock_process.communicate = AsyncMock(return_value=(b"", b""))
    
    with patch('asyncio.create_subprocess_exec', return_value=mock_process):
        with pytest.raises(ConversionError) as exc_info:
            await converter.convert_to_pdf(str(docx_path), str(output_dir))
        
        assert "PDF file was not created" in str(exc_info.value)


@pytest.mark.asyncio
async def test_convert_to_pdf_creates_output_directory(temp_storage):
    """Test that PDF converter creates output directory if it doesn't exist."""
    converter = PDFConverter()
    
    docx_path = temp_storage / "test.docx"
    docx_path.write_text("test content")
    
    output_dir = temp_storage / "nested" / "output" / "dir"
    expected_pdf_path = output_dir / "test.pdf"
    
    # Mock the subprocess execution
    mock_process = MagicMock()
    mock_process.returncode = 0
    mock_process.communicate = AsyncMock(return_value=(b"", b""))
    
    with patch('asyncio.create_subprocess_exec', return_value=mock_process):
        # Create the expected PDF file after directory is created
        output_dir.mkdir(parents=True, exist_ok=True)
        expected_pdf_path.write_text("PDF content")
        
        result = await converter.convert_to_pdf(str(docx_path), str(output_dir))
        
        # Verify the directory was created
        assert output_dir.exists()
        assert result == str(expected_pdf_path)


@pytest.mark.asyncio
async def test_convert_to_pdf_preserves_filename(temp_storage):
    """Test that PDF converter preserves the base filename."""
    converter = PDFConverter()
    
    docx_path = temp_storage / "my_document_name.docx"
    docx_path.write_text("test content")
    
    output_dir = temp_storage / "output"
    expected_pdf_path = output_dir / "my_document_name.pdf"
    
    # Mock the subprocess execution
    mock_process = MagicMock()
    mock_process.returncode = 0
    mock_process.communicate = AsyncMock(return_value=(b"", b""))
    
    with patch('asyncio.create_subprocess_exec', return_value=mock_process):
        output_dir.mkdir(parents=True, exist_ok=True)
        expected_pdf_path.write_text("PDF content")
        
        result = await converter.convert_to_pdf(str(docx_path), str(output_dir))
        
        # Verify the filename is preserved
        assert Path(result).name == "my_document_name.pdf"
        assert result == str(expected_pdf_path)


@pytest.mark.asyncio
async def test_convert_to_pdf_exception_handling(temp_storage):
    """Test that unexpected exceptions are wrapped in ConversionError."""
    converter = PDFConverter()
    
    docx_path = temp_storage / "test.docx"
    docx_path.write_text("test content")
    
    output_dir = temp_storage / "output"
    
    # Mock subprocess to raise an exception
    with patch('asyncio.create_subprocess_exec', side_effect=OSError("System error")):
        with pytest.raises(ConversionError) as exc_info:
            await converter.convert_to_pdf(str(docx_path), str(output_dir))
        
        assert "Failed to convert document to PDF" in str(exc_info.value)
        assert "System error" in str(exc_info.value)
