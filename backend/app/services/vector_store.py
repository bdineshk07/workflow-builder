# app/services/vector_store.py

import os
import logging
from typing import List, Dict, Any

import chromadb
from chromadb.config import Settings

logger = logging.getLogger(__name__)

_client = None
_collection = None

def _get_chroma_collection():
    """Initialize and return ChromaDB collection."""
    global _client, _collection
    
    if _collection is not None:
        return _collection

    try:
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        persist_dir = os.path.join(base_dir, "chroma_db")
        os.makedirs(persist_dir, exist_ok=True)

        _client = chromadb.PersistentClient(
            path=persist_dir,
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=True,
                is_persistent=True
            )
        )
        
        _collection = _client.get_or_create_collection(name="documents")
        return _collection
        
    except Exception as e:
        logger.error(f"Error initializing ChromaDB: {e}")
        raise

async def search_documents(query: str, k: int = 3) -> List[Dict[str, Any]]:
    """Search for relevant documents using the query."""
    try:
        collection = _get_chroma_collection()
        results = collection.query(
            query_texts=[query],
            n_results=k
        )
        
        documents = []
        for i in range(len(results['ids'][0])):
            documents.append({
                "id": results['ids'][0][i],
                "text": results['documents'][0][i],
                "metadata": results['metadatas'][0][i] if results['metadatas'] else {},
                "distance": results['distances'][0][i] if results['distances'] else None
            })
            
        return documents
    except Exception as e:
        logger.error(f"Error searching documents: {e}")
        raise

async def add_document(doc_id: str, text: str, metadata: Dict[str, Any] = None) -> None:
    """Add a document to the vector store."""
    try:
        collection = _get_chroma_collection()
        
        # Split text into chunks if it's too long (optional)
        # For now, we'll add it as a single document
        
        collection.add(
            documents=[text],
            ids=[doc_id],
            metadatas=[metadata or {}]
        )
        
        logger.info(f"Successfully added document {doc_id} to vector store")
    except Exception as e:
        logger.error(f"Error adding document to vector store: {e}")
        raise RuntimeError(f"Failed to add document to vector store: {str(e)}")

async def search_context(query: str, k: int = 3) -> List[Dict[str, Any]]:
    """
    Search for relevant context using the query.
    Args:
        query: The search query
        k: Number of results to return
    Returns:
        List of documents with their content and metadata
    """
    try:
        collection = _get_chroma_collection()
        results = collection.query(
            query_texts=[query],
            n_results=k,
            include=['documents', 'metadatas', 'distances']
        )

        # Format results
        documents = []
        if results['ids'] and len(results['ids'][0]) > 0:
            for i in range(len(results['ids'][0])):
                documents.append({
                    'id': results['ids'][0][i],
                    'content': results['documents'][0][i],
                    'metadata': results['metadatas'][0][i] if results['metadatas'] else {},
                    'score': float(results['distances'][0][i]) if results['distances'] else None
                })

        logger.info(f"Found {len(documents)} relevant documents for query")
        return documents

    except Exception as e:
        logger.error(f"Error searching context: {str(e)}")
        raise RuntimeError(f"Failed to search context: {str(e)}")