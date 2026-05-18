import pytest
from unittest.mock import patch, MagicMock
from sqlalchemy import text
from datetime import datetime, timezone
import asyncio

import models
from core.worker.handlers.whatsapp import handle_whatsapp_event

@pytest.mark.asyncio
async def test_real_time_cost_sync_delivered_paid(db_session):
    """Testa se uma mensagem paga (categoria marketing) atualiza corretamente o trigger pai."""
    # Mock para pg_advisory_xact_lock no SQLite de teste
    orig_execute = db_session.execute
    def mock_execute(statement, params=None, *args, **kwargs):
        if "pg_advisory_xact_lock" in str(statement):
            from unittest.mock import MagicMock
            return MagicMock()
        return orig_execute(statement, params, *args, **kwargs)
    db_session.execute = mock_execute

    # 1. Cria um trigger correspondente a um template pago via webhook
    trigger = models.ScheduledTrigger(
        client_id=1,
        template_name="hello_world",
        is_free_message=False,
        cost_per_unit=0.35,
        sent_as="TEMPLATE",
        total_cost=0.0,
        total_paid_templates=0,
        status="completed"
    )
    db_session.add(trigger)
    db_session.commit()

    # 2. Cria o status da mensagem no estado 'sent'
    message = models.MessageStatus(
        trigger_id=trigger.id,
        message_id="wamid_test_123",
        phone_number="5585999999999",
        status="sent",
        delivered_counted=False,
        read_counted=False
    )
    db_session.add(message)
    db_session.commit()

    # 3. Simula o payload de webhook da Meta contendo categoria 'marketing'
    payload = {
        "entry": [
            {
                "changes": [
                    {
                        "value": {
                            "metadata": {
                                "phone_number_id": "123456"
                            },
                            "statuses": [
                                {
                                    "id": "wamid.wamid_test_123",
                                    "status": "delivered",
                                    "recipient_id": "5585999999999",
                                    "pricing": {
                                        "billable": True,
                                        "pricing_model": "CBP",
                                        "category": "marketing"
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        ]
    }

    # Executa a chamada interceptando o SessionLocal do handler e handle_deferred_post_delivery
    with patch("core.worker.handlers.whatsapp.SessionLocal", return_value=db_session), \
         patch("core.worker.handlers.whatsapp.handle_deferred_post_delivery", return_value=asyncio.sleep(0)):
        await handle_whatsapp_event(payload)

    # 4. Consulta os registros atualizados do banco de dados (novas instâncias)
    updated_message = db_session.query(models.MessageStatus).filter_by(message_id="wamid_test_123").first()
    updated_trigger = db_session.query(models.ScheduledTrigger).filter_by(id=trigger.id).first()

    # Validações
    assert updated_message.status == "delivered"
    assert updated_message.meta_price_category == "marketing"
    assert updated_message.meta_price_brl == 0.35
    assert updated_message.delivered_counted is True
    
    assert updated_trigger.total_cost == 0.35
    assert updated_trigger.total_paid_templates == 1


@pytest.mark.asyncio
async def test_real_time_cost_sync_delivered_free_session(db_session):
    """Testa se uma mensagem de sessão gratuita (categoria service) zera o custo e não cobra."""
    # Mock para pg_advisory_xact_lock no SQLite de teste
    orig_execute = db_session.execute
    def mock_execute(statement, params=None, *args, **kwargs):
        if "pg_advisory_xact_lock" in str(statement):
            from unittest.mock import MagicMock
            return MagicMock()
        return orig_execute(statement, params, *args, **kwargs)
    db_session.execute = mock_execute

    # 1. Cria um trigger de mensagem gratuita
    trigger = models.ScheduledTrigger(
        client_id=1,
        template_name="hello_world_free",
        is_free_message=True,
        cost_per_unit=0.0,
        sent_as="FREE_MESSAGE",
        total_cost=0.0,
        total_paid_templates=0,
        status="completed"
    )
    db_session.add(trigger)
    db_session.commit()

    # 2. Cria o status da mensagem
    message = models.MessageStatus(
        trigger_id=trigger.id,
        message_id="wamid_test_free_123",
        phone_number="5585999999999",
        status="sent",
        delivered_counted=False,
        read_counted=False
    )
    db_session.add(message)
    db_session.commit()

    # 3. Simula o payload de webhook com a categoria 'service'
    payload = {
        "entry": [
            {
                "changes": [
                    {
                        "value": {
                            "metadata": {
                                "phone_number_id": "123456"
                            },
                            "statuses": [
                                {
                                    "id": "wamid.wamid_test_free_123",
                                    "status": "delivered",
                                    "recipient_id": "5585999999999",
                                    "pricing": {
                                        "billable": True,
                                        "pricing_model": "CBP",
                                        "category": "service"
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        ]
    }

    # Executa a chamada
    with patch("core.worker.handlers.whatsapp.SessionLocal", return_value=db_session), \
         patch("core.worker.handlers.whatsapp.handle_deferred_post_delivery", return_value=asyncio.sleep(0)):
        await handle_whatsapp_event(payload)

    # 4. Consulta os registros atualizados
    updated_message = db_session.query(models.MessageStatus).filter_by(message_id="wamid_test_free_123").first()
    updated_trigger = db_session.query(models.ScheduledTrigger).filter_by(id=trigger.id).first()

    # Validações
    assert updated_message.status == "delivered"
    assert updated_message.meta_price_category == "service"
    assert updated_message.meta_price_brl == 0.0
    assert updated_message.delivered_counted is True
    
    assert updated_trigger.total_cost == 0.0
    assert updated_trigger.total_paid_templates == 0


@pytest.mark.asyncio
async def test_real_time_cost_sync_button_interaction(db_session):
    """Testa se uma mensagem interativa (clique em botão) incrementa total_interactions."""
    # Evita que o fechamento da sessão no handler desvincule as instâncias
    db_session.close = MagicMock()
    
    # Mock para pg_advisory_xact_lock no SQLite de teste
    orig_execute = db_session.execute
    def mock_execute(statement, params=None, *args, **kwargs):
        if "pg_try_advisory_xact_lock" in str(statement):
            from unittest.mock import MagicMock
            mock_res = MagicMock()
            mock_res.scalar.return_value = True
            return mock_res
        return orig_execute(statement, params, *args, **kwargs)
    db_session.execute = mock_execute

    # 1. Cria um trigger correspondente
    trigger = models.ScheduledTrigger(
        client_id=1,
        template_name="hello_world",
        is_free_message=False,
        cost_per_unit=0.35,
        sent_as="TEMPLATE",
        total_cost=0.0,
        total_interactions=0,
        status="completed"
    )
    db_session.add(trigger)
    db_session.commit()

    trigger_id = trigger.id

    # 2. Cria o status da mensagem
    message = models.MessageStatus(
        trigger_id=trigger_id,
        message_id="wamid_test_interaction_123",
        phone_number="5585999999999",
        status="sent",
        delivered_counted=True,
        read_counted=True,
        is_interaction=False,
        interaction_counted=False
    )
    db_session.add(message)
    db_session.commit()

    message_uuid = message.message_id

    # 3. Payload contendo mensagem inbound do tipo 'interactive' (clique em botão)
    payload = {
        "entry": [
            {
                "changes": [
                    {
                        "value": {
                            "metadata": {
                                "phone_number_id": "123456"
                            },
                            "contacts": [
                                {
                                    "profile": {
                                        "name": "João"
                                    },
                                    "wa_id": "5585999999999"
                                }
                            ],
                            "messages": [
                                {
                                    "from": "5585999999999",
                                    "id": "wamid.inbound_123",
                                    "type": "interactive",
                                    "interactive": {
                                        "type": "button_reply",
                                        "button_reply": {
                                            "id": "btn_1",
                                            "title": "Quero saber mais"
                                        }
                                    },
                                    "context": {
                                        "id": "wamid.wamid_test_interaction_123"
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        ]
    }

    # Executa a chamada
    with patch("core.worker.handlers.whatsapp.SessionLocal", return_value=db_session), \
         patch("core.worker.handlers.whatsapp.rabbitmq.publish", return_value=asyncio.sleep(0)):
        await handle_whatsapp_event(payload)

    # 4. Verifica se incrementou o total_interactions no trigger e is_interaction no status
    updated_message = db_session.query(models.MessageStatus).filter_by(message_id=message_uuid).first()
    updated_trigger = db_session.query(models.ScheduledTrigger).filter_by(id=trigger_id).first()

    assert updated_message.is_interaction is True
    assert updated_message.interaction_counted is True
    assert updated_trigger.total_interactions == 1


@pytest.mark.asyncio
async def test_real_time_cost_sync_text_interaction_no_increment(db_session):
    """Testa se uma mensagem de texto simples (texto puro) NÃO incrementa total_interactions."""
    # Evita que o fechamento da sessão no handler desvincule as instâncias
    db_session.close = MagicMock()
    
    # Mock para pg_advisory_xact_lock no SQLite de teste
    orig_execute = db_session.execute
    def mock_execute(statement, params=None, *args, **kwargs):
        if "pg_try_advisory_xact_lock" in str(statement):
            from unittest.mock import MagicMock
            mock_res = MagicMock()
            mock_res.scalar.return_value = True
            return mock_res
        return orig_execute(statement, params, *args, **kwargs)
    db_session.execute = mock_execute

    # 1. Cria um trigger correspondente
    trigger = models.ScheduledTrigger(
        client_id=1,
        template_name="hello_world",
        is_free_message=False,
        cost_per_unit=0.35,
        sent_as="TEMPLATE",
        total_cost=0.0,
        total_interactions=0,
        status="completed"
    )
    db_session.add(trigger)
    db_session.commit()

    trigger_id = trigger.id

    # 2. Cria o status da mensagem
    message = models.MessageStatus(
        trigger_id=trigger_id,
        message_id="wamid_test_text_123",
        phone_number="5585999999999",
        status="sent",
        delivered_counted=True,
        read_counted=True,
        is_interaction=False,
        interaction_counted=False
    )
    db_session.add(message)
    db_session.commit()

    message_uuid = message.message_id

    # 3. Payload contendo mensagem inbound do tipo 'text' (resposta em texto puro)
    payload = {
        "entry": [
            {
                "changes": [
                    {
                        "value": {
                            "metadata": {
                                "phone_number_id": "123456"
                            },
                            "contacts": [
                                {
                                    "profile": {
                                        "name": "João"
                                    },
                                    "wa_id": "5585999999999"
                                }
                            ],
                            "messages": [
                                {
                                    "from": "5585999999999",
                                    "id": "wamid.inbound_text_123",
                                    "type": "text",
                                    "text": {
                                        "body": "Olá, tudo bem?"
                                    },
                                    "context": {
                                        "id": "wamid.wamid_test_text_123"
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        ]
    }

    # Executa a chamada
    with patch("core.worker.handlers.whatsapp.SessionLocal", return_value=db_session), \
         patch("core.worker.handlers.whatsapp.rabbitmq.publish", return_value=asyncio.sleep(0)):
        await handle_whatsapp_event(payload)

    # 4. Verifica que NÃO incrementou o total_interactions no trigger nem o is_interaction no status
    updated_message = db_session.query(models.MessageStatus).filter_by(message_id=message_uuid).first()
    updated_trigger = db_session.query(models.ScheduledTrigger).filter_by(id=trigger_id).first()

    assert updated_message.is_interaction is False
    assert updated_message.interaction_counted is False
    assert updated_trigger.total_interactions == 0
