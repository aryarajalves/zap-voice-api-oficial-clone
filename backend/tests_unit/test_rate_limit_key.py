"""
Testes unitarios para a funcao get_rate_limit_key em core/security.py.
Valida que o rate limit e identificado por usuario (JWT) e nao por IP.
"""
import os
import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timedelta, timezone

os.environ["TESTING"] = "true"
os.environ["SECRET_KEY"] = "chave-de-teste-super-segura-com-32-caracteres-ok"

from jose import jwt as jose_jwt
from core.security import get_rate_limit_key, ALGORITHM

SECRET_KEY = os.environ["SECRET_KEY"]


def _make_jwt(email: str, secret: str = SECRET_KEY) -> str:
    """Gera um JWT valido com o email do usuario no campo 'sub'."""
    payload = {
        "sub": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=60),
    }
    return jose_jwt.encode(payload, secret, algorithm=ALGORITHM)


def _mock_request(auth_header: str = "", api_key: str = "", remote_addr: str = "192.168.1.1") -> MagicMock:
    """Cria um mock de Request com os headers e IP fornecidos."""
    request = MagicMock()
    request.headers.get = lambda key, default="": {
        "Authorization": auth_header,
        "X-API-Key": api_key,
    }.get(key, default)
    request.client = MagicMock()
    request.client.host = remote_addr
    return request


class TestGetRateLimitKey:
    def test_retorna_email_do_usuario_com_token_bearer_valido(self):
        """Com Bearer JWT valido, deve retornar 'user:<email>'."""
        token = _make_jwt("joao@example.com")
        request = _mock_request(auth_header=f"Bearer {token}")
        key = get_rate_limit_key(request)
        assert key == "user:joao@example.com"

    def test_retorna_email_diferente_para_usuarios_distintos(self):
        """Dois usuarios distintos devem ter chaves de rate limit distintas."""
        token_a = _make_jwt("alice@example.com")
        token_b = _make_jwt("bob@example.com")
        key_a = get_rate_limit_key(_mock_request(auth_header=f"Bearer {token_a}"))
        key_b = get_rate_limit_key(_mock_request(auth_header=f"Bearer {token_b}"))
        assert key_a != key_b
        assert key_a == "user:alice@example.com"
        assert key_b == "user:bob@example.com"

    def test_fallback_para_ip_sem_token(self):
        """Sem token, deve fazer fallback para o IP da requisicao."""
        request = _mock_request(auth_header="", api_key="", remote_addr="10.0.0.5")
        with patch("core.security.get_remote_address", return_value="10.0.0.5"):
            key = get_rate_limit_key(request)
        assert key == "10.0.0.5"

    def test_fallback_para_ip_com_token_invalido(self):
        """Com token JWT invalido (assinatura errada), deve fazer fallback para IP."""
        token_invalido = _make_jwt("hacker@example.com", secret="chave-errada-completamente-diferente-1234567")
        request = _mock_request(auth_header=f"Bearer {token_invalido}", remote_addr="10.0.0.9")
        with patch("core.security.get_remote_address", return_value="10.0.0.9"):
            key = get_rate_limit_key(request)
        assert key == "10.0.0.9"

    def test_fallback_para_ip_com_header_malformado(self):
        """Com header Authorization malformado (sem Bearer), usa fallback para IP."""
        request = _mock_request(auth_header="Token xyz", remote_addr="172.16.0.1")
        with patch("core.security.get_remote_address", return_value="172.16.0.1"):
            key = get_rate_limit_key(request)
        assert key == "172.16.0.1"

    def test_mesmo_usuario_mesma_chave_multiplas_chamadas(self):
        """O mesmo usuario deve sempre receber a mesma chave (idempotencia)."""
        token = _make_jwt("repeat@example.com")
        keys = [
            get_rate_limit_key(_mock_request(auth_header=f"Bearer {token}"))
            for _ in range(10)
        ]
        assert all(k == "user:repeat@example.com" for k in keys)

    def test_ip_compartilhado_nao_afeta_usuarios_distintos(self):
        """
        Cenario de producao: multiplos usuarios atras do mesmo proxy (mesmo IP).
        Cada usuario deve ter sua propria chave de rate limit.
        """
        PROXY_IP = "10.0.1.3"
        token_user1 = _make_jwt("usuario1@empresa.com")
        token_user2 = _make_jwt("usuario2@empresa.com")
        token_user3 = _make_jwt("usuario3@empresa.com")

        key1 = get_rate_limit_key(_mock_request(auth_header=f"Bearer {token_user1}", remote_addr=PROXY_IP))
        key2 = get_rate_limit_key(_mock_request(auth_header=f"Bearer {token_user2}", remote_addr=PROXY_IP))
        key3 = get_rate_limit_key(_mock_request(auth_header=f"Bearer {token_user3}", remote_addr=PROXY_IP))

        assert key1 == "user:usuario1@empresa.com"
        assert key2 == "user:usuario2@empresa.com"
        assert key3 == "user:usuario3@empresa.com"
        assert key1 != key2
        assert key2 != key3
