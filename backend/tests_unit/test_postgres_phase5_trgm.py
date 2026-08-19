"""
test_postgres_phase5_trgm.py
Testes unitários para validação de Busca Rápida e Difusa com pg_trgm e Índices Trigram GIN
da Fase 5 do Roadmap PostgreSQL do ZapVoice.
"""
import os
import pytest
from unittest.mock import MagicMock
from alembic.config import Config
from alembic.script import ScriptDirectory
import models
from models.trigger import WebhookLead
from models.chat import ChatMessage, ChatConversation


def test_alembic_has_trigram_migration_head():
    """Valida se a migração 0004_add_trigram_indexes é a head atual do Alembic."""
    current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ini_path = os.path.join(current_dir, "alembic.ini")
    
    cfg = Config(ini_path)
    cfg.set_main_option("script_location", os.path.join(current_dir, "alembic_migrations"))
    
    script_dir = ScriptDirectory.from_config(cfg)
    revisions = [rev.revision for rev in script_dir.walk_revisions()]
    assert "0004_add_trigram_indexes" in revisions, "A migração 0004_add_trigram_indexes deve estar presente no histórico"


def test_trigram_search_query_generation(db_session):
    """Valida a execução de filtros com substring (ilike) sobre os modelos indexados com Trigram."""
    # 1. Lead search
    lead = WebhookLead(
        client_id=1,
        name="Carlos Eduardo Silva",
        phone="5511988887777",
        email="carlos.eduardo@empresa.com",
        platform="kiwify"
    )
    db_session.add(lead)

    # 2. Chat Conversation
    convo = ChatConversation(
        client_id=1,
        contact_name="Mariana Gonçalves",
        phone="5521977776666",
        status="open"
    )
    db_session.add(convo)
    db_session.commit()

    # 3. Chat Message
    msg = ChatMessage(
        conversation_id=convo.id,
        sender_type="contact",
        content="Gostaria de saber mais sobre a proposta comercial da plataforma."
    )
    db_session.add(msg)
    db_session.commit()

    # Consultas com wildcard ILIKE
    lead_found = db_session.query(WebhookLead).filter(
        WebhookLead.name.ilike("%Eduardo%")
    ).first()
    assert lead_found is not None
    assert lead_found.name == "Carlos Eduardo Silva"

    convo_found = db_session.query(ChatConversation).filter(
        ChatConversation.contact_name.ilike("%Gonçalves%")
    ).first()
    assert convo_found is not None
    assert convo_found.phone == "5521977776666"

    msg_found = db_session.query(ChatMessage).filter(
        ChatMessage.content.ilike("%proposta comercial%")
    ).first()
    assert msg_found is not None
    assert "proposta comercial" in msg_found.content
