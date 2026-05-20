from services.webhooks import parse_webhook_payload

def test_eduzz_orbita_open_status_translation():
    payload = {
        "id": "sb3xb6p7rx84flct98wc92qa3",
        "data": {
            "id": "99789985",
            "status": "open",
            "buyer": {
                "id": "24776267",
                "name": "Fabio Mello Kling",
                "email": "fbio.kling@yahoo.com",
                "cellphone": "+5532991535250"
            },
            "items": [
                {
                    "name": "Desbloqueio Neural 24h",
                    "price": {"value": 49, "currency": "BRL"},
                    "productId": "2978551"
                }
            ],
            "price": {"value": 49, "currency": "BRL"},
            "paymentMethod": "pix"
        },
        "event": "myeduzz.invoice_opened"
    }

    result = parse_webhook_payload("eduzz", payload)
    
    assert result['name'] == "Fabio Mello Kling"
    assert result['email'] == "fbio.kling@yahoo.com"
    assert result['phone'] == "5532991535250"
    assert result['raw_status'] == "Aguardando o Pagamento"


def test_eduzz_orbita_waiting_refund_status_translation():
    payload = {
        "id": "a8hmu3qnj2fmmvez4vhwc5lfi",
        "data": {
            "id": "99667879",
            "status": "waiting_refund",
            "buyer": {
                "id": "24653379",
                "name": "Rosangela Aparecida Alves da Silva",
                "email": "roalves1301@gmail.com",
                "cellphone": "+5545999643727"
            },
            "items": [
                {
                    "name": "Desbloqueio Neural 24h",
                    "price": {"value": 49, "currency": "BRL"},
                    "productId": "2978551"
                }
            ],
            "price": {"value": 49, "currency": "BRL"},
            "paymentMethod": "pix"
        },
        "event": "myeduzz.invoice_waiting_refund"
    }

    result = parse_webhook_payload("eduzz", payload)
    
    assert result['name'] == "Rosangela Aparecida Alves da Silva"
    assert result['email'] == "roalves1301@gmail.com"
    assert result['phone'] == "5545999643727"
    assert result['raw_status'] == "Aguardando Reembolso"
