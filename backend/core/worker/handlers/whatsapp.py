import asyncio
import os
import json
import models
from core.logger import setup_logger
from datetime import datetime, timezone, timedelta
from sqlalchemy import text, func, or_
from database import SessionLocal
from chatwoot_client import ChatwootClient
from services.discovery import discover_or_create_chatwoot_conversation
from rabbitmq_client import rabbitmq
from config_loader import get_setting
from core.engine.business_hours import is_within_business_hours, get_next_business_hour_start
from services.ai_memory import notify_agent_memory_webhook

logger = setup_logger("Worker.WhatsApp")

# Cache em memória para evitar reprocessamento ultra-rápido do mesmo payload
GLOBAL_PROCESSING_LOCKS = {}

def normalize_phone_inbound(phone: str) -> str:
    """Normaliza o telefone de entrada para o padrão brasileiro de 13 dígitos"""
    if not phone: return phone
    cleaned = ''.join(filter(str.isdigit, str(phone)))
    
    # Se não tem o prefixo 55 e tem 10-11 dígitos, adiciona 55
    if not cleaned.startswith("55") and len(cleaned) <= 11:
        cleaned = "55" + cleaned
    
    # Se tem 55 + DDD + 8 dígitos (Total 12), adiciona o 9
    if cleaned.startswith("55") and len(cleaned) == 12:
        ddd = cleaned[2:4]
        number = cleaned[4:]
        cleaned = f"55{ddd}9{number}"
        
    return cleaned

# Import modular handlers (defined after normalize_phone_inbound and GLOBAL_PROCESSING_LOCKS to avoid circular dependency)
from core.worker.handlers.whatsapp_status import handle_whatsapp_statuses, handle_deferred_post_delivery
from core.worker.handlers.whatsapp_inbound import handle_whatsapp_inbound_messages

async def handle_whatsapp_event(data: dict):
    """
    Processa webhooks brutos da Meta (Status e Mensagens Inbound)
    """
    db = SessionLocal()
    
    try:
        entries = data.get("entry", [])
        for entry in entries:
            changes = entry.get("changes", [])
            for change in changes:
                value = change.get("value", {})
                metadata = value.get("metadata", {})
                
                # 1. PROCESS STATUS UPDATES
                statuses = value.get("statuses", [])
                if statuses:
                    await handle_whatsapp_statuses(db, statuses, value)
                
                # 2. PROCESS INBOUND MESSAGES (INTERACTION)
                messages = value.get("messages", [])
                if messages:
                    await handle_whatsapp_inbound_messages(db, messages, value, metadata)

    except Exception as e:
        logger.error(f"❌ Erro crítico no handler de WhatsApp: {e}")
        db.rollback()
    finally:
        db.close()
