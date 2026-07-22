import pytest
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import models
from routers.capture_page import (
    get_capture_page_config,
    save_capture_page_config,
    list_captured_leads,
    delete_captured_lead,
    bulk_delete_captured_leads,
    get_public_capture_page,
    submit_public_lead,
    CapturePageConfigPayload,
    PublicSubmitPayload,
    BulkDeleteLeadsPayload
)

@pytest.mark.asyncio
async def test_capture_page_full_flow():
    engine = create_engine("sqlite:///:memory:")
    models.Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        # 1. Criar cliente de teste
        client = models.Client(id=1, name="Cliente Teste Captura")
        mock_user = models.User(id=1, email="admin@teste.com", role="super_admin")
        db.add(client)
        db.commit()

        # 2. Obter configuração inicial (deve criar config padrão)
        config_initial = await get_capture_page_config(client_id=1, current_user=mock_user, db=db)
        assert config_initial.client_id == 1
        assert config_initial.headline == "INTENSIVO"

        # 3. Salvar nova configuração personalizada
        payload = CapturePageConfigPayload(
            slug="intensivo-miguel",
            headline="SUPER INTENSIVO",
            badge_text="Aulas VIP",
            badge_status="AO VIVO",
            event_date="Amanhã às 20h",
            main_title="GARANTA SUA VAGA!",
            main_description="Digite seu e-mail abaixo.",
            email_placeholder="Seu melhor e-mail",
            button_text="INSCREVER AGORA",
            footer_note="Sem spam.",
            thank_you_title="Você está inscrito!",
            thank_you_description="Entre no grupo abaixo.",
            whatsapp_group_url="https://chat.whatsapp.com/grupo-teste",
            whatsapp_button_text="ENTRAR NO GRUPO VIP",
            tag_name="Lead Intensivo"
        )

        saved_config = await save_capture_page_config(payload, client_id=1, current_user=mock_user, db=db)
        assert saved_config.slug == "intensivo-miguel"
        assert saved_config.headline == "SUPER INTENSIVO"
        assert saved_config.whatsapp_group_url == "https://chat.whatsapp.com/grupo-teste"

        # 4. Acessar endpoint público por slug
        public_page = await get_public_capture_page(slug="intensivo-miguel", db=db)
        assert public_page["headline"] == "SUPER INTENSIVO"
        assert public_page["whatsapp_button_text"] == "ENTRAR NO GRUPO VIP"

        # 5. Enviar e-mail de lead no formulário público
        submit_res = await submit_public_lead(
            slug="intensivo-miguel",
            payload=PublicSubmitPayload(email="leadteste@exemplo.com"),
            db=db
        )
        assert submit_res["success"] is True
        assert submit_res["redirect_url"] == "https://chat.whatsapp.com/grupo-teste"
        assert submit_res["thank_you_title"] == "Você está inscrito!"

        # 6. Verificar que o lead foi salvo na listagem do dashboard
        leads_res = await list_captured_leads(client_id=1, current_user=mock_user, db=db)
        assert leads_res["total_count"] == 1
        assert leads_res["leads"][0]["email"] == "leadteste@exemplo.com"

        # 7. Deletar lead específico
        lead_id = leads_res["leads"][0]["id"]
        delete_res = await delete_captured_lead(lead_id=lead_id, client_id=1, current_user=mock_user, db=db)
        assert delete_res["message"] == "Lead removido com sucesso."

        # 8. Confirmar que lista ficou vazia
        leads_empty = await list_captured_leads(client_id=1, current_user=mock_user, db=db)
        assert leads_empty["total_count"] == 0

    finally:
        db.close()
