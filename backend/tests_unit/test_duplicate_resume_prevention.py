import pytest
from unittest.mock import MagicMock, patch, AsyncMock
import sys
import os

# Ajustando o path para importar o worker e injetando a chave secreta mock
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
os.environ["SECRET_KEY"] = "test_secret_key_12345678901234567890123456789012"
os.environ["DATABASE_URL"] = "sqlite:///./test_zapvoice.db"

import pytest_asyncio
from worker import handle_whatsapp_event
import models

@pytest.mark.asyncio
async def test_handle_whatsapp_event_prevents_duplicate_resume():
    # Setup trigger
    mock_trigger = models.ScheduledTrigger(
        id=42,
        client_id=1,
        contact_phone="5585999999999",
        funnel_id=1,
        status="paused_waiting_delivery",
        current_node_id="NODE_MESSAGE",
        is_bulk=False
    )
    
    # Mock do funnel no mock_trigger
    mock_funnel = MagicMock()
    mock_funnel.id = 1
    mock_funnel.steps = {
        "nodes": [
            {"id": "NODE_MESSAGE", "type": "message"},
            {"id": "NODE_NEXT", "type": "message"}
        ],
        "edges": [
            {"source": "NODE_MESSAGE", "target": "NODE_NEXT"}
        ]
    }
    mock_trigger.funnel = mock_funnel

    mock_message_record = models.MessageStatus(
        id=502,
        message_id="TEST_WAMID",
        trigger_id=42,
        status="sent",
        phone_number="5585999999999",
        delivered_counted=False,
        read_counted=False
    )

    # Simula payload recebendo 'delivered' e 'read' concorrentemente no mesmo lote/event
    payload = {
        "entry": [{
            "changes": [{
                "value": {
                    "messaging_product": "whatsapp",
                    "metadata": {"phone_number_id": "948132921713045"},
                    "statuses": [
                        {
                            "id": "TEST_WAMID",
                            "status": "delivered",
                            "recipient_id": "5585999999999",
                            "timestamp": "1600000000"
                        },
                        {
                            "id": "TEST_WAMID",
                            "status": "read",
                            "recipient_id": "5585999999999",
                            "timestamp": "1600000001"
                        }
                    ]
                },
                "field": "messages"
            }]
        }]
    }

    # Criar uma classe mock de DB session simplificada
    class SimpleDbMock:
        def __init__(self):
            self.bind = MagicMock()
            self.bind.dialect.name = 'sqlite'
            self.commits = 0
            
        def query(self, model):
            q = MagicMock()
            q.with_for_update.return_value = q
            q.filter.return_value = q
            q.filter_by.return_value = q
            q.order_by.return_value = q
            q.join.return_value = q
            q.distinct.return_value = q
            q.count.return_value = 1
            
            # Quando consultar MessageStatus
            if "MessageStatus" in str(model):
                q.first.return_value = mock_message_record
                q.get.return_value = mock_message_record
            # Quando consultar ScheduledTrigger
            elif "ScheduledTrigger" in str(model):
                # Importante: o first() do query de with_for_update retorna o trigger mutável.
                # Se o status do mock_trigger já foi alterado para 'processing', a próxima iteração
                # do loop deve ler esse mesmo status atualizado.
                q.first.side_effect = lambda *args, **kwargs: mock_trigger
                q.get.side_effect = lambda *args, **kwargs: mock_trigger
            elif "AppConfig" in str(model):
                c = MagicMock()
                c.client_id = 1
                c.value = "test"
                q.all.return_value = [c]
                
            return q
            
        def commit(self):
            self.commits += 1
        def flush(self): pass
        def add(self, obj): pass
        def close(self): pass
        def refresh(self, obj): pass
        def execute(self, *args, **kwargs):
            m = MagicMock()
            m.scalar.return_value = True
            return m

    db_instance = SimpleDbMock()

    created_tasks = []
    def mock_create_task(coro, *args, **kwargs):
        created_tasks.append(coro)
        return MagicMock()

    with patch("core.worker.handlers.whatsapp.SessionLocal", return_value=db_instance):
        with patch("core.worker.handlers.whatsapp.rabbitmq", new_callable=AsyncMock):
            with patch("asyncio.create_task", side_effect=mock_create_task):
                # Executa o handler
                await handle_whatsapp_event(payload)
                
                # O status do trigger deve ir para 'processing'
                assert mock_trigger.status == "processing"
                
                # A tarefa resume_funnel_after_delay deve ter sido criada APENAS uma vez,
                # mesmo contendo dois eventos (delivered e read) na lista que indicavam retomar.
                # Como a primeira execução já alterou o status para 'processing', o segundo evento 
                # de status concorrente é ignorado de forma segura.
                resume_tasks = [t for t in created_tasks if 'resume_funnel_after_delay' in str(t)]
                assert len(resume_tasks) == 1

