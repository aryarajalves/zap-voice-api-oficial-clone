import pytest
import os
import sys

# Ajusta PATH
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ["DATABASE_URL"] = "sqlite://"

from core.security import verify_password, get_password_hash, create_access_token
import hashlib

def test_password_hashing():
    password = "test_password_123"
    hashed = get_password_hash(password)
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("wrong_password", hashed) is False

def test_sha256_fallback():
    password = "test_password_123"
    sha256_hash = hashlib.sha256(password.encode()).hexdigest()
    # O verify_password deve aceitar hashes SHA256 legados
    assert verify_password(password, sha256_hash) is True

def test_create_access_token():
    data = {"sub": "user@example.com", "role": "admin"}
    token = create_access_token(data)
    assert isinstance(token, str)
    assert len(token) > 0
