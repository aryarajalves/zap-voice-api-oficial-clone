import pytest
from routers.webhooks_public import parse_webhook_payload

def test_pagtrust_webhook_approved_parsing():
    payload = {
      "aff": "",
      "doc": "01239862229",
      "off": "225992",
      "sck": "facebookhQwK21wXxR[06] [VENDA] [CBO] [1-3-1] [VALOR] [LP-PAGTRUST] [CDLC] [ADS PISCINA CAMPEÃO] — Cópia",
      "src": "v3_7a3d87f9-57aa-49b2-8574-c62ac6e1bd74_698105a20d7dab617570d4b5_485_t-10_s-1",
      "name": "Erick Phelipe",
      "prod": "610828",
      "xcod": "facebookhQwK21wXxR[06] [VENDA] [CBO] [1-3-1] [VALOR] [LP-PAGTRUST] [CDLC] [ADS PISCINA CAMPEÃO] — Cópia",
      "email": "erick_phelipe@hotmail.com",
      "price": "375.69",
      "funnel": "true",
      "hotkey": "",
      "hottok": "20972",
      "status": "approved",
      "cms_aff": "0.00",
      "aff_name": "",
      "currency": "BRL",
      "utm_term": "[ABERTO ADV+] [BR] [ADS CAMPEÃO] — Cópia",
      "last_name": "Erick Phelipe",
      "prod_name": "COMO DEIXAR ELA LOUCA NA CAMA - D.U",
      "cms_vendor": "375.69",
      "first_name": "Erick Phelipe",
      "full_price": "397.00",
      "order_bump": "false",
      "utm_medium": "cpc",
      "utm_source": "facebook",
      "transaction": "7126945",
      "utm_content": "[ADS-CAMPEÃO PISCINA]::IwZXh0bg==::",
      "address_comp": "",
      "payment_type": "PIX",
      "phone_number": "999279430",
      "utm_campaign": "[06] [VENDA] [CBO] [1-3-1] [VALOR] [LP-PAGTRUST] [CDLC] [ADS PISCINA CAMPEÃO] — Cópia",
      "callback_type": "1",
      "producer_name": "Sexologia Sem Tabu",
      "purchase_date": "2026-05-28T17:28:31 -03:00Z",
      "receiver_type": "SELLER",
      "warranty_date": "2026-06-04T17:29:20 +00:00Z",
      "payment_engine": "pagtrust",
      "address_country": "Brasil",
      "cms_marketplace": "21.31",
      "subscriber_code": "",
      "transaction_ext": "7126945",
      "phone_local_code": "64",
      "signature_status": "",
      "currency_codefrom": "BRL",
      "has_co_production": "false",
      "producer_document": "53839969000117",
      "recurrency_period": "",
      "currency_code_from": "BRL",
      "address_country_ISO": "BR",
      "installments_number": "1",
      "subscription_status": "",
      "original_offer_price": "397.00",
      "phone_checkout_number": "999279430",
      "producer_legal_nature": "Pessoa Jurídica",
      "name_subscription_plan": "COMO DEIXAR ELA LOUCA NA CAMA - D.U/2",
      "productOfferPaymentMode": "pagamento_vista",
      "phone_checkout_local_code": "64",
      "confirmation_purchase_date": "2026-05-28T17:29:20 +00:00Z",
      "subscription_anticipation_purchase": "false"
    }

    result = parse_webhook_payload("pagtrust", payload)

    assert result["name"] == "Erick Phelipe"
    assert result["first_name"] == "Erick"
    assert result["email"] == "erick_phelipe@hotmail.com"
    # Normalização de Telefone: 64 + 999279430 -> prefixado 55 -> 5564999279430
    assert result["phone"] == "5564999279430"
    assert result["platform"] == "pagtrust"
    assert result["event_type"] == "compra_aprovada"
    assert result["product_name"] == "COMO DEIXAR ELA LOUCA NA CAMA - D.U"
    assert result["payment_method"] == "Pix"
    assert result["price"] == "375.69"
    assert result["utm_source"] == "facebook"
    assert result["utm_medium"] == "cpc"
    assert result["utm_campaign"] == "[06] [VENDA] [CBO] [1-3-1] [VALOR] [LP-PAGTRUST] [CDLC] [ADS PISCINA CAMPEÃO] — Cópia"
    assert result["raw_status"] == "Compra Aprovada"
    assert result["order_bump"] is False

def test_pagtrust_pending_pix_parsing():
    payload = {
        "status": "pending",
        "payment_type": "PIX",
        "phone_local_code": "11",
        "phone_number": "988887777",
        "prod_name": "Produto Teste",
        "price": "100.00"
    }

    result = parse_webhook_payload("pagtrust", payload)

    assert result["event_type"] == "pix_gerado"
    assert result["raw_status"] == "Pix Gerado"
    assert result["payment_method"] == "Pix"
    assert result["phone"] == "5511988887777"

def test_pagtrust_pending_billet_parsing():
    payload = {
        "status": "pending",
        "payment_type": "BILLET",
        "phone_local_code": "11",
        "phone_number": "988887777",
        "prod_name": "Produto Teste",
        "price": "100.00"
    }

    result = parse_webhook_payload("pagtrust", payload)

    assert result["event_type"] == "boleto_impresso"
    assert result["raw_status"] == "Boleto Impresso"
    assert result["payment_method"] == "Boleto"

def test_pagtrust_abandoned_cart_new_format():
    payload = {
      "sck": "instagramhQwK21wXxRbio-linkhQwK21wXxRorganicohQwK21wXxRbio-juliahQwK21wXxRmuito-alem-da-chupada",
      "src": "v3_62822f8c-ce86-4d62-bb05-0bf79660b4aa_66db74b758b6bb000b57a015_20",
      "xcod": "instagramhQwK21wXxRbio-linkhQwK21wXxRorganicohQwK21wXxRbio-juliahQwK21wXxRmuito-alem-da-chupada",
      "hottok": "F9E7F77C-21F0-45B5-B7EC-20496F85CB9F",
      "status": "abandoned_cart",
      "buyerVO": {
        "name": "João Marcelo Côrtes Alda",
        "email": "joaoalda23@gmail.com",
        "phone": "5521981129505"
      },
      "utm_term": "muito-alem-da-chupada",
      "productId": 615963,
      "webhookId": 2864,
      "utm_medium": "organico",
      "utm_source": "instagram",
      "buyerVOName": "João Marcelo Côrtes Alda",
      "productName": "MUITO ALÉM DA CHUPADA - SST",
      "utm_content": "bio-julia",
      "buyerVOEmail": "joaoalda23@gmail.com",
      "hasNegotiate": 0,
      "productUCode": "MUITO ALÉM DA CHUPADA - SST",
      "utm_campaign": "bio-link",
      "customerEmail": "joaoalda23@gmail.com",
      "productCategory": 0,
      "customerFullName": "João Marcelo Côrtes Alda",
      "customerFullPhoneNumber": "5521981129505"
    }

    result = parse_webhook_payload("pagtrust", payload)

    assert result["event_type"] == "carrinho_abandonado"
    assert result["raw_status"] == "Carrinho Abandonado"
    assert result["name"] == "João Marcelo Côrtes Alda"
    assert result["email"] == "joaoalda23@gmail.com"
    assert result["phone"] == "5521981129505"
    assert result["product_name"] == "MUITO ALÉM DA CHUPADA - SST"

def test_pagtrust_canceled_credit_card():
    payload = {
      "aff": "",
      "doc": "04536115676",
      "off": "225992",
      "sck": "facebookhQwK21wXxR[06] [VENDA] [CBO] [1-3-1] [VALOR] [LP-PAGTRUST] [CDLC] [ADS PISCINA CAMPEÃO] — CópiahQwK21wXxRcpchQwK21wXxR[ADS-CAMPEÃO PISCINA]hQwK21wXxR[ABERTO ADV+] [BR] [ADS CAMPEÃO] — Cópia",
      "src": "v3_0fca73b1-99fe-4229-8976-f66a15d79731_698105a20d7dab617570d4b5_485_t-13_s-1",
      "name": "Dalton Passos Junior ",
      "prod": "610828",
      "xcod": "facebookhQwK21wXxR[06] [VENDA] [CBO] [1-3-1] [VALOR] [LP-PAGTRUST] [CDLC] [ADS PISCINA CAMPEÃO] — CópiahQwK21wXxRcpchQwK21wXxR[ADS-CAMPEÃO PISCINA]hQwK21wXxR[ABERTO ADV+] [BR] [ADS CAMPEÃO] — Cópia",
      "email": "jrpassospersonal@gmail.com",
      "price": "375.69",
      "funnel": "true",
      "hotkey": "",
      "hottok": "20972",
      "status": "canceled",
      "cms_aff": "0.00",
      "aff_name": "",
      "currency": "BRL",
      "utm_term": "[ABERTO ADV+] [BR] [ADS CAMPEÃO] — Cópia",
      "last_name": "Dalton Passos Junior ",
      "prod_name": "COMO DEIXAR ELA LOUCA NA CAMA - D.U",
      "cms_vendor": "0.00",
      "first_name": "Dalton Passos Junior ",
      "full_price": "454.37",
      "order_bump": "false",
      "utm_medium": "cpc",
      "utm_source": "facebook",
      "transaction": "7127674",
      "utm_content": "[ADS-CAMPEÃO PISCINA]::PAZXh0bgNhZW0BMABhZGlkAas65hFsTxFzcnRjBmFwcF9pZA81NjcwNjczNDMzNTI0MjcAAachgUghoblWoex-Oo0Q_66Mz0gza6rM9uh7wIILG42vot0YqDG9IjZ1zuoo-A_aem_9lt1-QqHcVGgNW-Yi3mEhw::",
      "address_comp": "",
      "payment_type": "CREDIT_CARD",
      "phone_number": "991159556",
      "utm_campaign": "[06] [VENDA] [CBO] [1-3-1] [VALOR] [LP-PAGTRUST] [CDLC] [ADS PISCINA CAMPEÃO] — Cópia",
      "callback_type": "1",
      "producer_name": "Sexologia Sem Tabu",
      "purchase_date": "2026-05-28T23:43:51 -03:00Z",
      "receiver_type": "SELLER",
      "warranty_date": "",
      "payment_engine": "pagtrust",
      "address_country": "Brasil",
      "cms_marketplace": "0.00",
      "subscriber_code": "",
      "transaction_ext": "7127674",
      "phone_local_code": "82",
      "signature_status": "",
      "currency_codefrom": "BRL",
      "has_co_production": "false",
      "producer_document": "53839969000117",
      "recurrency_period": "",
      "currency_code_from": "BRL",
      "address_country_ISO": "BR",
      "installments_number": "6",
      "subscription_status": "",
      "original_offer_price": "397.00",
      "phone_checkout_number": "991159556",
      "producer_legal_nature": "Pessoa Jurídica",
      "name_subscription_plan": "COMO DEIXAR ELA LOUCA NA CAMA - D.U/2",
      "productOfferPaymentMode": "multiplos_pagamentos",
      "phone_checkout_local_code": "82",
      "confirmation_purchase_date": "",
      "subscription_anticipation_purchase": "false"
    }

    result = parse_webhook_payload("pagtrust", payload)

    assert result["event_type"] == "cartao_recusado"
    assert result["raw_status"] == "Cartão Recusado"
    assert result["name"] == "Dalton Passos Junior "
    assert result["email"] == "jrpassospersonal@gmail.com"
    # Local code 82 + number 991159556 -> 5582991159556 (with 9-digit fix)
    assert result["phone"] == "5582991159556"
    assert result["price"] == "375.69"
    assert result["product_name"] == "COMO DEIXAR ELA LOUCA NA CAMA - D.U"
    assert result["payment_method"] == "Cartão de Crédito"

def test_pagtrust_refund_parsing():
    payload = {
      "aff": "",
      "doc": "44344790839",
      "off": "223182",
      "sck": "instagramhQwK21wXxRbio-linkhQwK21wXxRorganicohQwK21wXxRbio-juliahQwK21wXxRcomo-deixar-ela-louca",
      "src": "v3_c0ea2c84-fedb-4e51-ae8a-cfb359cf2dbc_698105a20d7dab617570d4b5_485_t-14_s-1",
      "name": "Miguel Moura",
      "prod": "615962",
      "xcod": "instagramhQwK21wXxRbio-linkhQwK21wXxRorganicohQwK21wXxRbio-juliahQwK21wXxRcomo-deixar-ela-louca",
      "email": "miguelmouracvm23@gmail.com",
      "price": "375.69",
      "funnel": "true",
      "hotkey": "",
      "hottok": "20972",
      "status": "refunded",
      "cms_aff": "0.00",
      "aff_name": "",
      "currency": "BRL",
      "utm_term": "como-deixar-ela-louca",
      "last_name": "Miguel Moura",
      "prod_name": "COMO DEIXAR ELA LOUCA NA CAMA - SST",
      "cms_vendor": "0.00",
      "first_name": "Miguel Moura",
      "full_price": "454.37",
      "order_bump": "false",
      "utm_medium": "organico",
      "utm_source": "instagram",
      "transaction": "7127738",
      "utm_content": "bio-julia",
      "address_comp": "",
      "payment_type": "CREDIT_CARD",
      "phone_number": "995946311",
      "utm_campaign": "bio-link",
      "callback_type": "1",
      "producer_name": "Sexologia Sem Tabu",
      "purchase_date": "2026-05-29T00:57:09 -03:00Z",
      "receiver_type": "SELLER",
      "warranty_date": "2026-06-05T00:57:13 +00:00Z",
      "payment_engine": "pagtrust",
      "address_country": "Brasil",
      "cms_marketplace": "0.00",
      "subscriber_code": "",
      "transaction_ext": "7127738",
      "phone_local_code": "41",
      "signature_status": "",
      "currency_codefrom": "BRL",
      "has_co_production": "false",
      "producer_document": "53839969000117",
      "recurrency_period": "",
      "currency_code_from": "BRL",
      "address_country_ISO": "BR",
      "installments_number": "6",
      "subscription_status": "",
      "original_offer_price": "397.00",
      "phone_checkout_number": "995946311",
      "producer_legal_nature": "Pessoa Jurídica",
      "name_subscription_plan": "COMO DEIXAR ELA LOUCA NA CAMA - SST - Oferta Padrão",
      "productOfferPaymentMode": "multiplos_pagamentos",
      "phone_checkout_local_code": "41",
      "confirmation_purchase_date": "2026-05-29T00:57:13 +00:00Z",
      "subscription_anticipation_purchase": "false"
    }

    result = parse_webhook_payload("pagtrust", payload)

    assert result["event_type"] == "reembolso"
    assert result["raw_status"] == "Reembolso"
    assert result["name"] == "Miguel Moura"
    assert result["email"] == "miguelmouracvm23@gmail.com"
    # Local code 41 + number 995946311 -> 5541995946311 (com normalização de DDI 55)
    assert result["phone"] == "5541995946311"
    assert result["price"] == "375.69"
    assert result["product_name"] == "COMO DEIXAR ELA LOUCA NA CAMA - SST"
    assert result["payment_method"] == "Cartão de Crédito"

def test_pagtrust_abandoned_cart_short_phone_parsing():
    payload = {
      "sck": "facebookhQwK21wXxR[06] [VENDA] [CBO] [1-3-1] [VALOR] [LP-PAGTRUST] [CDLC] [ADS PISCINA CAMPEÃO] — CópiahQwK21wXxRcpchQwK21wXxR[ADS-CAMPEÃO PISCINA]hQwK21wXxR[ABERTO ADV+] [BR] [ADS CAMPEÃO] — Cópia",
      "src": "v3_f1ca60ec-ff00-44af-915d-69f62f23c012_698105a20d7dab617570d4b5_483_t-13_s-1",
      "xcod": "facebookhQwK21wXxR[06] [VENDA] [CBO] [1-3-1] [VALOR] [LP-PAGTRUST] [CDLC] [ADS PISCINA CAMPEÃO] — CópiahQwK21wXxRcpchQwK21wXxR[ADS-CAMPEÃO PISCINA]hQwK21wXxR[ABERTO ADV+] [BR] [ADS CAMPEÃO] — Cópia",
      "hottok": "F9E7F77C-21F0-45B5-B7EC-20496F85CB9F",
      "status": "abandoned_cart",
      "buyerVO": {
        "name": "Fabio Campassi",
        "email": "fabiocampassi@gmail.com",
        "phone": "55119"
      },
      "utm_term": "[ABERTO ADV+] [BR] [ADS CAMPEÃO] — Cópia",
      "productId": 610828,
      "webhookId": 2864,
      "utm_medium": "cpc",
      "utm_source": "facebook",
      "buyerVOName": "Fabio Campassi",
      "productName": "COMO DEIXAR ELA LOUCA NA CAMA - D.U",
      "utm_content": "[ADS-CAMPEÃO PISCINA]::PAZXh0bgNhZW0BMABhZGlkAas65hfFrNFzcnRjBmFwcF9pZA8xMjQwMjQ1NzQyODc0MTQAAacwQoo2YaKflncNx6gEqGEMEarQNT-X0BuCsd3K_l-RKuhLODXTnPmyOtwIdA_aem_iKkozQundNNlFLFgbTKluw::",
      "buyerVOEmail": "fabiocampassi@gmail.com",
      "hasNegotiate": 0,
      "productUCode": "COMO DEIXAR ELA LOUCA NA CAMA - D.U",
      "utm_campaign": "[06] [VENDA] [CBO] [1-3-1] [VALOR] [LP-PAGTRUST] [CDLC] [ADS PISCINA CAMPEÃO] — Cópia",
      "customerEmail": "fabiocampassi@gmail.com",
      "productCategory": 0,
      "customerFullName": "Fabio Campassi",
      "customerFullPhoneNumber": "55119"
    }

    result = parse_webhook_payload("pagtrust", payload)

    assert result["event_type"] == "carrinho_abandonado"
    assert result["raw_status"] == "Carrinho Abandonado"
    assert result["name"] == "Fabio Campassi"
    assert result["email"] == "fabiocampassi@gmail.com"
    # Normalização de Telefone com 55119 -> 55119 (como tem menos de 12 dígitos e começa com 55, é mantido)
    assert result["phone"] == "55119"
    assert result["product_name"] == "COMO DEIXAR ELA LOUCA NA CAMA - D.U"

if __name__ == "__main__":
    pytest.main([__file__])
