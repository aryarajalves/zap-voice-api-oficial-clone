from typing import List, Optional, Any, Union
from pydantic import BaseModel, Field, ValidationError

class FunnelBase(BaseModel):
    name: str
    description: Optional[str] = None
    trigger_phrase: Optional[str] = None
    allowed_phone: Optional[str] = None
    steps: Union[List[Any], dict] = Field(..., description="Lista sequencial de passos ou Grafo do Flow Builder")

class FunnelCreate(FunnelBase):
    pass

data = {
    "name": "Funil Teste Grafo",
    "description": "Teste de salvamento com estrutura de grafo",
    "trigger_phrase": "#teste_grafo",
    "steps": {
        "nodes": [
            {"id": "1", "type": "messageNode", "data": {"content": "Olá!"}, "position": {"x": 0, "y": 0}},
            {"id": "2", "type": "mediaNode", "data": {"mediaUrl": "http://link.com"}, "position": {"x": 0, "y": 100}}
        ],
        "edges": [
            {"id": "e1-2", "source": "1", "target": "2"}
        ]
    }
}

try:
    obj = FunnelCreate(**data)
    print("✅ Pydantic validation success!")
    print(f"Steps type: {type(obj.steps)}")
except ValidationError as e:
    print("❌ Pydantic validation failed!")
    print(e.json())
