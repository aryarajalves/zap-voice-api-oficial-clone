import os
import sys

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ["DATABASE_URL"] = "sqlite://"

import pytest
from datetime import datetime, timezone
import models
from main import app
from core.deps import get_db, get_current_user, get_validated_client_id
from services.triggers_service import process_bulk_csv_logic

mock_user = models.User(id=1, email="test@test.com", client_id=1, is_active=True)

def mock_get_current_user():
    return mock_user

def mock_get_validated_client_id():
    return 1

@pytest.mark.asyncio
async def test_schedule_bulk_send_deduplicates_and_sets_exact_total_contacts(client, db_session):
    app.dependency_overrides[get_current_user] = mock_get_current_user
    app.dependency_overrides[get_validated_client_id] = mock_get_validated_client_id

    try:
        # Lista com 20 contatos, sendo 11 duplicados/inválidos e 9 contatos únicos reais
        payload_contacts = [
            # Contato 1 (4 variações)
            {"phone": "(11) 98888-7777", "name": "João A"},
            {"phone": "5511988887777", "name": "João B"},
            {"phone": "11988887777", "name": "João C"},
            {"phone": "011988887777", "name": "João D"},
            # Contato 2 (3 variações)
            {"phone": "(21) 97777-6666", "name": "Maria A"},
            {"phone": "5521977776666", "name": "Maria B"},
            {"phone": "21977776666", "name": "Maria C"},
            # Contato 3 (2 variações)
            {"phone": "31966665555", "name": "Carlos A"},
            {"phone": "5531966665555", "name": "Carlos B"},
            # Contato 4 (2 variações)
            {"phone": "41955554444", "name": "Ana A"},
            {"phone": "5541955554444", "name": "Ana B"},
            # Contato 5 (2 variações)
            {"phone": "51944443333", "name": "Pedro A"},
            {"phone": "5551944443333", "name": "Pedro B"},
            # Contato 6 (1)
            {"phone": "5561933332222", "name": "Lucas"},
            # Contato 7 (1)
            {"phone": "5571922221111", "name": "Beatriz"},
            # Contato 8 (1)
            {"phone": "5581911110000", "name": "Gabriel"},
            # Contato 9 (3 variações)
            {"phone": "85999991111", "name": "Aryaraj A"},
            {"phone": "5585999991111", "name": "Aryaraj B"},
            {"phone": "(85) 99999-1111", "name": "Aryaraj C"},
            # Inválido (deve ser descartado)
            {"phone": "123", "name": "Invalido"}
        ]
        assert len(payload_contacts) == 20

        payload = {
            "template_name": "teste_deduplicacao",
            "contacts_list": payload_contacts,
            "schedule_at": datetime.now(timezone.utc).isoformat()
        }

        response = client.post(
            "/api/bulk-send/schedule",
            json=payload,
            headers={"X-Client-Id": "1"}
        )

        assert response.status_code == 200
        data = response.json()

        # O total_contacts deve ser exatamente 9 contatos únicos (11 duplicados descartados)
        assert data["total_contacts"] == 9
        assert len(data["contacts_list"]) == 9

        # Validar que todos os telefones gravados estão normalizados e sem duplicidade
        saved_phones = [c["phone"] for c in data["contacts_list"]]
        assert len(saved_phones) == len(set(saved_phones))
        assert "5511988887777" in saved_phones
        assert "5521977776666" in saved_phones
        assert "5585999991111" in saved_phones

    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_validated_client_id, None)

@pytest.mark.asyncio
async def test_reserve_bulk_send_deduplicates_and_sets_exact_total_contacts(client, db_session):
    app.dependency_overrides[get_current_user] = mock_get_current_user
    app.dependency_overrides[get_validated_client_id] = mock_get_validated_client_id

    try:
        payload_contacts = [
            {"phone": "11988887777"},
            {"phone": "5511988887777"},
            {"phone": "21977776666"},
            {"phone": "5521977776666"},
            {"phone": "31966665555"}
        ]

        payload = {
            "template_name": "teste_reserve",
            "contacts_list": payload_contacts
        }

        response = client.post(
            "/api/bulk-send/reserve",
            json=payload,
            headers={"X-Client-Id": "1"}
        )

        assert response.status_code == 200
        data = response.json()

        assert data["total_contacts"] == 3
        assert len(data["contacts_list"]) == 3
        assert len(data["pending_contacts"]) == 3
        assert set(data["pending_contacts"]) == {"5511988887777", "5521977776666", "5531966665555"}

    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_validated_client_id, None)

def test_process_bulk_csv_logic_deduplicates_csv():
    csv_data = (
        "phone,name\n"
        "11988887777,João 1\n"
        "5511988887777,João 2\n"
        "21977776666,Maria 1\n"
        "(21) 97777-6666,Maria 2\n"
        "31966665555,Carlos\n"
    )

    contacts = process_bulk_csv_logic(csv_data)
    assert len(contacts) == 3
    phones = [c["phone"] for c in contacts]
    assert phones == ["5511988887777", "5521977776666", "5531966665555"]
