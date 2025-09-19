# app/routes/documents.py

import os
import uuid
import shutil
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Document as DocumentModel
from app.services.pdf_extractor import extract_text_from_pdf
from app.services.vector_store import add_document

UPLOAD_DIR = "uploads"
router = APIRouter()

@router.post("/upload")
def upload_document(file: UploadFile = File(...), db: Session = Depends(get_db)):
    # Check if file is PDF
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    # Generate unique ID
    doc_id = str(uuid.uuid4())

    # Save uploaded file
    file_path = os.path.join(UPLOAD_DIR, f"{doc_id}.pdf")
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Extract text & generate embeddings
        text = extract_text_from_pdf(file_path)
        if not text.strip():
            raise HTTPException(status_code=400, detail="No text could be extracted from the PDF")
            
        add_document(doc_id, text)

        # Save metadata in DB
        doc_record = DocumentModel(doc_id=doc_id, filename=file.filename)
        db.add(doc_record)
        db.commit()
        db.refresh(doc_record)

        return {
            "message": "Document processed, stored, and saved in DB!",
            "doc_id": doc_id,
        }
    except Exception as e:
        # Clean up file if something goes wrong
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Error processing document: {str(e)}")

@router.get("/list")
def list_documents(db: Session = Depends(get_db)):
    """List all uploaded documents"""
    documents = db.query(DocumentModel).all()
    return {"documents": [{"doc_id": doc.doc_id, "filename": doc.filename, "uploaded_at": doc.uploaded_at} for doc in documents]}

@router.delete("/{doc_id}")
def delete_document(doc_id: str, db: Session = Depends(get_db)):
    """Delete a document"""
    doc = db.query(DocumentModel).filter(DocumentModel.doc_id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Remove file
    file_path = os.path.join(UPLOAD_DIR, f"{doc_id}.pdf")
    if os.path.exists(file_path):
        os.remove(file_path)
    
    # Remove from database
    db.delete(doc)
    db.commit()
    
    return {"message": "Document deleted successfully"}