# backend/workflow/executor_safe.py
import time
import threading
from typing import Dict, Any, List
import logging
import asyncio
from datetime import datetime
from .validator import validate_workflow, WorkflowValidationError
from .user_query import UserQueryComponent
from .knowledge_base import KnowledgeBaseComponent
from .llm_engine import LLMEngineComponent
from .output import OutputComponent

logger = logging.getLogger(__name__)

# Map node types to component classes
COMPONENT_MAP = {
    "user_query": UserQueryComponent,
    "knowledge_base": KnowledgeBaseComponent,
    "llm_engine": LLMEngineComponent,
    "output": OutputComponent,
}

# Concurrency / rate limiting for LLM calls (adjust to your resources)
LLM_CONCURRENCY_LIMIT = 4
_llm_semaphore = threading.Semaphore(LLM_CONCURRENCY_LIMIT)

# Timeout defaults (seconds)
NODE_RUNTIME_TIMEOUT = 30  # per-node timeout (LLM nodes may use this)


class NodeExecutionError(Exception):
    pass


def _safe_run_node(node_obj, inputs: Dict[str, Any], timeout: float = NODE_RUNTIME_TIMEOUT) -> Dict[str, Any]:
    """
    Synchronously execute node_obj.run(inputs) with a timeout and
    special handling for LLM nodes using a semaphore.
    """
    # If node is LLMEngineComponent, acquire semaphore
    is_llm = isinstance(node_obj, LLMEngineComponent)

    def _call():
        return node_obj.run(inputs)

    start = time.perf_counter()
    if is_llm:
        acquired = _llm_semaphore.acquire(timeout=timeout)
        if not acquired:
            raise NodeExecutionError("Could not acquire LLM semaphore (too many concurrent LLM calls)")
    try:
        # Run the node in a thread and wait with timeout to avoid blocking server
        from concurrent.futures import ThreadPoolExecutor, TimeoutError

        with ThreadPoolExecutor(max_workers=1) as ex:
            future = ex.submit(_call)
            try:
                result = future.result(timeout=timeout)
            except TimeoutError:
                future.cancel()
                raise NodeExecutionError("Node execution timed out")
    finally:
        if is_llm:
            _llm_semaphore.release()
    end = time.perf_counter()
    duration = end - start

    # Expect node.run to return a dict
    if not isinstance(result, dict):
        raise NodeExecutionError("Node did not return a dict")
    # attach some metadata optionally
    result["_exec_duration"] = duration
    return result


def execute_workflow_safe(workflow: Dict, user_query: str, trace: List[Dict] = None) -> Dict:
    """
    Validate workflow, compute execution order, run nodes safely, return final result and trace.
    trace: optional list that will be appended with per-node execution entries.
    """
    trace = trace if trace is not None else []
    # 1. Validate
    try:
        validate_workflow(workflow)
    except WorkflowValidationError as v:
        # return structured validation errors in response
        raise

    # Build nodes dict (id -> node metadata)
    nodes_meta = {n["id"]: n for n in workflow["nodes"]}
    edges = workflow["edges"]

    # build adjacency and reverse adjacency
    adj = {nid: [] for nid in nodes_meta}
    parents = {nid: [] for nid in nodes_meta}
    for e in edges:
        adj[e["from"]].append(e["to"])
        parents[e["to"]].append(e["from"])

    # Get topological order (re-use validator's Kahn if desired, but recompute here)
    # Simple Kahn's algorithm:
    incoming = {nid: 0 for nid in nodes_meta}
    for e in edges:
        incoming[e["to"]] += 1
    queue = [nid for nid, c in incoming.items() if c == 0]
    topo = []
    while queue:
        n = queue.pop(0)
        topo.append(n)
        for m in adj[n]:
            incoming[m] -= 1
            if incoming[m] == 0:
                queue.append(m)

    # Execution context: store output of each node
    context_map: Dict[str, Dict] = {}

    # Initialize start node(s) - find the user_query node(s)
    user_nodes = [nid for nid, meta in nodes_meta.items() if meta["type"] == "user_query"]
    if not user_nodes:
        raise NodeExecutionError("No user_query node found")
    # We enforce exactly one user_query in validation; take the first
    start_node_id = user_nodes[0]
    context_map[start_node_id] = {"query": user_query}

    # Execute nodes in topo order
    for node_id in topo:
        node_meta = nodes_meta[node_id]
        node_type = node_meta["type"]
        node_cls = COMPONENT_MAP.get(node_type)
        if node_cls is None:
            # Skip unknown node types (shouldn't happen after validation)
            continue
        node_instance = node_cls(id=node_id, config=node_meta.get("config", {}))

        # Collect inputs by merging outputs from parent nodes (last-wins for same keys)
        inputs = {}
        if node_id in parents and parents[node_id]:
            for p in parents[node_id]:
                parent_out = context_map.get(p, {}) or {}
                inputs.update(parent_out)
        else:
            # no parents: use initial context if this is start node
            inputs = context_map.get(node_id, {})

        # Execute with safe wrapper and record trace
        entry = {
            "node_id": node_id,
            "node_type": node_type,
            "started_at": datetime.utcnow().isoformat() + "Z",
        }
        trace.append(entry)
        try:
            node_start = time.perf_counter()
            output = _safe_run_node(node_instance, inputs)
            node_end = time.perf_counter()
            duration = node_end - node_start
            entry.update({
                "status": "success",
                "duration_seconds": duration,
                "output_keys": list(output.keys()),
            })
            # Save output to context for downstream nodes
            context_map[node_id] = output
        except Exception as exc:
            entry.update({
                "status": "error",
                "error": str(exc),
            })
            # Stop execution and return a structured error result
            return {
                "error": "Node execution error",
                "node_id": node_id,
                "node_type": node_type,
                "error_message": str(exc),
                "trace": trace,
            }

    # At the end, gather outputs of output node(s)
    output_nodes = [nid for nid, meta in nodes_meta.items() if meta["type"] == "output"]
    final_outputs = [context_map.get(nid, {}) for nid in output_nodes]
    # If multiple output nodes merge them or return first
    final = final_outputs[0] if final_outputs else {}
    return {
        "result": final,
        "trace": trace
    }
