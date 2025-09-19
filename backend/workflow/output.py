# backend/workflow/output.py
from .base import Component

class OutputComponent(Component):
    def run(self, data: dict) -> dict:
        # Just pass the final answer
        return {"answer": data.get("answer", "(no answer)")}
