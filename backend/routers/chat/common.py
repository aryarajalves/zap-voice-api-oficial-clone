from typing import Optional
from fastapi import Header, Depends
from pydantic import BaseModel
import models
from core.deps import get_current_user
from core.logger import setup_logger

logger = setup_logger("ChatRouter")


def get_client_id(
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    current_user: models.User = Depends(get_current_user)
) -> Optional[int]:
    if x_client_id:
        return x_client_id
    if current_user and current_user.client_id:
        return current_user.client_id
    return None


class LabelCreateRequest(BaseModel):
    name: str
    color: Optional[str] = "#3B82F6"


class ResendAgentFlowPayload(BaseModel):
    content: Optional[str] = None


class ReactRequest(BaseModel):
    phone: str
    message_id: str
    emoji: str
