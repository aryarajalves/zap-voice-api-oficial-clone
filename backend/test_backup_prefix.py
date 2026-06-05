import os
import pytest
from unittest import mock
from services.backup_service import BackupService

def test_backup_prefix_default():
    """Valida se o prefixo assume o padrão com o COMPANY_NAME do env."""
    with mock.patch.dict(os.environ, {"COMPANY_NAME": "testcompany", "S3_BACKUP_PREFIX": ""}):
        service = BackupService()
        assert service.prefix == "backups_testcompany/"

def test_backup_prefix_env_override():
    """Valida se o prefixo customizado no env sobrescreve o padrão."""
    with mock.patch.dict(os.environ, {"COMPANY_NAME": "testcompany", "S3_BACKUP_PREFIX": "custom_path/"}):
        service = BackupService()
        assert service.prefix == "custom_path/"

def test_backup_prefix_sanitization():
    """Valida se caracteres especiais e acentos do COMPANY_NAME são devidamente sanitizados."""
    with mock.patch.dict(os.environ, {"COMPANY_NAME": "Tést Còmpany!", "S3_BACKUP_PREFIX": ""}):
        service = BackupService()
        assert service.prefix == "backups_test_company/"
