# backend/workflow/executor.py
from .user_query import UserQueryComponent
from .knowledge_base import KnowledgeBaseComponent
from .llm_engine import LLMEngineComponent
from .output import OutputComponent

COMPONENT_MAP = {
    "user_query": UserQueryComponent,
    "knowledge_base": KnowledgeBaseComponent,
    "llm_engine": LLMEngineComponent,
    "output": OutputComponent,
}

def execute_workflow(workflow_def: dict, query: str) -> dict:
    """
    workflow_def: dict describing nodes in order.
    Example:
    {
        "nodes": [
            {"id": "1", "type": "user_query"},
            {"id": "2", "type": "knowledge_base"},
            {"id": "3", "type": "llm_engine"},
            {"id": "4", "type": "output"}
        ],
        "edges": [
            {"from": "1", "to": "2"},
            {"from": "2", "to": "3"},
            {"from": "3", "to": "4"}
        ]
    }
    """
    # Build node objects
    nodes = {n["id"]: COMPONENT_MAP[n["type"]](id=n["id"], config=n.get("config")) for n in workflow_def["nodes"]}

    # Find start (user_query must be first)
    start_node = next((n for n in workflow_def["nodes"] if n["type"] == "user_query"), None)
    if not start_node:
        raise ValueError("Workflow missing user_query node")

    # Execute along edges
    data = {"query": query}
    current_id = start_node["id"]
    visited = set()

    while current_id:
        if current_id in visited:
            raise ValueError("Cycle detected in workflow")
        visited.add(current_id)

        node = nodes[current_id]
        data = node.run(data)

        # Find next edge
        edges = [e for e in workflow_def["edges"] if e["from"] == current_id]
        if not edges:
            break  # end of flow
        current_id = edges[0]["to"]

    return data
