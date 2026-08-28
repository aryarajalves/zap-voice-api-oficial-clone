import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock
from fastapi import WebSocket
from websocket_manager import ConnectionManager
from models import User, Client
from core.security import get_password_hash, create_access_token

@pytest.mark.asyncio
async def test_connection_manager_tenant_isolation():
    """
    Testa o isolamento de mensagens por tenant no ConnectionManager.
    """
    manager = ConnectionManager()

    # 3 conexões simuladas
    ws_tenant_1 = MagicMock(spec=WebSocket)
    ws_tenant_1.send_text = AsyncMock()

    ws_tenant_2 = MagicMock(spec=WebSocket)
    ws_tenant_2.send_text = AsyncMock()

    ws_super_admin = MagicMock(spec=WebSocket)
    ws_super_admin.send_text = AsyncMock()

    # Conectar com metadados
    await manager.connect(ws_tenant_1, metadata={"client_id": 1, "role": "user"})
    await manager.connect(ws_tenant_2, metadata={"client_id": 2, "role": "user"})
    await manager.connect(ws_super_admin, metadata={"client_id": None, "role": "super_admin"})

    # 1. Enviar mensagem direcionada ao Tenant 1
    msg_tenant_1 = {"event": "trigger_progress", "client_id": 1, "data": {"status": "running"}}
    await manager.broadcast(msg_tenant_1)

    # Tenant 1 e Super Admin devem receber
    ws_tenant_1.send_text.assert_awaited_once()
    ws_super_admin.send_text.assert_awaited_once()
    # Tenant 2 NÃO deve receber a mensagem do Tenant 1
    ws_tenant_2.send_text.assert_not_awaited()

    # Resetar mocks
    ws_tenant_1.send_text.reset_mock()
    ws_tenant_2.send_text.reset_mock()
    ws_super_admin.send_text.reset_mock()

    # 2. Enviar mensagem direcionada ao Tenant 2
    msg_tenant_2 = {"event": "webhook_received", "client_id": 2, "data": {"name": "Lead Teste"}}
    await manager.broadcast(msg_tenant_2)

    ws_tenant_2.send_text.assert_awaited_once()
    ws_super_admin.send_text.assert_awaited_once()
    ws_tenant_1.send_text.assert_not_awaited()


def test_websocket_endpoint_auth_and_subscription(client, db_session):
    """
    Testa a autenticação e validação de permissão de tenant no endpoint /ws.
    """
    # 1. Setup Clients
    client_a = Client(name="Empresa A", is_active=True)
    client_b = Client(name="Empresa B", is_active=True)
    db_session.add_all([client_a, client_b])
    db_session.commit()
    db_session.refresh(client_a)
    db_session.refresh(client_b)

    # 2. Setup User com acesso apenas a Empresa A
    user = User(
        email="ws_user@empresa.com",
        hashed_password=get_password_hash("pass123"),
        role="user",
        is_active=True,
        client_id=client_a.id
    )
    user.accessible_clients.append(client_a)
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    valid_token = create_access_token(data={"sub": user.email})

    # Teste 1: Conexão sem token -> deve rejeitar
    with pytest.raises(Exception):
        with client.websocket_connect("/ws") as ws:
            pass

    # Teste 2: Conexão com token válido
    with client.websocket_connect(f"/ws?token={valid_token}") as ws:
        # Tenta assinar tenant não autorizado (Empresa B)
        ws.send_json({"event": "subscribe_client", "client_id": client_b.id})
        response = ws.receive_json()
        assert response.get("event") == "error"
        assert "Acesso negado" in response.get("detail", "")

        # Assina tenant autorizado (Empresa A)
        ws.send_json({"event": "subscribe_client", "client_id": client_a.id})
        response_auth = ws.receive_json()
        assert response_auth.get("event") == "system_stats"
