# backend/workflow/llm_engine.py
import os
from openai import OpenAI
from .base import Component

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

class LLMEngineComponent(Component):
    def run(self, data: dict) -> dict:
        query = data.get("query", "")
        context = data.get("context", "")
        prompt = f"Context: {context}\n\nUser query: {query}"

        if _client is None:
            # Dev fallback
            return {**data, "answer": f"(LLM fallback) Echo: {query}"}

        try:
            resp = _client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=500,
                temperature=0.0,
            )
            answer = resp.choices[0].message.content.strip()
            return {**data, "answer": answer}
        except Exception as exc:
            return {**data, "answer": f"(LLM error: {exc})"}
