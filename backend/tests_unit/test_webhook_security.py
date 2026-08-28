import hmac
import hashlib
import time
import pytest
from core.webhook_security import (
    verify_hmac_sha256,
    verify_meta_signature,
    verify_hotmart_hottok,
    verify_kiwify_signature,
    verify_stripe_signature,
)


def test_verify_hmac_sha256_valid():
    secret = 'my_super_secret_key'
    payload = b'{"event": "purchase", "price": 99.9}'
    expected_sig = hmac.new(secret.encode('utf-8'), payload, hashlib.sha256).hexdigest()

    # Com prefixo sha256=
    assert verify_hmac_sha256(payload, secret, f'sha256={expected_sig}') is True
    # Sem prefixo
    assert verify_hmac_sha256(payload, secret, expected_sig) is True
    # Assinatura invalida
    assert verify_hmac_sha256(payload, secret, 'fake_signature_here') is False
    # Assinatura ausente
    assert verify_hmac_sha256(payload, secret, '') is False
    # Secret nao configurado (retrocompatibilidade)
    assert verify_hmac_sha256(payload, '', 'fake_sig') is True


def test_verify_meta_signature():
    app_secret = 'fb_app_secret_123456'
    body = b'{"whid": "123456", "events": []}'
    signature = hmac.new(app_secret.encode('utf-8'), body, hashlib.sha256).hexdigest()

    # Cabecalho X-Hub-Signature-256 correto
    assert verify_meta_signature(body, app_secret, f'sha256={signature}') is True
    # Cabecalho invalido
    assert verify_meta_signature(body, app_secret, 'sha256=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa') is False
    # Cabecalho ausente com secret ativo
    assert verify_meta_signature(body, app_secret, None) is False
    # Secret vazio (nao configurado) => liberado
    assert verify_meta_signature(body, '', None) is True


def test_verify_hotmart_hottok():
    hottok_configurado = 'SECRET_HOTTOK_999887'

    # 1. Token no payload
    assert verify_hotmart_hottok({'hottok': 'SECRET_HOTTOK_999887', 'product': 'Curso'}, {}, hottok_configurado) is True
    # 2. Token nos headers
    assert verify_hotmart_hottok({}, {'x-hotmart-hottok': 'SECRET_HOTTOK_999887'}, hottok_configurado) is True
    # 3. Token invalido
    assert verify_hotmart_hottok({}, {'x-hotmart-hottok': 'TOKEN_WRONG'}, hottok_configurado) is False
    # 4. Token ausente
    assert verify_hotmart_hottok({}, {}, hottok_configurado) is False
    # 5. Hottok nao exigido (hottok configurado vazio)
    assert verify_hotmart_hottok({}, {}, '') is True


def test_verify_kiwify_signature():
    secret_token = 'kiwifysecret_123456'

    # Token direto aprovado
    assert verify_kiwify_signature(b'{}', 'kiwifysecret_123456', secret_token) is True
    # Token direto invalido
    assert verify_kiwify_signature(b'{}', 'wrong_sig', secret_token) is False
    # Secret nao configurado
    assert verify_kiwify_signature(b'{}', None, '') is True


def test_verify_stripe_signature():
    secret = 'whsec_123456789abcdef'
    payload = b'{"id": "evt_123", "type": "charge.succeeded"}'
    ts = int(time.time())

    signed_payload = f'{ts}.'.encode('utf-8') + payload
    sig = hmac.new(secret.encode('utf-8'), signed_payload, hashlib.sha256).hexdigest()
    stripe_header = f't={ts},v1={sig}'

    # Assinatura Stripe Valida
    assert verify_stripe_signature(payload, stripe_header, secret) is True
    # Assinatura com timestamp expirado (acima de 300s)
    expired_ts = ts - 600
    expired_signed_payload = f'{expired_ts}.'.encode('utf-8') + payload
    expired_sig = hmac.new(secret.encode('utf-8'), expired_signed_payload, hashlib.sha256).hexdigest()
    expired_header = f't={expired_ts},v1={expired_sig}'
    assert verify_stripe_signature(payload, expired_header, secret) is False

