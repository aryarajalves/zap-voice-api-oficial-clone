import pytest
from main import _sanitize_validation_errors

def test_sanitize_validation_errors_masks_passwords():
    """
    Testa se a função de sanitização mascara corretamente campos de senha e tokens sensíveis.
    """
    raw_errors = [
        {
            "type": "string_too_short",
            "loc": ("body", "password"),
            "msg": "String should have at least 6 characters",
            "input": "super_secret_password_123",
            "ctx": {"min_length": 6}
        },
        {
            "type": "string_type",
            "loc": ("body", "email"),
            "msg": "Input should be a valid string",
            "input": "usuario@teste.com"
        },
        {
            "type": "missing",
            "loc": ("body", "current_password"),
            "msg": "Field required",
            "input": "old_pass_456"
        },
        {
            "type": "value_error",
            "loc": ("body", "api_key"),
            "msg": "Invalid api key",
            "input": "zv_live_secret_key_999"
        }
    ]

    sanitized = _sanitize_validation_errors(raw_errors)

    # Verifica que password foi mascarado
    assert sanitized[0]["input"] == "******"
    
    # Verifica que email não-sensível foi mantido para diagnóstico
    assert sanitized[1]["input"] == "usuario@teste.com"

    # Verifica que current_password foi mascarado
    assert sanitized[2]["input"] == "******"

    # Verifica que api_key foi mascarada
    assert sanitized[3]["input"] == "******"


def test_validation_error_endpoint_does_not_expose_passwords(client, db_session):
    """
    Testa se requisições com erros de validação em endpoints de autenticação
    retornam respostas 422 com senhas protegidas e sem expor senhas no payload do erro.
    """
    from models import User
    from core.security import get_password_hash, create_access_token

    # 1. Setup Super Admin
    admin_user = User(
        email="superadmin_val@zapvoice.com",
        hashed_password=get_password_hash("pass123"),
        role="super_admin",
        is_active=True
    )
    db_session.add(admin_user)
    db_session.commit()
    db_session.refresh(admin_user)

    token = create_access_token(data={"sub": admin_user.email})
    headers = {"Authorization": f"Bearer {token}"}

    # Envia payload com tipo inválido para forçar erro de validação no campo password
    invalid_payload = {
        "email": "teste@exemplo.com",
        "password": ["lista_invalida_com_senha_secreta"]
    }

    response = client.post("/api/auth/register", json=invalid_payload, headers=headers)
    assert response.status_code == 422
    
    response_text = response.text
    # Garante que o texto da senha secreta não está presente na resposta
    assert "lista_invalida_com_senha_secreta" not in response_text

