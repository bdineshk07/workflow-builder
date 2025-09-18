# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="AI Planet Backend - scaffold")

# allow local frontend (Vite) during dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "ok"}

class ChatRequest(BaseModel):
    query: str

@app.post("/api/chat")
async def chat(req: ChatRequest):
    # placeholder: later this will call the LLM / workflow executor
    return {"answer": f"Echo: {req.query}"}
