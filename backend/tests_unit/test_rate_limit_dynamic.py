import pytest
import os
from contextvars import ContextVar
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

# Definimos as mesmas classes do nosso core de segurança para testar em isolamento
request_var_test = ContextVar("request_var_test")

class RequestContextMiddlewareTest:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] not in ("http", "websocket"):
            await self.app(scope, receive, send)
            return

        request = Request(scope, receive=receive)
        token = request_var_test.set(request)
        try:
            await self.app(scope, receive, send)
        finally:
            request_var_test.reset(token)

def test_dynamic_rate_limiting():
    # Setup de limites
    limit_read = "2/minute"
    limit_write = "1/minute"

    def get_test_rate_limit() -> str:
        try:
            request = request_var_test.get()
            if request.method == "GET":
                return limit_read
            return limit_write
        except Exception:
            return limit_read

    # Configuração do app e limiter para o teste
    app = FastAPI()
    limiter = Limiter(
        key_func=lambda request: "test-client-ip",
        default_limits=[get_test_rate_limit],
        enabled=True
    )
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    
    app.add_middleware(SlowAPIMiddleware)
    app.add_middleware(RequestContextMiddlewareTest)

    @app.get("/test-endpoint")
    def get_endpoint(request: Request):
        return {"status": "ok"}

    @app.post("/test-endpoint")
    def post_endpoint(request: Request):
        return {"status": "ok"}

    client = TestClient(app)

    # Testando os limites de leitura (GET) -> Limite é 2/minute
    # Primeira requisição: ok (200)
    response = client.get("/test-endpoint")
    assert response.status_code == 200

    # Segunda requisição: ok (200)
    response = client.get("/test-endpoint")
    assert response.status_code == 200

    # Terceira requisição: excedeu (429)
    response = client.get("/test-endpoint")
    assert response.status_code == 429

    # Reiniciar o estado do limitador para testar POST (limite de 1/minute)
    # Para simplificar o teste de POST sem esperar 1 minuto, usamos um IP diferente no key_func
    # Ou criamos um novo app / limiter específico para testar a escrita
    app_post = FastAPI()
    limiter_post = Limiter(
        key_func=lambda request: "test-client-ip-post",
        default_limits=[get_test_rate_limit],
        enabled=True
    )
    app_post.state.limiter = limiter_post
    app_post.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app_post.add_middleware(SlowAPIMiddleware)
    app_post.add_middleware(RequestContextMiddlewareTest)

    @app_post.post("/test-endpoint")
    def post_endpoint_2(request: Request):
        return {"status": "ok"}

    client_post = TestClient(app_post)

    # Testando os limites de escrita (POST) -> Limite é 1/minute
    # Primeira requisição: ok (200)
    response = client_post.post("/test-endpoint")
    assert response.status_code == 200

    # Segunda requisição: excedeu de imediato (429)
    response = client_post.post("/test-endpoint")
    assert response.status_code == 429
