"""
Testes unitários para o endpoint de teste de webhook (/{integration_id}/test).

Valida dois cenários principais:
1. COM mapeamento ativo: status deve ser 'pending' e sem error_message.
2. SEM mapeamento ativo: status deve ser 'skipped' com mensagem de erro em português.

O background task (process_webhook_automation) é mockado para não abrir conexão
com o banco de produção durante os testes.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch
import models
from main import app
from core.deps import get_db, get_current_user, get_validated_client_id
from routers.webhooks.actions import get_db as actions_get_db
import uuid
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# ── Banco de teste em memória ──────────────────────────────────────────────────
engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Mock de autenticação ───────────────────────────────────────────────────────
mock_user = models.User(id=1, email="admin@test.com", role="super_admin")


async def override_get_current_user():
    return mock_user


async def override_get_validated_client_id():
    return 1


# ── Sobrescreve dependências ───────────────────────────────────────────────────
app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[actions_get_db] = override_get_db
app.dependency_overrides[get_current_user] = override_get_current_user
app.dependency_overrides[get_validated_client_id] = override_get_validated_client_id


@pytest.fixture(autouse=True)
def setup_db():
    """Cria e destroi as tabelas a cada teste."""
    models.Base.metadata.create_all(bind=engine)
    yield
    models.Base.metadata.drop_all(bind=engine)


client = TestClient(app)

INTEGRATION_ID_STR = "25c800a8-5240-483d-8030-1c7531a6a574"
INTEGRATION_UUID = uuid.UUID(INTEGRATION_ID_STR)

PAYLOAD = {
    "event": "PURCHASE_APPROVED",
    "data": {
        "buyer": {
            "name": "Cliente Teste",
            "email": "teste@zapvoice.com.br",
            "checkout_phone": "5511999999999"
        },
        "product": {"name": "Produto Teste"},
        "purchase": {"status": "APPROVED", "payment": {"type": "CREDIT_CARD"}}
    }
}

HEADERS = {
    "X-Client-ID": "1",
    "Authorization": "Bearer fake-token"
}


def _seed_integration(db, with_mapping: bool = False):
    """Cria a integração e, opcionalmente, um mapeamento ativo."""
    test_client = models.Client(id=1, name="Test Client")
    db.add(test_client)
    db.commit()

    integration = models.WebhookIntegration(
        id=INTEGRATION_UUID,
        client_id=1,
        name="Hotmart Test Integration",
        platform="hotmart",
        status="active"
    )
    db.add(integration)

    if with_mapping:
        mapping = models.WebhookEventMapping(
            integration_id=INTEGRATION_UUID,
            event_type="compra_aprovada",
            is_active=True
        )
        db.add(mapping)

    db.commit()


# ── Teste 1: COM mapeamento ativo → status 'pending' ──────────────────────────
def test_webhook_test_com_mapeamento():
    """
    Quando há um mapeamento ativo, o endpoint deve registrar o histórico
    com status 'pending' e sem mensagem de erro, indicando que a automação
    será processada em background.
    """
    db = TestingSessionLocal()
    _seed_integration(db, with_mapping=True)
    db.close()

    # Mockamos o background task para não abrir conexão com banco de produção
    with patch("services.webhooks.process_webhook_automation", new=AsyncMock()):
        response = client.post(
            f"/api/webhook-integrations/{INTEGRATION_ID_STR}/test",
            json=PAYLOAD,
            headers=HEADERS
        )

    assert response.status_code == 200, f"Status inesperado: {response.status_code} - {response.text}"

    db = TestingSessionLocal()
    history = db.query(models.WebhookHistory).filter(
        models.WebhookHistory.integration_id == INTEGRATION_UUID
    ).first()
    db.close()

    assert history is not None, "Nenhum registro de histórico foi criado."
    assert history.status == "pending", f"Status esperado 'pending', recebido '{history.status}'"
    assert history.error_message is None, f"error_message deveria ser None, mas é '{history.error_message}'"


# ── Teste 2: SEM mapeamento → status 'skipped' com mensagem em português ──────
def test_webhook_test_sem_mapeamento():
    """
    Quando não há nenhum mapeamento ativo, o endpoint deve registrar o histórico
    com status 'skipped' e uma mensagem de erro amigável em português,
    SEM disparar o background task.
    """
    db = TestingSessionLocal()
    _seed_integration(db, with_mapping=False)
    db.close()

    response = client.post(
        f"/api/webhook-integrations/{INTEGRATION_ID_STR}/test",
        json=PAYLOAD,
        headers=HEADERS
    )

    assert response.status_code == 200, f"Status inesperado: {response.status_code} - {response.text}"

    db = TestingSessionLocal()
    history = db.query(models.WebhookHistory).filter(
        models.WebhookHistory.integration_id == INTEGRATION_UUID
    ).first()
    db.close()

    assert history is not None, "Nenhum registro de histórico foi criado."
    assert history.status == "skipped", f"Status esperado 'skipped', recebido '{history.status}'"
    assert history.error_message is not None, "error_message deveria conter mensagem de erro."
    assert "Nenhum mapeamento" in history.error_message, (
        f"Mensagem de erro deveria conter 'Nenhum mapeamento', mas é: '{history.error_message}'"
    )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
