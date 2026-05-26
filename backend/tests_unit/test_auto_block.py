import pytest
import os
import sys
from unittest.mock import MagicMock, AsyncMock, patch

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ["DATABASE_URL"] = "sqlite://"

from sqlalchemy import create_engine, text, or_
from sqlalchemy.orm import sessionmaker
from database import Base
import models
from core.worker.handlers.whatsapp import handle_whatsapp_event

engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture
def client_obj(db):
    c = models.Client(name="AutoBlockTestClient")
    db.add(c)
    db.commit()
    db.refresh(c)
    return c

@pytest.mark.asyncio
@patch("core.worker.handlers.whatsapp.SessionLocal")
@patch("core.worker.handlers.whatsapp.rabbitmq")
@patch("core.worker.handlers.whatsapp.ChatwootClient")
async def test_auto_block_trigger_flow(mock_chatwoot, mock_rabbitmq, mock_session_local, db, client_obj):
    # Mock SessionLocal para retornar nossa sessão db em memória
    mock_session_local.return_value = db
    
    # Mock do close para evitar que o worker feche nossa sessão em memória
    original_close = db.close
    db.close = MagicMock()
    
    mock_rabbitmq.publish = AsyncMock()
    mock_rabbitmq.publish_event = AsyncMock()
    
    mock_cw_instance = MagicMock()
    mock_cw_instance.ensure_conversation = AsyncMock(return_value={"conversation_id": 1234, "contact_id": 5678})
    mock_cw_instance.add_label_to_conversation = AsyncMock()
    mock_cw_instance.add_label_to_contact = AsyncMock()
    mock_chatwoot.return_value = mock_cw_instance

    client_id = client_obj.id

    # Cadastra configs de auto-bloqueio para o cliente
    db.add(models.AppConfig(client_id=client_id, key="AUTO_BLOCK_KEYWORDS", value="parar,sair,cancelar"))
    db.add(models.AppConfig(client_id=client_id, key="AUTO_BLOCK_FUNNEL_ID", value="10"))
    db.add(models.AppConfig(client_id=client_id, key="AUTO_BLOCK_LABEL", value="opt_out"))
    
    # Criar trigger de disparo anterior para simular o histórico
    trigger = models.ScheduledTrigger(
        client_id=client_id,
        funnel_id=5,
        status="completed",
        contact_phone="5511999998888",
        contact_name="Contato Teste"
    )
    db.add(trigger)
    db.commit()
    db.refresh(trigger)

    # Adicionar mensagem enviada
    msg_status = models.MessageStatus(
        trigger_id=trigger.id,
        message_id="ABC123XYZ",
        phone_number="5511999998888",
        status="sent"
    )
    db.add(msg_status)
    db.commit()

    # Payload simulando clique em botão inbound contendo "Sair"
    inbound_payload = {
        "entry": [{
            "changes": [{
                "value": {
                    "messaging_product": "whatsapp",
                    "metadata": {
                        "display_phone_number": "5511999998888",
                        "phone_number_id": "1234567890"
                    },
                    "contacts": [{
                        "profile": {"name": "Contato Teste"},
                        "wa_id": "5511999998888"
                    }],
                    "messages": [{
                        "from": "5511999998888",
                        "id": "wamid.HBgMNTU2NjgxMDIzMDY4FQIAERgSQTUzOUU5NEMwQTMwRDlCMTI0AA==",
                        "timestamp": "1672531199",
                        "type": "button",
                        "button": {
                            "text": "Sair",
                            "payload": "sair"
                        },
                        "context": {
                            "id": "ABC123XYZ"
                        }
                    }]
                },
                "field": "messages"
            }]
        }]
    }

    # Executa o handler (não vai fechar db por causa do mock)
    await handle_whatsapp_event(inbound_payload)

    # 1. Verifica se o contato foi adicionado na tabela de contatos bloqueados
    blocked = db.query(models.BlockedContact).filter(
        models.BlockedContact.client_id == client_id,
        models.BlockedContact.phone == "5511999998888"
    ).first()
    assert blocked is not None
    assert blocked.reason == "Auto-Bloqueio (Gatilho)"

    # 2. Verifica se incrementou total_blocked e não total_interactions no trigger pai
    db.refresh(trigger)
    assert trigger.total_blocked == 1
    assert trigger.total_interactions == 0

    # 3. Verifica se o funil de despedida 10 foi instanciado com skip_block_check=True
    despedida_trigger = db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.client_id == client_id,
        models.ScheduledTrigger.funnel_id == 10
    ).first()
    assert despedida_trigger is not None
    assert despedida_trigger.skip_block_check is True
    assert despedida_trigger.status == "processing"

    # 4. Verifica se publicou a execução do funil no RabbitMQ
    mock_rabbitmq.publish.assert_called_with(
        "zapvoice_funnel_executions",
        {
            "trigger_id": despedida_trigger.id,
            "funnel_id": 10,
            "conversation_id": 1234,
            "contact_phone": "5511999998888"
        }
    )

    # 5. Verifica se aplicou a etiqueta Chatwoot na conversa e contato
    mock_cw_instance.add_label_to_conversation.assert_called_with(1234, ["opt_out"])
    mock_cw_instance.add_label_to_contact.assert_called_with(5678, ["opt_out"])
    
    # Restaura o close original e fecha a sessão
    db.close = original_close
    db.close()
