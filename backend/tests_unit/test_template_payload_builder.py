import pytest
from core.clients.whatsapp.client import WhatsAppClient

def test_build_template_components_cleans_quick_reply_buttons():
    client = WhatsAppClient(client_id=1)
    
    data = {
        "header_type": "NONE",
        "body_text": "Olá {{1}}, confirma presença?",
        "footer_text": "",
        "buttons": [
            {"type": "QUICK_REPLY", "text": "PRESENTE", "url": "", "phone_number": ""},
            {"type": "QUICK_REPLY", "text": "Sair", "url": None, "phone_number": None}
        ]
    }
    
    components = client._build_template_components(data)
    
    buttons_comp = next((c for c in components if c["type"] == "BUTTONS"), None)
    assert buttons_comp is not None
    assert len(buttons_comp["buttons"]) == 2
    
    btn1 = buttons_comp["buttons"][0]
    assert btn1 == {"type": "QUICK_REPLY", "text": "PRESENTE"}
    assert "url" not in btn1
    assert "phone_number" not in btn1

    btn2 = buttons_comp["buttons"][1]
    assert btn2 == {"type": "QUICK_REPLY", "text": "Sair"}
    assert "url" not in btn2

def test_build_template_components_url_and_phone():
    client = WhatsAppClient(client_id=1)
    
    data = {
        "header_type": "NONE",
        "body_text": "Acesse nosso site",
        "buttons": [
            {"type": "URL", "text": "Visitar Site", "url": "https://exemplo.com"},
            {"type": "PHONE_NUMBER", "text": "Ligar", "phone_number": "+5511999999999"}
        ]
    }
    
    components = client._build_template_components(data)
    buttons_comp = next((c for c in components if c["type"] == "BUTTONS"), None)
    assert len(buttons_comp["buttons"]) == 2
    assert buttons_comp["buttons"][0] == {"type": "URL", "text": "Visitar Site", "url": "https://exemplo.com"}
    assert buttons_comp["buttons"][1] == {"type": "PHONE_NUMBER", "text": "Ligar", "phone_number": "+5511999999999"}
