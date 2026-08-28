import pytest
from core.encryption import encrypt_token, decrypt_token, is_sensitive_key
from models import AppConfig, User, Client
from config_loader import get_settings, get_setting
from core.security import get_password_hash, create_access_token

def test_encryption_and_decryption_core():
    """
    Testa o ciclo de vida de criptografia e descriptografia do módulo core/encryption.py.
    """
    raw_token = "EAAGm0PX4ZCpsBAK...meta_access_token_secret_123"
    
    # 1. Criptografa
    cipher_token = encrypt_token(raw_token)
    assert cipher_token.startswith("enc:v1:")
    assert cipher_token != raw_token
    assert raw_token not in cipher_token

    # 2. Idempotência (não duplica criptografia)
    double_cipher = encrypt_token(cipher_token)
    assert double_cipher == cipher_token

    # 3. Descriptografa
    decrypted = decrypt_token(cipher_token)
    assert decrypted == raw_token

    # 4. Retrocompatibilidade com texto claro legado
    legacy_plain = "legacy_unencrypted_chatwoot_token_abc"
    assert decrypt_token(legacy_plain) == legacy_plain

    # 5. Tratamento de vazios e None
    assert encrypt_token(None) is None
    assert encrypt_token("") == ""
    assert decrypt_token(None) is None
    assert decrypt_token("") == ""


def test_is_sensitive_key_detection():
    """
    Testa a detecção correta de nomes de chaves que representam credenciais ou segredos.
    """
    assert is_sensitive_key("WA_ACCESS_TOKEN") is True
    assert is_sensitive_key("CHATWOOT_API_TOKEN") is True
    assert is_sensitive_key("MANYCHAT_API_KEY") is True
    assert is_sensitive_key("OPENAI_API_KEY") is True
    assert is_sensitive_key("INSTAGRAM_ACCESS_TOKEN") is True
    assert is_sensitive_key("SMTP_PASSWORD") is True

    # Chaves não-sensíveis
    assert is_sensitive_key("CLIENT_NAME") is False
    assert is_sensitive_key("APP_NAME") is False
    assert is_sensitive_key("WA_PHONE_NUMBER_ID") is False
    assert is_sensitive_key("CHATWOOT_ACCOUNT_ID") is False


def test_settings_field_encryption_flow(client, db_session):
    """
    Testa se o fluxo da API de configurações criptografa tokens ao salvar no banco,
    mas os entrega descriptografados para o config_loader e no endpoint /reveal.
    """
    # 1. Setup Client e Admin
    test_client = Client(name="Empresa Cripto Teste", is_active=True)
    db_session.add(test_client)
    db_session.commit()
    db_session.refresh(test_client)

    admin = User(
        email="admin_enc@zapvoice.com",
        hashed_password=get_password_hash("pass123"),
        role="admin",
        is_active=True,
        client_id=test_client.id
    )
    admin.accessible_clients.append(test_client)
    db_session.add(admin)
    db_session.commit()
    db_session.refresh(admin)

    token = create_access_token(data={"sub": admin.email})
    headers = {"Authorization": f"Bearer {token}", "X-Client-ID": str(test_client.id)}

    raw_wa_token = "EAAB1234567890abcdef_secret_meta_token_999"

    # 2. Salvar configuração via API
    payload = {
        "settings": {
            "WA_ACCESS_TOKEN": raw_wa_token,
            "APP_NAME": "Meu Zap Custom"
        }
    }
    update_res = client.post("/api/settings/", json=payload, headers=headers)
    assert update_res.status_code == 200

    # 3. Validar no banco que o token está gravado como CIFRADO (enc:v1:...)
    db_record = db_session.query(AppConfig).filter_by(client_id=test_client.id, key="WA_ACCESS_TOKEN").first()
    assert db_record is not None
    assert db_record.value.startswith("enc:v1:")
    assert raw_wa_token not in db_record.value

    # Validar que APP_NAME não foi criptografado
    db_name_record = db_session.query(AppConfig).filter_by(client_id=test_client.id, key="APP_NAME").first()
    assert db_name_record.value == "Meu Zap Custom"

    # 4. Validar que config_loader entrega o token descriptografado em memória
    loaded_settings = get_settings(client_id=test_client.id)
    assert loaded_settings.get("WA_ACCESS_TOKEN") == raw_wa_token

    # 5. Validar que /api/settings/reveal entrega o token descriptografado ao admin
    reveal_res = client.post("/api/settings/reveal", json={"key": "WA_ACCESS_TOKEN"}, headers=headers)
    assert reveal_res.status_code == 200
    assert reveal_res.json().get("value") == raw_wa_token
