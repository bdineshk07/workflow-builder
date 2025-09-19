# backend/workflow/knowledge_base.py
from .base import Component

class KnowledgeBaseComponent(Component):
    def run(self, data: dict) -> dict:
        # Placeholder: real implementation will extract docs, create embeddings, etc.
        # For now just return data unchanged with fake context
        query = data.get("query", "")
        context = f"(stub context for '{query}')"
        return {**data, "context": context}
