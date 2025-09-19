# backend/workflow/base.py
from abc import ABC, abstractmethod

class Component(ABC):
    """Abstract base class for all workflow components."""

    def __init__(self, id: str, config: dict | None = None):
        self.id = id
        self.config = config or {}

    @abstractmethod
    def run(self, data: dict) -> dict:
        """Each component takes a dict (data) and returns a dict (output)."""
        pass
