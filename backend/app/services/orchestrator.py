# app/services/orchestrator.py

import logging
from typing import Optional, List, Dict, Any

from .vector_store import search_context
from .llm_service import ask_llm

logger = logging.getLogger(__name__)

def run_workflow(workflow_definition: Dict[str, Any], user_query: str, doc_ids: Optional[List[str]] = None) -> str:
    """
    Orchestrates workflow execution with KnowledgeBase retrieval.
    
    Args:
        workflow_definition: Dictionary containing workflow steps
        user_query: User's question or query
        doc_ids: Optional list of specific document IDs to search in
    
    Returns:
        Final workflow output as string
    """
    if not workflow_definition or not workflow_definition.get("steps"):
        return "Error: Invalid workflow definition"
    
    if not user_query.strip():
        return "Error: Empty user query"
    
    logger.info(f"Starting workflow execution for query: {user_query[:50]}...")
    
    # Initialize variables for workflow execution
    query = user_query
    context = ""
    response = ""
    
    try:
        for i, step in enumerate(workflow_definition.get("steps", [])):
            step_type = step.get("type")
            logger.info(f"Executing step {i+1}: {step_type}")
            
            if step_type == "UserQuery":
                # Use the provided user query
                query = user_query
                logger.info("UserQuery step: Using provided user query")
                
            elif step_type == "KnowledgeBase":
                # Retrieve context from vector store for the query
                try:
                    context_chunks = search_context(query, doc_ids=doc_ids)
                    context = "\n".join(context_chunks) if context_chunks else ""
                    logger.info(f"KnowledgeBase step: Retrieved {len(context_chunks)} context chunks")
                    
                    if not context:
                        logger.warning("No relevant context found in knowledge base")
                        
                except Exception as e:
                    logger.error(f"Error retrieving context from knowledge base: {e}")
                    context = ""
                
            elif step_type == "LLMEngine":
                # Send query + context to LLM
                try:
                    max_tokens = step.get("max_tokens", 500)
                    temperature = step.get("temperature", 0.0)
                    
                    response = ask_llm(
                        query=query, 
                        context=context if context else None,
                        max_tokens=max_tokens,
                        temperature=temperature
                    )
                    logger.info("LLMEngine step: Generated response from LLM")
                    
                except Exception as e:
                    logger.error(f"Error calling LLM: {e}")
                    response = f"Error generating response: {str(e)}"
                
            elif step_type == "Output":
                # Return the current response
                logger.info("Output step: Returning final response")
                return response or "No response generated"
                
            else:
                logger.warning(f"Unknown step type: {step_type}")
                continue
    
    except Exception as e:
        logger.error(f"Error during workflow execution: {e}")
        return f"Workflow execution error: {str(e)}"
    
    # If no explicit Output step, return the last response
    return response or "Workflow completed but no output generated"

def validate_workflow(workflow_definition: Dict[str, Any]) -> tuple[bool, str]:
    """
    Validate a workflow definition.
    
    Args:
        workflow_definition: Dictionary containing workflow definition
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not isinstance(workflow_definition, dict):
        return False, "Workflow definition must be a dictionary"
    
    if "steps" not in workflow_definition:
        return False, "Workflow definition must contain 'steps' key"
    
    steps = workflow_definition["steps"]
    if not isinstance(steps, list):
        return False, "Steps must be a list"
    
    if len(steps) == 0:
        return False, "Workflow must contain at least one step"
    
    valid_step_types = {"UserQuery", "KnowledgeBase", "LLMEngine", "Output"}
    
    for i, step in enumerate(steps):
        if not isinstance(step, dict):
            return False, f"Step {i+1} must be a dictionary"
        
        if "type" not in step:
            return False, f"Step {i+1} must have a 'type' field"
        
        step_type = step["type"]
        if step_type not in valid_step_types:
            return False, f"Step {i+1} has invalid type '{step_type}'. Valid types: {valid_step_types}"
    
    # Check if workflow has an Output step
    has_output = any(step.get("type") == "Output" for step in steps)
    if not has_output:
        return False, "Workflow must contain at least one Output step"
    
    return True, "Workflow is valid"