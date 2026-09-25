import json
import re
from .common import get_val

def parse_bussola_quiz(payload: dict, result: dict) -> None:
    """
    Parser para webhooks da Landing Page - Bussola Quiz (origem: quiz_bussola).
    Extrai dados do lead, nascimento, cidade, quiz, mensagem de leitura formatada e dados da carta.
    """
    def gv(keys, default=None):
        return get_val(payload, keys, default)

    # 1. Nome do Usuário
    name = (
        payload.get("nome_completo") or
        payload.get("nome") or
        gv(["data", "buyer", "name"]) or
        gv(["data", "custom_fields", "nome_completo"]) or
        payload.get("name")
    )
    if name:
        result["name"] = str(name).strip()
        result["nome_completo"] = str(name).strip()
        parts = result["name"].split()
        result["first_name"] = parts[0] if parts else ""

    # 2. Telefone / WhatsApp
    phone_raw = (
        payload.get("phone") or
        payload.get("whatsapp") or
        gv(["data", "buyer", "phone"]) or
        gv(["data", "custom_fields", "numero"]) or
        payload.get("numero") or
        payload.get("celular") or
        payload.get("telefone")
    )
    if phone_raw:
        phone_digits = "".join(filter(str.isdigit, str(phone_raw)))
        result["phone"] = phone_digits

    # 3. Email (se fornecido)
    email = (
        payload.get("email") or
        gv(["data", "buyer", "email"]) or
        gv(["data", "custom_fields", "email"])
    )
    if email:
        result["email"] = str(email).strip()

    # 4. Tipo de Evento
    tipo = str(payload.get("tipo") or "").strip().lower()
    event_raw = str(payload.get("event") or "").strip().upper()

    if tipo == "leitura_concluida" or event_raw == "LEITURA_CONCLUIDA":
        result["event_type"] = "leitura_concluida"
        result["raw_status"] = "Leitura Concluída"
    elif tipo in ("compra_aprovada", "approved") or event_raw in ("PURCHASE_APPROVED", "COMPRA_APROVADA"):
        result["event_type"] = "compra_aprovada"
        result["raw_status"] = "Compra Aprovada"
    elif tipo in ("carrinho_abandonado", "abandoned") or event_raw in ("ABANDONED_CART", "CARRINHO_ABANDONADO"):
        result["event_type"] = "carrinho_abandonado"
        result["raw_status"] = "Carrinho Abandonado"
    elif tipo in ("checkout_pre_populado", "checkout_pre-populado") or event_raw in ("PURCHASE_OUT_OF_SHOPPING_CART", "CHECKOUT_PRE_POPULADO"):
        result["event_type"] = "checkout_pre_populado"
        result["raw_status"] = "Checkout Pré-populado"
    elif tipo:
        result["event_type"] = tipo
        result["raw_status"] = tipo.replace("_", " ").title()
    elif event_raw:
        result["event_type"] = event_raw.lower()
        result["raw_status"] = event_raw.replace("_", " ").title()
    else:
        result["event_type"] = "leitura_concluida"
        result["raw_status"] = "Leitura Concluída"

    # 5. Produto / Área do Quiz
    quiz = payload.get("quiz") or {}
    area = quiz.get("area") or ""
    product_name = payload.get("product_name") or payload.get("produto")
    if not product_name:
        if area:
            product_name = f"Bússola Astrológica - {str(area).capitalize()}"
        else:
            product_name = "Bússola Astrológica - Quiz"
    result["product_name"] = str(product_name).strip()

    # 6. Mensagem Secreta / Leitura Formatada para WhatsApp
    mensagem = (
        payload.get("mensagem") or
        gv(["data", "custom_fields", "mensagem"]) or
        ""
    )
    result["mensagem"] = str(mensagem) if mensagem else ""

    # 7. ID da Leitura
    leitura_id = payload.get("leitura_id") or ""
    result["leitura_id"] = str(leitura_id)

    # 8. Data / Hora de Brasília do evento
    data_hora = (
        payload.get("data_hora_brasilia") or
        payload.get("data_hora") or
        payload.get("timestamp") or
        payload.get("created_at")
    )
    if data_hora:
        result["event_time"] = str(data_hora)

    # 9. Dados de Nascimento
    nasc = payload.get("nascimento") or gv(["data", "custom_fields", "nascimento"]) or {}
    nasc_data = ""
    nasc_hora = ""
    nasc_completo = ""
    if isinstance(nasc, dict):
        ano = nasc.get("ano")
        mes = nasc.get("mes")
        dia = nasc.get("dia")
        hora = nasc.get("hora")
        minuto = nasc.get("minuto")
        precisao = nasc.get("precisao")

        if dia and mes and ano:
            try:
                nasc_data = f"{int(dia):02d}/{int(mes):02d}/{int(ano)}"
            except Exception:
                nasc_data = f"{dia}/{mes}/{ano}"
        if hora is not None and minuto is not None:
            try:
                nasc_hora = f"{int(hora):02d}:{int(minuto):02d}"
            except Exception:
                nasc_hora = f"{hora}:{minuto}"

        if nasc_data and nasc_hora:
            nasc_completo = f"{nasc_data} {nasc_hora}"
        elif nasc_data:
            nasc_completo = nasc_data

        result["nascimento_ano"] = str(ano) if ano else ""
        result["nascimento_mes"] = str(mes) if mes else ""
        result["nascimento_dia"] = str(dia) if dia else ""
        result["nascimento_hora"] = nasc_hora
        result["nascimento_data"] = nasc_data
        result["nascimento_completo"] = nasc_completo
        result["nascimento_precisao"] = str(precisao) if precisao else ""
    elif isinstance(nasc, str):
        result["nascimento_data"] = nasc
        result["nascimento_completo"] = nasc

    # 10. Dados de Cidade
    cidade = payload.get("cidade") or gv(["data", "custom_fields", "cidade"]) or {}
    if isinstance(cidade, dict):
        cidade_nome = str(cidade.get("nome") or "").strip()
        cidade_uf = str(cidade.get("uf") or "").strip()
        cidade_completa = f"{cidade_nome} - {cidade_uf}" if cidade_nome and cidade_uf else (cidade_nome or cidade_uf)
        result["cidade_nome"] = cidade_nome
        result["cidade_uf"] = cidade_uf
        result["cidade"] = cidade_completa
        if cidade.get("lat") is not None:
            result["cidade_lat"] = str(cidade.get("lat"))
        if cidade.get("lng") is not None:
            result["cidade_lng"] = str(cidade.get("lng"))
        if cidade.get("tz"):
            result["cidade_tz"] = str(cidade.get("tz"))
    elif isinstance(cidade, str):
        result["cidade_nome"] = cidade
        result["cidade"] = cidade

    # 11. Dados do Quiz
    if isinstance(quiz, dict):
        result["quiz_area"] = str(quiz.get("area") or "")
        result["quiz_espelho"] = str(quiz.get("espelho") or "")
        result["quiz_quebra"] = str(quiz.get("quebra") or "")

    # 12. Objeto da Carta
    carta = payload.get("carta") or {}
    if isinstance(carta, dict):
        result["carta_titulo"] = str(carta.get("titulo") or "")
        result["carta_destaque"] = str(carta.get("destaque") or "")
        if carta.get("identificacao"):
            result["carta_identificacao"] = json.dumps(carta.get("identificacao"), ensure_ascii=False) if isinstance(carta.get("identificacao"), (dict, list)) else str(carta.get("identificacao"))
        if carta.get("porta"):
            result["carta_porta"] = json.dumps(carta.get("porta"), ensure_ascii=False) if isinstance(carta.get("porta"), (dict, list)) else str(carta.get("porta"))

    # 13. Agrupa Variáveis e Campos Customizados
    variables = result.get("variables") or {}
    custom_fields = result.get("custom_fields") or {}

    bussola_vars = {
        "nome_completo": result.get("nome_completo") or result.get("name") or "",
        "whatsapp": str(phone_raw or ""),
        "phone": result.get("phone") or "",
        "mensagem": result.get("mensagem") or "",
        "leitura_id": result.get("leitura_id") or "",
        "nascimento_data": result.get("nascimento_data") or "",
        "nascimento_hora": result.get("nascimento_hora") or "",
        "nascimento_completo": result.get("nascimento_completo") or "",
        "nascimento_precisao": result.get("nascimento_precisao") or "",
        "cidade": result.get("cidade") or "",
        "cidade_nome": result.get("cidade_nome") or "",
        "cidade_uf": result.get("cidade_uf") or "",
        "quiz_area": result.get("quiz_area") or "",
        "quiz_espelho": result.get("quiz_espelho") or "",
        "quiz_quebra": result.get("quiz_quebra") or "",
        "carta_titulo": result.get("carta_titulo") or "",
        "carta_destaque": result.get("carta_destaque") or "",
        "origem": str(payload.get("origem") or "quiz_bussola"),
    }

    # Mescla variáveis adicionais dentro de data.custom_fields se existirem
    raw_custom = gv(["data", "custom_fields"]) or {}
    if isinstance(raw_custom, dict):
        for k, v in raw_custom.items():
            if k not in bussola_vars and not isinstance(v, (dict, list)):
                bussola_vars[k] = str(v)

    variables.update(bussola_vars)
    custom_fields.update(bussola_vars)

    result["variables"] = variables
    result["custom_fields"] = custom_fields
    result["country"] = "BR"
    result["raw_status"] = result.get("raw_status") or "Leitura Concluída"
