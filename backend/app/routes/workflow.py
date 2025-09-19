# app/routes/workflow.py

from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List, Any, Dict
import json

# Executor + validator from the workflow package we created
from app.workflow.executor_safe import execute_workflow_safe
from app.workflow.validator import WorkflowValidationError as WorkflowValidationError

# DB helpers and models (keep these imports as in your project)
from app.database import get_db
from app.models import Workflow as WorkflowModel, ChatLog

router = APIRouter()


class WorkflowRequest(BaseModel):
    workflow_definition: Dict[str, Any]
    user_query: str
    doc_ids: Optional[List[str]] = None
    workflow_id: Optional[int] = None  # optional: link the run to a saved workflow


class SaveWorkflowRequest(BaseModel):
    name: str
    definition: Dict[str, Any]


@router.post("/run")
def execute_workflow(req: WorkflowRequest, db: Session = Depends(get_db)):
    """
    Execute a workflow safely.

    Request body:
    {
      "workflow_definition": { ... },   # nodes + edges
      "user_query": "string",
      "doc_ids": ["optional", "list", "of", "doc_ids"],
      "workflow_id": 123   # optional - used to save chat logs
    }
    """
    try:
        # Run the safe executor (validates and executes with tracing/timeouts)
        res = execute_workflow_safe(req.workflow_definition, req.user_query)

        # executor_safe returns a dict; error cases are returned as {"error": ...}
        if isinstance(res, dict) and res.get("error"):
            # bubble up executor error (includes trace)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=res)

        # Normal success: expect {"result": ..., "trace": [...]}
        result = res.get("result") if isinstance(res, dict) else res
        trace = res.get("trace") if isinstance(res, dict) else None

        # Persist chat log if DB available (workflow_id may be None)
        try:
            # Convert result to JSON string safely
            answer_str = (
                result if isinstance(result, str) else json.dumps(result, default=str, ensure_ascii=False)
            )
            chat = ChatLog(
                workflow_id=req.workflow_id,
                question=req.user_query,
                answer=answer_str,
            )
            db.add(chat)
            db.commit()
            db.refresh(chat)
        except Exception:
            # Do not fail the whole request if DB saving fails; log in your real app.
            pass

        return {"result": result, "trace": trace}

    except WorkflowValidationError as v:
        # Validation errors from the validator -> 400 Bad Request
        errors = [{"field": e.field, "message": e.message} for e in v.errors]
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"validation_errors": errors})

    except HTTPException:
        # re-raise HTTPException (so we keep status and detail)
        raise

    except Exception as e:
        # Unexpected error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Workflow execution failed: {str(e)}"
        )


@router.post("/save")
def save_workflow(req: SaveWorkflowRequest, db: Session = Depends(get_db)):
    """
    Save a workflow definition to the database.
    """
    # Check if workflow with same name exists
    existing = db.query(WorkflowModel).filter(WorkflowModel.name == req.name).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Workflow with this name already exists")

    workflow = WorkflowModel(name=req.name, definition=req.definition)
    db.add(workflow)
    db.commit()
    db.refresh(workflow)

    return {"message": "Workflow saved successfully", "workflow_id": workflow.id}


@router.get("/list")
def list_workflows(db: Session = Depends(get_db)):
    """
    List all saved workflows.
    """
    workflows = db.query(WorkflowModel).all()
    return {
        "workflows": [
            {
                "id": wf.id,
                "name": wf.name,
                "definition": wf.definition,
                "created_at": wf.created_at
            } for wf in workflows
        ]
    }


@router.get("/{workflow_id}")
def get_workflow(workflow_id: int, db: Session = Depends(get_db)):
    """
    Get a specific workflow by ID.
    """
    workflow = db.query(WorkflowModel).filter(WorkflowModel.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")

    return {
        "id": workflow.id,
        "name": workflow.name,
        "definition": workflow.definition,
        "created_at": workflow.created_at
    }


@router.delete("/{workflow_id}")
def delete_workflow(workflow_id: int, db: Session = Depends(get_db)):
    """
    Delete a workflow.
    """
    workflow = db.query(WorkflowModel).filter(WorkflowModel.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")

    db.delete(workflow)
    db.commit()

    return {"message": "Workflow deleted successfully"}
