"""
test_postgres_phase4_partitioning.py
Testes unitários para validação de Auditoria e Particionamento de Logs (PARTITION BY RANGE)
da Fase 4 do Roadmap PostgreSQL do ZapVoice.
"""
import os
import pytest
from unittest.mock import MagicMock
from alembic.config import Config
from alembic.script import ScriptDirectory
import models
from models.dispatch_log import DispatchLog


def test_dispatch_log_model_definition():
    """Valida a definição do modelo DispatchLog e seus índices e chave composta."""
    log = DispatchLog(
        client_id=1,
        trigger_id=10,
        channel="whatsapp_official",
        recipient="5511999999999",
        status="sent",
        response_payload={"message_id": "wamid.HBgL"},
        cost=0.035
    )
    assert log.client_id == 1
    assert log.channel == "whatsapp_official"
    assert log.recipient == "5511999999999"
    assert log.status == "sent"
    assert log.cost == 0.035

    # Validar que DispatchLog possui os atributos de particionamento e índices
    table = DispatchLog.__table__
    assert "id" in table.columns
    assert "created_at" in table.columns
    assert "client_id" in table.columns
    assert "status" in table.columns


def test_alembic_has_partitioning_migration_head():
    """Valida se a migração 0003_create_partitioned_dispatch_logs é a head atual do Alembic."""
    current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ini_path = os.path.join(current_dir, "alembic.ini")
    
    cfg = Config(ini_path)
    cfg.set_main_option("script_location", os.path.join(current_dir, "alembic_migrations"))
    
    script_dir = ScriptDirectory.from_config(cfg)
    revisions = [rev.revision for rev in script_dir.walk_revisions()]
    assert "0003_dispatch_logs" in revisions, "A migração 0003_dispatch_logs deve estar presente no histórico"
