import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from models import BackupMetadata, User
from core.security import get_password_hash


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
def super_admin_token(client: TestClient, super_admin_user: User) -> str:
    """Obtém o token JWT do super_admin."""
    res = client.post("/api/auth/token", data={
        "username": "backup_test_admin@test.com",
        "password": "test1234",
    })
    assert res.status_code == 200
    return res.json()["access_token"]


class TestBackupMetadataRouter:
    """Testes para o gerenciamento de pinagem e etiquetas de backups."""

    def test_update_metadata_success(
        self, client: TestClient, super_admin_token: str, db_session: Session
    ):
        """PUT /api/backup/metadata/{filename} — atualiza com sucesso."""
        filename = "backup_test_success.dump.gz"
        
        # Envia requisição para pinar e etiquetar
        res = client.put(
            f"/api/backup/metadata/{filename}",
            json={"is_pinned": True, "tag": "Backup Funcional"},
            headers={"Authorization": f"Bearer {super_admin_token}"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["filename"] == filename
        assert data["is_pinned"] is True
        assert data["tag"] == "Backup Funcional"

        # Verifica persistência no banco
        db_meta = db_session.query(BackupMetadata).filter(BackupMetadata.filename == filename).first()
        assert db_meta is not None
        assert db_meta.is_pinned is True
        assert db_meta.tag == "Backup Funcional"

    def test_update_metadata_pinned_limit(
        self, client: TestClient, super_admin_token: str, db_session: Session
    ):
        """PUT /api/backup/metadata/{filename} — impede de pinar mais de 3 backups."""
        # Cria 3 backups pinados no banco
        for i in range(3):
            meta = BackupMetadata(filename=f"backup_limit_{i}.dump.gz", is_pinned=True, tag=f"Tag {i}")
            db_session.add(meta)
        db_session.commit()

        # Tenta pinar o 4º backup
        res = client.put(
            "/api/backup/metadata/backup_limit_4.dump.gz",
            json={"is_pinned": True, "tag": "Tag 4"},
            headers={"Authorization": f"Bearer {super_admin_token}"},
        )
        assert res.status_code == 400
        assert "Limite máximo de 3" in res.json()["detail"]

    def test_list_backups_with_metadata(
        self, client: TestClient, super_admin_token: str, db_session: Session
    ):
        """GET /api/backup/list — retorna os backups ordenados, integrando as etiquetas e pinos."""
        # Configura alguns metadados no banco
        meta1 = BackupMetadata(filename="backup_a.dump.gz", is_pinned=True, tag="Producao")
        meta2 = BackupMetadata(filename="backup_b.dump.gz", is_pinned=False, tag="Teste")
        db_session.add_all([meta1, meta2])
        db_session.commit()

        # Mocka o list_backups do S3
        mock_s3_files = [
            {"filename": "backup_b.dump.gz", "s3_key": "backups/backup_b.dump.gz", "size_bytes": 100, "created_at": "2026-05-30T10:00:00+00:00"},
            {"filename": "backup_a.dump.gz", "s3_key": "backups/backup_a.dump.gz", "size_bytes": 200, "created_at": "2026-05-30T09:00:00+00:00"},
            {"filename": "backup_c.dump.gz", "s3_key": "backups/backup_c.dump.gz", "size_bytes": 300, "created_at": "2026-05-30T11:00:00+00:00"},
        ]

        with patch(
            "services.backup_service.backup_service.list_backups",
            return_value=mock_s3_files
        ):
            res = client.get(
                "/api/backup/list",
                headers={"Authorization": f"Bearer {super_admin_token}"},
            )
        
        assert res.status_code == 200
        data = res.json()
        assert len(data["backups"]) == 3

        # O primeiro da lista deve ser o pinado ("backup_a.dump.gz"), mesmo criado mais cedo
        assert data["backups"][0]["filename"] == "backup_a.dump.gz"
        assert data["backups"][0]["is_pinned"] is True
        assert data["backups"][0]["tag"] == "Producao"

        # Os outros devem seguir por ordem de created_at desc
        assert data["backups"][1]["filename"] == "backup_c.dump.gz"
        assert data["backups"][1]["is_pinned"] is False
        assert data["backups"][1]["tag"] is None

        assert data["backups"][2]["filename"] == "backup_b.dump.gz"
        assert data["backups"][2]["is_pinned"] is False
        assert data["backups"][2]["tag"] == "Teste"
