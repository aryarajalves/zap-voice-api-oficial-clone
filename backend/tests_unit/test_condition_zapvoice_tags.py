import pytest
from unittest.mock import MagicMock
from core.engine.nodes.condition import handle_condition_node
import models

@pytest.fixture
def mock_trigger():
    trigger = MagicMock()
    trigger.client_id = 1
    return trigger

@pytest.fixture
def mock_chatwoot():
    return MagicMock()

@pytest.mark.asyncio
async def test_condition_tag_found_in_zapvoice_chat(mock_trigger, mock_chatwoot):
    """Valida que uma etiqueta presente na conversa do Chat do ZapVoice ativa a saída 'yes'."""
    db = MagicMock()
    
    # Simular conversa do ZapVoice com etiqueta 'interessado'
    mock_convo = MagicMock()
    mock_convo.labels = ["cliente", "Interessado", "vip"]
    
    # Query retorna a conversa
    db.query.return_value.filter.return_value.first.return_value = mock_convo
    
    node = {
        "id": "cond_tag_1",
        "data": {
            "conditionType": "tag",
            "tag": "interessado"
        }
    }
    
    result = await handle_condition_node(
        db=db,
        trigger=mock_trigger,
        node=node,
        chatwoot=mock_chatwoot,
        contact_phone="5511988887777",
        edges=[]
    )
    
    assert result == "yes"

@pytest.mark.asyncio
async def test_condition_tag_not_found_in_zapvoice_chat(mock_trigger, mock_chatwoot):
    """Valida que se o contato não possui a etiqueta no Chat do ZapVoice, ativa a saída 'no'."""
    db = MagicMock()
    
    mock_convo = MagicMock()
    mock_convo.labels = ["suporte", "duvida"]
    
    # Query para ChatConversation retorna a conversa sem a tag, e para WebhookLead retorna None
    db.query.return_value.filter.return_value.first.side_effect = [mock_convo, None]
    
    node = {
        "id": "cond_tag_2",
        "data": {
            "conditionType": "tag",
            "tag": "compra-aprovada"
        }
    }
    
    result = await handle_condition_node(
        db=db,
        trigger=mock_trigger,
        node=node,
        chatwoot=None,
        contact_phone="5511988887777",
        edges=[]
    )
    
    assert result == "no"

@pytest.mark.asyncio
async def test_condition_tag_found_in_webhook_lead_fallback(mock_trigger, mock_chatwoot):
    """Valida fallback para WebhookLead quando a conversa não possui a etiqueta."""
    db = MagicMock()
    
    mock_lead = MagicMock()
    mock_lead.tags = "lead_frio, boleto_gerado, interessado"
    
    # Primeiro query (ChatConversation) -> None, Segundo query (WebhookLead) -> mock_lead
    db.query.return_value.filter.return_value.first.side_effect = [None, mock_lead]
    
    node = {
        "id": "cond_tag_3",
        "data": {
            "conditionType": "tag",
            "tag": "boleto_gerado"
        }
    }
    
    result = await handle_condition_node(
        db=db,
        trigger=mock_trigger,
        node=node,
        chatwoot=None,
        contact_phone="5511988887777",
        edges=[]
    )
    
    assert result == "yes"

@pytest.mark.asyncio
async def test_condition_tag_empty(mock_trigger, mock_chatwoot):
    """Valida que tag vazia retorna 'no' imediatamente."""
    db = MagicMock()
    
    node = {
        "id": "cond_tag_4",
        "data": {
            "conditionType": "tag",
            "tag": ""
        }
    }
    
    result = await handle_condition_node(
        db=db,
        trigger=mock_trigger,
        node=node,
        chatwoot=mock_chatwoot,
        contact_phone="5511988887777",
        edges=[]
    )
    
    assert result == "no"
