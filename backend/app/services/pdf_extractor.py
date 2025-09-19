# app/services/pdf_extractor.py

import os
import logging
from typing import Optional

import fitz  # PyMuPDF

logger = logging.getLogger(__name__)

def extract_text_from_pdf(file_path: str, max_pages: Optional[int] = None) -> str:
    """Extract text from a PDF file."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"PDF file not found: {file_path}")
    
    try:
        with fitz.open(file_path) as doc:
            pages = range(min(len(doc), max_pages or len(doc)))
            text = ""
            
            for i in pages:
                text += doc[i].get_text()
            
            return text
            
    except Exception as e:
        logger.error(f"Error extracting text from PDF: {e}")
        raise

def get_pdf_metadata(file_path: str) -> dict:
    """
    Extract metadata from a PDF file.
    
    Args:
        file_path: Path to the PDF file
    
    Returns:
        Dictionary containing PDF metadata
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"PDF file not found: {file_path}")
    
    try:
        doc = fitz.open(file_path)
        metadata = doc.metadata
        
        # Add additional info
        metadata["page_count"] = len(doc)
        metadata["file_size"] = os.path.getsize(file_path)
        
        doc.close()
        return metadata
        
    except Exception as e:
        logger.error(f"Error extracting metadata from PDF {file_path}: {e}")
        return {}

def extract_text_by_page(file_path: str) -> list[str]:
    """
    Extract text from PDF, returning a list with text from each page.
    
    Args:
        file_path: Path to the PDF file
    
    Returns:
        List of strings, one per page
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"PDF file not found: {file_path}")
    
    try:
        doc = fitz.open(file_path)
        pages = []
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            page_text = page.get_text("text").strip()
            pages.append(page_text)
        
        doc.close()
        return pages
        
    except Exception as e:
        logger.error(f"Error extracting text by page from PDF {file_path}: {e}")
        raise Exception(f"Failed to extract text by page from PDF: {str(e)}")

print("All dependencies installed successfully!")