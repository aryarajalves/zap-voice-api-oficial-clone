import pytest
from unittest.mock import patch
from datetime import datetime, timezone, timedelta
from database import Base
import models
import uuid

def test_manychat_tag_routing_before_and_after_start_date(client, db_session):
    """
    Testa se o webhook roteia corretamente a tag do ManyChat (padrão vs alternativa)
    com base na data de início definida.
    """
    # 1. Setup: Criar Cliente e Integração de Teste
    test_client = models.Client(name=f"ManyChat Date Test {uuid.uuid4().hex[:6]}")
    db_session.add(test_client)
    db_session.commit()
    db_session.refresh(test_client)

    integration = models.WebhookIntegration(
        client_id=test_client.id,
        name="ManyChat Date Integration",
        platform="hotmart",
        status="active"
    )
    db_session.add(integration)
    db_session.commit()
    db_session.refresh(integration)

    # 2. Criar Mapeamento com ManyChat Ativo e Data de Início no Futuro (Etiqueta Padrão)
    future_date = datetime.now(timezone.utc) + timedelta(days=1)
    mapping_future = models.WebhookEventMapping(
        integration_id=integration.id,
        event_type="compra_aprovada",
        template_name="test_template",
        manychat_active=True,
        manychat_name="{{name}}",
        manychat_phone="{{phone}}",
        manychat_tag="default_tag",
        manychat_start_date=future_date,
        manychat_tag_alternative="alternative_tag"
    )
    db_session.add(mapping_future)
    db_session.commit()

    payload = {
        "event": "PURCHASE_APPROVED",
        "data": {
            "buyer": {
                "name": "Cliente Teste Futuro",
                "checkout_phone": "5511988887777",
                "email": "test@manychat.com"
            },
            "purchase": {
                "status": "APPROVED",
                "payment": {"type": "CREDIT_CARD"}
            },
            "product": {"name": "Produto Teste"}
        }
    }

    # Teste 1: Data de Início no futuro -> Deve usar a tag PADRÃO
    with patch("routers.webhooks_public.sync_to_manychat_and_update_history") as mock_sync_history:
        response = client.post(
            f"/api/webhooks/{integration.id}",
            json=payload
        )
        assert response.status_code == 200
        
        # O mock do sync history deve ser chamado
        mock_sync_history.assert_called_once()
        _, kwargs = mock_sync_history.call_args
        assert kwargs["tag"] == "default_tag"

    # Atualizar a data para o passado para testar a etiqueta alternativa
    past_date = datetime.now(timezone.utc) - timedelta(days=1)
    mapping_future.manychat_start_date = past_date
    db_session.commit()

    # Limpar trava de webhook duplicado
    from routers.webhooks_public import GLOBAL_WEBHOOK_LOCKS
    GLOBAL_WEBHOOK_LOCKS.clear()

    # Teste 2: Data de Início no passado -> Deve usar a tag ALTERNATIVA
    with patch("routers.webhooks_public.sync_to_manychat_and_update_history") as mock_sync_history:
        response = client.post(
            f"/api/webhooks/{integration.id}",
            json=payload
        )
        assert response.status_code == 200
        
        mock_sync_history.assert_called_once()
        _, kwargs = mock_sync_history.call_args
        assert kwargs["tag"] == "alternative_tag"
