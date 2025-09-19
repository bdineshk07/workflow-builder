from typing import Dict, Any
import logging
from openai import OpenAI
from os import getenv

logger = logging.getLogger(__name__)

class LLMEngineComponent:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.client = OpenAI(api_key=getenv("OPENAI_API_KEY"))
        self.model = config.get("model", "gpt-3.5-turbo")
        self.temperature = config.get("temperature", 0.0)
        self.max_tokens = config.get("max_tokens", 800)

    async def process(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        if not input_data or "query" not in input_data:
            raise ValueError("Input must contain 'query'")

        query = input_data["query"]
        context = input_data.get("context", [])
        
        # Construct prompt with context
        system_prompt = "You are a helpful AI assistant. Use the provided context to answer questions accurately."
        context_text = "\n\n".join([doc.get("text", "") for doc in context]) if context else ""
        
        messages = [
            {"role": "system", "content": system_prompt},
        ]

        if context_text:
            messages.append({
                "role": "user", 
                "content": f"Context:\n{context_text}\n\nQuestion: {query}"
            })
        else:
            messages.append({"role": "user", "content": query})

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=self.temperature,
                max_tokens=self.max_tokens
            )
            
            return {
                "answer": response.choices[0].message.content.strip(),
                "sources": [doc.get("id") for doc in context] if context else []
            }
            
        except Exception as e:
            logger.error(f"LLM processing failed: {str(e)}")
            raise RuntimeError(f"LLM processing failed: {str(e)}")