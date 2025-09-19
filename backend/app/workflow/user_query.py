from typing import Dict, Any

class UserQueryComponent:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
    
    async def process(self, input_data: Dict[str, Any] = None) -> Dict[str, Any]:
        query = self.config.get("query", "")
        if not query and input_data:
            query = input_data.get("query", "")
            
        if not query:
            raise ValueError("No query provided")
            
        return {"query": query}