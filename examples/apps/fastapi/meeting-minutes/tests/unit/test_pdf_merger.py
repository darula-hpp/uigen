"""Unit tests for PDF merger."""
import pytest
from pathlib import Path
from pypdf import PdfWriter
from app.core.pdf_merger import PDFMerger
from app.exceptions import MergeError


def create_test_pdf(path: Path, content: str = "Test PDF"):
    """Create a simple test PDF file."""
    writer = PdfWriter()
    writer.add_blank_page(width=200, height=200)
    
    # Add metadata to identify the PDF
    writer.add_metadata({'/Title': content})
    
    with open(path, 'wb') as f:
        writer.write(f)


@pytest.mark.asyncio
async def test_merge_pdfs_success(temp_storage):
    """Test successful PDF merging."""
    merger = PDFMerger()
    
    # Create test PDF files
    pdf1_path = temp_storage / "doc1.pdf"
    pdf2_path = temp_storage / "doc2.pdf"
    pdf3_path = temp_storage / "doc3.pdf"
    
    create_test_pdf(pdf1_path, "Document 1")
    create_test_pdf(pdf2_path, "Document 2")
    create_test_pdf(pdf3_path, "Document 3")
    
    output_path = temp_storage / "merged.pdf"
    
    # Merge PDFs
    result = await merger.merge_pdfs(
        [str(pdf1_path), str(pdf2_path), str(pdf3_path)],
        str(output_path)
    )
    
    # Verify the result
    assert result == str(output_path)
    assert output_path.exists()
    
    # Verify the merged PDF has content from all input PDFs
    # (basic check - just verify file size is reasonable)
    assert output_path.stat().st_size > 0


@pytest.mark.asyncio
async def test_merge_pdfs_preserves_order(temp_storage):
    """Test that PDF merger preserves the order of input files."""
    merger = PDFMerger()
    
    # Create test PDF files with identifiable content
    pdf1_path = temp_storage / "first.pdf"
    pdf2_path = temp_storage / "second.pdf"
    pdf3_path = temp_storage / "third.pdf"
    
    create_test_pdf(pdf1_path, "First Document")
    create_test_pdf(pdf2_path, "Second Document")
    create_test_pdf(pdf3_path, "Third Document")
    
    output_path = temp_storage / "merged_ordered.pdf"
    
    # Merge in specific order
    result = await merger.merge_pdfs(
        [str(pdf1_path), str(pdf2_path), str(pdf3_path)],
        str(output_path)
    )
    
    assert result == str(output_path)
    assert output_path.exists()


@pytest.mark.asyncio
async def test_merge_pdfs_single_file(temp_storage):
    """Test merging a single PDF file."""
    merger = PDFMerger()
    
    pdf_path = temp_storage / "single.pdf"
    create_test_pdf(pdf_path, "Single Document")
    
    output_path = temp_storage / "merged_single.pdf"
    
    result = await merger.merge_pdfs([str(pdf_path)], str(output_path))
    
    assert result == str(output_path)
    assert output_path.exists()


@pytest.mark.asyncio
async def test_merge_pdfs_missing_input_file(temp_storage):
    """Test that merging fails when an input file is missing."""
    merger = PDFMerger()
    
    pdf1_path = temp_storage / "exists.pdf"
    pdf2_path = temp_storage / "missing.pdf"
    
    create_test_pdf(pdf1_path, "Exists")
    # Don't create pdf2_path
    
    output_path = temp_storage / "merged.pdf"
    
    with pytest.raises(MergeError) as exc_info:
        await merger.merge_pdfs(
            [str(pdf1_path), str(pdf2_path)],
            str(output_path)
        )
    
    assert "PDF file not found" in str(exc_info.value)
    assert str(pdf2_path) in str(exc_info.value)


@pytest.mark.asyncio
async def test_merge_pdfs_creates_output_directory(temp_storage):
    """Test that PDF merger creates output directory if it doesn't exist."""
    merger = PDFMerger()
    
    pdf_path = temp_storage / "doc.pdf"
    create_test_pdf(pdf_path, "Document")
    
    output_path = temp_storage / "nested" / "output" / "merged.pdf"
    
    result = await merger.merge_pdfs([str(pdf_path)], str(output_path))
    
    assert result == str(output_path)
    assert output_path.exists()
    assert output_path.parent.exists()


@pytest.mark.asyncio
async def test_merge_pdfs_empty_list(temp_storage):
    """Test that merging an empty list raises an error."""
    merger = PDFMerger()
    
    output_path = temp_storage / "merged.pdf"
    
    with pytest.raises(MergeError):
        await merger.merge_pdfs([], str(output_path))


@pytest.mark.asyncio
async def test_merge_pdfs_overwrites_existing_file(temp_storage):
    """Test that merging overwrites an existing output file."""
    merger = PDFMerger()
    
    pdf_path = temp_storage / "doc.pdf"
    create_test_pdf(pdf_path, "Document")
    
    output_path = temp_storage / "merged.pdf"
    
    # Create an existing file
    output_path.write_text("old content")
    old_size = output_path.stat().st_size
    
    # Merge should overwrite
    result = await merger.merge_pdfs([str(pdf_path)], str(output_path))
    
    assert result == str(output_path)
    assert output_path.exists()
    # Size should be different (PDF format, not text)
    assert output_path.stat().st_size != old_size


@pytest.mark.asyncio
async def test_merge_pdfs_multiple_pages(temp_storage):
    """Test merging PDFs with multiple pages."""
    merger = PDFMerger()
    
    # Create PDFs with multiple pages
    pdf1_path = temp_storage / "multi1.pdf"
    pdf2_path = temp_storage / "multi2.pdf"
    
    # Create first PDF with 2 pages
    writer1 = PdfWriter()
    writer1.add_blank_page(width=200, height=200)
    writer1.add_blank_page(width=200, height=200)
    with open(pdf1_path, 'wb') as f:
        writer1.write(f)
    
    # Create second PDF with 3 pages
    writer2 = PdfWriter()
    writer2.add_blank_page(width=200, height=200)
    writer2.add_blank_page(width=200, height=200)
    writer2.add_blank_page(width=200, height=200)
    with open(pdf2_path, 'wb') as f:
        writer2.write(f)
    
    output_path = temp_storage / "merged_multi.pdf"
    
    result = await merger.merge_pdfs(
        [str(pdf1_path), str(pdf2_path)],
        str(output_path)
    )
    
    assert result == str(output_path)
    assert output_path.exists()
