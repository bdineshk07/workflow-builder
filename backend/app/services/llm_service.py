# app/services/llm_service.py

from dotenv import load_dotenv
import os
from openai import OpenAI
import logging

# Load environment variables from .env
load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")

logger = logging.getLogger(__name__)

# Initialize OpenAI client
_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

def ask_llm(query: str, context: str | None = None, max_tokens: int = 500, temperature: float = 0.0) -> str:
    """
    Sends a query (with optional context) to OpenAI GPT and returns the response.
    Falls back to a dummy response if the API key is not set.
    
    Args:
        query: The question or prompt to send to the LLM
        context: Optional context information to include in the prompt
        max_tokens: Maximum number of tokens in the response
        temperature: Controls randomness in the response (0.0 = deterministic)
    
    Returns:
        The LLM's response as a string
    """
    if not query.strip():
        return "Please provide a valid query."
    
    prompt = query
    if context and context.strip():
        prompt = f"Use the following context to answer the question:\n\n{context}\n\nQuestion: {query}"

    if _client is None:
        logger.warning("OpenAI client not initialized - using fallback response")
        return f"(Fallback) Query: {query}"

    try:
        response = _client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens,
            temperature=temperature,
        )
        
        result = response.choices[0].message.content.strip()
        logger.info(f"LLM response generated successfully for query: {query[:50]}...")
        return result
        
    except Exception as exc:
        logger.error(f"Error calling OpenAI API: {exc}")
        return f"(LLM error: {exc})"

def get_embedding(text: str, model: str = "text-embedding-3-small") -> list[float] | None:
    """
    Get embedding for a text using OpenAI's embedding API.
    
    Args:
        text: Text to embed
        model: Embedding model to use
    
    Returns:
        List of floats representing the embedding, or None if error
    """
    if not _client:
        logger.warning("OpenAI client not initialized - cannot generate embedding")
        return None
    
    try:
        response = _client.embeddings.create(
            input=text,
            model=model
        )
        return response.data[0].embedding
    except Exception as exc:
        logger.error(f"Error generating embedding: {exc}")
        return None

def is_llm_available() -> bool:
    """Check if LLM service is available."""
    return _client is not None