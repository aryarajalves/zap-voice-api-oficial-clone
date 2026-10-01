import re
import unicodedata
from typing import Dict, Any, Optional
from core.logger import logger


def _clean_slug(text: str) -> str:
    """Normaliza texto para chave/slug de variável amigável (ex: 'Qual é o seu WhatsApp? *' -> 'qual_e_o_seu_whatsapp')."""
    if not text:
        return ""
    nfkd = unicodedata.normalize('NFKD', text)
    ascii_text = ''.join([c for c in nfkd if not unicodedata.combining(c)])
    cleaned = re.sub(r'[^a-zA-Z0-9\s_]', '', ascii_text)
    slug = re.sub(r'\s+', '_', cleaned.strip()).lower()
    return slug[:60].strip('_')


def _format_content(content: Any) -> str:
    """Converte conteúdo de resposta para string limpa."""
    if content is None:
        return ""
    if isinstance(content, list):
        return ", ".join(str(c).strip() for c in content if c is not None and str(c).strip())
    if isinstance(content, bool):
        return "Sim" if content else "Não"
    return str(content).strip()


def parse_yayforms(payload: dict, result: dict) -> None:
    """
    Parser para webhooks da plataforma de formulários YayForms.
    Extrai dados do lead (nome, WhatsApp, e-mail, cidade), metadados do formulário,
    respostas das perguntas como variáveis dinâmicas e define o status principal como 'formulario'.
    """
    resp = payload.get("response") if isinstance(payload.get("response"), dict) else payload

    # 1. Identificadores do formulário e envio
    form_id = str(resp.get("formId") or payload.get("formId") or "").strip()
    response_id = str(resp.get("id") or payload.get("id") or "").strip()
    user_id = str(resp.get("userId") or payload.get("userId") or "").strip()

    # 2. Data / Hora do evento
    event_time = resp.get("submittedAt") or resp.get("createdAt") or payload.get("submittedAt")
    if event_time:
        result["event_time"] = event_time

    # 3. Status principal (solicitado: Formulario)
    result["event_type"] = "formulario"
    result["raw_status"] = "Formulário"

    # 4. Geolocalização e Metadados do navegador/dispositivo
    geo = resp.get("geolocation") if isinstance(resp.get("geolocation"), dict) else (payload.get("geolocation") or {})
    city_geo = str(geo.get("city") or "").strip()
    state_geo = str(geo.get("state") or geo.get("region") or "").strip()
    country_geo = str(geo.get("country_name") or geo.get("country_code") or "Brazil").strip()
    zipcode_geo = str(geo.get("zipcode") or "").strip()

    ip_address = str(resp.get("ipAddress") or payload.get("ipAddress") or "").strip()
    browser = str(resp.get("browser") or payload.get("browser") or "").strip()
    device_type = str(resp.get("deviceType") or payload.get("deviceType") or "").strip()
    operating_system = str(resp.get("operatingSystem") or payload.get("operatingSystem") or "").strip()

    result["country"] = "BR" if country_geo.lower() in ("brazil", "brasil", "br") else country_geo

    # 5. Processamento das respostas (answers)
    answers_raw = resp.get("answers") or payload.get("answers") or {}
    if isinstance(answers_raw, dict):
        answers_list = list(answers_raw.values())
    elif isinstance(answers_raw, list):
        answers_list = answers_raw
    else:
        answers_list = []

    extracted_name = None
    extracted_phone = None
    extracted_email = None
    extracted_city = None
    detected_product_name = None

    variables: Dict[str, str] = {}
    custom_fields: Dict[str, str] = {}

    # Metadados estruturados
    if form_id:
        variables["form_id"] = form_id
        custom_fields["form_id"] = form_id
    if response_id:
        variables["response_id"] = response_id
        custom_fields["response_id"] = response_id
    if user_id:
        variables["user_id"] = user_id
    if ip_address:
        variables["ip"] = ip_address
    if browser:
        variables["browser"] = browser
    if device_type:
        variables["dispositivo"] = device_type
    if operating_system:
        variables["sistema_operacional"] = operating_system

    for item in answers_list:
        if not isinstance(item, dict):
            continue

        raw_content = item.get("content")
        field_title = str(item.get("fieldTitle") or "").strip()
        field_desc = str(item.get("fieldDescription") or "").strip()
        answer_id = str(item.get("answerId") or "").strip()
        val_str = _format_content(raw_content)

        title_lower = field_title.lower()
        desc_lower = field_desc.lower()
        title_slug = _clean_slug(field_title)

        # Se for um bloco informativo / título de formulário (content é None ou vazio)
        if raw_content is None and field_title:
            # Detecta título do formulário/evento (ex: "RETIRO CORAÇÃO CIGANO 2026")
            is_intro_title = (
                not any(p in field_title for p in ["?", ":", "•", "Qual ", "Como ", "Conte "]) and
                len(field_title) >= 4 and len(field_title) <= 90 and
                not any(ign in title_lower for ign in ["saúde e segurança", "investimento e momento", "aplicação recebida", "declaração"])
            )
            if is_intro_title and not detected_product_name:
                detected_product_name = field_title
            continue

        if not val_str:
            continue

        # Registra a variável pela slug limpa da pergunta
        if title_slug:
            variables[title_slug] = val_str
            custom_fields[title_slug] = val_str

        # Também registra no custom_fields pelo título original da pergunta
        custom_fields[field_title] = val_str
        if answer_id:
            variables[f"answer_{answer_id}"] = val_str

        # --- A. Nome Completo ---
        if not extracted_name:
            if any(k in title_lower for k in ["nome completo", "qual é o seu nome", "qual seu nome", "seu nome", "nome"]) and not any(k in title_lower for k in ["whatsapp", "email", "e-mail"]):
                extracted_name = val_str

        # --- B. WhatsApp / Telefone ---
        if not extracted_phone:
            if any(k in title_lower for k in ["whatsapp", "whats", "celular", "telefone", "phone", "mobile", "contato"]) or "ddd" in desc_lower:
                extracted_phone = val_str
            elif val_str.startswith("+") and any(c.isdigit() for c in val_str):
                extracted_phone = val_str

        # --- C. E-mail ---
        if not extracted_email:
            if any(k in title_lower for k in ["email", "e-mail"]) or ("@" in val_str and "." in val_str):
                extracted_email = val_str.lower()

        # --- D. Cidade / Onde mora ---
        if not extracted_city:
            if any(k in title_lower for k in ["onde você mora", "onde mora", "cidade", "localização", "mora atualmente"]):
                extracted_city = val_str

        # --- E. Aliases semânticos úteis para automações e templates ---
        if "investimento" in title_lower or "faixa" in title_lower:
            variables["investimento"] = val_str
            variables["faixa_investimento"] = val_str
        elif "transformação" in title_lower or "transformacao" in title_lower:
            variables["area_transformacao"] = val_str
        elif "mudança concreta" in title_lower or "mudanca concreta" in title_lower:
            variables["mudanca_concreta"] = val_str
        elif "medicinas tradicionais" in title_lower or "medicinas" in title_lower:
            variables["experiencia_medicinas"] = val_str
        elif "consagrar" in title_lower:
            variables["interesse_consagrar"] = val_str
        elif "disponibilidade" in title_lower:
            variables["disponibilidade"] = val_str
        elif "diagnóstico" in title_lower or "diagnostico" in title_lower or "saúde" in title_lower:
            variables["saude_historico"] = val_str
        elif "pronto(a) para avançar" in title_lower or "avançar" in title_lower or "avancar" in title_lower:
            variables["momento_avancar"] = val_str

    # 6. Atribuição dos campos normalizados do Lead
    if extracted_name:
        result["name"] = extracted_name
        result["nome_completo"] = extracted_name
        parts = extracted_name.split()
        result["first_name"] = parts[0] if parts else ""
        variables["nome_completo"] = extracted_name
        variables["name"] = extracted_name
        variables["first_name"] = result["first_name"]
        custom_fields["nome_completo"] = extracted_name

    if extracted_phone:
        phone_digits = "".join(filter(str.isdigit, str(extracted_phone)))
        result["phone"] = phone_digits
        variables["whatsapp"] = phone_digits
        variables["phone"] = phone_digits
        custom_fields["whatsapp"] = phone_digits

    if extracted_email:
        result["email"] = extracted_email
        variables["email"] = extracted_email
        custom_fields["email"] = extracted_email

    # Cidade e Localização
    city_final = extracted_city or city_geo
    if city_final:
        result["cidade"] = city_final
        variables["cidade"] = city_final
        custom_fields["cidade"] = city_final
    if state_geo:
        result["estado"] = state_geo
        variables["estado"] = state_geo
        custom_fields["estado"] = state_geo
    if country_geo:
        result["pais"] = country_geo
        variables["pais"] = country_geo

    # 7. Definição do Nome do Produto / Formulário
    product_name = (
        payload.get("formTitle") or
        resp.get("formTitle") or
        payload.get("title") or
        resp.get("title") or
        detected_product_name or
        (f"YayForms - {form_id}" if form_id else "Formulário YayForms")
    )
    result["product_name"] = str(product_name).strip()
    variables["product_name"] = result["product_name"]

    # 8. Mescla de variáveis e custom_fields
    result["variables"] = variables
    result["custom_fields"] = custom_fields

    logger.info(f"📋 [YAYFORMS_PARSER] Formulário processado com sucesso: lead='{result.get('name')}', phone='{result.get('phone')}', product='{result.get('product_name')}'")
