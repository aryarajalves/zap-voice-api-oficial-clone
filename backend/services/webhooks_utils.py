from typing import Union, List, Optional, Any, Dict
from datetime import datetime, timezone, timedelta
import re
import json
from urllib.parse import urlparse, parse_qs
from core.logger import logger

def get_brasilia_now():
    # Simplificado: UTC-3. Idealmente usaria pytz, mas timedelta resolve aqui.
    return datetime.now(timezone.utc) - timedelta(hours=3)

def compute_dynamic_manychat_tag(mapping) -> str:
    """
    Calcula o nome da etiqueta dinâmica baseada na próxima ocorrência da rotação.
    Ex: Se hoje é sexta e o workshop é terça, retorna a data da próxima terça.
    """
    if not getattr(mapping, "manychat_tag_automation", False):
        return mapping.manychat_tag

    now = get_brasilia_now()
    prefix = mapping.manychat_tag_prefix or "tag"
    
    # Se o usuário não quiser incluir a data, retorna apenas o prefixo
    if not getattr(mapping, "manychat_tag_include_date", True):
        return prefix

    target_weekday = mapping.manychat_tag_rotation_day if mapping.manychat_tag_rotation_day is not None else 0
    rotation_time_str = mapping.manychat_tag_rotation_time or "00:00"
    
    try:
        hour, minute = map(int, rotation_time_str.split(':'))
    except:
        hour, minute = 0, 0

    # 1. Encontrar a ocorrência deste dia na semana atual
    current_weekday = now.weekday()
    # (Ex: se hoje é sexta(4) e queremos terça(1), days_until = (1-4)%7 = 4)
    days_until = (target_weekday - current_weekday) % 7
    
    candidate_date = now + timedelta(days=days_until)
    rotation_point = candidate_date.replace(hour=hour, minute=minute, second=0, microsecond=0)
    
    # 2. Se agora já passou do horário de rotação para ESSA ocorrência, pula para a próxima semana
    if now > rotation_point:
        final_date = candidate_date + timedelta(days=7)
    else:
        final_date = candidate_date
        
    tag_date = final_date.strftime("%d-%m-%Y")
    return f"{prefix}-{tag_date}"


def parse_webhook_payload(platform: str, payload: dict) -> dict:
    """
    Função dedicada para extrair os dados padronizados de diferentes plataformas.
    """
    platform_lower = str(platform or "outros").lower().strip()
    result = {
        "name": None,
        "first_name": None,
        "phone": None,
        "email": None,
        "event_type": None, # 'pix_gerado', 'compra_aprovada', 'carrinho_abandonado', 'cartao_recusado', 'pix_expirado', 'outros'
        "country": None,
        "product_name": None,
        "order_bump": False,
        "order_bump_products": [],
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
        "items": [],
        "is_stress_test": bool(payload.get("_zapvoice_stress_test"))
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
        return str(val).strip().replace('\u00a0', ' ')

    if platform_lower == 'hotmart':
        from services.utils.webhook_platform_parsers import parse_hotmart
        parse_hotmart(payload, result)
    elif platform_lower == 'kiwify':
        from services.utils.webhook_platform_parsers import parse_kiwify
        parse_kiwify(payload, result)
    elif platform_lower == 'eduzz':
        from services.utils.webhook_platform_parsers import parse_eduzz
        parse_eduzz(payload, result)
    elif platform_lower == 'kirvano':
        from services.utils.webhook_platform_parsers import parse_kirvano
        parse_kirvano(payload, result)
    elif platform_lower == 'pagtrust':
        from services.utils.webhook_platform_parsers import parse_pagtrust
        parse_pagtrust(payload, result)
    elif platform_lower == 'ticto':
        from services.utils.webhook_platform_parsers import parse_ticto
        parse_ticto(payload, result)
    elif platform_lower == 'pepper':
        from services.utils.webhook_platform_parsers import parse_pepper
        parse_pepper(payload, result)
    elif platform_lower == 'braip':
        from services.utils.webhook_platform_parsers import parse_braip
        parse_braip(payload, result)
    elif platform_lower == 'monetizze':
        from services.utils.webhook_platform_parsers import parse_monetizze
        parse_monetizze(payload, result)
    elif platform_lower == 'cakto':
        from services.utils.webhook_platform_parsers import parse_cakto
        parse_cakto(payload, result)
    elif platform_lower == 'guru':
        from services.utils.webhook_platform_parsers import parse_guru
        parse_guru(payload, result)
    elif platform_lower == 'lastlink':
        from services.utils.webhook_platform_parsers import parse_lastlink
        parse_lastlink(payload, result)
    elif platform_lower == 'hubla':
        from services.utils.webhook_platform_parsers import parse_hubla
        parse_hubla(payload, result)
    elif platform_lower == 'greenn':
        from services.utils.webhook_platform_parsers import parse_greenn
        parse_greenn(payload, result)
    elif platform_lower == 'herospark':
        from services.utils.webhook_platform_parsers import parse_herospark
        parse_herospark(payload, result)
    elif platform_lower == 'appmax':
        from services.utils.webhook_platform_parsers import parse_appmax
        parse_appmax(payload, result)
    elif platform_lower == 'zapgroup':
        from services.utils.webhook_platform_parsers import parse_zapgroup
        parse_zapgroup(payload, result)
    elif platform_lower in ['elementor', 'generic', 'outra', 'outros']:
        # Tenta capturar campos comuns em payloads desconhecidos
        result['name'] = (
            get_val(["name"]) or get_val(["first_name"]) or get_val(["full_name"]) or 
            get_val(["nome"]) or get_val(["buyer_name"]) or get_val(["customer_name"]) or
            get_val(["contact_name"]) or
            get_val(["data", "name"]) or get_val(["data", "customer", "name"])
        )
        result['email'] = (
            get_val(["email"]) or get_val(["email_address"]) or 
            get_val(["contact_email"]) or
            get_val(["data", "email"]) or get_val(["customer", "email"])
        )
        result['phone'] = (
            get_val(["phone"]) or get_val(["telephone"]) or get_val(["cellphone"]) or 
            get_val(["whatsapp"]) or get_val(["phone_number"]) or get_val(["mobile"]) or
            get_val(["celular"]) or get_val(["telefone"]) or
            get_val(["contact_phone"]) or get_val(["contact_phone_number"]) or
            get_val(["data", "phone"]) or get_val(["customer", "phone"]) or
            get_val(["fields", "whatsapp"]) or get_val(["form", "phone"])
        )
        result['product_name'] = (
            get_val(["product"]) or get_val(["product_name"]) or get_val(["item_name"]) or
            get_val(["data", "product", "name"]) or get_val(["form_name"])
        )
        result['event_type'] = (
            get_val(["event"]) or get_val(["event_type"]) or get_val(["status"]) or 
            ("form_submission" if platform_lower == "elementor" else "outros")
        )

    # Standardize Phone (Generic Fallback)
    if not result.get('phone'):
        # Tenta buscar nas chaves do payload de forma case-insensitive se for Elementor ou similar
        for k, v in payload.items():
            k_lower = k.lower()
            if "fields[" in k_lower and "][value]" in k_lower:
                if any(x in k_lower for x in ["phone", "tel", "cell", "whats", "cel"]):
                    result['phone'] = v
                    break

    if not result.get('phone'):
        result['phone'] = (
            payload.get("phone") or payload.get("phone_number") or payload.get("celular") or 
            payload.get("telefone") or payload.get("mobile") or payload.get("whatsapp") or
            payload.get("Telefone") or payload.get("Celular") or payload.get("Whatsapp") or
            payload.get("contact_phone") or payload.get("contact_phone_number") or
            payload.get("contact_whatsapp") or
            payload.get("WhatsApp") or
            payload.get("fields[phone][value]") or payload.get("fields[whatsapp][value]") or
            payload.get("fields[telefone][value]") or payload.get("fields[celular][value]") or
            get_val(["fields", "phone"]) or get_val(["fields", "phone", "value"]) or
            get_val(["respondent", "answers", "INFORME AQUI QUAL O MELHOR NÚMERO PARA FALAR COM VOCÊ NO WHATS"]) or
            get_val(["respondent", "answers", "WHATSAPP"]) or get_val(["respondent", "answers", "TELEFONE"]) or
            get_val(["customer", "phone"]) or get_val(["customer", "phone_number"]) or
            get_val(["buyer", "phone"]) or get_val(["data", "buyer", "phone"]) or
            get_val(["fields", "celular"]) or get_val(["fields", "whatsapp"]) or 
            get_val(["cliente", "phone"])
        )
    
    # Standardize Name (Generic Fallback)
    if not result.get('name'):
        result['name'] = (
            payload.get("name") or payload.get("fullname") or payload.get("first_name") or
            payload.get("nome") or payload.get("nome_completo") or payload.get("full_name") or
            payload.get("primeiro_nome") or payload.get("Nome") or payload.get("Nome Completo") or
            payload.get("fields[name][value]") or payload.get("fields[nome][value]") or
            get_val(["fields", "name"]) or get_val(["fields", "name", "value"]) or
            get_val(["respondent", "answers", "SEU NOME COMPLETO"]) or
            get_val(["respondent", "answers", "NOME COMPLETO"]) or
            get_val(["respondent", "answers", "NOME"]) or
            get_val(["customer", "name"]) or get_val(["buyer", "name"]) or
            get_val(["fields", "nome"]) or get_val(["data", "buyer", "name"])
        )

    # Standardize Email (Generic Fallback)
    if not result.get('email'):
        result['email'] = (
            payload.get("email") or payload.get("mail") or payload.get("contactEmail") or
            payload.get("fields[email][value]") or
            get_val(["respondent", "answers", "SEU MELHOR E-MAIL"]) or
            get_val(["respondent", "answers", "E-MAIL"]) or
            get_val(["respondent", "answers", "Email"]) or
            get_val(["customer", "email"]) or get_val(["buyer", "email"]) or
            get_val(["fields", "email"])
        )

    # Standardize Product Name (Generic Fallback)
    if not result.get('product_name'):
        products = payload.get("products")
        if isinstance(products, list) and len(products) > 0:
            main_product = next((p for p in products if not p.get("is_order_bump")), products[0])
            result['product_name'] = main_product.get("name")
            ob_products = [p for p in products if p.get("is_order_bump")]
            if ob_products:
                result['order_bump_products'] = [
                    {'name': p.get('name'), 'price': p.get('price')} for p in ob_products
                ]
        
        if not result.get('product_name'):
            result['product_name'] = (
                payload.get("product_name") or payload.get("produto") or
                get_val(["product", "name"]) or get_val(["Product", "product_name"]) or
                get_val(["form", "form_name"])
            )

    # Kirvano / Eduzz: mesmo payload com OB embutido → event_type diferente
    if result.get('order_bump_products') and result.get('event_type') == 'compra_aprovada':
        result['event_type'] = 'compra_aprovada_com_ob'

    # Price Normalization
    if not result.get('price'):
        val = (
            payload.get("total_price") or payload.get("amount") or 
            payload.get("net_value") or payload.get("total_amount") or 
            payload.get("price") or payload.get("valor") or
            get_val(["fiscal", "total_value"]) or
            get_val(["data", "amount"]) or get_val(["payment", "amount"]) or
            get_val(["Commissions", "charge_amount"])
        )
        if val: result['price'] = val

    price_to_normalize = result.get('price')
    if price_to_normalize:
        try:
            is_cents = False
            f_val = 0.0
            val = price_to_normalize
            if isinstance(val, (int, float)):
                f_val = float(val)
                is_cents = isinstance(val, int) or (f_val == int(f_val))
            elif isinstance(val, str):
                val_clean = val.replace('\u00a0', ' ').replace("R$", "").replace("$", "").replace(" ", "").strip()
                if "," in val_clean and "." in val_clean:
                    val_clean = val_clean.replace(".", "").replace(",", ".")
                elif "," in val_clean:
                    val_clean = val_clean.replace(",", ".")
                is_cents = "." not in val_clean
                f_val = float(val_clean)
            
            if is_cents and platform_lower == 'kiwify':
                f_val = f_val / 100
            
            currency = str(result.get('currency') or payload.get("currency") or get_val(["Commissions", "currency"]) or "BRL").upper()
            result['currency'] = currency
            rates = {"USD": 5.45, "EUR": 5.85, "GBP": 6.80, "MXN": 0.30}
            if currency != "BRL" and currency in rates:
                f_val = f_val * rates[currency]
            result['price'] = f"{f_val:.2f}"
        except:
            result['price'] = str(price_to_normalize)

    # Final event_type fallback
    if not result.get('event_type'):
        event_raw = payload.get("event") or payload.get("status") or payload.get("event_type") or ("form_submission" if platform_lower == "elementor" else "outros")
        result['event_type'] = str(event_raw).lower().replace(".", "_")

    # Map status to a friendly name
    raw_val = str(result.get('raw_status') or result.get('status') or payload.get("status") or payload.get("event") or result.get("event_type") or "outros").upper()
    friendly_map = {
        "APPROVED": "Compra Aprovada", "SALE_APPROVED": "Compra Aprovada", "PAID": "Compra Aprovada",
        "COMPLETED": "Compra Aprovada", "COMPLETE": "Compra Aprovada",
        "COMPRA_APROVADA": "Compra Aprovada", "PIX_GERADO": "Pix Gerado", "BOLETO_IMPRESSO": "Boleto Impresso",
        "REEMBOLSO": "Reembolso", "CARTAO_RECUSADO": "Cartão Recusado", "CARRINHO_ABANDONADO": "Carrinho Abandonado",
        "PIX_EXPIRADO": "Pix Expirado", "EVENTO_ALUNO": "Evento do Aluno", "OUTROS": "Outros",
        "PENDING": "Pix Gerado", "WAITING_PAYMENT": "Pix Gerado", "REFUNDED": "Reembolso",
        "PURCHASE_REFUNDED": "Reembolso", "PURCHASE_CANCELED": "Compra Cancelada",
        "REFUSED": "Cartão Recusado", "ABANDONED_CART": "Carrinho Abandonado", "ABANDONED": "Carrinho Abandonado",
        "WAITING": "Aguardando", "CANCELED": "Cancelado", "EXPIRED": "Expirado",
        "COMMISSION_PROCESSED": "Comissão Processada",
        "OPEN": "Aguardando o Pagamento",
        "WAITING_REFUND": "Aguardando Reembolso",
        "BOLETO_IMPRESSO": "Boleto Impresso",
        "CHARGEBACK": "Reembolso",
        "DELAYED": "Cartão Recusado",
        "DISPUTE": "Em Disputa",
        "CLUB_FIRST_ACCESS": "Primeiro Acesso ao Club",
        "CLUB_MODULE_COMPLETED": "Módulo Concluído",
        "PURCHASE_OUT_OF_SHOPPING_CART": "Carrinho Abandonado",
        "SUBSCRIPTION_CANCELLATION": "Assinatura Cancelada",
        "SUBSCRIPTION_CANCELED": "Assinatura Cancelada",
        "ASSINATURA_CANCELADA": "Assinatura Cancelada",
        "SUBSCRIPTION_EXPIRED": "Assinatura Atrasada",
        "ASSINATURA_ATRASADA": "Assinatura Atrasada",
        "SUBSCRIPTION_RENEWED":  "Assinatura Renovada",
        "ASSINATURA_RENOVADA":   "Assinatura Renovada",
        "BANK_SLIP_GENERATED": "Boleto Gerado",
        "BANK_SLIP_EXPIRED": "Boleto Expirado",
        "BOLETO_EXPIRADO": "Boleto Expirado",
        "PIX_GENERATED": "PIX Gerado",
        "PIX_EXPIRED": "PIX Expirado",
        "SALE_REFUSED": "Cartão Recusado",
        "SALE_CHARGEBACK": "Chargeback",
        "SALE_REFUNDED": "Reembolso",
        "SWITCH_PLAN": "Troca de Plano",
        "UPDATE_SUBSCRIPTION_CHARGE_DATE": "Alteração de Vencimento"
    }
    result['raw_status'] = friendly_map.get(raw_val, raw_val.capitalize())

    # Phone Normalization (The 9-digit fix)
    if result.get("phone"):
        cleaned = ''.join(filter(str.isdigit, str(result["phone"])))
        if not cleaned.startswith("55") and len(cleaned) <= 11:
            cleaned = "55" + cleaned
        if cleaned.startswith("55") and len(cleaned) == 12:
            ddd = cleaned[2:4]
            number = cleaned[4:]
            cleaned = f"55{ddd}9{number}"
        result["phone"] = cleaned

    # Country Detection (fallback after platform parser)
    if not result.get("country"):
        # 1. Try currency-based detection
        currency = str(result.get("currency") or "").upper()
        currency_country_map = {
            "BRL": "BR", "USD": "US", "EUR": "PT", "ARS": "AR",
            "CLP": "CL", "COP": "CO", "MXN": "MX", "PEN": "PE",
            "UYU": "UY", "PYG": "PY", "BOB": "BO", "VEF": "VE",
            "GBP": "GB", "CAD": "CA", "AUD": "AU",
        }
        if currency and currency in currency_country_map:
            result["country"] = currency_country_map[currency]

        # 2. If currency was BRL or still missing, try phone prefix
        if not result.get("country") or result.get("country") == "BR":
            phone_digits = ''.join(filter(str.isdigit, str(result.get("phone") or "")))
            if phone_digits:
                # Common country codes to ISO mapping (longest prefix first)
                phone_prefix_map = [
                    ("351", "PT"),  # Portugal
                    ("376", "AD"),  # Andorra
                    ("598", "UY"),  # Uruguay
                    ("595", "PY"),  # Paraguay
                    ("591", "BO"),  # Bolivia
                    ("593", "EC"),  # Ecuador
                    ("502", "GT"),  # Guatemala
                    ("503", "SV"),  # El Salvador
                    ("504", "HN"),  # Honduras
                    ("505", "NI"),  # Nicaragua
                    ("506", "CR"),  # Costa Rica
                    ("507", "PA"),  # Panama
                    ("569", "CL"),  # Chile (alt)
                    ("549", "AR"),  # Argentina (alt)
                    ("521", "MX"),  # Mexico (mobile)
                    ("44", "GB"),   # UK
                    ("61", "AU"),   # Australia
                    ("55", "BR"),   # Brazil
                    ("54", "AR"),   # Argentina
                    ("56", "CL"),   # Chile
                    ("57", "CO"),   # Colombia
                    ("58", "VE"),   # Venezuela
                    ("51", "PE"),   # Peru
                    ("52", "MX"),   # Mexico
                    ("1", "US"),    # USA/Canada
                ]
                for prefix, iso in phone_prefix_map:
                    if phone_digits.startswith(prefix):
                        result["country"] = iso
                        break

    # Name Validation
    if result.get("name") and platform_lower != "zapgroup":
        name_val = str(result["name"]).strip()
        if name_val.isdigit() or len(name_val) <= 1:
             result["name"] = None

    # Tradução Global de Forma de Pagamento
    if result.get("payment_method"):
        pm_clean = str(result["payment_method"]).strip().lower().replace("_", "").replace("-", "").replace(" ", "")
        pm_map = {
            "creditcard": "Cartão de Crédito",
            "credit_card": "Cartão de Crédito",
            "cardpix": "Cartão de Crédito",
            "card_pix": "Cartão de Crédito",
            "pix": "Pix",
            "billet": "Boleto",
            "boleto": "Boleto",
            "banktransfer": "Transferência",
            "directdebit": "Débito",
            "paypal": "PayPal",
            "transferencia": "Transferência",
            "debito": "Débito",
            "cartao": "Cartão de Crédito",
            "cartaodecredito": "Cartão de Crédito"
        }
        result["payment_method"] = pm_map.get(pm_clean, result["payment_method"])

    # First Name Extraction
    if result.get("name"):
        parts = str(result["name"]).strip().split()
        result["first_name"] = parts[0] if parts else ""
    else:
        result["first_name"] = ""

    return result

def extract_mapped_variables(payload: dict, parsed_data: dict, mapping_config: Union[dict, list], header_format: str = None) -> list:
    components = []
    if not mapping_config:
        return components
    
    body_params = []
    header_params = []
    button_params = []

    def extract_value(key, custom_val=None):
        # Se o valor for 'custom', usamos o custom_val (que pode ser um path ou valor fixo)
        lookup_key = custom_val if key == 'custom' else key
        if not lookup_key:
            return ""
            
        # Tenta no parsed_data primeiro (chaves simples como 'name', 'phone')
        if lookup_key in parsed_data:
            val = parsed_data.get(lookup_key)
            if val is not None: return str(val)
            
        # Se não achou ou é um path, tenta no payload bruto (suporta caminhos aninhados)
        parts = str(lookup_key).split('.')
        curr = payload
        for p in parts:
            if isinstance(curr, dict) and p in curr:
                curr = curr[p]
            else:
                curr = None
                break
        
        if curr is not None:
            return str(curr)
            
        # Se for um mapeamento customizado e não encontramos no payload
        if key == 'custom' and lookup_key:
            lookup_str = str(lookup_key)
            # Se parecer uma URL ou um valor fixo sem pontos, retornamos como está
            if lookup_str.startswith(("http://", "https://")) or "." not in lookup_str:
                return lookup_str
            
        return ""

    # Caso 1: Formato Novo (Lista de Objetos) - Vindo do Frontend atualizado
    if isinstance(mapping_config, list):
        for var in mapping_config:
            key_index = var.get("key")
            val_type = var.get("value")
            custom_val = var.get("custom_value")
            comp_type = var.get("type", "body")
            
            extracted_text = extract_value(val_type, custom_val)
            param = {"type": "text", "text": extracted_text if extracted_text else "-"}
            
            if comp_type == "body":
                body_params.append(param)
            elif comp_type == "header":
                # Para header, se for mídia, o formato é diferente (link)
                if header_format in ["IMAGE", "VIDEO", "DOCUMENT"]:
                    media_type = header_format.lower()
                    header_params.append({"type": media_type, media_type: {"link": extracted_text}})
                else:
                    header_params.append(param)
            elif comp_type == "button":
                button_params.append(param)

    # Caso 2: Formato Antigo (Dicionário) - Legado
    elif isinstance(mapping_config, dict):
        body_mapping = {k: v for k, v in mapping_config.items() if k.isdigit()}
        for index_str, key in sorted(body_mapping.items(), key=lambda x: int(x[0])):
            val = extract_value(key)
            body_params.append({"type": "text", "text": val if val else "-"})
            
        header_url_key = mapping_config.get("header_url")
        if header_url_key and header_format in ["IMAGE", "VIDEO", "DOCUMENT"]:
            val = extract_value(header_url_key)
            if val:
                media_type = header_format.lower()
                header_params.append({
                    "type": "header",
                    "parameters": [{"type": media_type, media_type: {"link": val}}]
                })

    # Monta os componentes finais
    if body_params:
        components.append({"type": "body", "parameters": body_params})
    if header_params:
        # Se for mídia, o componente header já vem formatado internamente no Caso 2, 
        # mas no Caso 1 precisamos envelopar
        if isinstance(header_params[0], dict) and "type" in header_params[0] and header_params[0]["type"] in ["image", "video", "document"]:
             components.append({"type": "header", "parameters": header_params})
        else:
             components.append({"type": "header", "parameters": header_params})
    if button_params:
        # Botões na API da Meta costumam ser componentes separados por índice
        for idx, btn_param in enumerate(button_params):
            components.append({
                "type": "button",
                "sub_type": "url",
                "index": idx,
                "parameters": [btn_param]
            })

    return components

def extract_nested_custom_fields(payload: dict, mapping: dict) -> dict:
    custom_fields = {}
    if not mapping:
        return custom_fields
    for field_name, json_paths_str in mapping.items():
        if not json_paths_str:
            continue
        # Suporta múltiplos caminhos separados por vírgula como fallback
        paths = [p.strip() for p in str(json_paths_str).split(',') if p.strip()]
        for path in paths:
            parts = path.split('.')
            curr = payload
            for p in parts:
                if isinstance(curr, dict) and p in curr:
                    curr = curr[p]
                else:
                    curr = None
                    break
            if curr is not None and str(curr).strip() != "":
                custom_fields[field_name] = str(curr).strip()
                break # Usou o primeiro fallback que deu certo, para
    return custom_fields

def apply_custom_mapping_to_parsed_data(payload: dict, parsed_data: dict, custom_fields_mapping: dict) -> dict:
    """
    Aplica o mapeamento de campos customizados sobre os dados extraídos por padrão do payload do webhook.
    Garante suporte a múltiplos fallbacks por campo e substituição robusta das variáveis principais.
    """
    final_vars = parsed_data.copy()
    
    # Adiciona resolução robusta padrão
    final_vars["name"] = replace_variables_in_string("{{name}}", payload, parsed_data)
    final_vars["phone"] = replace_variables_in_string("{{phone}}", payload, parsed_data)
    final_vars["email"] = replace_variables_in_string("{{email}}", payload, parsed_data)

    if custom_fields_mapping:
        custom_vars = extract_nested_custom_fields(payload, custom_fields_mapping)
        final_vars.update(custom_vars)
        
        # Sincroniza campos principais se foram mapeados customizados
        for field in ["name", "phone", "email", "product_name", "price", "payment_method"]:
            if field in custom_vars:
                final_vars[field] = custom_vars[field]
                
    return final_vars

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
        "pix_code": "pix_code",
        "first_name": "first_name",
        "primeiro_nome": "first_name"
    }

    # 1. Se o texto for uma chave simples conhecida (sem {{ }}), resolve direto
    text_stripped = text.strip()
    if text_stripped in SIMPLE_KEY_MAP and "{{" not in text_stripped:
        val = parsed_data.get(SIMPLE_KEY_MAP[text_stripped])
        # Fallback se name estiver presente mas first_name não
        if val is None and text_stripped in ["first_name", "primeiro_nome"]:
            contact_name = parsed_data.get("name")
            if contact_name:
                parts = str(contact_name).strip().split()
                val = parts[0] if parts else ""
            else:
                val = ""
        return str(val) if val is not None else ""

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
        
        # Tenta no parsed_data primeiro
        val = None
        if key in SIMPLE_KEY_MAP:
            val = parsed_data.get(SIMPLE_KEY_MAP[key])
            if val is None and key in ["first_name", "primeiro_nome"]:
                contact_name = parsed_data.get("name")
                if contact_name:
                    parts = str(contact_name).strip().split()
                    val = parts[0] if parts else ""
                else:
                    val = ""
        elif key in parsed_data:
            val = parsed_data.get(key)
            
        # Se não achou, tenta no payload bruto (suporta caminhos aninhados)
        if val is None:
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
        else:
            # Se não achou de jeito nenhum, limpa a variável para não enviar o texto bruto
            text = text.replace(f"{{{{{match}}}}}", "")

    return text
