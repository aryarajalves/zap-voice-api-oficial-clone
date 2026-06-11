import pytest
import models

# Removido o cliente global direto para utilizar a fixture do conftest que tem a DB configurada

@pytest.fixture
def setup_client_with_insta_slug(db_session):
    # Encontra ou cria cliente
    cli = db_session.query(models.Client).filter_by(id=1).first()
    if not cli:
        cli = models.Client(id=1, name="Cliente Teste Instagram", is_active=True)
        db_session.add(cli)
        db_session.commit()
        db_session.refresh(cli)
        
    # Salva configurações de slug do webhook do Instagram para o teste
    slug_cfg = db_session.query(models.AppConfig).filter_by(client_id=1, key="INSTAGRAM_WEBHOOK_SLUG").first()
    if not slug_cfg:
        slug_cfg = models.AppConfig(client_id=1, key="INSTAGRAM_WEBHOOK_SLUG", value="insta_teste_slug")
        db_session.add(slug_cfg)
    else:
        slug_cfg.value = "insta_teste_slug"

    verify_cfg = db_session.query(models.AppConfig).filter_by(client_id=1, key="WHATSAPP_VERIFY_TOKEN").first()
    if not verify_cfg:
        verify_cfg = models.AppConfig(client_id=1, key="WHATSAPP_VERIFY_TOKEN", value="insta_teste_token")
        db_session.add(verify_cfg)
    else:
        verify_cfg.value = "insta_teste_token"

    db_session.commit()
    return cli

def test_instagram_webhook_verification_with_slug(client, setup_client_with_insta_slug, db_session):
    # Teste de verificação válida com o slug customizado do Instagram
    response = client.get(
        "/api/instagram/webhook/insta_teste_slug?hub.mode=subscribe&hub.challenge=challenge123&hub.verify_token=insta_teste_token"
    )
    assert response.status_code == 200
    assert response.text == "challenge123"

    # Teste de verificação inválida com o token errado
    response = client.get(
        "/api/instagram/webhook/insta_teste_slug?hub.mode=subscribe&hub.challenge=challenge123&hub.verify_token=token_errado"
    )
    assert response.status_code == 403

    # Teste de verificação inválida com slug inexistente
    response = client.get(
        "/api/instagram/webhook/slug_inexistente?hub.mode=subscribe&hub.challenge=challenge123&hub.verify_token=insta_teste_token"
    )
    assert response.status_code == 403
