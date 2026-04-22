import os
import sys
import re
import unittest
from unittest.mock import MagicMock, AsyncMock, patch

# Define DATABASE_URL antes de importar qualquer coisa do backend
os.environ["DATABASE_URL"] = "sqlite:///./test_temp.db"

# Adiciona o diretório backend ao path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Mock das dependências que o ChatwootClient usa no __init__
with patch('config_loader.get_settings', return_value={}):
    from chatwoot_client import ChatwootClient

class TestSelfHealingPruning(unittest.IsolatedAsyncioTestCase):
    
    def setUp(self):
        self.client = ChatwootClient(client_id=1)
        # Mock do logger para não sujar o output
        self.client.logger = MagicMock()

    @patch('chatwoot_client.httpx.AsyncClient')
    @patch('chatwoot_client.SessionLocal')
    async def test_pruning_extra_parameters(self, mock_session_local, mock_async_client):
        # 1. Configurar o mock do Banco de Dados (Cache de Template)
        mock_db = MagicMock()
        mock_session_local.return_value = mock_db
        
        # Template com 0 variáveis
        mock_tpl = MagicMock()
        mock_tpl.name = "compra_aprovada"
        mock_tpl.body = "Sua compra foi aprovada com sucesso! Obrigado."
        
        mock_db.query().filter().first.return_value = mock_tpl
        
        # 2. Mock do httpx.post
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"success": True}
        
        client_instance = mock_async_client.return_value.__aenter__.return_value
        client_instance.post = AsyncMock(return_value=mock_response)
        
        # 3. Chamar send_template com 1 componente de body (que não deveria existir)
        components = [
            {
                "type": "body",
                "parameters": [{"type": "text", "text": "Aryaraj"}]
            }
        ]
        
        res = await self.client.send_template(
            phone_number="5585999999999",
            template_name="compra_aprovada",
            language_code="pt_BR",
            components=components
        )
        
        # 4. Verificar o payload enviado para a Meta
        call_args = client_instance.post.call_args
        payload = call_args[1]['json']
        
        # O self-healing deve ter removido os parâmetros do body
        final_components = payload['template']['components']
        body_comp = next((c for c in final_components if c['type'] == 'body'), None)
        
        print(f"\n🔍 [TESTE] Payload Final: {payload}")
        
        # No meu código, eu podo os parâmetros, mas mantenho o componente de body vazio?
        # Ou eu removo o parâmetro da lista?
        # Minha lógica foi: body_comp["parameters"] = current_params[:required_count]
        # Se required_count é 0, parameters vira [].
        
        if body_comp:
            self.assertEqual(len(body_comp['parameters']), 0, "O parâmetro extra deveria ter sido podado!")
            print("✅ Sucesso: Parâmetro extra podado corretamente (0 esperados, 0 enviados).")
        else:
             print("✅ Sucesso: Componente de body não encontrado no payload (o que também é válido se não houver parâmetros).")

    @patch('chatwoot_client.httpx.AsyncClient')
    @patch('chatwoot_client.SessionLocal')
    async def test_keeping_correct_parameters(self, mock_session_local, mock_async_client):
        # 1. Configurar o mock do Banco de Dados
        mock_db = MagicMock()
        mock_session_local.return_value = mock_db
        
        # Template com 1 variável
        mock_tpl = MagicMock()
        mock_tpl.name = "aviso_entrega"
        mock_tpl.body = "Olá {{1}}, seu pedido saiu para entrega!"
        
        mock_db.query().filter().first.return_value = mock_tpl
        
        # 2. Mock do httpx.post
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"success": True}
        
        client_instance = mock_async_client.return_value.__aenter__.return_value
        client_instance.post = AsyncMock(return_value=mock_response)
        
        # 3. Chamar send_template com 1 componente de body (correto)
        components = [
            {
                "type": "body",
                "parameters": [{"type": "text", "text": "Aryaraj"}]
            }
        ]
        
        res = await self.client.send_template(
            phone_number="5585999999999",
            template_name="aviso_entrega",
            language_code="pt_BR",
            components=components
        )
        
        # 4. Verificar o payload
        call_args = client_instance.post.call_args
        payload = call_args[1]['json']
        final_components = payload['template']['components']
        body_comp = next((c for c in final_components if c['type'] == 'body'), None)
        
        self.assertEqual(len(body_comp['parameters']), 1, "O parâmetro legítimo deveria ter sido mantido!")
        self.assertEqual(body_comp['parameters'][0]['text'], "Aryaraj")
        print("✅ Sucesso: Parâmetro legítimo mantido.")

if __name__ == "__main__":
    unittest.main()
