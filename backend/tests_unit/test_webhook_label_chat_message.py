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
    assert "Etiqueta 'compra-aprovada' adicionada via Webhook Kiwify em " in sys_msg.content

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

    assert len(messages) == 2
    contents = [m.content for m in messages]
    assert any("lead-quente" in c for c in contents)
    assert any("boleto-gerado" in c for c in contents)
