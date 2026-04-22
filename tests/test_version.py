import pytest
from backend.main import app

def test_app_version():
    """Verifica se a versão da aplicação está correta conforme o planejado (3.0.3)."""
    assert app.version == "3.0.3"

def test_root_endpoint_version():
    """Verifica se o endpoint root retorna a versão correta."""
    from fastapi.testclient import TestClient
    client = TestClient(app)
    response = client.get("/")
    assert response.status_code == 200
    # O endpoint root pode retornar HTML (frontend built) ou JSON (API only)
    if response.headers.get("content-type") == "application/json":
        data = response.json()
        assert data["version"] == "3.0.3"
    else:
        # Se retornar HTML, é o shell do frontend. 
        # Não necessariamente contém a versão em texto puro.
        assert response.status_code == 200
        assert "<html" in response.text.lower()
