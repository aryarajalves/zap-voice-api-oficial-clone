import pytest
import sys
import os
from datetime import datetime, timezone
from unittest.mock import patch, AsyncMock

# Adjust path to import modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import models
from routers.chat import trigger_bulk_funnel_for_conversations
from fastapi import HTTPException


@pytest.mark.asyncio
async def test_trigger_bulk_funnel_with_ids():
    engine = create_engine("sqlite:///:memory:")
    models.Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        # Criar dados de teste
        convo1 = models.ChatConversation(
            id=101,
            client_id=1,
            status="open",
            contact_name="Lead Alpha",
            phone="5511999991111",
            urgent=False
        )
        convo2 = models.ChatConversation(
            id=102,
            client_id=1,
            status="open",
            contact_name="Lead Beta",
            phone="5511999992222",
            urgent=False
        )
        db.add_all([convo1, convo2])

        funnel = models.Funnel(
            id=42,
            client_id=1,
            name="Funil de Conversão",
            is_active=True,
            is_archived=False
        )
        db.add(funnel)
        db.commit()

        mock_user = models.User(id=1, email="test@zapvoice.com")

        payload = {
            "funnel_id": 42,
            "ids": [101, 102]
        }

        with patch("rabbitmq_client.rabbitmq.publish", new_callable=AsyncMock) as mock_pub:
            res = await trigger_bulk_funnel_for_conversations(
                payload=payload,
                client_id=1,
                current_user=mock_user,
                db=db
            )

            assert res["status"] == "ok"
            assert res["funnel_id"] == 42
            assert res["funnel_name"] == "Funil de Conversão"
            assert res["total_contacts"] == 2
            assert "iniciado com sucesso para 2 contato(s)" in res["message"]

            # Verificar no banco
            trigger = db.query(models.ScheduledTrigger).filter_by(id=res["trigger_id"]).first()
            assert trigger is not None
            assert trigger.funnel_id == 42
            assert trigger.is_bulk is True
            assert trigger.total_contacts == 2
            assert len(trigger.contacts_list) == 2
            assert trigger.contacts_list[0]["phone"] == "5511999991111"
            assert trigger.contacts_list[1]["phone"] == "5511999992222"
            assert mock_pub.called

            # Verificar criacao de ChatMessage funnel_event para cada conversa
            chat_events = db.query(models.ChatMessage).filter_by(message_type="funnel_event").all()
            assert len(chat_events) == 2
            convo_ids = {ev.conversation_id for ev in chat_events}
            assert convo_ids == {101, 102}
            for ev in chat_events:
                assert ev.sender_type == "system"
                assert "🚀 Funil \"Funil de Conversão\" foi iniciado" in ev.content
                assert ev.meta_data.get("is_funnel_event") is True
                assert ev.meta_data.get("trigger_id") == trigger.id
                assert ev.meta_data.get("funnel_id") == 42
                assert ev.meta_data.get("status") == "started"

    finally:
        db.close()


@pytest.mark.asyncio
async def test_get_active_funnels_map_with_bulk_contacts():
    from routers.chat.conversation_modules.conversation_filter_helpers import get_active_funnels_map

    engine = create_engine("sqlite:///:memory:")
    models.Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        funnel = models.Funnel(id=88, client_id=1, name="Funil Lote Ativo")
        db.add(funnel)
        db.commit()

        # Trigger em lote com contacts_list
        trigger = models.ScheduledTrigger(
            id=500,
            client_id=1,
            funnel_id=88,
            status="processing",
            is_bulk=True,
            contact_phone=None,
            contacts_list=[
                {"id": 1, "phone": "5585998259497", "name": "Aryaraj"},
                {"id": 2, "meta": {"sender": {"phone_number": "5511988887777", "name": "Contato 2"}}}
            ]
        )
        db.add(trigger)
        db.commit()

        active_map = get_active_funnels_map(db, client_id=1)

        # Sufixos de 8 dígitos: "98259497" e "88887777"
        assert "98259497" in active_map
        assert active_map["98259497"]["id"] == 88
        assert active_map["98259497"]["trigger_id"] == 500
        assert active_map["98259497"]["name"] == "Funil Lote Ativo"

        assert "88887777" in active_map
        assert active_map["88887777"]["id"] == 88
        assert active_map["88887777"]["trigger_id"] == 500
    finally:
        db.close()



@pytest.mark.asyncio
async def test_trigger_bulk_funnel_select_all_pages():
    engine = create_engine("sqlite:///:memory:")
    models.Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        convo1 = models.ChatConversation(
            id=201, client_id=1, status="open", contact_name="Lead 1", phone="5511999993333"
        )
        convo2 = models.ChatConversation(
            id=202, client_id=1, status="open", contact_name="Lead 2", phone="5511999994444"
        )
        convo_archived = models.ChatConversation(
            id=203, client_id=1, status="archived", contact_name="Lead 3", phone="5511999995555"
        )
        db.add_all([convo1, convo2, convo_archived])

        funnel = models.Funnel(
            id=50, client_id=1, name="Funil Todos", is_active=True, is_archived=False
        )
        db.add(funnel)
        db.commit()

        mock_user = models.User(id=1, email="test@zapvoice.com")

        payload = {
            "funnel_id": 50,
            "select_all_pages": True,
            "status": "open"
        }

        with patch("rabbitmq_client.rabbitmq.publish", new_callable=AsyncMock):
            res = await trigger_bulk_funnel_for_conversations(
                payload=payload,
                client_id=1,
                current_user=mock_user,
                db=db
            )

            assert res["status"] == "ok"
            assert res["total_contacts"] == 2

    finally:
        db.close()


@pytest.mark.asyncio
async def test_trigger_bulk_funnel_validations():
    engine = create_engine("sqlite:///:memory:")
    models.Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        mock_user = models.User(id=1, email="test@zapvoice.com")

        # 1. Sem funnel_id
        with pytest.raises(HTTPException) as exc1:
            await trigger_bulk_funnel_for_conversations(
                payload={"ids": [1]},
                client_id=1,
                current_user=mock_user,
                db=db
            )
        assert exc1.value.status_code == 400
        assert "Funil não especificado" in exc1.value.detail

        # 2. Funil inexistente
        with pytest.raises(HTTPException) as exc2:
            await trigger_bulk_funnel_for_conversations(
                payload={"funnel_id": 999, "ids": [1]},
                client_id=1,
                current_user=mock_user,
                db=db
            )
        assert exc2.value.status_code == 404

        # 3. Funil existe mas sem IDs nem select_all_pages
        funnel = models.Funnel(id=60, client_id=1, name="Funil Teste")
        db.add(funnel)
        db.commit()

        with pytest.raises(HTTPException) as exc3:
            await trigger_bulk_funnel_for_conversations(
                payload={"funnel_id": 60},
                client_id=1,
                current_user=mock_user,
                db=db
            )
        assert exc3.value.status_code == 400
        assert "Nenhuma conversa selecionada" in exc3.value.detail

        # 4. IDs com conversas sem telefone
        convo_no_phone = models.ChatConversation(id=301, client_id=1, phone="")
        db.add(convo_no_phone)
        db.commit()

        with pytest.raises(HTTPException) as exc4:
            await trigger_bulk_funnel_for_conversations(
                payload={"funnel_id": 60, "ids": [301]},
                client_id=1,
                current_user=mock_user,
                db=db
            )
        assert exc4.value.status_code == 400
        assert "Nenhum contato com telefone válido" in exc4.value.detail

    finally:
        db.close()
