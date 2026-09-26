import pytest
from datetime import datetime, timezone
import models
from core.deps import get_current_user
from main import app

def test_bulk_tag_select_all_pages_chat(db_session, client):
    mock_user = models.User(id=1, email="test@example.com", client_id=1, role="admin", full_name="Admin Teste")
    app.dependency_overrides[get_current_user] = lambda: mock_user

    try:
        # Criar 3 conversas abertas sem a etiqueta nova
        convos = [
            models.ChatConversation(client_id=1, phone=f"551198888000{i}", contact_name=f"Lead {i}", status="open", labels=["antiga"])
            for i in range(1, 4)
        ]
        db_session.add_all(convos)
        db_session.commit()

        # Etiquetar todas as conversas selecionadas em todas as páginas
        res = client.post(
            "/api/chat/conversations/bulk-tag",
            json={
                "select_all_pages": True,
                "tab": "todos",
                "status": "open",
                "labels": ["etiqueta_todas_paginas"],
                "target": "chat",
                "mode": "sync"
            },
            headers={"X-Client-ID": "1"}
        )
        assert res.status_code == 200, res.text
        data = res.json()
        assert data.get("status") == "ok"
        assert data.get("updated_count") == 3

        for c in convos:
            db_session.refresh(c)
            assert "etiqueta_todas_paginas" in c.labels
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_bulk_tag_select_all_pages_contacts(db_session, client):
    mock_user = models.User(id=1, email="test@example.com", client_id=1, role="admin", full_name="Admin Teste")
    app.dependency_overrides[get_current_user] = lambda: mock_user

    try:
        # Criar conversas e 1 lead já existente
        convo1 = models.ChatConversation(client_id=1, phone="5511977770001", contact_name="Lead Contato 1", status="open", labels=[])
        convo2 = models.ChatConversation(client_id=1, phone="5511977770002", contact_name="Lead Contato 2", status="open", labels=[])
        existing_lead = models.WebhookLead(client_id=1, phone="5511977770001", name="Lead Contato 1", tags="antiga_tag", created_at=datetime.now(timezone.utc))
        db_session.add_all([convo1, convo2, existing_lead])
        db_session.commit()

        # Etiquetar na Aba de Contatos a partir da seleção de todas as páginas no Chat
        res = client.post(
            "/api/chat/conversations/bulk-tag",
            json={
                "select_all_pages": True,
                "tab": "todos",
                "status": "open",
                "labels": ["tag_aba_contatos"],
                "target": "contacts",
                "mode": "sync"
            },
            headers={"X-Client-ID": "1"}
        )
        assert res.status_code == 200, res.text
        data = res.json()
        assert data.get("status") == "ok"
        assert data.get("updated_count") >= 2

        # Validar que existing_lead foi atualizado e novo lead criado para convo2
        db_session.refresh(existing_lead)
        assert "tag_aba_contatos" in existing_lead.tags

        lead2 = db_session.query(models.WebhookLead).filter(
            models.WebhookLead.client_id == 1,
            models.WebhookLead.phone == "5511977770002"
        ).first()
        assert lead2 is not None
        assert "tag_aba_contatos" in lead2.tags
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_bulk_tag_all_leads_route(db_session, client):
    from core.permissions import require_premium
    mock_user = models.User(id=1, email="test@example.com", client_id=1, role="admin")
    mock_client = models.Client(id=1, name="Cliente Teste")
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[require_premium] = lambda: mock_user

    try:
        existing_client = db_session.query(models.Client).filter(models.Client.id == 1).first()
        if not existing_client:
            db_session.add(mock_client)
            db_session.commit()

        # Criar 2 leads sem etiquetas
        lead_a = models.WebhookLead(client_id=1, phone="5511966660001", name="Lead A", tags="", created_at=datetime.now(timezone.utc))
        lead_b = models.WebhookLead(client_id=1, phone="5511966660002", name="Lead B", tags="", created_at=datetime.now(timezone.utc))
        db_session.add_all([lead_a, lead_b])
        db_session.commit()

        res = client.post(
            "/api/leads/bulk-tag-all",
            json={
                "tag": "nova_tag_leads_all"
            },
            headers={"X-Client-ID": "1"}
        )
        assert res.status_code == 200, res.text
        data = res.json()
        assert data.get("status") == "success"
        assert data.get("tagged_count") >= 2

        db_session.refresh(lead_a)
        db_session.refresh(lead_b)
        assert "nova_tag_leads_all" in lead_a.tags
        assert "nova_tag_leads_all" in lead_b.tags
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(require_premium, None)
