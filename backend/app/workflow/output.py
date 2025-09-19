from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)

class OutputComponent:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.format = config.get("format", "text")
    
    async def process(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process the input and format the output."""
        try:
            if not input_data:
                raise ValueError("No input data provided")

            # Get answer and sources from input
            answer = input_data.get("answer", "")
            sources = input_data.get("sources", [])

            # Format output based on configuration
            if self.format == "json":
                return {
                    "answer": answer,
                    "sources": sources
                }
            else:
                # Default text format
                source_text = f"\nSources: {', '.join(sources)}" if sources else ""
                return {
                    "result": f"{answer}{source_text}"
                }

        except Exception as e:
            logger.error(f"Error in output component: {str(e)}")
            raise RuntimeError(f"Output processing failed: {str(e)}")