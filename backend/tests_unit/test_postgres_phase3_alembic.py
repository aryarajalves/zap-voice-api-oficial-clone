"""
test_postgres_phase3_alembic.py
Testes unitários para validação de Migrações Automatizadas com Alembic
da Fase 3 do Roadmap PostgreSQL do ZapVoice.
"""
import os
import pytest
from unittest.mock import MagicMock, patch
from alembic.config import Config
from alembic.script import ScriptDirectory
import models
from scripts.database.update_schema import run_alembic_migrations


def test_alembic_ini_and_structure_exist():
    """Valida se o arquivo alembic.ini e o diretório de migrações existem."""
    current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ini_path = os.path.join(current_dir, "alembic.ini")
    env_path = os.path.join(current_dir, "alembic_migrations", "env.py")
    versions_path = os.path.join(current_dir, "alembic_migrations", "versions")

    assert os.path.exists(ini_path), "alembic.ini deve existir na raiz do backend"
    assert os.path.exists(env_path), "alembic_migrations/env.py deve existir"
    assert os.path.exists(versions_path), "alembic_migrations/versions deve existir"


def test_alembic_script_directory_and_heads():
    """Valida se o Alembic consegue ler a árvore de versões e encontrar a baseline."""
    current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ini_path = os.path.join(current_dir, "alembic.ini")
    
    cfg = Config(ini_path)
    cfg.set_main_option("script_location", os.path.join(current_dir, "alembic_migrations"))
    
    script_dir = ScriptDirectory.from_config(cfg)
    heads = script_dir.get_heads()
    
    assert len(heads) >= 1, "Alembic deve possuir pelo menos uma versão head"
    revisions = [rev.revision for rev in script_dir.walk_revisions()]
    assert "0001_initial_baseline" in revisions, "A baseline inicial deve estar presente no histórico de migrações"


def test_run_alembic_migrations_calls_upgrade():
    """Valida se run_alembic_migrations executa command.upgrade sem exceções."""
    with patch("alembic.command.upgrade") as mock_upgrade:
        run_alembic_migrations()
        mock_upgrade.assert_called_once()
        args, _ = mock_upgrade.call_args
        assert args[1] == "head"
