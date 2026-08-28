from typing import Optional
from fastapi import Header, Depends
from pydantic import BaseModel
import models
from core.deps import get_current_user, get_validated_client_id
from core.logger import setup_logger

logger = setup_logger("ChatRouter")


async def get_client_id(
    client_id: int = Depends(get_validated_client_id)
) -> int:
    """
    Retorna o client_id autenticado e validado contra o usuário atual (multi-tenant IDOR protection).
    """
    return client_id



class LabelCreateRequest(BaseModel):
    name: str
    color: Optional[str] = "#3B82F6"


class ResendAgentFlowPayload(BaseModel):
    content: Optional[str] = None


class ReactRequest(BaseModel):
    phone: str
    message_id: str
    emoji: str
