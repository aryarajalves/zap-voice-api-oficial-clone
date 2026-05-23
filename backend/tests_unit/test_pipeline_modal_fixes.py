import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone
import models
import schemas
from core.engine.logging import log_node_execution
from routers.triggers.management import get_trigger

@pytest.mark.asyncio
async def test_log_node_execution_expires_and_reloads_concurrency(db_session):
    # Cria o trigger inicial no banco
    trigger = models.ScheduledTrigger(
        id=987,
        client_id=1,
        status='processing',
        execution_history=[
            {
                "node_id": "message_node_1",
                "status": "processing",
                "timestamp": "2024-01-01T00:00:00Z",
                "extra": {}
            }
        ]
    )
    db_session.add(trigger)
    db_session.commit()

    # Simula um worker assíncrono atualizando o banco diretamente por baixo do SQLAlchemy
    # para simular a concorrência (usando outra conexão ou alterando o registro no banco)
    db_session.execute(
        models.ScheduledTrigger.__table__.update()
        .where(models.ScheduledTrigger.id == 987)
        .values(execution_history=[
            {
                "node_id": "message_node_1",
                "status": "processing",
                "timestamp": "2024-01-01T00:00:00Z",
                "extra": {"memory_status": "success"} # worker atualizou para success
            }
        ])
    )
    db_session.commit()

    # Agora o engine no thread principal (que tem a referência antiga do objeto trigger na sessão)
    # chama log_node_execution para registrar o próximo passo (ex: 'FINISH').
    # A nossa modificação com db.expire(trigger) deve forçar a recarga dos dados do banco,
    # garantindo que o status de memória "success" NÃO seja sobrescrito/perdido!
    with patch("rabbitmq_client.rabbitmq.publish_event"):
        log_node_execution(db_session, trigger, "FINISH", "completed", "Funil concluído")

    # Recarrega o trigger para validar
    db_session.refresh(trigger)
    
    # Verifica se o nó "message_node_1" manteve o "memory_status": "success" atualizado concorrentemente
    msg_node = next(h for h in trigger.execution_history if h['node_id'] == "message_node_1")
    assert msg_node['extra'].get('memory_status') == 'success', "O status de memória atualizado pelo worker foi sobrescrito!"
    
    # E verifica se o novo nó "FINISH" foi adicionado com sucesso
    finish_node = next(h for h in trigger.execution_history if h['node_id'] == "FINISH")
    assert finish_node['status'] == 'completed'
    print("✅ Teste de concorrência e expiração do log_node_execution aprovado!")


@pytest.mark.asyncio
async def test_get_trigger_resolves_chatwoot_url_and_account_id(db_session):
    # Cria um trigger com account_id e url nulos no banco
    trigger = models.ScheduledTrigger(
        id=765,
        client_id=1,
        conversation_id=9876,
        chatwoot_account_id=None,
        status='processing'
    )
    db_session.add(trigger)
    db_session.commit()

    # Cria mock do usuário autenticado
    mock_user = MagicMock()
    mock_user.client_id = 1

    # Mocka get_setting para retornar os valores esperados sem acessar o banco de config
    def mock_get_setting_func(key, default="", client_id=None):
        if key == "CHATWOOT_ACCOUNT_ID":
            return "123"
        elif key == "CHATWOOT_URL":
            return "https://chat.meusistema.com/"
        return default

    with patch("config_loader.get_setting", side_effect=mock_get_setting_func):
        # Executa o endpoint get_trigger
        result = get_trigger(
            trigger_id=765,
            x_client_id=1,
            db=db_session,
            current_user=mock_user
        )

    # Valida se o chatwoot_account_id foi resolvido e persistido no banco
    assert result.chatwoot_account_id == 123
    
    # Valida se a chatwoot_url foi resolvida dinamicamente no formato correto
    assert result.chatwoot_url == "https://chat.meusistema.com/app/accounts/123/conversations/9876"
    
    # Valida persistência no banco
    db_session.refresh(trigger)
    assert trigger.chatwoot_account_id == 123
    print("✅ Teste de resolução do chatwoot_account_id e chatwoot_url aprovado!")


@pytest.mark.asyncio
async def test_get_trigger_resolves_chatwoot_account_id_fallback_to_1(db_session):
    # Cria um trigger com account_id e url nulos no banco
    trigger = models.ScheduledTrigger(
        id=766,
        client_id=1,
        conversation_id=9877,
        chatwoot_account_id=None,
        status='processing'
    )
    db_session.add(trigger)
    db_session.commit()

    # Cria mock do usuário autenticado
    mock_user = MagicMock()
    mock_user.client_id = 1

    # Mocka get_setting para retornar vazio para CHATWOOT_ACCOUNT_ID
    def mock_get_setting_func(key, default="", client_id=None):
        if key == "CHATWOOT_ACCOUNT_ID":
            return default  # retorna o default passado (que é "1" na nossa implementação do router)
        elif key == "CHATWOOT_URL":
            return "https://chat.meusistema.com/"
        return default

    with patch("config_loader.get_setting", side_effect=mock_get_setting_func):
        # Executa o endpoint get_trigger
        result = get_trigger(
            trigger_id=766,
            x_client_id=1,
            db=db_session,
            current_user=mock_user
        )

    # Valida se o chatwoot_account_id foi resolvido com o fallback '1'
    assert result.chatwoot_account_id == 1
    
    # Valida se a chatwoot_url foi resolvida dinamicamente no formato correto
    assert result.chatwoot_url == "https://chat.meusistema.com/app/accounts/1/conversations/9877"
    
    # Valida persistência no banco
    db_session.refresh(trigger)
    assert trigger.chatwoot_account_id == 1
    print("✅ Teste de fallback do chatwoot_account_id para 1 aprovado!")
