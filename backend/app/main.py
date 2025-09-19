# app/main.py

import os
import logging
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI  

from app.routes import workflow, documents
from app.services.orchestrator import run_workflow

# Load environment variables
load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")

# OpenAI client
client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai-planet-backend")

# Create FastAPI app
app = FastAPI(title="AI Planet Backend")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root endpoint
@app.get("/")
def root():
    return {"message": "Hello, world"}

# Health check
@app.get("/health")
def health():
    return {"status": "ok"}

# Chat API
class ChatRequest(BaseModel):
    query: str

@app.post("/api/chat")
def chat(req: ChatRequest):
    logger.info("Received chat request: %s", req.query)

    if not client:
        return {"answer": f"(DEV fallback) Echo: {req.query}"}

    try:
        resp = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[{"role": "user", "content": req.query}],
            max_tokens=800,
            temperature=0.0,
        )
        return {"answer": resp.choices[0].message.content.strip()}
    except Exception as exc:
        logger.exception("Error while calling OpenAI")
        return {"answer": f"(Error calling OpenAI) {str(exc)}"}

# Workflow runner
class WorkflowRunRequest(BaseModel):
    workflow: dict
    query: str

@app.post("/api/run_workflow")
def run_workflow_endpoint(req: WorkflowRunRequest):
    try:
        return run_workflow(req.workflow, req.query)
    except Exception as exc:
        logger.exception("Error while running workflow")
        return {"error": str(exc)}

# Routers
app.include_router(workflow.router, prefix="/workflow", tags=["workflow"])
app.include_router(documents.router, prefix="/documents", tags=["documents"])