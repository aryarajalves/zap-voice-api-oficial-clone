import pytest
from unittest.mock import AsyncMock, patch, MagicMock
import os
import sys

# Garante path correto
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from chatwoot_client import ChatwootClient
from models import WhatsAppTemplateCache

@pytest.mark.asyncio
async def test_send_template_pruning_extra_params(db_session, mock_rabbitmq_session):
    # 1. Setup Cache (Template com 0 variáveis no body)
    template_name = "test_no_vars"
    client_id = 1
    
    # Criar entrada no cache real do DB de teste
    tpl = WhatsAppTemplateCache(
        id=123456,
        client_id=client_id,
        name=template_name,
        language="pt_BR",
        body="Olá, esta é uma mensagem sem variáveis.",
        components=[{"type": "BODY", "text": "Olá, esta é uma mensagem sem variáveis."}]
    )
    db_session.add(tpl)
    db_session.commit()
    
    # 2. Mockar o httpx.AsyncClient e SessionLocal
    with patch("httpx.AsyncClient") as mock_client_class, \
         patch("database.SessionLocal", return_value=db_session):
        mock_client = mock_client_class.return_value.__aenter__.return_value
        mock_client.post = AsyncMock(return_value=MagicMock(status_code=200, json=lambda: {"success": True}))
        
        # Mockar get_setting para evitar quebras se as chaves não existirem
        with patch("chatwoot_client.get_setting", return_value="fake_setting"):
            
            cw_client = ChatwootClient(client_id=client_id)
            
            # Tentar enviar com um componente de body contendo variável
            components = [
                {
                    "type": "body",
                    "parameters": [{"type": "text", "text": "GhostVariable"}]
                }
            ]
            
            await cw_client.send_template(
                phone_number="5585999999999",
                template_name=template_name,
                language_code="pt_BR",
                components=components
            )
            
            # 3. Verificar se o parâmetro foi podado no payload final
            call_args = mock_client.post.call_args
            payload = call_args[1]["json"]
            
            sent_components = payload["template"]["components"]
            body_comp = next((c for c in sent_components if c["type"] == "body"), None)
            
            # Deve ser [] pois o template espera 0 variáveis
            assert body_comp is not None
            assert len(body_comp["parameters"]) == 0, f"Deveria ter podado para 0, mas enviou {len(body_comp['parameters'])}"

@pytest.mark.asyncio
async def test_send_template_keeps_correct_params(db_session, mock_rabbitmq_session):
    # 1. Setup Cache (Template com 1 variável no body)
    template_name = "test_one_var"
    client_id = 1
    
    tpl = WhatsAppTemplateCache(
        id=789,
        client_id=client_id,
        name=template_name,
        language="pt_BR",
        body="Olá {{1}}, bem-vindo!",
        components=[{"type": "BODY", "text": "Olá {{1}}, bem-vindo!"}]
    )
    db_session.add(tpl)
    db_session.commit()
    
    with patch("httpx.AsyncClient") as mock_client_class, \
         patch("database.SessionLocal", return_value=db_session):
        mock_client = mock_client_class.return_value.__aenter__.return_value
        mock_client.post = AsyncMock(return_value=MagicMock(status_code=200, json=lambda: {"success": True}))
        
        with patch("chatwoot_client.get_setting", return_value="fake_setting"):
            cw_client = ChatwootClient(client_id=client_id)
            
            # Enviar com 1 variável (correto)
            components = [
                {
                    "type": "body",
                    "parameters": [{"type": "text", "text": "Aryaraj"}]
                }
            ]
            
            await cw_client.send_template(
                phone_number="5585999999999",
                template_name=template_name,
                language_code="pt_BR",
                components=components
            )
            
            call_args = mock_client.post.call_args
            payload = call_args[1]["json"]
            
            sent_components = payload["template"]["components"]
            body_comp = next((c for c in sent_components if c["type"] == "body"), None)
            
            assert body_comp is not None
            assert len(body_comp["parameters"]) == 1
            assert body_comp["parameters"][0]["text"] == "Aryaraj"
