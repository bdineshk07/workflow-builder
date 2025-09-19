from typing import Dict, Any
from app.services.vector_store import search_documents

class KnowledgeBaseComponent:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        
    async def process(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        if not input_data or "query" not in input_data:
            raise ValueError("Input must contain 'query'")
            
        query = input_data["query"]
        k = self.config.get("top_k", 3)
        
        try:
            results = await search_documents(query, k)
            return {
                "query": query,
                "context": results,
                "sources": [r["id"] for r in results]
            }
        except Exception as e:
            raise RuntimeError(f"Knowledge base search failed: {str(e)}")