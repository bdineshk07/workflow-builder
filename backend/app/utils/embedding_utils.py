# app/utils/embedding_utils.py
from app.services.vector_store import add_document as vs_add_document

def add_document(doc_id: str, text: str) -> None:
    vs_add_document(doc_id, text)
