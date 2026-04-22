
import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
import models
import uuid
import json

@pytest.fixture
def mock_integration(db_session: Session):
    integration = models.WebhookIntegration(
        id=uuid.uuid4(),
        client_id=1,
        name="Hotmart Integration",
        platform="hotmart",
        status="active",
        product_filtering=True,
        product_whitelist=["Curso de Teste"],
        discovered_products=["Curso de Teste", "Curso Antigo"]
    )
    db_session.add(integration)
    db_session.commit()
    return integration

@pytest.fixture
def mock_funnels(db_session: Session):
    f1 = models.Funnel(id=1, name="Funnel Geral", client_id=1, steps=[])
    f2 = models.Funnel(id=2, name="Funnel Específico", client_id=1, steps=[])
    db_session.add_all([f1, f2])
    db_session.commit()
    return f1, f2

def test_product_discovery(client, db_session: Session, mock_integration):
    """Testa se um novo produto é adicionado à lista de descobertos."""
    payload = {
        "event": "PURCHASE_APPROVED",
        "data": {
            "product": {"name": "Novo Produto Ninja"},
            "buyer": {"checkout_phone": "5511999999999", "name": "João", "email": "joao@teste.com"},
            "purchase": {"status": "APPROVED"}
        }
    }
    
    response = client.post(
        f"/api/webhooks/external/{mock_integration.id}",
        json=payload
    )
    
    assert response.status_code == 200
    
    db_session.refresh(mock_integration)
    assert "Novo Produto Ninja" in mock_integration.discovered_products

def test_product_filtering_denied(client, db_session: Session, mock_integration):
    """Testa se um produto fora da whitelist é ignorado quando a filtragem está ativa."""
    payload = {
        "event": "PURCHASE_APPROVED",
        "data": {
            "product": {"name": "Curso Bloqueado"},
            "buyer": {"checkout_phone": "5511999999999", "name": "João"},
            "purchase": {"status": "APPROVED"}
        }
    }
    
    response = client.post(
        f"/api/webhooks/external/{mock_integration.id}",
        json=payload
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ignored"
    assert data["reason"] == "product_not_allowed"

def test_product_filtering_allowed(client, db_session: Session, mock_integration):
    """Testa se um produto na whitelist é processado normalmente."""
    # Adicionando um mapeamento para não dar 'no_mapping'
    m = models.WebhookEventMapping(
        integration_id=mock_integration.id,
        event_type="compra_aprovada",
        template_name="template_teste",
        is_active=True
    )
    db_session.add(m)
    db_session.commit()

    payload = {
        "event": "PURCHASE_APPROVED",
        "data": {
            "product": {"name": "Curso de Teste"},
            "buyer": {"checkout_phone": "5511999999999", "name": "João"},
            "purchase": {"status": "APPROVED"}
        }
    }
    
    with patch("routers.webhooks_public.rabbitmq.publish", new_callable=AsyncMock):
        response = client.post(
            f"/api/webhooks/external/{mock_integration.id}",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("reason") != "product_not_allowed"

def test_priority_mapping(client, db_session: Session, mock_integration, mock_funnels):
    """Testa se o sistema prioriza mapeamentos específicos de produtos."""
    f_geral, f_especifico = mock_funnels
    
    # Mapeamento Geral
    m_geral = models.WebhookEventMapping(
        integration_id=mock_integration.id,
        event_type="compra_aprovada",
        funnel_id=f_geral.id,
        template_name="template_geral",
        is_active=True
    )
    
    # Mapeamento Específico
    m_especifico = models.WebhookEventMapping(
        integration_id=mock_integration.id,
        event_type="compra_aprovada",
        product_name="Curso de Teste",
        funnel_id=f_especifico.id,
        template_name="template_especifico",
        is_active=True
    )
    
    db_session.add_all([m_geral, m_especifico])
    db_session.commit()
    
    with patch("routers.webhooks_public.rabbitmq.publish", new_callable=AsyncMock):
        # 1. Testa com o produto específico
        payload_spec = {
            "event": "PURCHASE_APPROVED",
            "data": {
                "product": {"name": "Curso de Teste"},
                "buyer": {"checkout_phone": "5511999999999", "name": "João"},
                "purchase": {"status": "APPROVED"}
            }
        }
        
        response = client.post(
            f"/api/webhooks/external/{mock_integration.id}",
            json=payload_spec
        )
        assert response.status_code == 200
        
        history = db_session.query(models.WebhookHistory).filter_by(integration_id=mock_integration.id, status="processed").first()
        assert history is not None

    # 2. Testa com outro produto (deve cair no Geral)
    # IMPORTANTE: Forçar detecção de mudança na Whitelist (JSON)
    new_whitelist = list(mock_integration.product_whitelist)
    new_whitelist.append("Outro Curso")
    mock_integration.product_whitelist = new_whitelist
    flag_modified(mock_integration, "product_whitelist")
    db_session.add(mock_integration)
    db_session.commit()
    db_session.refresh(mock_integration)
    
    payload_gen = {
        "event": "PURCHASE_APPROVED",
        "data": {
            "product": {"name": "Outro Curso"},
            "buyer": {"checkout_phone": "5511999998888", "name": "Maria"},
            "purchase": {"status": "APPROVED"}
        }
    }
    
    with patch("routers.webhooks_public.rabbitmq.publish", new_callable=AsyncMock):
        response = client.post(
            f"/api/webhooks/external/{mock_integration.id}",
            json=payload_gen
        )
        assert response.status_code == 200
        
        # Agora deve ter pelo menos 2 sucessos
        history_count = db_session.query(models.WebhookHistory).filter_by(integration_id=mock_integration.id, status="processed").count()
        assert history_count >= 2
    
