import uuid
import json
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy import text
from sqlalchemy.orm import Session
import models, schemas
from database import SessionLocal
from core.logger import logger
from rabbitmq_client import rabbitmq
from services.leads import upsert_webhook_lead
from services.manychat import sync_to_manychat
from core.deps import get_db
from services.webhooks import get_brasilia_now, compute_dynamic_manychat_tag, parse_webhook_payload
import re

router = APIRouter()
import calendar

# Helpers moved to services.webhooks


def parse_webhook_payload(platform: str, payload: dict) -> dict:
    """
    Função dedicada para extrair os dados padronizados de diferentes plataformas.
    """
    platform_lower = platform.lower().strip()
    result = {
        "name": None,
        "phone": None,
        "email": None,
        "event_type": None, # 'pix_gerado', 'compra_aprovada', 'carrinho_abandonado', 'cartao_recusado', 'pix_expirado', 'outros'
        "country": None,
        "product_name": None,
        "order_bump": False,
        "payment_method": None,
        "raw_status": None,
        "price": None,
        "checkout_url": None,
        "pix_qrcode": None,
        "utm_source": None,
        "utm_medium": None,
        "utm_campaign": None,
        "platform": platform_lower,
        "event_time": None,
        "currency": "BRL",
        "items": []
    }
    
    def get_val(keys, default=None):
        curr = payload
        for key in keys:
            if isinstance(curr, dict) and key in curr:
                curr = curr[key]
            else:
                return default
        
        # Smart unwrapping for WordPress/Elementor/Typeform style objects
        if isinstance(curr, dict) and "value" in curr:
            return curr["value"]
            
        return curr
    
    def clean_str(val):
        if not val: return None
        return str(val).strip().replace('\u00a0', ' ') # Replace non-breaking space

    platform_lower = platform.lower().strip()
    
    if platform_lower == 'hotmart':
        # Hotmart version 2.0.0
        event = payload.get("event", "")
        if event == "PURCHASE_APPROVED": result['event_type'] = "compra_aprovada"
        elif event == "PURCHASE_CANCELED" or event == "PURCHASE_REFUNDED": result['event_type'] = "reembolso"
        elif event == "PURCHASE_BILLET_PRINTED": result['event_type'] = "boleto_impresso"
        elif event == "PURCHASE_DELAYED": result['event_type'] = "cartao_recusado"
        elif event == "ABANDONED_CART": result['event_type'] = "carrinho_abandonado"
        
        data = payload.get("data", {})
        buyer = data.get("buyer", {})
        product = data.get("product", {})
        purchase = data.get("purchase", {})
        
        result['name'] = buyer.get("name")
        result['email'] = buyer.get("email")
        
        # Phone logic (DDI + number)
        checkout_phone = buyer.get("checkout_phone", "")
        if checkout_phone: result['phone'] = checkout_phone
        else: result['phone'] = get_val(["buyer", "phone"])

        result['country'] = get_val(["buyer", "address", "country"])
        result['product_name'] = product.get("name")
        result['payment_method'] = purchase.get("payment", {}).get("type")
        
        # Check order bump in Hotmart
        result['order_bump'] = purchase.get("is_order_bump", False)
        result['raw_status'] = purchase.get("status")
        
        if result['payment_method'] == "PIX" and result['raw_status'] == "WAITING_PAYMENT":
            result['event_type'] = "pix_gerado"

    elif platform_lower == 'kiwify':
        # Kiwify uses order_status (Paid) or status (Abandoned)
        order_status = payload.get("order_status") or payload.get("status", "")
        if order_status == "paid": result['event_type'] = "compra_aprovada"
        elif order_status == "waiting_payment":
            payment_method = payload.get("payment_method", "").lower()
            if payment_method == "pix": result['event_type'] = "pix_gerado"
            else: result['event_type'] = "boleto_impresso"
        elif order_status == "refunded": result['event_type'] = "reembolso"
        elif order_status == "refused": result['event_type'] = "cartao_recusado"
        elif order_status in ["abandoned_cart", "abandoned"]: result['event_type'] = "carrinho_abandonado"

        customer = payload.get("Customer", {})
        result['name'] = customer.get("full_name")
        result['email'] = customer.get("email")
        result['phone'] = customer.get("mobile") or customer.get("phone")
        result['product_name'] = payload.get("Product", {}).get("product_name")
        result['currency'] = get_val(["Commissions", "currency"]) or "BRL"
        result['event_time'] = payload.get("created_at") or payload.get("updated_at")
        
        # Tradução do método de pagamento Kiwify
        payload_pm = payload.get("payment_method", "")
        kiwify_pm_map = {
            "credit_card": "Cartão de Crédito",
            "card_pix": "Cartão de Crédito",
            "pix": "Pix",
            "billet": "Boleto",
            "free": "Gratuito"
        }
        result['payment_method'] = kiwify_pm_map.get(payload_pm.lower(), payload_pm)
        
        # Extração de preço específica da Kiwify (Centavos)
        result['price'] = get_val(["Commissions", "charge_amount"])
        
        result['raw_status'] = order_status

    elif platform_lower == 'eduzz':
        # Eduzz can have two formats: v1 (legacy) and v2 (Orbita)
        # Check root or nested in 'data'
        is_orbita = "buyer" in payload or "student" in payload or "items" in payload or (
            isinstance(payload.get("data"), dict) and ("buyer" in payload["data"] or "items" in payload["data"] or "student" in payload["data"])
        )
        
        if is_orbita:
            # Format v2/Orbita
            if "data" in payload and isinstance(payload["data"], dict) and not ("buyer" in payload or "student" in payload or "items" in payload):
                # Work with 'data' content if root is just metadata
                data_ctx = payload["data"]
            else:
                data_ctx = payload

            status = data_ctx.get("status", "").lower()
            if status == "paid": result['event_type'] = "compra_aprovada"
            elif status == "waiting_payment":
                pm = data_ctx.get("paymentMethod", "").lower()
                if pm == "pix": result['event_type'] = "pix_gerado"
                else: result['event_type'] = "boleto_impresso"
            elif status == "refunded": result['event_type'] = "reembolso"
            elif status == "abandoned_cart": result['event_type'] = "carrinho_abandonado"
            elif status == "canceled": result['event_type'] = "cartao_recusado"

            buyer = data_ctx.get("buyer") or data_ctx.get("student") or {}
            result['name'] = buyer.get("name")
            result['email'] = buyer.get("email")
            result['phone'] = buyer.get("cellphone") or buyer.get("phone")
            
            items_list = data_ctx.get("items", [])
            if items_list:
                # Currency helper for Eduzz
                currency_code = (data_ctx.get("price", {}).get("currency") or data_ctx.get("paid", {}).get("currency") or "BRL").upper()
                result['currency'] = currency_code
                
                symbol_map = {"BRL": "R$", "USD": "$", "EUR": "€", "GBP": "£"}
                # Use the symbol relevant to the transaction currency
                main_symbol = symbol_map.get(currency_code, "$")

                formatted_items = []
                for i in items_list:
                    p_name = i.get("name", "Produto Desconhecido")
                    item_price_data = i.get("price", {})
                    p_value = item_price_data.get("value")
                    p_currency = (item_price_data.get("currency") or currency_code).upper()
                    p_symbol = symbol_map.get(p_currency, main_symbol)

                    formatted_items.append(p_name)
                
                result['product_name'] = " | ".join(formatted_items)
                result['items'] = [{"name": i.get("name"), "price": i.get("price", {}).get("value"), "symbol": symbol_map.get((i.get("price",{}).get("currency") or currency_code).upper(), main_symbol)} for i in items_list]
                
                # Preço total da Eduzz Orbita
                total_price = data_ctx.get("price", {}).get("value") or data_ctx.get("paid", {}).get("value")
                if total_price:
                    result['price'] = total_price

            result['payment_method'] = data_ctx.get("paymentMethod")
            result['event_time'] = data_ctx.get("at") or data_ctx.get("createdAt")
            result['raw_status'] = status
        else:
            # Format v1/Legacy
            status_name = get_val(["transacao_status", "nome"], "").lower()
            if "pago" in status_name: result['event_type'] = "compra_aprovada"
            elif "aguardando pagamento" in status_name:
                if get_val(["transacao_forma_pagamento", "nome"], "").lower() == "pix": result['event_type'] = "pix_gerado"
                else: result['event_type'] = "boleto_impresso"
            elif "cancelado" in status_name: result['event_type'] = "cartao_recusado"
            elif "abandonado" in status_name: result['event_type'] = "carrinho_abandonado"

            result['name'] = get_val(["cli_nome"])
            result['email'] = get_val(["cli_email"])
            result['phone'] = get_val(["cli_celular"])
            result['product_name'] = get_val(["produto_nome"])
            result['payment_method'] = get_val(["transacao_forma_pagamento", "nome"])
            result['raw_status'] = status_name
    
    elif platform_lower == 'kirvano':
        # Kirvano uses event and status
        event = payload.get("event", "").upper()
        status = payload.get("status", "").upper()
        payment_method = str(payload.get("payment_method") or get_val(["payment", "method"]) or "").upper()
        
        if status in ["PAID", "APPROVED"] or event in ["ORDER.PAID", "SALE_APPROVED"]: 
            result['event_type'] = "compra_aprovada"
        elif status == "PENDING" or event == "ORDER.PENDING":
            if payment_method == "PIX": result['event_type'] = "pix_gerado"
            else: result['event_type'] = "boleto_impresso"
        elif status == "CANCELED" or event in ["ORDER.CANCELED", "PIX_EXPIRED", "SALE_CANCELED"]: 
            if payment_method == "PIX" or "PIX" in event:
                result['event_type'] = "pix_expirado"
            else:
                result['event_type'] = "cartao_recusado"
        elif status == "REFUNDED" or event == "ORDER.REFUNDED": result['event_type'] = "reembolso"
        elif event in ["CHECKOUT.ABANDONED", "ABANDONED_CART"]: result['event_type'] = "carrinho_abandonado"

        customer = payload.get("customer", {})
        result['name'] = customer.get("name") or customer.get("full_name")
        result['email'] = customer.get("email")
        result['phone'] = customer.get("phone") or customer.get("mobile") or customer.get("phone_number")
        result['product_name'] = payload.get("product", {}).get("name")
        result['payment_method'] = payment_method
        result['raw_status'] = status or event
        result['checkout_url'] = payload.get("checkout_url")
        result['pix_qrcode'] = get_val(["payment", "qrcode"]) or get_val(["payment", "pix_code"])

    # Generic / Fallback strategy (Smart Discovery)
    # This ensures that even if platform is 'outros', we try to find the data in common paths
    if not result.get('phone'):
        result['phone'] = (
            payload.get("phone") or payload.get("phone_number") or payload.get("celular") or 
            payload.get("telefone") or payload.get("mobile") or payload.get("whatsapp") or
            payload.get("fields[phone][value]") or payload.get("fields[whatsapp][value]") or # Elementor Flat
            payload.get("fields[telefone][value]") or payload.get("fields[celular][value]") or
            get_val(["fields", "phone"]) or get_val(["fields", "phone", "value"]) or # Elementor Nested
            get_val(["respondent", "answers", "INFORME AQUI QUAL O MELHOR NÚMERO PARA FALAR COM VOCÊ NO WHATS"]) or # New Typeform-style Structure
            get_val(["customer", "phone"]) or get_val(["customer", "phone_number"]) or
            get_val(["customer", "mobile"]) or
            get_val(["buyer", "phone"]) or get_val(["buyer", "phone_number"]) or
            get_val(["buyer", "cellphone"]) or
            get_val(["data", "buyer", "cellphone"]) or
            get_val(["data", "buyer", "phone"]) or 
            get_val(["data", "buyer", "phone_number"]) or
            get_val(["data", "student", "cellphone"]) or
            get_val(["data", "student", "phone"]) or
            get_val(["fields", "celular"]) or 
            get_val(["fields", "whatsapp"]) or get_val(["fields", "telefone"]) or 
            get_val(["fields", "whatsapp_number"]) or
            get_val(["fields", "celular", "value"]) or 
            get_val(["cliente", "phone"]) or get_val(["cliente", "telefone"]) or 
            get_val(["cliente", "whatsapp"]) or get_val(["cliente", "celular"])
        )
    if not result.get('name'):
        result['name'] = (
            payload.get("name") or payload.get("customer_name") or payload.get("nome") or
            payload.get("fullname") or payload.get("full_name") or payload.get("first_name") or
            payload.get("fields[name][value]") or payload.get("fields[nome][value]") or # Elementor Flat
            payload.get("fields[fullname][value]") or payload.get("fields[full_name][value]") or
            get_val(["fields", "name"]) or get_val(["fields", "name", "value"]) or # Elementor Nested
            get_val(["respondent", "answers", "SEU NOME COMPLETO"]) or # New Structure
            get_val(["fields", "fullname", "value"]) or get_val(["fields", "full_name", "value"]) or
            get_val(["customer", "name"]) or get_val(["customer", "full_name"]) or
            get_val(["Customer", "full_name"]) or get_val(["Customer", "name"]) or
            get_val(["buyer", "name"]) or get_val(["buyer", "full_name"]) or
            get_val(["data", "buyer", "name"]) or
            get_val(["fields", "nome"]) or
            get_val(["fields", "nome", "value"]) or
            get_val(["cliente", "name"]) or get_val(["cliente", "nome_completo"]) or 
            get_val(["cliente", "nome"])
        )
    if not result.get('email'):
        result['email'] = (
            payload.get("email") or payload.get("mail") or payload.get("contactEmail") or
            payload.get("fields[email][value]") or payload.get("fields[mail][value]") or # Elementor Flat
            get_val(["fields", "email"]) or get_val(["fields", "email", "value"]) or # Elementor Nested
            get_val(["respondent", "answers", "SEU MELHOR E-MAIL"]) or # New Structure
            get_val(["customer", "email"]) or get_val(["buyer", "email"]) or
            get_val(["data", "buyer", "email"]) or
            get_val(["cliente", "email"]) or get_val(["cliente", "mail"])
        )

    if not result.get('product_name'):
        # 1. Check for products list (Kirvano style)
        products = payload.get("products")
        if isinstance(products, list) and len(products) > 0:
            # Identificar produto principal (is_order_bump=False) ou pegar o primeiro como fallback
            main_product = next((p for p in products if not p.get("is_order_bump")), products[0])
            result['product_name'] = main_product.get("name")
            
            # Flag se existe qualquer item extras (order bumps)
            result['e_order_bump'] = any([p.get("is_order_bump") for p in products])
            
            # Lista estruturada de itens e preços para o histórico
            result['items_detailed'] = [{"name": p.get('name'), "price": p.get('price')} for p in products]
            
        if not result.get('product_name'):
            result['product_name'] = (
                payload.get("product_name") or payload.get("produto") or
                get_val(["product", "name"]) or get_val(["Product", "product_name"]) or
                get_val(["form", "form_name"])
            )
    
    # Extração de UTMs
    result['utm_source'] = (
        payload.get("utm_source") or payload.get("fields[utm_source][value]") or 
        payload.get("fields[src][value]") or get_val(["utm", "utm_source"]) or 
        get_val(["utm", "src"]) or get_val(["TrackingParameters", "utm_source"]) or
        get_val(["TrackingParameters", "src"]) or payload.get("src")
    )
    result['utm_medium'] = payload.get("utm_medium") or payload.get("fields[utm_medium][value]") or get_val(["utm", "utm_medium"]) or get_val(["TrackingParameters", "utm_medium"])
    result['utm_campaign'] = payload.get("utm_campaign") or payload.get("fields[utm_campaign][value]") or get_val(["utm", "utm_campaign"]) or get_val(["TrackingParameters", "utm_campaign"])
    result['utm_term'] = payload.get("utm_term") or payload.get("fields[utm_term][value]") or get_val(["TrackingParameters", "utm_term"])
    result['utm_content'] = payload.get("utm_content") or payload.get("fields[utm_content][value]") or get_val(["TrackingParameters", "utm_content"])

    if not result.get('price'):
        # Attempt to find Price/Amount
        val = (
            payload.get("total_price") or payload.get("amount") or 
            payload.get("net_value") or payload.get("total_amount") or 
            payload.get("price") or payload.get("valor") or
            payload.get("preco") or
            get_val(["fiscal", "total_value"]) or
            get_val(["data", "amount"]) or get_val(["data", "net_value"]) or
            get_val(["payment", "amount"])
        )
        
        # 2. Check in products list
        if not val and isinstance(payload.get("products"), list) and len(payload.get("products")) > 0:
            val = payload.get("products")[0].get("price")

        # 3. Check if val is a dictionary (common in newer Eduzz/Orbita formats)
        if isinstance(val, dict):
            val = val.get('value') or val.get('amount') or val.get('total')
        
        if val:
            result['price'] = val

    # --- Extra loop for respondent.raw_answers (Typeform style) ---
    raw_answers = get_val(["respondent", "raw_answers"])
    if isinstance(raw_answers, list):
        for item in raw_answers:
            if not isinstance(item, dict): continue
            q_title = str(item.get("question", {}).get("question_title", "")).upper()
            answer_val = item.get("answer")
            
            # Map common questions to result fields if not found yet
            if not result.get("name") and ("NOME" in q_title or "WHO ARE YOU" in q_title):
                result["name"] = answer_val
            if not result.get("email") and ("E-MAIL" in q_title or "EMAIL" in q_title):
                result["email"] = answer_val
            if not result.get("phone") and ("WHATS" in q_title or "FONE" in q_title or "TEL" in q_title or "CELULAR" in q_title or "MOBILE" in q_title):
                if isinstance(answer_val, dict) and "phone" in answer_val:
                    country = answer_val.get("country", "")
                    num = answer_val.get("phone", "")
                    result["phone"] = f"{country}{num}"
                else:
                    result["phone"] = answer_val

    # Normalização Robusta e Conversão de Moeda (Sempre executado se houver preço)
    price_to_normalize = result.get('price')
    if price_to_normalize:
        try:
            is_cents = False
            f_val = 0.0
            val = price_to_normalize
            
            if isinstance(val, (int, float)):
                f_val = float(val)
                # Se for int (ex: 2990) ou float que termina em .0 (ex: 2990.0), parece centavos
                is_cents = isinstance(val, int) or (f_val == int(f_val))
            elif isinstance(val, str):
                val_clean = val.replace('\u00a0', ' ').replace("R$", "").replace("$", "").replace(" ", "").strip()
                if "," in val_clean and "." in val_clean:
                    val_clean = val_clean.replace(".", "").replace(",", ".")
                elif "," in val_clean:
                    val_clean = val_clean.replace(",", ".")
                
                # Se não tem ponto decimal após limpeza, tratamos como centavos (ex: "2990")
                is_cents = "." not in val_clean
                f_val = float(val_clean)
            
            # Se parece centavos e a plataforma é conhecida por usar centavos, divide por 100
            # Se a plataforma é Kiwify, dividimos por 100 (centavos -> reais)
            if is_cents and platform_lower == 'kiwify':
                f_val = f_val / 100
            
            # Conversão Automática de Moeda para BRL (Reais)
            currency = (
                payload.get("currency") or 
                get_val(["Commissions", "currency"]) or 
                get_val(["data", "purchase", "price", "currency"]) or 
                payload.get("original_currency") or
                "BRL"
            ).upper()
            
            result['currency'] = currency
            
            # Escolha do símbolo correto para o valor total
            symbol_map = {"BRL": "R$", "USD": "$", "EUR": "€", "GBP": "£", "MXN": "Mex$"}
            result['currency_symbol'] = symbol_map.get(currency, "$")
            
            rates = {
                "USD": 5.45, "EUR": 5.85, "GBP": 6.80, "MXN": 0.30,
                "CLP": 0.006, "ARS": 0.006, "COP": 0.0014
            }
            
            if currency != "BRL" and currency in rates:
                f_val = f_val * rates[currency]
                logger.info(f"[CURRENCY] Convertendo {currency} {f_val/rates[currency]:.2f} para BRL {f_val:.2f}")

            result['price'] = f"{f_val:.2f}"
        except Exception as e:
            logger.error(f"[PRICE ERROR] Falha ao normalizar preço '{price_to_normalize}': {str(e)}")
            result['price'] = str(price_to_normalize)

    # Map status to a friendly name (Always apply if found in mapping)
    status_raw_val = str(result.get('raw_status') or payload.get("status") or payload.get("event") or payload.get("event_description") or "outros").upper()
    
    friendly_status_map = {
        "APPROVED": "Compra Aprovada", "SALE_APPROVED": "Compra Aprovada", "PAID": "Compra Aprovada",
        "PENDING": "Pix Gerado", "WAITING_PAYMENT": "Pix Gerado", "WAITING": "Pix Gerado",
        "REFUNDED": "Reembolso", "REFUSED": "Cartão Recusado", 
        "ABANDONED_CART": "Carrinho Abandonado", "CHECKOUT.ABANDONED": "Carrinho Abandonado",
        "ABANDONED": "Carrinho Abandonado",
        "PIX_EXPIRED": "Pix Expirado", "CANCELED": "Cancelado"
    }
    
    # If the current raw_status is in our map, we use the friendly name
    if status_raw_val in friendly_status_map:
        result['raw_status'] = friendly_status_map[status_raw_val]
    elif not result.get('raw_status'):
        # Fallback to capitalized raw value if no mapping and not set yet
        result['raw_status'] = status_raw_val.capitalize()

    if not result.get('event_type'):
        # If we didn't match a specific platform, we use the raw event/status name as type
        event_raw = payload.get("event") or payload.get("status") or payload.get("event_type") or "outros"
        result['event_type'] = str(event_raw).lower().replace(".", "_") # Normalize for mapping
        
    # Extra check for Kirvano specific status/event in generic payload
    if result['event_type'] in ["sale_approved", "approved", "order_paid"]:
        result['event_type'] = "compra_aprovada"
    elif result['event_type'] in ["order_pending", "pending", "pix_printed"]:
        result['event_type'] = "pix_gerado"
    elif result['event_type'] in ["pix_expired"]:
        result['event_type'] = "pix_expirado"
        
    # Final cleanup/translation for payment method
    pm = result.get("payment_method")
    if pm:
        pm_clean = str(pm).lower().strip().replace("_", "").replace(" ", "")
        pm_map = {
            "creditcard": "Cartão de Crédito",
            "cardpix": "Cartão de Crédito",
            "cartao": "Cartão de Crédito",
            "billet": "Boleto",
            "bankslip": "Boleto",
            "boleto": "Boleto",
            "pix": "Pix",
            "free": "Gratuito"
        }
        if pm_clean in pm_map:
            result['payment_method'] = pm_map[pm_clean]
        elif pm_clean == "credit":
            result['payment_method'] = "Cartão de Crédito"

    # Clean phone number (keep only digits)
    if result.get("phone"):
        cleaned = ''.join(filter(str.isdigit, str(result["phone"])))
        
        # 1. Add country code if missing (assumes BR if <= 11 digits)
        if not cleaned.startswith("55") and len(cleaned) <= 11:
            cleaned = "55" + cleaned
            
        # 2. BR Phone Normalization (The "9-digit" fix)
        # Standard BR format with country code: 55 (2) + DDD (2) + Number (9) = 13 digits
        # If we have 12 digits, it's likely missing the 9th digit (55 + DDD + 8 digits)
        if cleaned.startswith("55") and len(cleaned) == 12:
            # Check if it's a mobile (DDD is 11-99)
            # We inject the '9' after the DDD (which is at index 2,3)
            # Resulting Format: 55 + DDD + 9 + 8 digits
            ddd = cleaned[2:4]
            number = cleaned[4:]
            logger.info(f"📱 [Phone Normalization] Injecting 9th digit for BR number: {cleaned} -> 55{ddd}9{number}")
            cleaned = f"55{ddd}9{number}"
            
        result["phone"] = cleaned

    # ── VALIDATE NAME ─────────────────────────────────────────────────────────
    # Se o nome for puramente numérico (como "1" ou "123") ou muito curto, 
    # marcamos como None para tentar encontrar o nome correto via Chatwoot/Lead
    if result.get("name"):
        name_val = str(result["name"]).strip()
        # Se o nome é apenas números ou tem só 1 caractere, ignoramos
        if name_val.isdigit() or len(name_val) <= 1:
             logger.warning(f"⚠️ [PARSER] Nome inválido ignorado: '{name_val}'")
             result["name"] = None

    logger.info(f"[DEBUG PARSE END] Result: {result}")
    return result

def extract_mapped_variables(payload: dict, parsed_data: dict, mapping_config: dict, header_format: str = None) -> list:
    """
    Dado o mapping_config do banco, extrai os valores do payload bruto ou do data parseado
    Exemplo config: {"1": "name", "2": "pix_copia_cola", "header_url": "buyer.photo"}
    Retorno: [{"type": "body", "parameters": [...]}, {"type": "header", "parameters": [...]}]
    """
    components = []
    if not mapping_config:
        return components
        
    parameters = []
    
    def extract_value(key):
        # 1. Look in parsed_data standard fields
        if hasattr(parsed_data, key) or key in parsed_data:
            val = parsed_data.get(key)
            if val: return str(val)
            
        # 2. Look in raw payload (simple nested support like 'buyer.name' or just 'pix')
        parts = key.split('.')
        curr = payload
        for p in parts:
            if isinstance(curr, dict) and p in curr:
                curr = curr[p]
            else:
                curr = None
                break
        if curr is not None:
            return str(curr)
        return ""

    # 1. Body Parameters ({{1}}, {{2}}...)
    # Filter only numeric keys for body variables
    body_mapping = {k: v for k, v in mapping_config.items() if k.isdigit()}
    for index_str, key in sorted(body_mapping.items(), key=lambda x: int(x[0])):
        val = extract_value(key)
        parameters.append({"type": "text", "text": val if val else "-"})
        
    if parameters:
        components.append({
            "type": "body",
            "parameters": parameters
        })
        
    # 2. Header Media Mapping (image, video, document)
    header_url_key = mapping_config.get("header_url")
    if header_url_key and header_format in ["IMAGE", "VIDEO", "DOCUMENT"]:
        val = extract_value(header_url_key)
        if val:
            # Fallback for static URLs: if it contains http but doesn't resolve to a key, val stays as URL
            # extract_value already returns the key if not found? No, it returns "".
            # Let's adjust extract_value to handle static input if it looks like a URL.
            
            media_type = header_format.lower()
            components.append({
                "type": "header",
                "parameters": [
                    {
                        "type": media_type,
                        media_type: {"link": val}
                    }
                ]
            })
        
    return components

def extract_nested_custom_fields(payload: dict, mapping: dict) -> dict:
    custom_fields = {}
    if not mapping:
        return custom_fields
    for field_name, json_path in mapping.items():
        parts = str(json_path).split('.')
        curr = payload
        for p in parts:
            if isinstance(curr, dict) and p in curr:
                curr = curr[p]
            else:
                curr = None
                break
        if curr is not None:
            custom_fields[field_name] = str(curr)
    return custom_fields

def replace_variables_in_string(text: str, payload: dict, parsed_data: dict) -> str:
    """
    Substitui variáveis por valores reais.
    Suporta dois formatos:
    1. Chave simples (do dropdown): 'name', 'phone', 'email', 'buyer.name', etc.
    2. Sintaxe mustache: {{name}}, {{phone}}, {{campo_customizado}}, etc.
    """
    if not text: return ""

    # Mapeamento das chaves simples do dropdown para os campos do parsed_data
    SIMPLE_KEY_MAP = {
        "name": "name",
        "phone": "phone",
        "email": "email",
        "product_name": "product_name",
        "payment_method": "payment_method",
        "checkout_url": "checkout_url",
        "pix_qrcode": "pix_qrcode",
    }

    # 1. Se o texto for uma chave simples conhecida (sem {{ }}), resolve direto
    text_stripped = text.strip()
    if text_stripped in SIMPLE_KEY_MAP and "{{" not in text_stripped:
        val = parsed_data.get(SIMPLE_KEY_MAP[text_stripped])
        return str(val) if val is not None else text

    # 2. Se for uma chave de caminho (ex: 'buyer.name' ou 'Customer.full_name') sem {{ }}
    if "{{" not in text_stripped and "." in text_stripped:
        parts = text_stripped.split(".")
        curr = payload
        for p in parts:
            if isinstance(curr, dict) and p in curr:
                curr = curr[p]
            else:
                curr = None
                break
        if curr is not None:
            return str(curr)

    # 3. Processa sintaxe mustache: {{variavel}}
    matches = re.findall(r"\{\{([^}]+)\}\}", text)
    for match in matches:
        key = match.strip()
        val = None
        # Procura no parsed_data
        if key in parsed_data:
            val = parsed_data[key]
        # Procura no payload bruto (suporte a pontos para aninhamento)
        else:
            parts = key.split('.')
            curr = payload
            for p in parts:
                if isinstance(curr, dict) and p in curr:
                    curr = curr[p]
                else:
                    curr = None
                    break
            val = curr
        if val is not None:
            text = text.replace(f"{{{{{match}}}}}", str(val))

    return text


@router.post("/webhooks/external/{integration_uuid}", summary="Receber webhook externo")
async def receive_external_webhook(
    integration_uuid: str,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    # 1. Fetch Integration — aceita UUID ou slug personalizado
    integration = None
    try:
        uuid_obj = uuid.UUID(integration_uuid)
        integration = db.query(models.WebhookIntegration).filter(
            models.WebhookIntegration.id == uuid_obj,
            models.WebhookIntegration.status == "active"
        ).first()
    except ValueError:
        # Não é um UUID — tenta buscar pelo slug personalizado
        integration = db.query(models.WebhookIntegration).filter(
            models.WebhookIntegration.custom_slug == integration_uuid,
            models.WebhookIntegration.status == "active"
        ).first()
        if not integration:
            logger.warning(f"Webhook Integration slug '{integration_uuid}' rejected (Not found or inactive)")
            return {"status": "ignored", "reason": "integration_not_found_or_inactive"}

    if not integration:
        logger.warning(f"Webhook Integration {integration_uuid} rejected (Not found or inactive)")
        return {"status": "ignored", "reason": "integration_not_found_or_inactive"}

    # 2. Extract and Normalize Data
    try:
        content_type = request.headers.get("Content-Type", "").lower()
        if "application/json" in content_type:
            payload = await request.json()
        elif "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type:
            form_data = await request.form()
            payload = dict(form_data)
        else:
            # Try JSON by default if content-type is missing/generic, if fails try form
            try:
                payload = await request.json()
            except Exception:
                # Fallback to form data or query params
                form_data = await request.form()
                payload = dict(form_data)
                if not payload:
                    payload = dict(request.query_params)
        
        # Enhanced recursive unwrapping for 'body', 'data', 'dados'
        # This fixes structures like {"status": "sucesso", "dados": {...}}
        # We only unwrap if the payload ONLY has the wrapper key or if it's 'body'
        max_depth = 5
        for _ in range(max_depth):
            changed = False
            if isinstance(payload, list) and len(payload) > 0:
                payload = payload[0]
                changed = True
            elif isinstance(payload, dict):
                for wrapper in ["body", "dados"]: # Avoid unwrapping 'data' too aggressively
                    if wrapper in payload and isinstance(payload[wrapper], dict) and (len(payload) == 1 or wrapper == "body"):
                        payload = payload[wrapper]
                        changed = True
                        break
                
                # Special case: only unwrap 'data' if it's the ONLY key
                if not changed and "data" in payload and isinstance(payload["data"], dict) and len(payload) == 1:
                    payload = payload["data"]
                    changed = True
            if not changed:
                break
                
        logger.info(f"[WEBHOOK] Unwrapped payload keys: {list(payload.keys()) if isinstance(payload, dict) else 'not a dict'}")

            
    except Exception:
        raise HTTPException(status_code=400, detail="Payload must be valid JSON")

    # ── 1. ACQUIRE ADVISORY LOCK ─────────────────────────────────────────────
    # Usamos um lock transacional baseado no Client + Phone + Event
    # Isso garante que se dois webhooks chegarem ao mesmo tempo, um espera o outro
    # terminar de criar o Trigger antes de tentar a deduplicação.
    try:
        # Extração manual rápida de phone/event para o lock antes do parse completo
        # (Apenas para criar uma chave de lock estável)
        lock_phone = "".join(filter(str.isdigit, str(payload.get("phone") or payload.get("contact", {}).get("phone") or "0")))
        lock_event = str(payload.get("event") or payload.get("status") or "generic")
        lock_key_str = f"webhook_lock_{integration.client_id}_{lock_phone}_{lock_event}"
        
        # Gerar um BIGINT determinístico para o Postgres (zlib.adler32 é rápido e 32-bit, seguro para bigint)
        import zlib
        lock_id = zlib.adler32(lock_key_str.encode())
        
        # Acquire transactional advisory lock (released at end of block/on commit/rollback)
        db.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": lock_id})
        logger.info(f"🔒 [LOCK] Advisory lock adquirido para chave: {lock_key_str} (ID: {lock_id})")
    except Exception as lock_err:
        logger.error(f"❌ [LOCK ERROR] Falha ao adquirir advisory lock: {lock_err}")

    parsed_data = parse_webhook_payload(integration.platform, payload)
    
    # --- Custom Fields Extraction ---
    mapping = getattr(integration, "custom_fields_mapping", None)
    if mapping:
        custom_fields = extract_nested_custom_fields(payload, mapping)
        if custom_fields:
            parsed_data["custom_fields"] = custom_fields
            # 2.4 Synchronize Custom Fields with Primary Fields if missing
            # If standard extraction failed but the user mapped these manually, we prioritize the mapped values
            if not parsed_data.get("phone") and custom_fields.get("phone"):
                parsed_data["phone"] = custom_fields["phone"]
                logger.info(f"📱 [WEBHOOK SYNC] Phone recovered from custom fields: {parsed_data['phone']}")
            
            if not parsed_data.get("name") and custom_fields.get("name"):
                parsed_data["name"] = custom_fields["name"]
            
            if not parsed_data.get("email") and custom_fields.get("email"):
                parsed_data["email"] = custom_fields["email"]

    # Final cleanup for synchronized phone (normalization)
    if parsed_data.get("phone"):
        raw_phone = str(parsed_data["phone"])
        cleaned = "".join(filter(str.isdigit, raw_phone))
        if len(cleaned) >= 8: # Minimum plausible phone length
            if not cleaned.startswith("55") and len(cleaned) <= 11:
                cleaned = "55" + cleaned
            parsed_data["phone"] = cleaned

    event_type = parsed_data.get("event_type", "").lower()
    phone = parsed_data.get("phone")
    name = parsed_data.get("name")
    
    logger.info(f"[WEBHOOK {integration.platform}] Event: {event_type} | Phone: {phone} | Name: {name}")

    # 2.5 Validação Estrita de Telefone
    # Se não tem telefone ou se o telefone limpo é muito curto para ser válido (BR: 55 + DDD + 8/9 dígitos = min 12)
    # Usamos 10 como limite seguro para contemplar outros países ou variações estranhas.
    is_valid_phone = False
    if phone:
        clean_phone = "".join(filter(str.isdigit, str(phone)))
        if len(clean_phone) >= 10:
            is_valid_phone = True

    if not is_valid_phone:
        # Create history entry with explicit ERROR status for missing/invalid phone
        history_entry = models.WebhookHistory(
            integration_id=integration.id,
            payload=payload,
            event_type=event_type,
            status="error",
            error_message=f"Telefone Ausente ou Inválido: '{phone}'",
            processed_data=parsed_data
        )
        db.add(history_entry)
        db.commit()
        logger.warning(f"⚠️ [WEBHOOK] Disparo abortado: Telefone '{phone}' inválido ou ausente para evento '{event_type}'.")
        return {"status": "error", "reason": "invalid_or_missing_phone", "extracted_phone": phone}

    # 2.6 Deduplicação de histórico — mesmo phone + event_type nos últimos 5 min
    from sqlalchemy import cast as sa_cast, String as sa_String
    dedup_history_window = datetime.now(timezone.utc) - timedelta(minutes=5)
    phone_digits = "".join(filter(str.isdigit, str(phone)))
    recent_duplicate = db.query(models.WebhookHistory).filter(
        models.WebhookHistory.integration_id == integration.id,
        models.WebhookHistory.event_type == event_type,
        models.WebhookHistory.created_at >= dedup_history_window,
        sa_cast(models.WebhookHistory.processed_data["phone"], sa_String).contains(phone_digits[-8:])
    ).first()
    if recent_duplicate:
        logger.info(f"⏭️ [HISTORY DEDUP] Webhook duplicado ignorado para {phone} / {event_type} (histórico #{recent_duplicate.id} já existe)")
        return {"status": "ignored", "reason": "duplicate_webhook_within_5min"}

    # 2.7 Descoberta e Filtragem de Produto
    product_name = parsed_data.get("product_name")
    if product_name:
        # Atualiza lista de produtos descobertos (discovery)
        # SÓ salvamos nomes limpos e individuais
        discovered = set()
        # Primeiro pegamos o que já existe e limpamos (migração "on-the-fly")
        for existing in (integration.discovered_products or []):
            parts = [p.strip() for p in str(existing).split('|')]
            for p in parts:
                p_clean = re.sub(r'\s*\([^)]*?(R\$|\$|€|£|BRL|USD|EUR|US\$|R\$ )[\d\.,\s]+[^)]*?\)', '', p)
                p_clean = re.sub(r'\s*-?\s*(R\$|\$|€|£|BRL|USD|EUR|US\$)\s*[\d\.,]+', '', p_clean).strip()
                if p_clean: discovered.add(p_clean)
        
        # Agora processamos o novo produto que chegou
        parts = [p.strip() for p in str(product_name).split('|')]
        changed = False
        for p in parts:
            p_clean = re.sub(r'\s*\([^)]*?(R\$|\$|€|£|BRL|USD|EUR|US\$|R\$ )[\d\.,\s]+[^)]*?\)', '', p)
            p_clean = re.sub(r'\s*-?\s*(R\$|\$|€|£|BRL|USD|EUR|US\$)\s*[\d\.,]+', '', p_clean).strip()
            if p_clean and p_clean not in discovered:
                discovered.add(p_clean)
                changed = True
                logger.info(f"✨ [DISCOVERY] Novo produto descoberto: '{p_clean}'")
        
        if changed or len(discovered) != len(integration.discovered_products or []):
            from sqlalchemy.orm.attributes import flag_modified
            integration.discovered_products = sorted(list(discovered))
            flag_modified(integration, "discovered_products")
            db.add(integration)
            db.commit()
        
        # Filtragem Global por Produto
        if getattr(integration, "product_filtering", False):
            whitelist = integration.product_whitelist or []
            # SEMPRE limpando o whitelist para garantir matching
            clean_whitelist = set()
            for w in whitelist:
                # Se o whitelist já tinha itens sujos, limpamos aqui também
                w_parts = [wp.strip() for wp in str(w).split('|')]
                for wp in w_parts:
                    wp_clean = re.sub(r'\s*\([^)]*?(R\$|\$|€|£|BRL|USD|EUR|US\$|R\$ )[\d\.,\s]+[^)]*?\)', '', wp)
                    wp_clean = re.sub(r'\s*-?\s*(R\$|\$|€|£|BRL|USD|EUR|US\$)\s*[\d\.,]+', '', wp_clean).strip()
                    if wp_clean: clean_whitelist.add(wp_clean)

            # Processamos o produto atual LIMPO
            current_parts = [p.strip() for p in str(product_name).split('|')]
            is_allowed = False
            for p in current_parts:
                p_clean = re.sub(r'\s*\([^)]*?(R\$|\$|€|£|BRL|USD|EUR|US\$|R\$ )[\d\.,\s]+[^)]*?\)', '', p)
                p_clean = re.sub(r'\s*-?\s*(R\$|\$|€|£|BRL|USD|EUR|US\$)\s*[\d\.,]+', '', p_clean).strip()
                if p_clean in clean_whitelist:
                    is_allowed = True
                    break
            
            if not is_allowed:
                logger.info(f"⏭️ [PRODUCT FILTER] Produto(s) '{product_name}' não estão na lista permitida. Ignorando.")
                history_entry = models.WebhookHistory(
                    integration_id=integration.id,
                    payload=payload,
                    event_type=event_type,
                    status="ignored",
                    error_message=f"Produto '{product_name}' filtrado (Global)",
                    processed_data=parsed_data
                )
                db.add(history_entry)
                db.commit()
                return {"status": "ignored", "reason": "product_not_allowed", "product": product_name}

    logger.info(f"⚡ [WEBHOOK] Processando disparo para Evento: '{event_type}', Telefone: '{phone}', Produto: '{product_name}'")

    # 3. Find matching event mappings
    # --- LOGICA DE PRIORIDADE ---
    # --- Busca por Mapeamentos ---
    # Coletamos todos os produtos envolvidos (podem ser múltiplos separados por '|')
    current_products = [p.strip() for p in str(product_name).split('|')] if product_name else [None]
    
    unique_mappings = {} # key: mapping_id, val: (mapping, product_name_that_matched)

    for p in current_products:
        # 1. Busca mapeamentos específicos para o produto
        p_mappings = []
        if p:
            p_mappings = db.query(models.WebhookEventMapping).filter(
                models.WebhookEventMapping.integration_id == integration.id,
                models.WebhookEventMapping.event_type == event_type,
                models.WebhookEventMapping.product_name == p,
                models.WebhookEventMapping.is_active == True
            ).all()
        
        # 2. Se não encontrou nada específico para ESSE produto, busca os gerais
        if not p_mappings:
            gen_mappings = db.query(models.WebhookEventMapping).filter(
                models.WebhookEventMapping.integration_id == integration.id,
                models.WebhookEventMapping.event_type == event_type,
                models.WebhookEventMapping.product_name == None,
                models.WebhookEventMapping.is_active == True
            ).all()
            for m in gen_mappings:
                if m.id not in unique_mappings:
                    unique_mappings[m.id] = (m, p) # P: none ou o nome do produto q caiu no geral
        else:
            for m in p_mappings:
                unique_mappings[m.id] = (m, p)

    mappings_to_execute = list(unique_mappings.values()) # List of (mapping, matched_product)
    
    # Transform back into the compatible 'mappings' list for legacy code
    # mappings = [m for m, p in mappings_to_execute]
    # Actually, we need to pass 'p' (matched product) forward if possible, 
    # but the loop below uses 'parsed_data.get("product_name")' for everything.
    # To keep it simple and correct, we will use a list of tuples and adjust the creation loop.

    # 2.6 Upsert WebhookLead (Centralized Contact Tracking) with Tag support
    try:
        # Collect only internal_tags for leads — chatwoot_label is for Chatwoot conversations only
        all_tags = []
        for m, mp in mappings_to_execute:
            if getattr(m, "internal_tags", None):
                all_tags.extend([t.strip() for t in m.internal_tags.split(',') if t.strip()])

        # Remove duplicates
        final_tags = ", ".join(list(dict.fromkeys(all_tags))) if all_tags else None
        
        upsert_webhook_lead(db, integration.client_id, integration.platform, parsed_data, tag=final_tags)
        logger.info(f"👤 [WEBHOOK LEAD] Lead {phone} atualizado/criado via Webhook (Tags: {final_tags}).")
    except Exception as e:
        logger.error(f"❌ [WEBHOOK LEAD] Erro ao registrar lead: {e}")

    # Create history entry
    history_entry = models.WebhookHistory(
        integration_id=integration.id,
        payload=payload,
        event_type=event_type,
        status="processed" if mappings_to_execute else "ignored",
        processed_data=parsed_data
    )
    db.add(history_entry)
    db.commit()

    if not mappings_to_execute:
        return {"status": "ignored", "reason": f"no_mapping_for_event_{event_type}", "parsed": parsed_data}

    # ── BLOCKED CONTACT CHECK ──────────────────────────────────────────────────
    # Antes de qualquer disparo, verifica se o contato está na lista de exclusão
    from sqlalchemy import or_, cast, String
    clean_phone = "".join(filter(str.isdigit, str(phone)))
    suffix = clean_phone[-8:] if len(clean_phone) >= 8 else clean_phone
    
    # ── BLOCKED CONTACT CHECK ──────────────────────────────────────────────────
    is_blocked = db.query(models.BlockedContact).filter(
        models.BlockedContact.client_id == integration.client_id,
        or_(
            models.BlockedContact.phone == clean_phone,
            models.BlockedContact.phone == f"+{clean_phone}",
            models.BlockedContact.phone.like(f"%{suffix}")
        )
    ).first()

    if is_blocked:
        logger.warning(f"🚫 [WEBHOOK] Phone {phone} is BLOCKED. Skipping all mappings for event '{event_type}'.")
        history_entry.status = "blocked"
        history_entry.error_message = "Contato na Lista de Exclusão"
        db.commit()
        return {"status": "blocked", "reason": "contact_in_exclusion_list", "phone": phone}

    # ── CANCEL PENDING TRIGGERS ─────────────────────────────────────────────
    for mapping, mp in mappings_to_execute:
        if mapping.cancel_events:
            cancelled_count = db.query(models.ScheduledTrigger).filter(
                models.ScheduledTrigger.client_id == integration.client_id,
                cast(models.ScheduledTrigger.integration_id, String) == str(integration.id),
                models.ScheduledTrigger.contact_phone == phone,
                models.ScheduledTrigger.product_name == mp, # Cancel products of the same matched product
                models.ScheduledTrigger.event_type.in_(mapping.cancel_events),
                models.ScheduledTrigger.status.in_(["pending", "queued"]),
                models.ScheduledTrigger.is_bulk == False
            ).update(
                {"status": "cancelled", "failure_reason": f"Cancelado por evento {event_type}"},
                synchronize_session="fetch"
            )
            if cancelled_count > 0:
                logger.info(f"🚫 {cancelled_count} triggers cancelados para {phone} / {mp} (eventos: {mapping.cancel_events})")
    db.commit()

    # Find suppressor events for this integration
    all_integration_mappings = db.query(models.WebhookEventMapping).filter(
        models.WebhookEventMapping.integration_id == integration.id,
        models.WebhookEventMapping.is_active == True
    ).all()
    
    suppressor_event_types = []
    for m in all_integration_mappings:
        if m.cancel_events and event_type in m.cancel_events:
            suppressor_event_types.append(m.event_type)

    for mapping, mp in mappings_to_execute:
        # --- SUPPRESSION CHECK (Don't trigger if a superior event already finished for THIS product) ---
        if suppressor_event_types:
            time_limit = datetime.now(timezone.utc) - timedelta(days=3)
            superior_trigger = db.query(models.ScheduledTrigger).filter(
                models.ScheduledTrigger.client_id == integration.client_id,
                cast(models.ScheduledTrigger.integration_id, String) == str(integration.id),
                models.ScheduledTrigger.contact_phone == phone,
                models.ScheduledTrigger.product_name == (mp or parsed_data.get("product_name")),
                models.ScheduledTrigger.event_type.in_(suppressor_event_types),
                models.ScheduledTrigger.status.in_(["completed", "processing", "queued", "pending"]),
                models.ScheduledTrigger.created_at >= time_limit,
                models.ScheduledTrigger.is_bulk == False
            ).first()

            if superior_trigger:
                logger.info(f"⏭️ [SUPPRESSION] Evento '{event_type}' para {phone} / {mp} suprimido por '{superior_trigger.event_type}'.")
                continue

        # 4.1 Check Trigger Once constraint
        if getattr(mapping, "trigger_once", False):
            # No matching trigger allowed for SAME integration + SAME phone + SAME event
            already_triggered = db.query(models.ScheduledTrigger).filter(
                models.ScheduledTrigger.client_id == integration.client_id,
                cast(models.ScheduledTrigger.integration_id, String) == str(integration.id),
                models.ScheduledTrigger.contact_phone == phone,
                models.ScheduledTrigger.event_type == event_type,
                models.ScheduledTrigger.status != "cancelled"
            ).first()
            if already_triggered:
                logger.info(f"⏭️ [SKIP ONCE] Evento '{event_type}' já disparado para {phone} anteriormente. Ignorando (Trigger ID Antigo: {already_triggered.id}).")
                continue

        template_name = mapping.template_name
        
        # Fallback: se o nome estiver nulo, busca no cache pelo ID
        if not template_name and mapping.template_id:
            tpl_cache = db.query(models.WhatsAppTemplateCache).filter(
                models.WhatsAppTemplateCache.id == mapping.template_id
            ).first()
            if tpl_cache:
                template_name = tpl_cache.name
        
        # Se não houver template definido nem no mapeamento nem no cache, pula o agendamento
        # (Isso permite mapeamentos de 'Apenas Cancelamento')
        if not template_name:
            logger.info(f"ℹ️ [WEBHOOK] Evento '{event_type}' para {phone} processado apenas para cancelamento (sem template configurado).")
            continue
                
        # Get Template details for header format
        header_format = "NONE"
        tpl_cache = db.query(models.WhatsAppTemplateCache).filter(
            models.WhatsAppTemplateCache.name == template_name,
            models.WhatsAppTemplateCache.client_id == integration.client_id
        ).first()
        
        if tpl_cache and tpl_cache.components:
            header_comp = next((c for c in tpl_cache.components if c.get("type") == "HEADER"), None)
            if header_comp:
                header_format = header_comp.get("format", "NONE")
        
        logger.info(f"🔍 [WEBHOOK MAPPING] Mapeamento Variáveis: {mapping.variables_mapping}")
        logger.info(f"🔍 [WEBHOOK MAPPING] Header Format Detectado: {header_format}")

        components = extract_mapped_variables(payload, parsed_data, mapping.variables_mapping or {}, header_format=header_format)
        
        logger.info(f"🔍 [WEBHOOK MAPPING] Componentes Gerados: {components}")
        
        # Determine internal private message if enabled
        private_msg_text = None
        if getattr(mapping, "private_note", None) == "true":
            template = db.query(models.WhatsAppTemplateCache).filter(
                models.WhatsAppTemplateCache.name == mapping.template_name,
                models.WhatsAppTemplateCache.client_id == integration.client_id
            ).first()
            if template:
                private_msg_text = template.body
                
                # Extract all parameters from components to replace variables
                body_params = []
                for comp in components:
                    if comp.get("type") == "body":
                        body_params = comp.get("parameters", [])
                        break
                
                # Replace variables {{1}}, {{2}} with actual component text
                for idx, p in enumerate(body_params):
                    text_val = p.get("text", "-")
                    private_msg_text = private_msg_text.replace(f"{{{{{idx+1}}}}}", str(text_val))
                
                private_msg_text = f"🔐 NOTA PRIVADA AUTOMÁTICA:\n{private_msg_text}"

        # Calculate delay
        delay_min = mapping.delay_minutes or 0
        delay_sec = mapping.delay_seconds or 0
        total_delay_sec = (delay_min * 60) + delay_sec

        scheduled_time = datetime.now(timezone.utc)
        if total_delay_sec > 0:
            scheduled_time = scheduled_time + timedelta(seconds=total_delay_sec)
            status = "queued"
        else:
            status = "queued" # Changed to queued to avoid engine skip-locked logic
            
        # Deduplicação: bloqueia se já existe dispatch ativo OU recentemente concluído (últimos 30 min)
        product_for_check = mp or parsed_data.get("product_name")
        dedup_window = datetime.now(timezone.utc) - timedelta(minutes=30)
        from sqlalchemy import or_ as sql_or, and_ as sql_and

        duplicate_dispatch = db.query(models.ScheduledTrigger).filter(
            models.ScheduledTrigger.client_id == integration.client_id,
            cast(models.ScheduledTrigger.integration_id, String) == str(integration.id),
            models.ScheduledTrigger.contact_phone == phone,
            models.ScheduledTrigger.event_type == event_type,
            models.ScheduledTrigger.product_name == product_for_check,
            models.ScheduledTrigger.is_bulk == False,
            sql_or(
                # Nível 1: ainda ativo (pending/queued/processing) — qualquer momento
                models.ScheduledTrigger.status.in_(["pending", "queued", "processing"]),
                # Nível 2: já completou/falhou mas dentro dos últimos 30 min
                sql_and(
                    models.ScheduledTrigger.status.in_(["completed", "failed"]),
                    models.ScheduledTrigger.created_at >= dedup_window
                )
            )
        ).first()

        if duplicate_dispatch:
            age_info = f"criado em {duplicate_dispatch.created_at.strftime('%H:%M:%S')}" if duplicate_dispatch.created_at else ""
            logger.info(f"⏭️ [DEDUP] Dispatch duplicado bloqueado para {phone} / {product_for_check} / {event_type} — dispatch #{duplicate_dispatch.id} ({duplicate_dispatch.status} {age_info})")
            history_entry = models.WebhookHistory(
                integration_id=integration.id,
                payload=payload,
                event_type=event_type,
                status="ignored",
                error_message=f"Disparo duplicado bloqueado — dispatch #{duplicate_dispatch.id} ({duplicate_dispatch.status}) já existe para este contato/produto/evento",
                processed_data=parsed_data
            )
            db.add(history_entry)
            db.commit()
            continue

        # 1. --- ManyChat Sync ---
        if getattr(mapping, "manychat_active", False):
            mc_name = replace_variables_in_string(mapping.manychat_name or "", payload, parsed_data)
            mc_phone = replace_variables_in_string(mapping.manychat_phone or "", payload, parsed_data)
            
            # Use dynamic tag if automation is active
            if getattr(mapping, "manychat_tag_automation", False):
                mc_tag = compute_dynamic_manychat_tag(mapping)
            else:
                mc_tag = mapping.manychat_tag
            
            logger.info(f"➕ [MANYCHAT] Agendando sincronização para {mc_phone} ({mc_name}) com tag '{mc_tag}'")
            background_tasks.add_task(sync_to_manychat, integration.client_id, mc_name, mc_phone, mc_tag)

        # 2. --- Skip Trigger if no content ---
        # If no template, no funnel AND no private note, there's no point in creating a trigger
        if not template_name and not funnel_id and not private_msg_text:
            logger.info(f"⏭️ [SKIP_TRIGGER] No template, funnel or note for mapping {mapping.id}. Skipping dispatch creation.")
            continue

        st = models.ScheduledTrigger(
            conversation_id=None,
            scheduled_time=scheduled_time,
            status=status,
            contact_name=parsed_data.get("name") or phone,
            contact_phone=phone,
            template_name=template_name,
            template_components=components,
            template_language="pt_BR",
            client_id=integration.client_id,
            product_name=mp or parsed_data.get("product_name"), # Use the matched product name
            private_message=private_msg_text,
            publish_external_event=getattr(mapping, "publish_external_event", False),
            is_free_message=getattr(mapping, "send_as_free_message", False),
            event_type=event_type,
            integration_id=integration.id,
            is_bulk=False,
            cost_per_unit=0.0,
            chatwoot_label=mapping.chatwoot_label if isinstance(mapping.chatwoot_label, list) else (json.loads(mapping.chatwoot_label) if mapping.chatwoot_label and mapping.chatwoot_label.startswith('[') else ([mapping.chatwoot_label] if mapping.chatwoot_label else []))
        )
        db.add(st)
        db.commit()
        db.refresh(st)
        
        # If no delay, trigger immediately via RabbitMQ
        if total_delay_sec <= 0:
            await rabbitmq.publish("zapvoice_funnel_executions", {
                "trigger_id": st.id,
                "funnel_id": funnel_id,
                "conversation_id": None,
                "contact_phone": phone,
                "contact_name": parsed_data.get("name") or phone
            })
            logger.info(f"🚀 Template {mapping.template_name} enviado IMEDIATAMENTE. (Trigger ID: {st.id})")
        else:
            logger.info(f"⏳ Template {mapping.template_name} agendado para o evento {event_type} com delay de {total_delay_sec}s. (Trigger ID: {st.id})")

    return {"status": "success", "event": event_type, "triggered": len(unique_mappings)}

