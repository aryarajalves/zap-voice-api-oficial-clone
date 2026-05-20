"""
Testes unitários para o endpoint POST /{integration_id}/history/sync-all.

Valida que ao clicar em 'Sincronizar Tudo', registros históricos com status 'pending'
sem mapeamento ativo configurado são corretamente reclassificados para 'skipped'
com mensagem de erro amigável em português.

Estratégia: mockamos `routers.webhooks.history.text` para substituir o SQL
de deduplicação PostgreSQL (incompatível com SQLite) por um mock seguro.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import models
import uuid
from main import app
from core.deps import get_db, get_current_user, get_validated_client_id
from routers.webhooks.history import get_db as history_get_db
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from datetime import datetime, timezone

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


mock_user = models.User(id=1, email="admin@test.com", role="super_admin")


async def override_get_current_user():
    return mock_user


async def override_get_validated_client_id():
    return 1


app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[history_get_db] = override_get_db
app.dependency_overrides[get_current_user] = override_get_current_user
app.dependency_overrides[get_validated_client_id] = override_get_validated_client_id


@pytest.fixture(autouse=True)
def setup_db():
    models.Base.metadata.create_all(bind=engine)
    yield
    models.Base.metadata.drop_all(bind=engine)


client = TestClient(app)

INTEGRATION_ID_STR = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
INTEGRATION_UUID = uuid.UUID(INTEGRATION_ID_STR)

HEADERS = {
    "X-Client-ID": "1",
    "Authorization": "Bearer fake-token"
}


def _seed_base(db, with_active_mapping: bool = False):
    test_client = models.Client(id=1, name="Test Client")
    db.add(test_client)
    db.commit()

    integration = models.WebhookIntegration(
        id=INTEGRATION_UUID,
        client_id=1,
        name="Hotmart Sync Test",
        platform="hotmart",
        status="active"
    )
    db.add(integration)

    if with_active_mapping:
        mapping = models.WebhookEventMapping(
            integration_id=INTEGRATION_UUID,
            event_type="compra_aprovada",
            is_active=True
        )
        db.add(mapping)

    db.commit()


def _create_history(db, status: str, event_type: str = "compra_aprovada"):
    history = models.WebhookHistory(
        integration_id=INTEGRATION_UUID,
        event_type=event_type,
        payload={
            "event": "PURCHASE_APPROVED",
            "data": {
                "buyer": {
                    "name": "Cliente Teste",
                    "email": "teste@zapvoice.com",
                    "checkout_phone": "5511999999999"
                },
                "product": {"name": "Produto X"},
                "purchase": {"status": "APPROVED", "payment": {"type": "CREDIT_CARD"}}
            }
        },
        status=status,
        created_at=datetime.now(timezone.utc)
    )
    db.add(history)
    db.commit()
    db.refresh(history)
    return history


def _mock_dedup_result():
    """Cria um mock para o resultado do SQL de deduplicação PostgreSQL."""
    result = MagicMock()
    result.rowcount = 0
    return result


# ── Teste 1: pending SEM mapeamento → deve virar skipped ──────────────────────
def test_sync_all_converte_pending_sem_mapeamento_para_skipped():
    """
    Ao clicar em 'Sincronizar Tudo', registros 'pending' sem mapeamento ativo
    devem ser reclassificados como 'skipped' com mensagem em português.
    """
    db = TestingSessionLocal()
    _seed_base(db, with_active_mapping=False)
    history = _create_history(db, status="pending")
    history_id = history.id
    db.close()

    # Mockamos:
    # 1. parse_webhook_payload → retorna dados estruturados simples
    # 2. upsert_webhook_lead → evita acesso a banco externo
    # 3. robust_extract_labels → função de limpeza de etiquetas
    # 4. text (SQLAlchemy) → retorna SQL SQLite-compatível no lugar do SQL PostgreSQL
    #    de deduplicação com date_trunc/INTERVAL que não funciona em SQLite
    def _safe_text(sql):
        """Intercepta o text() e substitui o SQL PostgreSQL por DELETE seguro para SQLite."""
        sql_str = str(sql)
        if "date_trunc" in sql_str or "INTERVAL" in sql_str:
            from sqlalchemy import text as real_text
            # SQL SQLite-compatível que não deleta nada (sem duplicatas no teste)
            return real_text("DELETE FROM webhook_history WHERE 1=0")
        from sqlalchemy import text as real_text
        return real_text(sql)

    with patch("routers.webhooks.history.parse_webhook_payload", return_value={
            "event_type": "compra_aprovada",
            "phone": "5511999999999",
            "name": "Cliente Teste"
        }), \
         patch("routers.webhooks.history.upsert_webhook_lead"), \
         patch("routers.webhooks.history.robust_extract_labels", return_value=[]), \
         patch("routers.webhooks.history.text", side_effect=_safe_text):

        response = client.post(
            f"/api/webhook-integrations/{INTEGRATION_ID_STR}/history/sync-all",
            headers=HEADERS
        )

    assert response.status_code == 200, (
        f"Status inesperado: {response.status_code} - {response.text}"
    )

    db = TestingSessionLocal()
    updated = db.query(models.WebhookHistory).filter(
        models.WebhookHistory.id == history_id
    ).first()
    db.close()

    assert updated is not None, "Registro do histórico não encontrado após sync-all."
    assert updated.status == "skipped", (
        f"Status deveria ser 'skipped', mas é '{updated.status}'"
    )
    assert updated.error_message is not None
    assert "Nenhum mapeamento" in updated.error_message, (
        f"Mensagem deveria conter 'Nenhum mapeamento', mas é: '{updated.error_message}'"
    )


# ── Teste 2: pending COM mapeamento ativo → deve permanecer pending ───────────
def test_sync_all_mantem_pending_com_mapeamento_ativo():
    """
    Registros 'pending' com mapeamento ativo configurado NÃO devem ser
    reclassificados durante o Sincronizar Tudo.
    """
    db = TestingSessionLocal()
    _seed_base(db, with_active_mapping=True)
    history = _create_history(db, status="pending")
    history_id = history.id
    db.close()

    def _safe_text(sql):
        sql_str = str(sql)
        if "date_trunc" in sql_str or "INTERVAL" in sql_str:
            from sqlalchemy import text as real_text
            return real_text("DELETE FROM webhook_history WHERE 1=0")
        from sqlalchemy import text as real_text
        return real_text(sql)

    with patch("routers.webhooks.history.parse_webhook_payload", return_value={
            "event_type": "compra_aprovada",
            "phone": "5511999999999",
            "name": "Cliente Teste"
        }), \
         patch("routers.webhooks.history.upsert_webhook_lead"), \
         patch("routers.webhooks.history.robust_extract_labels", return_value=[]), \
         patch("routers.webhooks.history.text", side_effect=_safe_text):

        response = client.post(
            f"/api/webhook-integrations/{INTEGRATION_ID_STR}/history/sync-all",
            headers=HEADERS
        )

    assert response.status_code == 200, (
        f"Status inesperado: {response.status_code} - {response.text}"
    )

    db = TestingSessionLocal()
    updated = db.query(models.WebhookHistory).filter(
        models.WebhookHistory.id == history_id
    ).first()
    db.close()

    assert updated is not None
    assert updated.status == "pending", (
        f"Status deveria permanecer 'pending', mas virou '{updated.status}'"
    )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
