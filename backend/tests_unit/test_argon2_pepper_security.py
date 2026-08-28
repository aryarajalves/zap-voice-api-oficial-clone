import os
import pytest
import hashlib
from passlib.context import CryptContext
from core.security import (
    get_password_hash,
    verify_password,
    needs_rehash,
    _apply_pepper,
    PASSWORD_PEPPER,
)


def test_argon2id_hash_generation():
    """Valida se o hash gerado é do tipo Argon2id."""
    password = "SenhaSuperSecreta!2026"
    hashed = get_password_hash(password)

    # Deve iniciar com $argon2id$
    assert hashed.startswith("$argon2id$")
    assert "m=65536" in hashed  # 64 MB memory-hard
    assert "t=3" in hashed      # 3 iterações
    assert "p=2" in hashed      # 2 threads


def test_argon2id_verification_success():
    """Valida se uma senha correta é validada com sucesso pelo Argon2id."""
    password = "MinhaSenhaValida123@"
    hashed = get_password_hash(password)

    assert verify_password(password, hashed) is True


def test_argon2id_verification_failure():
    """Valida se uma senha incorreta é rejeitada pelo Argon2id."""
    password = "MinhaSenhaValida123@"
    hashed = get_password_hash(password)

    assert verify_password("SenhaIncorreta", hashed) is False
    assert verify_password("", hashed) is False
    assert verify_password(password, "") is False


def test_legacy_bcrypt_compatibility():
    """Valida compatibilidade reversa com hashes antigos do Bcrypt."""
    # Gera um hash direto com Bcrypt
    bcrypt_ctx = CryptContext(schemes=["bcrypt"])
    raw_password = "SenhaAntigaBcrypt123"
    legacy_hash = bcrypt_ctx.hash(raw_password)

    assert legacy_hash.startswith("$2b$")
    # Deve validar com sucesso mesmo sendo bcrypt
    assert verify_password(raw_password, legacy_hash) is True
    # Senha errada deve falhar
    assert verify_password("senha_errada", legacy_hash) is False
    # Deve indicar que precisa de rehash/migração para Argon2id
    assert needs_rehash(legacy_hash) is True


def test_legacy_sha256_compatibility():
    """Valida compatibilidade reversa com hashes legados SHA256."""
    raw_password = "SenhaAntigaSha256"
    legacy_sha256 = hashlib.sha256(raw_password.encode()).hexdigest()

    assert verify_password(raw_password, legacy_sha256) is True
    assert verify_password("errada", legacy_sha256) is False
    assert needs_rehash(legacy_sha256) is True


def test_needs_rehash_behavior():
    """Valida a detecção de necessidade de upgrade de hash."""
    argon2_hash = get_password_hash("senha_moderna")
    assert needs_rehash(argon2_hash) is False
    assert needs_rehash(None) is True
    assert needs_rehash("") is True
    assert needs_rehash("hash_invalido") is True


def test_pepper_application():
    """Valida a aplicação de pimenta (Pepper) via HMAC-SHA256."""
    password = "teste_senha_com_pimenta"
    temperada = _apply_pepper(password)

    if PASSWORD_PEPPER:
        assert temperada != password
        assert len(temperada) == 64  # HMAC-SHA256 produz 64 chars hex
    else:
        assert temperada == password
