"""
test_postgres_phase2_jsonb.py
Testes unitários para validação de Metadados Flexíveis em JSONB e Índices GIN
da Fase 2 do Roadmap PostgreSQL do ZapVoice.
"""
import pytest
from unittest.mock import MagicMock, patch
import models
from services.leads import upsert_webhook_lead


def test_webhook_lead_model_has_metadata_column():
    """Valida se o modelo WebhookLead possui a coluna metadata_payload com JSONB."""
    lead = models.WebhookLead()
    assert hasattr(lead, "metadata_payload"), "WebhookLead deve possuir o atributo metadata_payload"
    assert hasattr(lead, "variables"), "WebhookLead deve possuir o atributo variables"

    # Valida mapeamento no schema de colunas
    col_metadata = models.WebhookLead.__table__.columns.get("metadata")
    assert col_metadata is not None, "A coluna física 'metadata' deve existir na tabela webhook_leads"


def test_upsert_webhook_lead_stores_jsonb_metadata_on_create():
    """Valida se upsert_webhook_lead grava o payload e metadados flexíveis ao criar novo lead."""
    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.first.return_value = None # Não existe

    parsed_data = {
        "phone": "5511999998888",
        "name": "Maria Silva",
        "email": "maria@exemplo.com",
        "product_name": "Curso Avançado",
        "raw_payload": {
            "order_id": "ORD-12345",
            "utm_source": "google_ads",
            "installments": 12,
            "bump_products": ["Ebook Bônus"]
        },
        "custom_fields": {
            "cpf": "123.456.789-00",
            "cargo": "Diretora"
        }
    }

    lead = upsert_webhook_lead(
        db=mock_db,
        client_id=1,
        platform="kiwify",
        parsed_data=parsed_data
    )

    assert lead is not None
    assert lead.metadata_payload is not None
    assert lead.metadata_payload.get("raw_payload", {}).get("order_id") == "ORD-12345"
    assert lead.metadata_payload.get("cpf") == "123.456.789-00"
    assert lead.metadata_payload.get("cargo") == "Diretora"
    mock_db.add.assert_called_once_with(lead)


def test_upsert_webhook_lead_updates_jsonb_metadata_on_existing():
    """Valida se upsert_webhook_lead mescla novos metadados em um lead existente sem perder os antigos."""
    mock_db = MagicMock()
    existing_lead = models.WebhookLead(
        id=42,
        client_id=1,
        phone="5511999998888",
        name="Maria Silva",
        metadata_payload={"original_campaign": "black_friday"}
    )
    mock_db.query.return_value.filter.return_value.first.return_value = existing_lead

    parsed_data = {
        "phone": "5511999998888",
        "name": "Maria Silva",
        "metadata": {
            "last_checkout_step": "payment_info"
        },
        "custom_fields": {
            "cupom": "DESCONTO10"
        }
    }

    updated_lead = upsert_webhook_lead(
        db=mock_db,
        client_id=1,
        platform="hotmart",
        parsed_data=parsed_data
    )

    assert updated_lead.id == 42
    assert updated_lead.metadata_payload.get("original_campaign") == "black_friday"
    assert updated_lead.metadata_payload.get("last_checkout_step") == "payment_info"
    assert updated_lead.metadata_payload.get("cupom") == "DESCONTO10"
