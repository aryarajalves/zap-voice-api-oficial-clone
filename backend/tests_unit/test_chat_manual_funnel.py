import pytest
import sys
import os
from datetime import datetime, timezone

# Adjust path to import modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import models
from routers.chat import list_conversations, trigger_funnel_for_conversation
from fastapi import HTTPException

@pytest.mark.asyncio
async def test_manual_funnel_execution_and_active_funnel_mapping():
    # Criar banco SQLite em memoria
    engine = create_engine("sqlite:///:memory:")
    models.Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Criar dados de teste
        convo = models.ChatConversation(
            id=300,
            client_id=1,
            status="open",
            contact_name="Manual Funnel Customer",
            phone="5585996000000",
            urgent=False
        )
        db.add(convo)
        
        funnel = models.Funnel(
            id=10,
            client_id=1,
            name="Funil de Boas-vindas",
            is_active=True,
            is_archived=False
        )
        db.add(funnel)
        db.commit()
        
        mock_user = models.User(id=1)
        
        # Testar disparo manual
        payload = {"funnel_id": 10}
        res_trigger = await trigger_funnel_for_conversation(
            conversation_id=300,
            payload=payload,
            client_id=1,
            current_user=mock_user,
            db=db
        )
        
        assert res_trigger["status"] == "ok"
        assert res_trigger["funnel_id"] == 10
        assert res_trigger["funnel_name"] == "Funil de Boas-vindas"
        
        # Verificar se ScheduledTrigger correspondente foi criado no banco
        trigger_db = db.query(models.ScheduledTrigger).filter_by(conversation_id=300, funnel_id=10).first()
        assert trigger_db is not None
        assert trigger_db.status in ["queued", "processing"]
        
        # Testar duplicidade (deve levantar erro HTTP 400)
        with pytest.raises(HTTPException) as exc_info:
            await trigger_funnel_for_conversation(
                conversation_id=300,
                payload=payload,
                client_id=1,
                current_user=mock_user,
                db=db
            )
        assert exc_info.value.status_code == 400
        assert "já está em execução" in exc_info.value.detail
        
        # Testar listagem e verificar o active_funnel injetado
        res_list = await list_conversations(
            tab="todos",
            status="open",
            client_id=1,
            current_user=mock_user,
            db=db
        )
        
        assert len(res_list["conversations"]) == 1
        active_funnel = res_list["conversations"][0]["active_funnel"]
        assert active_funnel is not None
        assert active_funnel["id"] == 10
        assert active_funnel["name"] == "Funil de Boas-vindas"
        
    finally:
        db.close()
