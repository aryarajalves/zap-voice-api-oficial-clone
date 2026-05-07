import sys
import os
import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from sqlalchemy.orm import Session

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import models

@pytest.mark.asyncio
async def test_worker_applies_labels():
    """
    Testa se o worker aplica as etiquetas do Chatwoot corretamente durante o processamento.
    """
    from worker import process_single_trigger_item
    
    # 1. Setup Mocks
    mock_db = MagicMock(spec=Session)
    mock_trigger = MagicMock(spec=models.ScheduledTrigger)
    mock_trigger.id = 1
    mock_trigger.client_id = 10
    mock_trigger.template_name = "test_template"
    mock_trigger.template_language = "pt_BR"
    mock_trigger.template_components = []
    mock_trigger.chatwoot_label = ["Tag1", "Tag2"]
    mock_trigger.private_message = None
    mock_trigger.status = 'queued'
    
    # Mock data item
    data = {"phone": "5585999999999", "contact_name": "Test User"}
    
    # Patch ChatwootClient
    with patch("worker.ChatwootClient", new_callable=AsyncMock) as MockCW:
        instance = MockCW.return_value
        # Simular descoberta de conversa
        with patch("worker.discover_or_create_chatwoot_conversation", new_callable=AsyncMock) as mock_discovery:
            mock_discovery.return_value = {
                "conversation_id": 123,
                "contact_id": 456,
                "account_id": "1"
            }
            
            # Simular envio de template (sucesso)
            instance.send_template.return_value = {"success": True, "messages": [{"id": "msg_123"}]}
            instance.add_label_to_conversation = AsyncMock(return_value={"success": True})
            
            # 2. Executar
            from worker import logger
            # Precisamos mockar o logger para não poluir o teste
            
            # Nota: process_single_trigger_item é uma função complexa, 
            # vamos testar a parte que importa para as etiquetas.
            
            await process_single_trigger_item(mock_db, mock_trigger, data)
            
            # 3. Verificações
            # Deve ter chamado add_label_to_conversation com as etiquetas corretas
            instance.add_label_to_conversation.assert_called_once_with(123, ["Tag1", "Tag2"])
            
@pytest.mark.asyncio
async def test_worker_no_labels_no_call():
    """
    Testa se o worker não tenta aplicar etiquetas se não houver nenhuma no trigger.
    """
    from worker import process_single_trigger_item
    
    mock_db = MagicMock(spec=Session)
    mock_trigger = MagicMock(spec=models.ScheduledTrigger)
    mock_trigger.chatwoot_label = None # Sem etiquetas
    mock_trigger.private_message = None
    
    data = {"phone": "5585999999999"}
    
    with patch("worker.ChatwootClient", new_callable=AsyncMock) as MockCW:
        instance = MockCW.return_value
        with patch("worker.discover_or_create_chatwoot_conversation", new_callable=AsyncMock) as mock_discovery:
            mock_discovery.return_value = {"conversation_id": 123}
            instance.send_template.return_value = {"success": True}
            instance.add_label_to_conversation = AsyncMock()
            
            await process_single_trigger_item(mock_db, mock_trigger, data)
            
            # Não deve ter sido chamado
            instance.add_label_to_conversation.assert_not_called()
