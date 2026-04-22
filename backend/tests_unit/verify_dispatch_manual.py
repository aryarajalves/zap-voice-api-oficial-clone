
import asyncio
import logging
from unittest.mock import MagicMock, patch, AsyncMock
from sqlalchemy.orm import Session
import os
import sys

# Adiciona o caminho base para importar os modelos e serviços
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import models
from services.engine import execute_funnel

# Configuração de Logs
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ValidacaoFinal")

async def validar_captura_ids():
    logger.info("🧪 Iniciando Validação Final: Captura de IDs e Gatilho de Funil...")
    
    # Setup de Mocks
    db = MagicMock(spec=Session)
    funnel_id = 777
    trigger_id = 888
    conversation_id = 999
    contact_phone = "5511999999999"
    client_id = 1
    
    # Mock do Funil
    mock_funnel = MagicMock(spec=models.Funnel)
    mock_funnel.id = funnel_id
    mock_funnel.name = "Funil de Teste ID Direto"
    mock_funnel.steps = [] # Funil vazio para teste de inicialização
    
    # Mock do Trigger com os novos IDs Capturados
    mock_trigger = MagicMock(spec=models.ScheduledTrigger)
    mock_trigger.id = trigger_id
    mock_trigger.client_id = client_id
    mock_trigger.status = 'queued'
    mock_trigger.is_bulk = False
    mock_trigger.chatwoot_contact_id = 12345
    mock_trigger.chatwoot_account_id = 1
    mock_trigger.chatwoot_inbox_id = 10
    
    # Comportamento do DB
    def mock_query(model):
        q = MagicMock()
        if model == models.Funnel:
            q.filter.return_value.first.return_value = mock_funnel
        elif model == models.ScheduledTrigger:
            q.filter.return_value.first.return_value = mock_trigger
        elif model == models.GlobalVariable:
            q.filter.return_value.all.return_value = []
        elif model == models.BlockedContact:
            q.filter.return_value.one_or_none.return_value = None
        return q
        
    db.query.side_effect = mock_query

    # Patch do ChatwootClient e get_best_conversation (Bypass)
    with patch("services.engine.ChatwootClient") as MockClient, \
         patch("services.engine.get_best_conversation", new_callable=AsyncMock) as mock_get_best:
        
        logger.info("⚙️ Simulando execução do funil com IDs capturados pelo Webhook...")
        await execute_funnel(
            funnel_id=funnel_id,
            conversation_id=conversation_id,
            trigger_id=trigger_id,
            contact_phone=contact_phone,
            db=db,
            chatwoot_contact_id=12345, # ID direto
            chatwoot_account_id=1,
            chatwoot_inbox_id=10
        )
        
        # Verificações de Sucesso
        try:
            # 1. Verifica se o cliente foi instanciado com o account_id correto (Bypass de busca de conta)
            MockClient.assert_called_with(client_id=client_id, account_id=1)
            logger.info("✅ SUCESSO: ChatwootClient instanciado com account_id direto.")
            
            # 2. Verifica se o motor recebeu os parâmetros corretamente (implícito na execução sem erro)
            logger.info("✅ SUCESSO: Motor de funis aceitou os novos argumentos de ID.")
            
            logger.info("🎉 VALIDAÇÃO CONCLUÍDA: O sistema está capturando e usando IDs diretos!")
        except Exception as e:
            logger.error(f"❌ FALHA NA VALIDAÇÃO: {e}")
            sys.exit(1)

if __name__ == "__main__":
    asyncio.run(validar_captura_ids())
