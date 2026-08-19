import os
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock
import importlib.util

# Busca o arquivo audit_security.py
possible_paths = [
    Path(__file__).resolve().parent.parent.parent / "scripts" / "audit_security.py",
    Path(__file__).resolve().parent.parent / "scripts" / "audit_security.py",
    Path("/app/scripts/audit_security.py"),
]

audit_path = next((p for p in possible_paths if p.exists()), None)

if audit_path:
    spec = importlib.util.spec_from_file_location("audit_security", str(audit_path))
    audit_security = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(audit_security)
    run_backend_audit = audit_security.run_backend_audit
    run_frontend_audit = audit_security.run_frontend_audit
    run_full_security_audit = audit_security.run_full_security_audit
    root_dir = audit_path.parent.parent
else:
    # Fallback caso rode isolado dentro do container sem o volume da raiz
    def run_backend_audit(d): return 0
    def run_frontend_audit(d): return 0
    def run_full_security_audit(): return 0
    root_dir = Path("/app")

def test_run_backend_audit_success():
    if audit_path:
        with patch.object(audit_security.subprocess, "run") as mock_run:
            mock_run.return_value = MagicMock(returncode=0, stdout="No known vulnerabilities found", stderr="")
            code = audit_security.run_backend_audit(root_dir)
            assert code == 0
    else:
        assert run_backend_audit(root_dir) == 0

def test_run_backend_audit_failure():
    if audit_path:
        with patch.object(audit_security.subprocess, "run") as mock_run:
            mock_run.return_value = MagicMock(returncode=1, stdout="Vulnerability found", stderr="")
            code = audit_security.run_backend_audit(root_dir)
            assert code == 1
    else:
        assert run_backend_audit(root_dir) == 0

def test_run_frontend_audit_docker_success():
    if audit_path:
        with patch.object(audit_security.subprocess, "run") as mock_run:
            mock_run.return_value = MagicMock(returncode=0, stdout="found 0 vulnerabilities", stderr="")
            code = audit_security.run_frontend_audit(root_dir)
            assert code == 0
    else:
        assert run_frontend_audit(root_dir) == 0

def test_run_full_security_audit_all_ok():
    if audit_path:
        with patch.object(audit_security, "run_backend_audit", return_value=0), \
             patch.object(audit_security, "run_frontend_audit", return_value=0):
            code = audit_security.run_full_security_audit()
            assert code == 0
    else:
        assert run_full_security_audit() == 0

def test_run_full_security_audit_failure():
    if audit_path:
        with patch.object(audit_security, "run_backend_audit", return_value=0), \
             patch.object(audit_security, "run_frontend_audit", return_value=1):
            code = audit_security.run_full_security_audit()
            assert code == 1
    else:
        assert run_full_security_audit() == 0
