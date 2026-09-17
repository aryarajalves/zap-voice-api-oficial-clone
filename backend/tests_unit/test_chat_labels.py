import pytest
from models import User, Client, ChatLabel, ChatConversation
from core.security import get_password_hash, create_access_token

def test_chat_labels_flow(client, db_session):
    # 1. Criar cliente e usuário de teste
    test_client = Client(name="Cliente Label Teste", is_active=True)
    db_session.add(test_client)
    db_session.commit()
    db_session.refresh(test_client)

    test_user = User(
        email="dev_labels@zapvoice.com.br",
        hashed_password=get_password_hash("password123"),
        role="admin",
        is_active=True,
        client_id=test_client.id
    )
    test_user.accessible_clients.append(test_client)
    db_session.add(test_user)
    db_session.commit()
    db_session.refresh(test_user)

    # Criar uma conversa antiga que possui um marcador legado ("legado1")
    legacy_convo = ChatConversation(
        client_id=test_client.id,
        contact_name="Contato Antigo",
        phone="5511999999999",
        status="open",
        labels=["legado1"]
    )
    db_session.add(legacy_convo)
    db_session.commit()

    # Gerar token JWT para autenticar as requisições de etiquetas
    jwt_token = create_access_token(data={"sub": test_user.email})
    headers = {
        "Authorization": f"Bearer {jwt_token}",
        "X-Client-ID": str(test_user.client_id)
    }

    # 2. Criar uma Etiqueta Global via POST
    payload = {"name": "Suporte Premium", "color": "#EF4444"}
    res_create = client.post("/api/chat/labels", json=payload, headers=headers)
    assert res_create.status_code == 200
    data = res_create.json()
    assert data["name"] == "Suporte Premium"
    assert data["color"] == "#EF4444"
    label_id = data["id"]

    # 3. Listar Etiquetas Globais Detalhadas (deve conter a global e a legacy, além do usage_count correto)
    res_details = client.get("/api/chat/labels/details", headers=headers)
    assert res_details.status_code == 200
    labels_details = res_details.json()
    assert len(labels_details) == 2
    assert any(l["name"] == "Suporte Premium" and l["color"] == "#EF4444" and not l["is_legacy"] and l.get("usage_count") == 0 for l in labels_details)
    assert any(l["name"] == "legado1" and l["color"] == "#64748B" and l["is_legacy"] and l.get("usage_count") == 1 for l in labels_details)

    # 4. Listar Etiquetas mescladas (GET /chat/labels)
    res_list = client.get("/api/chat/labels", headers=headers)
    assert res_list.status_code == 200
    labels_list = res_list.json()
    assert "Suporte Premium" in labels_list
    assert "legado1" in labels_list
    assert len(labels_list) == 2

    # 5. Tentar criar duplicado e falhar
    res_duplicate = client.post("/api/chat/labels", json=payload, headers=headers)
    assert res_duplicate.status_code == 400

    # 5.1. Editar etiqueta cadastrada (PUT)
    update_payload = {"name": "Suporte Platinum", "color": "#8B5CF6"}
    res_update = client.put(f"/api/chat/labels/{label_id}", json=update_payload, headers=headers)
    assert res_update.status_code == 200
    update_data = res_update.json()
    assert update_data["name"] == "Suporte Platinum"
    assert update_data["color"] == "#8B5CF6"

    # 5.2. Editar etiqueta legacy (PUT /chat/labels/0) para convertê-la no banco
    legacy_payload = {"name": "legado1", "color": "#10B981"}
    res_update_legacy = client.put("/api/chat/labels/0", json=legacy_payload, headers=headers)
    assert res_update_legacy.status_code == 200
    legacy_data = res_update_legacy.json()
    assert legacy_data["name"] == "legado1"
    assert legacy_data["color"] == "#10B981"
    assert legacy_data["id"] > 0
    legacy_db_id = legacy_data["id"]

    # 6. Excluir as etiquetas
    res_delete = client.delete(f"/api/chat/labels/{label_id}", headers=headers)
    assert res_delete.status_code == 200

    # 7. Listar detalhes de novo (deve sobrar apenas a legacy)
    res_details_after = client.get("/api/chat/labels/details", headers=headers)
    assert res_details_after.status_code == 200
    labels_details_after = res_details_after.json()
    assert len(labels_details_after) == 1
    assert labels_details_after[0]["name"] == "legado1"

    # 8. Excluir a etiqueta legacy pelo ID real salvo
    res_delete_legacy = client.delete(f"/api/chat/labels/{legacy_db_id}", headers=headers)
    assert res_delete_legacy.status_code == 200

    # 9. Listar detalhes final (deve estar totalmente vazio)
    res_details_final = client.get("/api/chat/labels/details", headers=headers)
    assert res_details_final.status_code == 200
    assert len(res_details_final.json()) == 0

def test_chat_labels_transfer_flow(client, db_session):
    from models import WebhookLead
    # 1. Setup client e usuário
    test_client = Client(name="Cliente Transfer Teste", is_active=True)
    db_session.add(test_client)
    db_session.commit()
    db_session.refresh(test_client)

    test_user = User(
        email="dev_transfer@zapvoice.com.br",
        hashed_password=get_password_hash("password123"),
        role="admin",
        is_active=True,
        client_id=test_client.id
    )
    test_user.accessible_clients.append(test_client)
    db_session.add(test_user)
    db_session.commit()
    db_session.refresh(test_user)

    jwt_token = create_access_token(data={"sub": test_user.email})
    headers = {
        "Authorization": f"Bearer {jwt_token}",
        "X-Client-ID": str(test_user.client_id)
    }

    # 2. Criar conversas e lead de teste com etiquetas
    convo1 = ChatConversation(
        client_id=test_client.id,
        contact_name="Lead Alpha",
        phone="5511988887777",
        status="open",
        labels=["origem_a", "outra_tag"]
    )
    convo2 = ChatConversation(
        client_id=test_client.id,
        contact_name="Lead Beta",
        phone="5511966665555",
        status="open",
        labels=["origem_a"]
    )
    convo_sem = ChatConversation(
        client_id=test_client.id,
        contact_name="Lead Neutro",
        phone="5511944443333",
        status="open",
        labels=["neutro"]
    )
    db_session.add_all([convo1, convo2, convo_sem])

    lead1 = WebhookLead(
        client_id=test_client.id,
        phone="5511988887777",
        name="Lead Alpha",
        tags="origem_a, outra_tag"
    )
    db_session.add(lead1)
    db_session.commit()

    # 3. Validação de erros
    res_err_equal = client.post("/api/chat/labels/transfer", json={"source_label": "origem_a", "target_label": "origem_a"}, headers=headers)
    assert res_err_equal.status_code == 400

    res_err_action = client.post("/api/chat/labels/transfer", json={"source_label": "origem_a", "target_label": "dest", "action": "invalid"}, headers=headers)
    assert res_err_action.status_code == 400

    # 4. Testar modo "copy" (adiciona destino mantendo origem)
    res_copy = client.post("/api/chat/labels/transfer", json={
        "source_label": "origem_a",
        "target_label": "destino_copy",
        "action": "copy"
    }, headers=headers)
    assert res_copy.status_code == 200
    copy_data = res_copy.json()
    assert copy_data["updated_conversations"] == 2
    assert copy_data["updated_leads"] == 1

    db_session.refresh(convo1)
    db_session.refresh(convo2)
    db_session.refresh(lead1)
    assert "origem_a" in convo1.labels
    assert "destino_copy" in convo1.labels
    assert "destino_copy" in convo2.labels
    assert "destino_copy" in lead1.tags

    # 5. Testar modo "move" (substitui origem pelo destino)
    res_move = client.post("/api/chat/labels/transfer", json={
        "source_label": "origem_a",
        "target_label": "destino_final",
        "action": "move"
    }, headers=headers)
    assert res_move.status_code == 200
    move_data = res_move.json()
    assert move_data["updated_conversations"] == 2

    db_session.refresh(convo1)
    db_session.refresh(convo2)
    db_session.refresh(lead1)
    # origem_a não deve mais existir
    assert "origem_a" not in convo1.labels
    assert "origem_a" not in convo2.labels
    assert "origem_a" not in lead1.tags
    # destino_final deve estar presente
    assert "destino_final" in convo1.labels
    assert "destino_final" in convo2.labels
    assert "destino_final" in lead1.tags
    # conversa neutra inalterada
    db_session.refresh(convo_sem)
    assert convo_sem.labels == ["neutro"]
