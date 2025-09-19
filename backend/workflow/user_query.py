# backend/workflow/user_query.py
from .base import Component

class UserQueryComponent(Component):
    def run(self, data: dict) -> dict:
        # Expect `query` key in data
        query = data.get("query", "")
        return {"query": query}
