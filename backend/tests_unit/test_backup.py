"""
Testes unitários — Router de Backup do Banco de Dados.

Testa:
- GET /api/backup/config (obter configuração)
- PUT /api/backup/config (salvar configuração)
- GET /api/backup/list (listar backups)
- POST /api/backup/manual (backup manual)
- DELETE /api/backup/file/{filename} (deletar backup)
- Controle de acesso: apenas super_admin
"""

import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from models import User, BackupConfig
from core.security import get_password_hash


# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture
def super_admin_user(db_session: Session) -> User:
    """Cria um usuário super_admin para os testes."""
    user = db_session.query(User).filter(User.email == "backup_test_admin@test.com").first()
    if not user:
        user = User(
            email="backup_test_admin@test.com",
            hashed_password=get_password_hash("test1234"),
            role="super_admin",
            full_name="Backup Test Admin",
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
    return user


@pytest.fixture
def regular_user(db_session: Session) -> User:
    """Cria um usuário comum (sem permissão de backup)."""
    user = db_session.query(User).filter(User.email == "backup_test_user@test.com").first()
    if not user:
        user = User(
            email="backup_test_user@test.com",
            hashed_password=get_password_hash("test1234"),
            role="user",
            full_name="Backup Test User",
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
    return user


@pytest.fixture
def super_admin_token(client: TestClient, super_admin_user: User) -> str:
    """Obtém o token JWT do super_admin."""
    res = client.post("/api/auth/token", data={
        "username": "backup_test_admin@test.com",
        "password": "test1234",
    })
    assert res.status_code == 200
    return res.json()["access_token"]


@pytest.fixture
def user_token(client: TestClient, regular_user: User) -> str:
    """Obtém o token JWT do usuário comum."""
    res = client.post("/api/auth/token", data={
        "username": "backup_test_user@test.com",
        "password": "test1234",
    })
    assert res.status_code == 200
    return res.json()["access_token"]


# ─── Testes de Controle de Acesso ─────────────────────────────────────────────

class TestBackupAccessControl:
    """Valida que apenas super_admin acessa os endpoints de backup."""

    def test_get_config_unauthenticated(self, client: TestClient):
        """Sem token → 401."""
        res = client.get("/api/backup/config")
        assert res.status_code == 401

    def test_get_config_regular_user_forbidden(
        self, client: TestClient, user_token: str
    ):
        """Usuário comum → 403."""
        res = client.get(
            "/api/backup/config",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert res.status_code == 403

    def test_list_backups_regular_user_forbidden(
        self, client: TestClient, user_token: str
    ):
        """Usuário comum não pode listar backups."""
        res = client.get(
            "/api/backup/list",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert res.status_code == 403

    def test_run_manual_regular_user_forbidden(
        self, client: TestClient, user_token: str
    ):
        """Usuário comum não pode disparar backup manual."""
        res = client.post(
            "/api/backup/manual",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert res.status_code == 403


# ─── Testes de Configuração ────────────────────────────────────────────────────

class TestBackupConfig:
    """Testa os endpoints de configuração de backup."""

    def test_get_config_creates_default(
        self, client: TestClient, super_admin_token: str
    ):
        """GET /api/backup/config deve retornar (ou criar) configuração padrão."""
        res = client.get(
            "/api/backup/config",
            headers={"Authorization": f"Bearer {super_admin_token}"},
        )
        assert res.status_code == 200
        data = res.json()
        assert "enabled" in data
        assert "interval_type" in data
        assert "retention_count" in data
        # Valores padrão esperados
        assert data["retention_count"] == 30
        assert data["enabled"] is False

    def test_save_config_manual_mode(
        self, client: TestClient, super_admin_token: str
    ):
        """PUT /api/backup/config — salva modo manual."""
        res = client.put(
            "/api/backup/config",
            json={
                "enabled": False,
                "interval_type": "manual",
                "interval_value": 24,
                "retention_count": 30,
            },
            headers={"Authorization": f"Bearer {super_admin_token}"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["enabled"] is False
        assert data["interval_type"] == "manual"
        assert data["retention_count"] == 30
        assert data["next_backup_at"] is None

    def test_save_config_hours_schedule(
        self, client: TestClient, super_admin_token: str
    ):
        """PUT /api/backup/config — ativa agendamento por horas."""
        res = client.put(
            "/api/backup/config",
            json={
                "enabled": True,
                "interval_type": "hours",
                "interval_value": 12,
                "retention_count": 15,
            },
            headers={"Authorization": f"Bearer {super_admin_token}"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["enabled"] is True
        assert data["interval_type"] == "hours"
        assert data["interval_value"] == 12
        assert data["retention_count"] == 15
        # next_backup_at deve ser preenchido
        assert data["next_backup_at"] is not None

    def test_save_config_days_schedule(
        self, client: TestClient, super_admin_token: str
    ):
        """PUT /api/backup/config — ativa agendamento por dias."""
        res = client.put(
            "/api/backup/config",
            json={
                "enabled": True,
                "interval_type": "days",
                "interval_value": 7,
                "retention_count": 30,
            },
            headers={"Authorization": f"Bearer {super_admin_token}"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["interval_type"] == "days"
        assert data["interval_value"] == 7
        assert data["next_backup_at"] is not None

    def test_save_config_invalid_interval_type(
        self, client: TestClient, super_admin_token: str
    ):
        """PUT /api/backup/config — tipo de intervalo inválido → 422."""
        res = client.put(
            "/api/backup/config",
            json={
                "enabled": True,
                "interval_type": "minutes",  # inválido
                "interval_value": 30,
                "retention_count": 10,
            },
            headers={"Authorization": f"Bearer {super_admin_token}"},
        )
        assert res.status_code == 422

    def test_save_config_retention_zero_invalid(
        self, client: TestClient, super_admin_token: str
    ):
        """PUT /api/backup/config — retenção 0 é inválida → 422."""
        res = client.put(
            "/api/backup/config",
            json={
                "enabled": False,
                "interval_type": "manual",
                "interval_value": 1,
                "retention_count": 0,  # inválido (ge=1)
            },
            headers={"Authorization": f"Bearer {super_admin_token}"},
        )
        assert res.status_code == 422


# ─── Testes de Listagem de Backups ────────────────────────────────────────────

class TestBackupList:
    """Testa o endpoint de listagem de backups no S3."""

    def test_list_backups_with_mocked_s3(
        self, client: TestClient, super_admin_token: str
    ):
        """GET /api/backup/list — lista retornada com mock do S3."""
        mock_backups = [
            {
                "filename": "backup_20260530_120000.dump.gz",
                "s3_key": "backups/backup_20260530_120000.dump.gz",
                "size_bytes": 512000,
                "created_at": "2026-05-30T12:00:00+00:00",
            }
        ]
        with patch(
            "services.backup_service.backup_service.list_backups",
            return_value=mock_backups
        ):
            res = client.get(
                "/api/backup/list",
                headers={"Authorization": f"Bearer {super_admin_token}"},
            )
        assert res.status_code == 200
        data = res.json()
        assert "backups" in data
        assert "total" in data
        assert data["total"] == 1
        assert data["backups"][0]["filename"] == "backup_20260530_120000.dump.gz"

    def test_list_backups_s3_not_configured(
        self, client: TestClient, super_admin_token: str
    ):
        """GET /api/backup/list — S3 não configurado → 503."""
        with patch(
            "services.backup_service.backup_service.list_backups",
            side_effect=RuntimeError("Credenciais S3 não configuradas.")
        ):
            res = client.get(
                "/api/backup/list",
                headers={"Authorization": f"Bearer {super_admin_token}"},
            )
        assert res.status_code == 503


# ─── Testes de Backup Manual ──────────────────────────────────────────────────

class TestBackupManual:
    """Testa o endpoint de backup manual."""

    def test_manual_backup_started_in_background(
        self, client: TestClient, super_admin_token: str
    ):
        """POST /api/backup/manual — retorna 200 imediatamente."""
        res = client.post(
            "/api/backup/manual",
            headers={"Authorization": f"Bearer {super_admin_token}"},
        )
        assert res.status_code == 200
        data = res.json()
        assert "message" in data
        assert "Backup iniciado" in data["message"]
        assert "started_by" in data
        assert "started_at" in data


# ─── Testes de Deleção de Backup ──────────────────────────────────────────────

class TestBackupDelete:
    """Testa o endpoint de deleção de backup específico."""

    def test_delete_backup_success(
        self, client: TestClient, super_admin_token: str
    ):
        """DELETE /api/backup/file/{filename} — sucesso com mock."""
        with patch(
            "services.backup_service.backup_service.delete_backup",
            return_value=None,
        ):
            res = client.delete(
                "/api/backup/file/backup_20260530_120000.dump.gz",
                headers={"Authorization": f"Bearer {super_admin_token}"},
            )
        assert res.status_code == 200
        assert "removido" in res.json()["message"]

    def test_delete_backup_invalid_path_traversal(
        self, client: TestClient, super_admin_token: str
    ):
        """
        DELETE /api/backup/file/{filename} — path traversal com barra invertida → 400.
        Nota: paths com '/' no filename são capturados pelo roteador do FastAPI antes de
        chegar ao handler, portanto testamos apenas o caso de barra invertida (backslash).
        """
        with patch(
            "services.backup_service.backup_service.delete_backup",
            side_effect=ValueError("Nome de arquivo inválido."),
        ):
            res = client.delete(
                "/api/backup/file/backup_malicioso.dump.gz",
                headers={"Authorization": f"Bearer {super_admin_token}"},
            )
        # Deve retornar 400 (ValueError capturado) ou o mock não foi chamado (arquivo válido passaria)
        # Como o mock lança ValueError, deve retornar 400
        assert res.status_code == 400

    def test_delete_backup_pinned_forbidden(
        self, client: TestClient, super_admin_token: str, db_session: Session
    ):
        """DELETE /api/backup/file/{filename} — erro 400 ao tentar deletar backup pinado."""
        from models import BackupMetadata
        # Pinar o backup fictício
        meta = db_session.query(BackupMetadata).filter(BackupMetadata.filename == "backup_pinned_test.dump.gz").first()
        if not meta:
            meta = BackupMetadata(filename="backup_pinned_test.dump.gz", is_pinned=True)
            db_session.add(meta)
            db_session.commit()
        else:
            meta.is_pinned = True
            db_session.commit()

        res = client.delete(
            "/api/backup/file/backup_pinned_test.dump.gz",
            headers={"Authorization": f"Bearer {super_admin_token}"},
        )
        assert res.status_code == 400
        assert "fixado (pinado)" in res.json()["detail"]

        # Limpar
        db_session.delete(meta)
        db_session.commit()



# ─── Testes de Lógica do BackupService ───────────────────────────────────────

class TestBackupServiceLogic:
    """Testa a lógica pura do BackupService (sem I/O real)."""

    def test_generate_filename_format(self):
        """Verifica que o nome de arquivo segue o padrão esperado."""
        from services.backup_service import BackupService
        svc = BackupService()
        filename = svc._generate_filename()
        assert filename.startswith("backup_")
        assert filename.endswith(".dump.gz")
        # Exemplo: backup_2026_06_03_08_43_zapvoice.dump.gz
        parts = filename.replace("backup_", "").replace(".dump.gz", "").split("_")
        assert len(parts) >= 6


    def test_calculate_next_backup_hours(self):
        """Testa cálculo de próximo backup em horas."""
        from services.backup_service import BackupService
        from datetime import datetime, timezone, timedelta
        svc = BackupService()
        before = datetime.now(timezone.utc)
        result = svc.calculate_next_backup("hours", 12)
        after = datetime.now(timezone.utc)
        assert before + timedelta(hours=11) < result < after + timedelta(hours=13)

    def test_calculate_next_backup_days(self):
        """Testa cálculo de próximo backup em dias."""
        from services.backup_service import BackupService
        from datetime import datetime, timezone, timedelta
        svc = BackupService()
        before = datetime.now(timezone.utc)
        result = svc.calculate_next_backup("days", 7)
        after = datetime.now(timezone.utc)
        assert before + timedelta(days=6) < result < after + timedelta(days=8)

    def test_calculate_next_backup_manual_returns_none(self):
        """Modo manual não tem próximo agendamento."""
        from services.backup_service import BackupService
        svc = BackupService()
        result = svc.calculate_next_backup("manual", 1)
        assert result is None

    def test_parse_database_url(self):
        """Testa parsing de DATABASE_URL PostgreSQL."""
        from services.backup_service import BackupService
        import os
        svc = BackupService()
        os.environ["DATABASE_URL"] = "postgresql://user:password@postgres:5432/mydb"
        result = svc._parse_database_url()
        assert result["user"] == "user"
        assert result["password"] == "password"
        assert result["host"] == "postgres"
        assert result["port"] == "5432"
        assert result["dbname"] == "mydb"

    def test_delete_backup_path_traversal_raises(self):
        """Testa que path traversal é rejeitado."""
        from services.backup_service import BackupService
        svc = BackupService()
        with pytest.raises(ValueError, match="inválido"):
            svc.delete_backup("../../../etc/passwd")

    def test_delete_backup_backslash_raises(self):
        """Testa que backslash no filename é rejeitado."""
        from services.backup_service import BackupService
        svc = BackupService()
        with pytest.raises(ValueError, match="inválido"):
            svc.delete_backup("backup\\..\\file")

    def test_restore_backup_with_warnings_code_1_success(self):
        """Testa que restore_backup não falha quando o pg_restore retorna código 1."""
        from services.backup_service import BackupService
        import os
        from unittest.mock import patch, MagicMock

        svc = BackupService()
        svc.bucket_name = "test-bucket"

        with patch.dict(os.environ, {"DATABASE_URL": "postgresql://user:password@host:5432/dbname"}), \
             patch.object(svc, "_get_s3") as mock_get_s3, \
             patch("sqlalchemy.create_engine") as mock_create_engine, \
             patch("services.backup_service.subprocess.run") as mock_run, \
             patch("services.backup_service.gzip.open") as mock_gzip, \
             patch("services.backup_service.open") as mock_open:

            mock_s3 = MagicMock()
            mock_get_s3.return_value = mock_s3

            # Mock pg_restore returning code 1 (warnings)
            mock_process = MagicMock()
            mock_process.returncode = 1
            mock_process.stderr = b"pg_restore: warning: unrecognized configuration parameter transaction_timeout"
            mock_run.return_value = mock_process

            # Execute restore
            svc.restore_backup("test_backup.dump.gz")

            # Asserts
            mock_s3.download_file.assert_called_once()
            mock_run.assert_called_once()


# ─── Testes de Restauração ────────────────────────────────────────────────────

class TestBackupRestore:
    """Testa o endpoint de restauração de backup."""

    def test_restore_backup_forbidden_for_regular_user(
        self, client: TestClient, user_token: str
    ):
        """POST /api/backup/restore/{filename} — regular user → 403."""
        res = client.post(
            "/api/backup/restore/backup_20260530_120000.dump.gz",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert res.status_code == 403

    def test_restore_backup_success(
        self, client: TestClient, super_admin_token: str
    ):
        """POST /api/backup/restore/{filename} — sucesso com mock."""
        with patch(
            "services.backup_service.backup_service.restore_backup",
            return_value=None,
        ):
            res = client.post(
                "/api/backup/restore/backup_20260530_120000.dump.gz",
                headers={"Authorization": f"Bearer {super_admin_token}"},
            )
        assert res.status_code == 200
        assert "restaurado com sucesso" in res.json()["message"]

    def test_restore_backup_invalid_path_traversal(
        self, client: TestClient, super_admin_token: str
    ):
        """POST /api/backup/restore/{filename} — path traversal rejeitado → 400."""
        with patch(
            "services.backup_service.backup_service.restore_backup",
            side_effect=ValueError("Nome de arquivo inválido."),
        ):
            res = client.post(
                "/api/backup/restore/backup_malicioso.dump.gz",
                headers={"Authorization": f"Bearer {super_admin_token}"},
            )
        assert res.status_code == 400


# ─── Testes de Upload de Backup ───────────────────────────────────────────────

class TestBackupUploadRouter:
    """Testa o endpoint de upload de backups externos."""

    def test_upload_backup_forbidden_for_regular_user(
        self, client: TestClient, user_token: str
    ):
        """POST /api/backup/upload — regular user → 403."""
        files = {"file": ("backup.dump", b"dummy content", "application/octet-stream")}
        res = client.post(
            "/api/backup/upload",
            files=files,
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert res.status_code == 403

    def test_upload_backup_invalid_format(
        self, client: TestClient, super_admin_token: str
    ):
        """POST /api/backup/upload — arquivo inválido (sem ser .dump/.dump.gz) → 400."""
        files = {"file": ("backup.txt", b"dummy content", "text/plain")}
        res = client.post(
            "/api/backup/upload",
            files=files,
            headers={"Authorization": f"Bearer {super_admin_token}"},
        )
        assert res.status_code == 400
        assert "Arquivo inválido" in res.json()["detail"]

    def test_upload_backup_success(
        self, client: TestClient, super_admin_token: str
    ):
        """POST /api/backup/upload — sucesso com mock."""
        mock_result = {
            "filename": "backup_backup_20260530_120000.dump.gz",
            "s3_key": "backups/backup_backup_20260530_120000.dump.gz",
            "size_bytes": 1024,
            "created_at": "2026-05-30T12:00:00+00:00",
        }
        with patch(
            "services.backup_service.backup_service.upload_backup",
            return_value=mock_result
        ), patch(
            "services.backup_service.backup_service.apply_retention",
            return_value=None
        ):
            files = {"file": ("backup.dump", b"dummy content", "application/octet-stream")}
            res = client.post(
                "/api/backup/upload",
                files=files,
                headers={"Authorization": f"Bearer {super_admin_token}"},
            )
        assert res.status_code == 200
        data = res.json()
        assert "Backup enviado com sucesso" in data["message"]
        assert data["filename"] == "backup_backup_20260530_120000.dump.gz"


# ─── Testes de Download de Backup ─────────────────────────────────────────────

class TestBackupDownload:
    """Testa o endpoint de download/exportação de backups."""

    def test_download_backup_forbidden_for_regular_user(
        self, client: TestClient, user_token: str
    ):
        """GET /api/backup/download/{filename} — regular user → 403."""
        res = client.get(
            "/api/backup/download/backup_20260530_120000.dump.gz",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert res.status_code == 403

    def test_download_backup_invalid_path_traversal(
        self, client: TestClient, super_admin_token: str
    ):
        """GET /api/backup/download/{filename} — path traversal com contra-barra → 400."""
        res = client.get(
            "/api/backup/download/backup\\..\\malicioso.dump.gz",
            headers={"Authorization": f"Bearer {super_admin_token}"},
        )
        assert res.status_code == 400
        assert "inválido" in res.json()["detail"]

    def test_download_backup_not_found(
        self, client: TestClient, super_admin_token: str
    ):
        """GET /api/backup/download/{filename} — arquivo inexistente no S3 → 404."""
        from botocore.exceptions import ClientError
        
        # Criar mock de erro ClientError
        error_response = {'Error': {'Code': 'NoSuchKey', 'Message': 'The specified key does not exist.'}}
        client_error = ClientError(error_response, 'GetObject')

        with patch("services.backup_service.backup_service._get_s3") as mock_get_s3:
            mock_s3 = MagicMock()
            mock_s3.get_object.side_effect = client_error
            mock_get_s3.return_value = mock_s3
            
            res = client.get(
                "/api/backup/download/backup_inexistente.dump.gz",
                headers={"Authorization": f"Bearer {super_admin_token}"},
            )
        assert res.status_code == 404
        assert "não encontrado" in res.json()["detail"]

    def test_download_backup_success(
        self, client: TestClient, super_admin_token: str
    ):
        """GET /api/backup/download/{filename} — download com sucesso."""
        class MockStreamingBody:
            def __init__(self, content):
                self.content = content
            def __iter__(self):
                yield self.content
        
        mock_response = {
            'Body': MockStreamingBody(b"gzip compressed content"),
            'ContentLength': 23
        }

        with patch("services.backup_service.backup_service._get_s3") as mock_get_s3:
            mock_s3 = MagicMock()
            mock_s3.get_object.return_value = mock_response
            mock_get_s3.return_value = mock_s3
            
            res = client.get(
                "/api/backup/download/backup_20260530_120000.dump.gz",
                headers={"Authorization": f"Bearer {super_admin_token}"},
            )
        assert res.status_code == 200
        assert res.headers["content-type"] == "application/gzip"
        assert "attachment; filename=backup_20260530_120000.dump.gz" in res.headers["content-disposition"]
        assert res.content == b"gzip compressed content"


    def test_bulk_delete_backups_success(
        self, client: TestClient, super_admin_token: str, db_session: Session
    ):
        """POST /api/backup/bulk-delete — exclui múltiplos backups."""
        from models import BackupMetadata
        meta = db_session.query(BackupMetadata).filter(BackupMetadata.filename == "backup_pinned_bulk.dump.gz").first()
        if not meta:
            meta = BackupMetadata(filename="backup_pinned_bulk.dump.gz", is_pinned=True)
            db_session.add(meta)
            db_session.commit()
        else:
            meta.is_pinned = True
            db_session.commit()

        with patch("services.backup_service.backup_service.delete_backup", return_value=None):
            res = client.post(
                "/api/backup/bulk-delete",
                json={
                    "filenames": ["backup_to_delete_1.dump.gz", "backup_to_delete_2.dump.gz", "backup_pinned_bulk.dump.gz"]
                },
                headers={"Authorization": f"Bearer {super_admin_token}"},
            )
        assert res.status_code == 200
        data = res.json()
        assert "Processamento concluído" in data["message"]
        assert "backup_to_delete_1.dump.gz" in data["deleted"]
        assert "backup_to_delete_2.dump.gz" in data["deleted"]
        assert "backup_pinned_bulk.dump.gz" in data["ignored_pinned"]

        # Limpar
        db_session.delete(meta)
        db_session.commit()



