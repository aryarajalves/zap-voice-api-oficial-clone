import pytest
from unittest.mock import MagicMock, patch
from services.bussola_pdf_service import (
    generate_bussola_pdf_bytes,
    generate_bussola_cover_image_bytes,
    format_bussola_display_filename,
    format_lead_name_title,
    format_whatsapp_text_to_reportlab_html,
    sanitize_text_for_pdf
)
from services.webhooks_utils import extract_mapped_variables


def test_format_lead_name_title_and_display_filename():
    assert format_lead_name_title("ARYARAJ ALVES DA SILVA") == "Aryaraj Alves da Silva"
    disp1, stor1 = format_bussola_display_filename("ARYARAJ ALVES")
    assert disp1 == "✨ Leitura da Bússola - Aryaraj.pdf"
    assert stor1 == "Leitura_Bussola_Aryaraj.pdf"
    disp2, stor2 = format_bussola_display_filename("")
    assert disp2 == "✨ Leitura da Bússola - Consulente.pdf"
    assert stor2 == "Leitura_Bussola_Consulente.pdf"


def test_sanitize_text_for_pdf():
    # Deve preservar texto em português com acentos e pontuação
    text = "Olá, João da Silva! Área: Dinheiro & Prosperidade."
    sanitized = sanitize_text_for_pdf(text)
    assert "Olá, João da Silva!" in sanitized
    assert "Área: Dinheiro & Prosperidade." in sanitized

    # Deve remover ou ignorar emojis que não existem na fonte padrão Helvetica
    text_with_emoji = "Área: Amor 🔮✨ e Sucesso 🌟"
    sanitized_emoji = sanitize_text_for_pdf(text_with_emoji)
    assert "🔮" not in sanitized_emoji
    assert "✨" not in sanitized_emoji
    assert "🌟" not in sanitized_emoji
    assert "Área: Amor" in sanitized_emoji
    assert "e Sucesso" in sanitized_emoji


def test_format_whatsapp_text_to_reportlab_html():
    raw_text = "*MOMENTO ATUAL:* _Transformação_ & Crescimento.\n\nPróximo parágrafo."
    html_out = format_whatsapp_text_to_reportlab_html(raw_text)

    # Negrito do WhatsApp deve virar <b>
    assert "<b>MOMENTO ATUAL:</b>" in html_out
    # Itálico do WhatsApp deve virar <i>
    assert "<i>Transformação</i>" in html_out
    # E-comercial deve ser escapado
    assert "&amp;" in html_out
    # Quebra de linha deve virar <br/>
    assert "<br/>" in html_out


def test_generate_bussola_pdf_bytes_success():
    sample_text = (
        "Olá, Aryaraj! Aqui está a sua leitura da Bússola Astrológica:\n\n"
        "*ÁREA:* Dinheiro e Prosperidade 🔮\n"
        "*MOMENTO ATUAL:* Momento de grande transformação ✨\n\n"
        "Suas escolhas mostram que você está pronto para romper crenças limitantes.\n\n"
        "*CONSELHO DO ORÁCULO:* Confie no seu valor!"
    )

    pdf_bytes = generate_bussola_pdf_bytes(
        lead_name="ARYARAJ ALVES FERNANDES",
        birth_date="20/05/1995 às 14:30",
        message_text=sample_text
    )

    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 1500
    assert pdf_bytes.startswith(b"%PDF")
    assert b"%%EOF" in pdf_bytes[-1024:]


def test_generate_bussola_cover_image_bytes_success():
    png_bytes = generate_bussola_cover_image_bytes(
        lead_name="ARYARAJ ALVES FERNANDES",
        birth_date="20/05/1995 às 14:30",
        message_text="*ÁREA:* Dinheiro e Prosperidade\nMomento de expansão e clareza."
    )
    assert isinstance(png_bytes, bytes)
    assert png_bytes.startswith(b"\x89PNG\r\n\x1a\n")
    assert len(png_bytes) > 2000


def test_generate_bussola_pdf_with_empty_or_fallback_data():
    pdf_bytes = generate_bussola_pdf_bytes(
        lead_name="",
        birth_date="",
        message_text=""
    )

    assert isinstance(pdf_bytes, bytes)
    assert pdf_bytes.startswith(b"%PDF")


def test_extract_mapped_variables_with_bussola_pdf():
    payload = {"nome": "Aryaraj Fernandes"}
    parsed_data = {
        "name": "Aryaraj Fernandes",
        "first_name": "Aryaraj",
        "bussola_pdf_url": "https://storage.zapvoice.com/files/leitura_aryaraj.pdf",
        "bussola_pdf_filename": "✨ Leitura da Bússola - Aryaraj.pdf"
    }

    mapping_config = [
        {"type": "header", "key": "0", "value": "bussola_pdf_auto", "custom_value": "bussola_pdf_auto"},
        {"type": "body", "key": "1", "value": "name"}
    ]

    components = extract_mapped_variables(
        payload=payload,
        parsed_data=parsed_data,
        mapping_config=mapping_config,
        header_format="DOCUMENT"
    )

    header_comp = next((c for c in components if c.get("type") == "header"), None)
    assert header_comp is not None
    assert "parameters" in header_comp
    doc_param = header_comp["parameters"][0]
    assert doc_param.get("type") == "document"
    assert doc_param["document"]["link"] == "https://storage.zapvoice.com/files/leitura_aryaraj.pdf"
    assert doc_param["document"]["filename"] == "✨ Leitura da Bússola - Aryaraj.pdf"


def test_extract_mapped_variables_with_bussola_cover_image():
    payload = {"nome": "Aryaraj Fernandes", "mensagem": "Leitura completa"}
    parsed_data = {"name": "Aryaraj Fernandes"}
    mapping_config = [
        {"type": "header", "key": "0", "value": "bussola_cover_auto", "custom_value": "bussola_cover_auto"}
    ]

    with patch("services.bussola_pdf_service.generate_and_upload_bussola_cover_image") as mock_cover:
        mock_cover.return_value = "https://storage.zapvoice.com/files/capa_aryaraj.png"
        components = extract_mapped_variables(
            payload=payload,
            parsed_data=parsed_data,
            mapping_config=mapping_config,
            header_format="IMAGE"
        )
        mock_cover.assert_called_once()
        header_comp = next((c for c in components if c.get("type") == "header"), None)
        assert header_comp is not None
        img_param = header_comp["parameters"][0]
        assert img_param.get("type") == "image"
        assert img_param["image"]["link"] == "https://storage.zapvoice.com/files/capa_aryaraj.png"


def test_extract_mapped_variables_jit_pdf_generation():
    payload = {"mensagem": "Olá! Esta é sua leitura astrológica."}
    parsed_data = {"name": "ARYARAJ ALVES"}
    mapping_config = [
        {"type": "header", "key": "0", "value": "bussola_pdf_auto", "custom_value": "bussola_pdf_auto"}
    ]

    with patch("services.bussola_pdf_service.generate_and_upload_bussola_pdf") as mock_upload:
        mock_upload.return_value = ("https://storage.example.com/bussola_123.pdf", "✨ Leitura da Bússola - Aryaraj.pdf")
        components = extract_mapped_variables(payload, parsed_data, mapping_config, header_format="DOCUMENT")

        mock_upload.assert_called_once()
        header_comp = next((c for c in components if c.get("type") == "header"), None)
        assert header_comp is not None
        assert header_comp["parameters"][0]["document"]["link"] == "https://storage.example.com/bussola_123.pdf"
        assert header_comp["parameters"][0]["document"]["filename"] == "✨ Leitura da Bússola - Aryaraj.pdf"


def test_ensure_trigger_document_link_repairs_empty_link():
    from services.bussola_pdf_service import ensure_trigger_document_link

    fake_trigger = MagicMock()
    fake_trigger.id = 999
    fake_trigger.contact_name = "ARYARAJ ALVES"
    fake_trigger.template_components = [
        {"type": "header", "parameters": [{"type": "document", "document": {"link": "", "filename": "Leitura_Bussola_ARYARAJ.pdf"}}]}
    ]
    fake_trigger.processed_data = {"mensagem": "Conteúdo da leitura astrológica", "name": "ARYARAJ ALVES"}
    fake_trigger.integration_id = "test-uuid"

    fake_db = MagicMock()

    with patch("services.bussola_pdf_service.generate_and_upload_bussola_pdf") as mock_upload:
        mock_upload.return_value = ("https://storage.example.com/repaired.pdf", "✨ Leitura da Bússola - Aryaraj.pdf")
        repaired = ensure_trigger_document_link(fake_db, fake_trigger)

        mock_upload.assert_called_once()
        assert repaired[0]["parameters"][0]["document"]["link"] == "https://storage.example.com/repaired.pdf"
        assert repaired[0]["parameters"][0]["document"]["filename"] == "✨ Leitura da Bússola - Aryaraj.pdf"

