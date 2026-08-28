import pytest
from unittest.mock import patch, AsyncMock
from models import User, Client, UserInvitation
from core.security import get_password_hash

def test_public_invitation_get_flow(client, db_session):
    """
    Testa o endpoint público GET /auth/invitations/{token} com rate limiting.
    """
    # 1. Setup Client & Invitation
    test_client = Client(name="Empresa Convite RateLimit", is_active=True)
    db_session.add(test_client)
    db_session.commit()
    db_session.refresh(test_client)

    invite = UserInvitation(
        token="token_rate_limit_public_123",
        role="user",
        is_used=False,
        blocked_features="[]",
        blocked_nodes="[]"
    )
    invite.accessible_clients.append(test_client)
    db_session.add(invite)
    db_session.commit()

    # 2. Requisita token existente
    response = client.get("/api/auth/invitations/token_rate_limit_public_123")
    assert response.status_code == 200
    data = response.json()
    assert data["token"] == "token_rate_limit_public_123"
    assert data["role"] == "user"

    # 3. Requisita token inexistente
    resp_404 = client.get("/api/auth/invitations/token_inexistente_999")
    assert resp_404.status_code == 404


@patch("websocket_manager.manager.broadcast", new_callable=AsyncMock)
def test_public_invitation_register_flow(mock_ws, client, db_session):
    """
    Testa o endpoint público POST /auth/invitations/{token}/register com rate limiting e criação de conta.
    """
    test_client = Client(name="Empresa Register RateLimit", is_active=True)
    db_session.add(test_client)
    db_session.commit()
    db_session.refresh(test_client)

    invite = UserInvitation(
        token="token_register_rl_456",
        role="user",
        is_used=False,
        blocked_features="[]",
        blocked_nodes="[]"
    )
    invite.accessible_clients.append(test_client)
    db_session.add(invite)
    db_session.commit()

    payload = {
        "full_name": "Usuário Convidado RL",
        "email": "convidado_rl@zapvoice.com",
        "password": "senha_segura_123"
    }

    response = client.post("/api/auth/invitations/token_register_rl_456/register", json=payload)
    assert response.status_code == 200
    assert "user_id" in response.json()

    # Verifica que o convite foi marcado como utilizado
    db_session.refresh(invite)
    assert invite.is_used is True

    # Tentativa de reutilizar convite deve retornar 400
    resp_reused = client.post("/api/auth/invitations/token_register_rl_456/register", json=payload)
    assert resp_reused.status_code == 400
    assert "já foi utilizado" in resp_reused.text
