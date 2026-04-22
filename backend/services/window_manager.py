from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
import models
import logging
from typing import Optional

logger = logging.getLogger("WindowManager")

WINDOW_HOURS = 23
WINDOW_MINUTES = 59

async def is_window_open_strict(
    client_id: int,
    phone: str,
    current_conversation_id: int,
    db: Session,
    chatwoot=None
) -> bool:
    """
    Check if the conversation window is strictly open (no fallback).
    """
    now = datetime.now(timezone.utc)
    safety_limit = now - timedelta(hours=WINDOW_HOURS, minutes=WINDOW_MINUTES)
    clean_phone = "".join(filter(str.isdigit, str(phone)))

    # 1. Cache Check
    # Priority A: Check by exact conversation ID
    current_window = db.query(models.ContactWindow).filter(
        models.ContactWindow.chatwoot_conversation_id == current_conversation_id,
        models.ContactWindow.client_id == client_id
    ).first()

    if current_window:
        last_int = current_window.last_interaction_at
        if last_int.tzinfo is None:
            last_int = last_int.replace(tzinfo=timezone.utc)
        if last_int >= safety_limit:
            return True

    # Priority B: Check by Phone (Client-wide window)
    # This covers cases where the interaction was just received and cached but ID didn't sync yet
    phone_window = db.query(models.ContactWindow).filter(
        models.ContactWindow.phone == clean_phone,
        models.ContactWindow.client_id == client_id
    ).order_by(models.ContactWindow.last_interaction_at.desc()).first()

    if phone_window:
        last_int = phone_window.last_interaction_at
        if last_int.tzinfo is None:
            last_int = last_int.replace(tzinfo=timezone.utc)
        if last_int >= safety_limit:
            # We found a fresh interaction for this phone! We can trust the window is open.
            # We don't update conversation_id here to avoid side-effects in a 'check' function
            return True

    # 2. API Check
    if chatwoot:
        try:
            # We use is_within_24h_window from ChatwootClient
            is_open = await chatwoot.is_within_24h_window(current_conversation_id)
            if is_open:
                # Update cache if it was closed
                if current_window:
                    current_window.last_interaction_at = now
                else:
                    db.add(models.ContactWindow(
                        client_id=client_id,
                        phone=clean_phone,
                        chatwoot_conversation_id=current_conversation_id,
                        last_interaction_at=now
                    ))
                db.commit()
                return True
        except Exception as e:
            logger.error(f"[WINDOW] Error in strict API check: {e}")

    return False

async def get_best_conversation(
    client_id: int,
    phone: str,
    current_conversation_id: int,
    db: Session,
    chatwoot=None  # ChatwootClient instance — obrigatório para fallback via API
) -> int:
    """
    Verifica se a conversa atual tem uma janela de 24h aberta.
    
    Fluxo de decisão:
    1. Verifica o cache local (ContactWindow) — mais rápido
    2. Se o cache estiver vazio/fechado, consulta a API do Chatwoot para a conversa atual.
    3. Se ainda assim não encontrar janela aberta, procura outra conversa do mesmo número no cache.
    4. Se nada no cache, executa uma busca global na API (ensure_conversation) que procura 
       por TODAS as conversas do contato e retorna a mais recente com janela aberta.
    5. Fallback final: retorna a conversa original.
    """
    # ETAPAS 1 e 2: Verificar janela na conversa atual (Cache -> API)
    is_open = await is_window_open_strict(client_id, phone, current_conversation_id, db, chatwoot)
    if is_open:
        logger.debug(f"[WINDOW] ✅ Current conversation {current_conversation_id} is OPEN.")
        return current_conversation_id

    # -----------------------------------------------------------------------
    # ETAPA 3: Procurar OUTRA conversa com janela aberta no cache local
    # -----------------------------------------------------------------------
    now = datetime.now(timezone.utc)
    safety_limit = now - timedelta(hours=WINDOW_HOURS, minutes=WINDOW_MINUTES)
    clean_phone = "".join(filter(str.isdigit, str(phone)))

    better_window = db.query(models.ContactWindow).filter(
        models.ContactWindow.phone == clean_phone,
        models.ContactWindow.client_id == client_id,
        models.ContactWindow.last_interaction_at >= safety_limit
    ).order_by(models.ContactWindow.last_interaction_at.desc()).first()

    if better_window and better_window.chatwoot_conversation_id:
        new_id = better_window.chatwoot_conversation_id
        if new_id != current_conversation_id:
            logger.info(
                f"[WINDOW] 🔄 Found better conversation in cache: {current_conversation_id} → {new_id} "
                f"(last: {better_window.last_interaction_at})"
            )
        return new_id

    # -----------------------------------------------------------------------
    # ETAPA 4: Busca Global na API do Chatwoot (ensure_conversation)
    # Busca em todas as conversas do contato e prioriza a mais recente aberta.
    # -----------------------------------------------------------------------
    if chatwoot:
        try:
            logger.info(f"[WINDOW] 🔍 Global API Search for {phone} (current {current_conversation_id} closed)")
            
            # Tentar obter inbox_id se possível para filtrar melhor
            inbox_id = None
            if better_window:
                inbox_id = better_window.chatwoot_inbox_id
                
            # ensure_conversation já faz a busca global, checa janela de cada uma e cria nova se necessário
            # Passamos name=None para ele tentar buscar o contato existente
            conv_res = await chatwoot.ensure_conversation(phone_number=phone, name=None, inbox_id=inbox_id)
            api_best_id = conv_res.get("conversation_id") if conv_res else None
            
            if api_best_id:
                if api_best_id != current_conversation_id:
                    logger.info(f"[WINDOW] 🎯 API ensure_conversation found better option: {api_best_id}")
                return api_best_id
        except Exception as e:
            logger.error(f"[WINDOW] ❌ Error during global API search for {phone}: {e}")

    # -----------------------------------------------------------------------
    # ETAPA 5: Fallback final
    # -----------------------------------------------------------------------
    logger.warning(
        f"[WINDOW] ⚠️ No open window found even after global search for {phone}. "
        f"Falling back to original conversation {current_conversation_id}."
    )
    return current_conversation_id
