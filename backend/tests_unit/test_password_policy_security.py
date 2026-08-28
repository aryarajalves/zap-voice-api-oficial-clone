import pytest
from pydantic import ValidationError
from routers.auth import UserCreate, ProfileUpdate, PasswordReset, UserUpdate
from routers.invitations import UserRegisterInvite

def test_user_create_password_policy():
    """
    Testa se a criação de usuário rejeita senhas com menos de 6 caracteres
    e aceita senhas válidas.
    """
    # Senha muito curta (inválida)
    with pytest.raises(ValidationError):
        UserCreate(email="teste@exemplo.com", password="123")

    with pytest.raises(ValidationError):
        UserCreate(email="teste@exemplo.com", password="")

    # Senha válida (mínimo 6 caracteres)
    user_ok = UserCreate(email="teste@exemplo.com", password="123456")
    assert user_ok.password == "123456"

    user_strong = UserCreate(email="teste@exemplo.com", password="StrongPassword#2026")
    assert user_strong.password == "StrongPassword#2026"


def test_password_reset_policy():
    """
    Testa se o reset de senha exige no mínimo 6 caracteres.
    """
    with pytest.raises(ValidationError):
        PasswordReset(email="teste@exemplo.com", new_password="abc")

    reset_ok = PasswordReset(email="teste@exemplo.com", new_password="nova_senha_segura")
    assert reset_ok.new_password == "nova_senha_segura"


def test_user_register_invite_password_policy():
    """
    Testa se o registro via convite exige no mínimo 6 caracteres.
    """
    with pytest.raises(ValidationError):
        UserRegisterInvite(full_name="Nome Teste", email="teste@exemplo.com", password="12")

    invite_ok = UserRegisterInvite(full_name="Nome Teste", email="teste@exemplo.com", password="senhaValida123")
    assert invite_ok.password == "senhaValida123"


def test_profile_update_and_user_update_password_policy():
    """
    Testa se as atualizações opcionais de perfil e usuário respeitam a política quando fornecidas.
    """
    # ProfileUpdate com senha curta
    with pytest.raises(ValidationError):
        ProfileUpdate(password="curta")

    # ProfileUpdate com senha válida ou None
    p_none = ProfileUpdate(full_name="Novo Nome")
    assert p_none.password is None

    p_ok = ProfileUpdate(password="senha_valida_123")
    assert p_ok.password == "senha_valida_123"

    # UserUpdate com senha curta
    with pytest.raises(ValidationError):
        UserUpdate(password="1234")

    # UserUpdate válido
    u_ok = UserUpdate(password="senha_valida_456")
    assert u_ok.password == "senha_valida_456"


def test_api_rejection_for_short_password(client, db_session):
    """
    Testa a rejeição via HTTP 422 na API para criação de usuário com senha fraca/curta.
    """
    from models import User
    from core.security import get_password_hash, create_access_token

    admin = User(
        email="superadmin_pwd@zapvoice.com",
        hashed_password=get_password_hash("pass123"),
        role="super_admin",
        is_active=True
    )
    db_session.add(admin)
    db_session.commit()
    db_session.refresh(admin)

    token = create_access_token(data={"sub": admin.email})
    headers = {"Authorization": f"Bearer {token}"}

    # Tentativa de criar usuário com senha de 3 caracteres
    payload = {
        "email": "short_pass_user@zapvoice.com",
        "password": "123"
    }

    response = client.post("/api/auth/register", json=payload, headers=headers)
    assert response.status_code == 422
    assert "at least 6 characters" in response.text.lower() or "string_too_short" in response.text.lower()
