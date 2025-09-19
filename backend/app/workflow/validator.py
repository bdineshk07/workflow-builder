# backend/workflow/validator.py
from typing import Dict, List, Set, Tuple
from dataclasses import dataclass


@dataclass
class ValidationErrorItem:
    field: str
    message: str


class WorkflowValidationError(Exception):
    def __init__(self, errors: List[ValidationErrorItem]):
        self.errors = errors
        super().__init__("Workflow validation failed")


NODE_TYPES = {"user_query", "knowledge_base", "llm_engine", "output"}

# minimal required config per node type (extend as needed)
REQUIRED_NODE_CONFIG = {
    "knowledge_base": [],  # e.g., ["collection_name"]
    "llm_engine": [],      # e.g., ["model"]
    "user_query": [],
    "output": [],
}

# safety limits
MAX_NODES = 50
MAX_EDGES = 200


def validate_shape(workflow: Dict) -> List[ValidationErrorItem]:
    errors: List[ValidationErrorItem] = []
    if not isinstance(workflow, dict):
        errors.append(ValidationErrorItem("workflow", "Workflow must be a JSON object"))
        return errors

    if "nodes" not in workflow or not isinstance(workflow["nodes"], list):
        errors.append(ValidationErrorItem("nodes", "Missing 'nodes' list"))
    if "edges" not in workflow or not isinstance(workflow["edges"], list):
        errors.append(ValidationErrorItem("edges", "Missing 'edges' list"))
    return errors


def validate_nodes_and_edges(workflow: Dict) -> List[ValidationErrorItem]:
    errors: List[ValidationErrorItem] = []
    nodes = workflow.get("nodes", [])
    edges = workflow.get("edges", [])

    if len(nodes) > MAX_NODES:
        errors.append(ValidationErrorItem("nodes", f"Too many nodes (max {MAX_NODES})"))
    if len(edges) > MAX_EDGES:
        errors.append(ValidationErrorItem("edges", f"Too many edges (max {MAX_EDGES})"))

    ids = set()
    for idx, n in enumerate(nodes):
        if not isinstance(n, dict):
            errors.append(ValidationErrorItem(f"nodes[{idx}]", "Node must be an object"))
            continue
        nid = n.get("id")
        ntype = n.get("type")
        if not nid or not isinstance(nid, str):
            errors.append(ValidationErrorItem(f"nodes[{idx}].id", "Node must have a string 'id'"))
        else:
            if nid in ids:
                errors.append(ValidationErrorItem(f"nodes[{idx}].id", f"Duplicate node id '{nid}'"))
            ids.add(nid)
        if ntype not in NODE_TYPES:
            errors.append(ValidationErrorItem(f"nodes[{idx}].type", f"Invalid or missing node type '{ntype}'"))

        # config presence check
        config = n.get("config", {})
        if not isinstance(config, dict):
            errors.append(ValidationErrorItem(f"nodes[{idx}].config", "Config must be an object"))

        # required keys check if defined
        required = REQUIRED_NODE_CONFIG.get(ntype, [])
        for key in required:
            if key not in config:
                errors.append(ValidationErrorItem(f"nodes[{idx}].config.{key}", f"Missing required config '{key}'"))

    # Validate edges reference existing node ids and shape
    node_ids = ids
    for idx, e in enumerate(edges):
        if not isinstance(e, dict):
            errors.append(ValidationErrorItem(f"edges[{idx}]", "Edge must be an object with 'from' and 'to'"))
            continue
        src = e.get("from")
        tgt = e.get("to")
        if not src or not isinstance(src, str):
            errors.append(ValidationErrorItem(f"edges[{idx}].from", "Missing/invalid 'from'"))
        elif src not in node_ids:
            errors.append(ValidationErrorItem(f"edges[{idx}].from", f"Unknown node id '{src}'"))
        if not tgt or not isinstance(tgt, str):
            errors.append(ValidationErrorItem(f"edges[{idx}].to", "Missing/invalid 'to'"))
        elif tgt not in node_ids:
            errors.append(ValidationErrorItem(f"edges[{idx}].to", f"Unknown node id '{tgt}'"))

    return errors


def find_roots_and_leaves(workflow: Dict) -> Tuple[Set[str], Set[str]]:
    nodes = workflow.get("nodes", [])
    edges = workflow.get("edges", [])
    node_ids = {n["id"] for n in nodes}
    incoming = {nid: 0 for nid in node_ids}
    outgoing = {nid: 0 for nid in node_ids}
    for e in edges:
        incoming[e["to"]] += 1
        outgoing[e["from"]] += 1
    roots = {nid for nid, c in incoming.items() if c == 0}
    leaves = {nid for nid, c in outgoing.items() if c == 0}
    return roots, leaves


def detect_cycles_and_toposort(workflow: Dict) -> Tuple[List[str], List[ValidationErrorItem]]:
    """
    Kahn's algorithm to detect cycles and return topo order.
    Returns (topo_order, errors). If cycles found, errors contains details.
    """
    errors: List[ValidationErrorItem] = []
    nodes = workflow.get("nodes", [])
    edges = workflow.get("edges", [])

    node_ids = [n["id"] for n in nodes]
    incoming = {nid: 0 for nid in node_ids}
    adj = {nid: [] for nid in node_ids}
    for e in edges:
        src = e["from"]
        tgt = e["to"]
        incoming[tgt] += 1
        adj[src].append(tgt)

    queue = [nid for nid in node_ids if incoming[nid] == 0]
    topo = []
    while queue:
        n = queue.pop(0)
        topo.append(n)
        for m in adj[n]:
            incoming[m] -= 1
            if incoming[m] == 0:
                queue.append(m)

    if len(topo) != len(node_ids):
        errors.append(ValidationErrorItem("workflow", "Cycle detected in workflow (graph is not a DAG)"))
    return topo, errors


def validate_workflow(workflow: Dict, require_single_user_query: bool = True) -> None:
    errors: List[ValidationErrorItem] = []
    errors.extend(validate_shape(workflow))
    if errors:
        raise WorkflowValidationError(errors)

    errors.extend(validate_nodes_and_edges(workflow))
    if errors:
        raise WorkflowValidationError(errors)

    # structural checks
    roots, leaves = find_roots_and_leaves(workflow)
    # require at least one user_query node and at least one output node
    types_by_id = {n["id"]: n["type"] for n in workflow["nodes"]}
    user_query_nodes = [nid for nid, t in types_by_id.items() if t == "user_query"]
    output_nodes = [nid for nid, t in types_by_id.items() if t == "output"]
    if require_single_user_query and len(user_query_nodes) != 1:
        errors.append(ValidationErrorItem("user_query", "Workflow must contain exactly one 'user_query' node"))
    if len(output_nodes) < 1:
        errors.append(ValidationErrorItem("output", "Workflow must contain at least one 'output' node"))

    # ensure graph is connected from the user_query (no orphan nodes)
    if user_query_nodes:
        start = user_query_nodes[0]
        reachable = set()
        # BFS
        adj = {n["id"]: [] for n in workflow["nodes"]}
        for e in workflow["edges"]:
            adj[e["from"]].append(e["to"])
        stack = [start]
        while stack:
            cur = stack.pop()
            if cur in reachable:
                continue
            reachable.add(cur)
            for nb in adj.get(cur, []):
                if nb not in reachable:
                    stack.append(nb)
        node_ids = {n["id"] for n in workflow["nodes"]}
        unreachable = node_ids - reachable
        if unreachable:
            errors.append(ValidationErrorItem("connectivity", f"Unreachable nodes from user_query: {list(unreachable)}"))

    # cycles & topo sort
    topo, cycle_errors = detect_cycles_and_toposort(workflow)
    errors.extend(cycle_errors)

    if errors:
        raise WorkflowValidationError(errors)

    # All checks passed
    return
