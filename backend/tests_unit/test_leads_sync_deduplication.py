import os
import sys
import pytest

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ["DATABASE_URL"] = "sqlite://"

import models
from main import app
from core.deps import get_db, get_current_user, get_validated_client_id
from services.utils.phone_utils import (
    clean_phone_for_canonical,
    get_canonical_phone_key,
    normalize_phone
)

mock_user = models.User(id=1, email="test@test.com", client_id=1, is_active=True, role="super_admin")

def mock_get_current_user():
    return mock_user

def mock_get_validated_client_id():
    return 1

def test_canonical_phone_key_handles_variations():
    # 1. Zero após DDD (ex: 8109060057339 vs 819060057339)
    key_with_zero = get_canonical_phone_key("8109060057339")
    key_without_zero = get_canonical_phone_key("819060057339")
    key_with_55 = get_canonical_phone_key("55819060057339")
    assert key_with_zero == key_without_zero == key_with_55

    # 2. Trailing zero de webhook (ex: 55119913215090 vs 5511991321509)
    key_trailing_zero = get_canonical_phone_key("55119913215090")
    key_standard = get_canonical_phone_key("5511991321509")
    assert key_trailing_zero == key_standard

    # 3. Nono dígito (8 dígitos vs 9 dígitos no celular BR)
    key_8_digits = get_canonical_phone_key("558596123586")
    key_9_digits = get_canonical_phone_key("5585996123586")
    assert key_8_digits == key_9_digits

    # 4. Zero à esquerda de discagem (081...)
    key_leading_zero = get_canonical_phone_key("0819060057339")
    assert key_leading_zero == key_without_zero


@pytest.mark.asyncio
async def test_clean_corrupted_tags_merges_duplicates_and_combines_tags(client, db_session):
    app.dependency_overrides[get_current_user] = mock_get_current_user
    app.dependency_overrides[get_validated_client_id] = mock_get_validated_client_id

    try:
        # Cria dois leads duplicados com telefones ligeiramente diferentes para o mesmo cliente
        lead1 = models.WebhookLead(
            client_id=1,
            name="Rita",
            phone="819060057339",
            tags="grupo-lancamento, veio_pelo_disparo",
            email="rita@test.com",
            total_events=2
        )
        lead2 = models.WebhookLead(
            client_id=1,
            name="Rita Silva",
            phone="8109060057339", # com zero após o DDD
            tags="contatos_disparo_agosto, grupo_astrowake",
            bsud="JP.1766708047670154",
            total_events=1
        )
        # Lead separado que não é duplicado
        lead_outro = models.WebhookLead(
            client_id=1,
            name="Carlos",
            phone="5511988887777",
            tags="cliente-vip"
        )
        db_session.add_all([lead1, lead2, lead_outro])
        db_session.commit()

        # Dispara endpoint de sincronização
        resp = client.post("/api/leads/clean-corrupted-tags", headers={"X-Client-Id": "1"})
        assert resp.status_code == 200
        data = resp.json()

        assert data["status"] == "success"
        assert data["leads_merged"] == 1
        assert "unificado(s)" in data["message"]

        # Verifica no banco se sobrou apenas 1 lead da Rita e 1 do Carlos
        all_leads = db_session.query(models.WebhookLead).filter(models.WebhookLead.client_id == 1).all()
        assert len(all_leads) == 2

        rita_leads = [l for l in all_leads if "Rita" in (l.name or "")]
        assert len(rita_leads) == 1
        merged_rita = rita_leads[0]

        # Verifica mesclagem de tags (todas as 4 tags únicas devem estar presentes)
        tags = [t.strip() for t in merged_rita.tags.split(",")]
        assert "grupo-lancamento" in tags
        assert "veio_pelo_disparo" in tags
        assert "contatos_disparo_agosto" in tags
        assert "grupo_astrowake" in tags

        # Verifica preservação de dados
        assert merged_rita.bsud == "JP.1766708047670154"
        assert merged_rita.email == "rita@test.com"
        # Executa uma segunda sincronização (agora com 0 duplicados restantes)
        resp2 = client.post("/api/leads/clean-corrupted-tags", headers={"X-Client-Id": "1"})
        assert resp2.status_code == 200
        data2 = resp2.json()
        assert data2["status"] == "success"
        assert data2["leads_merged"] == 0
        assert "Nenhum contato duplicado encontrado" in data2["message"]

    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_validated_client_id, None)
