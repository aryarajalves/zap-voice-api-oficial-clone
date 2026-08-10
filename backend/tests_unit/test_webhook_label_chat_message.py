"""
Testes unitários para validação de aplicação de etiquetas via Webhook
com mensagem de sistema no chat e fuso horário de Brasília.
"""
import pytest
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session

import models
from services.chat_label_service import apply_webhook_labels, get_brasilia_now

def test_get_brasilia_now():
    now_br = get_brasilia_now()
    assert now_br is not None
    # Brasília offset é GMT-3 (-03:00)
    assert now_br.tzinfo is not None

def test_apply_webhook_labels_new_label(db_session: Session):
    # Setup
    client = models.Client(name="Cliente Teste Webhook Label")
    db_session.add(client)
    db_session.commit()

    phone = "5511999998888"

    # Executar
    convo = apply_webhook_labels(
        db=db_session,
        client_id=client.id,
        phone=phone,
        raw_labels="compra-aprovada",
        source="Webhook Kiwify",
        contact_name="Ana Silva"
    )

    assert convo is not None
    assert "compra-aprovada" in convo.labels

    # Verificar mensagem de sistema no chat
    messages = db_session.query(models.ChatMessage).filter(
        models.ChatMessage.conversation_id == convo.id
    ).all()

    assert len(messages) == 1
    sys_msg = messages[0]
    assert sys_msg.sender_type == "system"
    assert sys_msg.message_type == "text"
    assert "Marcador(es) 'compra-aprovada' adicionado(s) via Webhook Kiwify em " in sys_msg.content

    # Verificar se contém o formato de data (DD/MM/YYYY às HH:MM)
    now_br = get_brasilia_now()
    expected_date = now_br.strftime("%d/%m/%Y")
    assert expected_date in sys_msg.content
    assert " às " in sys_msg.content

def test_apply_webhook_labels_duplicate_ignored(db_session: Session):
    client = models.Client(name="Cliente Teste Webhook Dup")
    db_session.add(client)
    db_session.commit()

    phone = "5511988887777"

    # Primeira execução
    convo1 = apply_webhook_labels(
        db=db_session,
        client_id=client.id,
        phone=phone,
        raw_labels="vip",
        source="Webhook Hotmart"
    )
    assert len(convo1.labels) == 1

    # Segunda execução com a mesma etiqueta
    convo2 = apply_webhook_labels(
        db=db_session,
        client_id=client.id,
        phone=phone,
        raw_labels="vip",
        source="Webhook Hotmart"
    )
    assert len(convo2.labels) == 1

    # Não deve criar segunda mensagem de sistema duplicada
    messages = db_session.query(models.ChatMessage).filter(
        models.ChatMessage.conversation_id == convo2.id
    ).all()

    assert len(messages) == 1

def test_apply_webhook_labels_multiple_labels(db_session: Session):
    client = models.Client(name="Cliente Teste Multi Label")
    db_session.add(client)
    db_session.commit()

    phone = "5511977776666"

    convo = apply_webhook_labels(
        db=db_session,
        client_id=client.id,
        phone=phone,
        raw_labels=["lead-quente", "boleto-gerado"],
        source="Webhook Eduzz"
    )

    assert "lead-quente" in convo.labels
    assert "boleto-gerado" in convo.labels

    messages = db_session.query(models.ChatMessage).filter(
        models.ChatMessage.conversation_id == convo.id
    ).all()

    assert len(messages) == 1
    assert "lead-quente" in messages[0].content or "boleto-gerado" in messages[0].content

def test_apply_webhook_labels_remove_robo_add_humano(db_session: Session):
    client = models.Client(name="Cliente Teste Swap Robo Humano")
    db_session.add(client)
    db_session.commit()

    phone = "5511966665555"

    # Criar conversa inicial com etiqueta 'robo'
    convo = models.ChatConversation(
        client_id=client.id,
        phone=phone,
        contact_name="Rosileia Teste",
        status="open",
        labels=["whatsapp", "robo"]
    )
    db_session.add(convo)
    db_session.commit()

    # Executar troca de etiqueta: remover 'robo' e adicionar 'humano' via API
    updated_convo = apply_webhook_labels(
        db=db_session,
        client_id=client.id,
        phone=phone,
        raw_labels="humano",
        remove_raw_labels="robo",
        source="API"
    )

    assert updated_convo is not None
    assert "humano" in updated_convo.labels
    assert "robo" not in updated_convo.labels

    # Verificar mensagem de sistema no chat
    messages = db_session.query(models.ChatMessage).filter(
        models.ChatMessage.conversation_id == updated_convo.id
    ).all()

    assert len(messages) == 1
    sys_msg = messages[0]
    assert sys_msg.sender_type == "system"
    assert "Marcador(es) 'robo' removido(s) e Marcador(es) 'humano' adicionado(s) via API em " in sys_msg.content

    now_br = get_brasilia_now()
    expected_date = now_br.strftime("%d/%m/%Y")
    assert expected_date in sys_msg.content
    assert " às " in sys_msg.content

def test_apply_webhook_labels_only_remove(db_session: Session):
    client = models.Client(name="Cliente Teste Only Remove")
    db_session.add(client)
    db_session.commit()

    phone = "5511955554444"

    convo = models.ChatConversation(
        client_id=client.id,
        phone=phone,
        contact_name="Cliente Remocao",
        status="open",
        labels=["suporte", "temp-tag"]
    )
    db_session.add(convo)
    db_session.commit()

    updated_convo = apply_webhook_labels(
        db=db_session,
        client_id=client.id,
        phone=phone,
        remove_raw_labels="temp-tag",
        source="Webhook"
    )

    assert updated_convo is not None
    assert "temp-tag" not in updated_convo.labels
    assert "suporte" in updated_convo.labels

    messages = db_session.query(models.ChatMessage).filter(
        models.ChatMessage.conversation_id == updated_convo.id
    ).all()

    assert len(messages) == 1
    sys_msg = messages[0]
    assert "Marcador(es) 'temp-tag' removido(s) via Webhook em " in sys_msg.content

