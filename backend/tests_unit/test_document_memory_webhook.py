import io
import pytest
from unittest.mock import patch, AsyncMock, MagicMock

from services.document_memory_service import (
    extract_text_from_pdf_bytes,
    resolve_document_details,
    download_or_fetch_pdf_bytes
)
from services.ai_memory import notify_agent_memory_webhook


@pytest.mark.asyncio
async def test_extract_text_from_pdf_bytes():
    """Valida que a biblioteca pypdf extrai texto dos objetos de página do PDF."""
    mock_page = MagicMock()
    mock_page.extract_text.return_value = "Olá Fulano\nLeitura da Bússola Astrológica\nSucesso no Trabalho"
    
    mock_reader = MagicMock()
    mock_reader.pages = [mock_page]

    with patch("pypdf.PdfReader", return_value=mock_reader):
        dummy_bytes = b"%PDF-1.4 dummy content"
        extracted = extract_text_from_pdf_bytes(dummy_bytes)
        assert "Olá Fulano" in extracted
        assert "Leitura da Bússola Astrológica" in extracted
        assert "Sucesso no Trabalho" in extracted


@pytest.mark.asyncio
async def test_resolve_document_details_from_processed_data():
    """Valida resolução de document_content, media_url e filename a partir do processed_data do trigger."""
    mock_trigger = MagicMock()
    mock_trigger.processed_data = {
        "mensagem": "Texto completo da leitura astrológica para teste.",
        "bussola_pdf_url": "https://api.teste.com/bussola.pdf",
        "bussola_pdf_filename": "✨ Leitura da Bússola - Fulano.pdf"
    }
    mock_trigger.template_components = None

    doc_info = await resolve_document_details(trigger=mock_trigger)
    assert doc_info["document_content"] == "Texto completo da leitura astrológica para teste."
    assert doc_info["media_url"] == "https://api.teste.com/bussola.pdf"
    assert doc_info["filename"] == "✨ Leitura da Bússola - Fulano.pdf"


@pytest.mark.asyncio
async def test_resolve_document_details_from_template_components_and_pdf():
    """Valida resolução a partir dos template_components quando não há texto pré-extraído."""
    mock_trigger = MagicMock()
    mock_trigger.processed_data = {}
    mock_trigger.template_components = [
        {
            "type": "header",
            "parameters": [
                {
                    "type": "document",
                    "document": {
                        "link": "https://api.teste.com/uploads/documento_exemplo.pdf",
                        "filename": "Contrato_Assinado.pdf"
                    }
                }
            ]
        }
    ]

    with patch("services.document_memory_service.download_or_fetch_pdf_bytes", return_value=b"pdf_bytes"), \
         patch("services.document_memory_service.extract_text_from_pdf_bytes", return_value="Conteúdo extraído diretamente do documento PDF anexado"):
        doc_info = await resolve_document_details(trigger=mock_trigger)
        assert doc_info["media_url"] == "https://api.teste.com/uploads/documento_exemplo.pdf"
        assert doc_info["filename"] == "Contrato_Assinado.pdf"
        assert "Conteúdo extraído diretamente do documento PDF anexado" in doc_info["document_content"]


@pytest.mark.asyncio
async def test_notify_agent_memory_webhook_opcao_1_payload():
    """Valida que o payload publicado no RabbitMQ segue rigorosamente a Opção 1 (campo dedicado)."""
    with patch("services.ai_memory.get_setting") as mock_get_setting, \
         patch("services.ai_memory.rabbitmq.publish", new_callable=AsyncMock) as mock_publish:
        
        mock_get_setting.side_effect = lambda key, default="", client_id=None: {
            "AGENT_MEMORY_WEBHOOK_URL": "https://webhook.n8n.teste/memoria",
            "CHATWOOT_ACCOUNT_ID": "14"
        }.get(key, default)

        await notify_agent_memory_webhook(
            client_id=14,
            phone="5585998259497",
            name="Fulano",
            template_name="leitura_concluida",
            content="Olá, Fulano! Sua leitura está em anexo.",
            dono="agente",
            media_url="https://api.aryaraj.shop/storage/leitura.pdf",
            filename="✦ Leitura da Bússola - Fulano.pdf",
            document_content="Olá, Fulano! Aqui está a sua leitura da Bússola Astrológica:\n✦ Mercúrio e Vênus..."
        )

        assert mock_publish.called
        queue_name, payload = mock_publish.call_args[0]
        assert queue_name == "agent_memory_webhook_queue"
        
        # Validação dos campos exigidos na Opção 1
        assert payload["template_name"] == "leitura_concluida"
        assert payload["template_content"] == "Olá, Fulano! Sua leitura está em anexo."
        assert payload["document_content"] == "Olá, Fulano! Aqui está a sua leitura da Bússola Astrológica:\n✦ Mercúrio e Vênus..."
        assert payload["media_url"] == "https://api.aryaraj.shop/storage/leitura.pdf"
        assert payload["filename"] == "✦ Leitura da Bússola - Fulano.pdf"
        assert payload["contact_name"] == "Fulano"
        assert payload["contact_phone"] == "5585998259497"
        assert payload["Dono"] == "agente"
