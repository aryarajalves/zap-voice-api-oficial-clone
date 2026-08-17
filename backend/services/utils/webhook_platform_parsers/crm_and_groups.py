import re as _re
from .common import get_doc_label


def parse_greenn(payload: dict, result: dict) -> None:
    """Parser para webhooks da Greenn (sale, contract, lead)."""
    wh_type = str(payload.get("type") or "").lower()
    event = str(payload.get("event") or "").lower()
    product = payload.get("product") or {}

    result['product_name'] = product.get("name") or None
    custom_fields = {}

    if wh_type == "sale":
        sale = payload.get("sale") or {}
        client = payload.get("client") or {}
        current_status = str(sale.get("status") or payload.get("currentStatus") or "").lower()
        method = str(sale.get("method") or product.get("method") or "").upper()

        is_pix = "PIX" in method
        is_boleto = "BOLETO" in method

        # Detecta upsell se o nome do produto contiver "upsell" ou "upgrade"
        prod_name_lower = str(product.get("name") or "").lower()
        is_upsell = "upsell" in prod_name_lower or "upgrade" in prod_name_lower
        
        products = payload.get("products") or []
        ob_products = [p for p in products if p.get("is_order_bump")]

        if current_status == "paid":
            if is_upsell:
                result['event_type'] = "compra_aprovada_upsell"
            elif ob_products:
                result['event_type'] = "compra_aprovada_com_ob"
            else:
                result['event_type'] = "compra_aprovada"
        elif current_status == "waiting_payment":
            if is_pix:
                result['event_type'] = "pix_gerado"
            elif is_boleto:
                result['event_type'] = "boleto_impresso"
            else:
                result['event_type'] = "boleto_impresso"
        elif current_status == "refused":
            if is_pix:
                result['event_type'] = "pix_expirado"
            elif is_boleto:
                result['event_type'] = "boleto_expirado"
            else:
                result['event_type'] = "cartao_recusado"
        elif current_status == "refunded":
            result['event_type'] = "reembolso"
        elif current_status == "chargedback":
            result['event_type'] = "chargeback"

        result['name'] = client.get("name") or None
        result['email'] = client.get("email") or None
        
        # Limpa telefone: remove +, espaços e caracteres não numéricos
        phone_raw = str(client.get("cellphone") or "").strip()
        phone_clean = _re.sub(r'\D', '', phone_raw)
        result['phone'] = phone_clean if phone_clean else None

        raw_price = sale.get("amount")
        if raw_price is not None:
            try:
                result['price'] = f"{float(raw_price):.2f}"
            except Exception:
                result['price'] = str(raw_price)

        result['payment_method'] = method.lower() if method else None
        result['country'] = "BR"
        result['raw_status'] = current_status.upper() if current_status else None

        # CPF / CNPJ do comprador
        doc = str(client.get("cpf_cnpj") or "").strip()
        if doc:
            doc_label = get_doc_label(doc)
            custom_fields[doc_label] = doc

        # Order Bump e Upsell adicionais
        if ob_products:
            bump_names = ", ".join(str(p.get("name") or "Produto OB") for p in ob_products)
            custom_fields["Produto(s) Order Bump"] = bump_names
            result["order_bump"] = True

        if is_upsell:
            result["is_upsell"] = True

    elif wh_type == "contract":
        current_sale = payload.get("currentSale") or {}
        client = payload.get("client") or {}
        contract = payload.get("contract") or {}
        current_status = str(contract.get("status") or payload.get("currentStatus") or "").lower()
        method = str(current_sale.get("method") or "").upper()

        if current_status == "paid":
            result['event_type'] = "assinatura_renovada"
        elif current_status == "trialing":
            result['event_type'] = "compra_aprovada"
        elif current_status in ("pending_payment", "unpaid"):
            result['event_type'] = "assinatura_atrasada"
        elif current_status == "canceled":
            result['event_type'] = "assinatura_cancelada"

        result['name'] = client.get("name") or None
        result['email'] = client.get("email") or None
        
        # Limpa telefone
        phone_raw = str(client.get("cellphone") or "").strip()
        phone_clean = _re.sub(r'\D', '', phone_raw)
        result['phone'] = phone_clean if phone_clean else None

        raw_price = current_sale.get("amount") or product.get("amount")
        if raw_price is not None:
            try:
                result['price'] = f"{float(raw_price):.2f}"
            except Exception:
                result['price'] = str(raw_price)

        result['payment_method'] = method.lower() if method else None
        result['country'] = "BR"
        result['raw_status'] = current_status.upper() if current_status else None

        # CPF / CNPJ do comprador
        doc = str(client.get("cpf_cnpj") or "").strip()
        if doc:
            doc_label = get_doc_label(doc)
            custom_fields[doc_label] = doc

    elif wh_type == "lead" and event == "checkoutabandoned":
        lead = payload.get("lead") or {}
        result['event_type'] = "carrinho_abandonado"
        result['name'] = lead.get("name") or None
        result['email'] = lead.get("email") or None
        
        # Limpa telefone
        phone_raw = str(lead.get("cellphone") or "").strip()
        phone_clean = _re.sub(r'\D', '', phone_raw)
        result['phone'] = phone_clean if phone_clean else None
        
        result['country'] = "BR"
        result['raw_status'] = "CHECKOUT_ABANDONED"

    if custom_fields:
        result['custom_fields'] = custom_fields


def parse_herospark(payload: dict, result: dict) -> None:
    """
    Parser para webhooks da HeroSpark (Liquid / custom payload).
    """
    event = str(payload.get("event") or "").upper().strip()
    buyer = payload.get("buyer") or {}
    product = payload.get("product") or {}
    purchase = payload.get("purchase") or {}
    price_obj = purchase.get("price") or {}
    payment = purchase.get("payment") or {}
    method = str(payment.get("type") or "").lower()
    subscription = purchase.get("subscription") or {}

    is_pix = "pix" in method
    is_boleto = "bank_slip" in method or "boleto" in method

    # ---- Flags de Order Bump e Upsell ----
    bump_used = bool(payload.get("purchaseBumpUsed")) or bool(payload.get("bump"))
    upsell    = bool(payload.get("upsell"))

    # ---- Event type mapping ----
    if event == "PURCHASE_APPROVED":
        if upsell:
            result['event_type'] = "compra_aprovada_upsell"
        elif bump_used:
            result['event_type'] = "compra_aprovada_com_ob"
        else:
            result['event_type'] = "compra_aprovada"
    elif event == "PURCHASE_CANCELED":
        if is_pix:
            result['event_type'] = "pix_expirado"
        elif is_boleto:
            result['event_type'] = "boleto_expirado"
        else:
            result['event_type'] = "cartao_recusado"
    elif event == "PURCHASE_BILLET_PRINTED":
        result['event_type'] = "pix_gerado" if is_pix else "boleto_impresso"
    elif event in ("PURCHASE_REFUNDED",):
        result['event_type'] = "reembolso"
    elif event in ("PURCHASE_CHARGEBACK", "PURCHASE_PROTEST"):
        result['event_type'] = "chargeback"
    elif event == "PURCHASE_EXPIRED":
        result['event_type'] = "pix_expirado" if is_pix else "boleto_expirado"
    elif event == "PURCHASE_DELAYED":
        result['event_type'] = "assinatura_atrasada"
    elif event == "PURCHASE_OUT_OF_SHOPPING_CART":
        result['event_type'] = "carrinho_abandonado"
    elif event == "SUBSCRIPTION_CANCELED":
        result['event_type'] = "assinatura_cancelada"
    elif event == "SUBSCRIPTION_RENEWED":
        result['event_type'] = "assinatura_renovada"

    # ---- Buyer info ----
    result['name'] = buyer.get("name") or None
    result['email'] = buyer.get("email") or None

    # Limpa telefone: remove +, espaços e caracteres não numéricos
    phone_raw = str(buyer.get("phone") or "").strip()
    phone_clean = _re.sub(r'\D', '', phone_raw)
    result['phone'] = phone_clean if phone_clean else None

    # ---- Product ----
    result['product_name'] = product.get("name") or None

    # ---- Price (offer_price is in cents) ----
    raw_price = price_obj.get("value") or price_obj.get("gross")
    if raw_price is not None:
        try:
            cents = float(raw_price)
            result['price'] = f"{(cents / 100 if cents > 1000 else cents):.2f}"
        except Exception:
            result['price'] = str(raw_price)

    # ---- Payment method ----
    result['payment_method'] = method or None

    # ---- Country default BR ----
    result['country'] = "BR"

    # ---- Raw status ----
    result['raw_status'] = event or None

    # ---- Campos extras (custom_fields) ----
    custom_fields = {}

    # CPF / CNPJ / documento do comprador
    doc = str(buyer.get("doc") or "").strip()
    if doc:
        doc_label = get_doc_label(doc)
        custom_fields[doc_label] = doc

    # Assinatura (apenas status se houver)
    sub_status = str(subscription.get("status") or "").strip() if isinstance(subscription, dict) else ""
    if sub_status:
        custom_fields["Status Assinatura"] = sub_status

    # Produtos do Order Bump (array "bump")
    bump_items = payload.get("bump") or []
    if isinstance(bump_items, list) and bump_items:
        bump_names = ", ".join(
            str(b.get("name") or "Produto OB") for b in bump_items if isinstance(b, dict)
        )
        if bump_names:
            custom_fields["Produto(s) Order Bump"] = bump_names

    if custom_fields:
        result['custom_fields'] = custom_fields

    # Flags para uso pelo sistema de disparo
    if bump_used:
        result['order_bump'] = True
    if upsell:
        result['is_upsell'] = True


def parse_appmax(payload: dict, result: dict) -> None:
    """Parser para webhooks da Appmax."""
    data = payload.get("data") or {}
    status = str(data.get("status") or "").lower().strip()
    payment_type = str(data.get("payment_type") or data.get("payment_method") or "").lower().strip()
    subscription = data.get("subscription") or {}
    customer = data.get("customer") or {}
    products = data.get("products") or []

    is_pix = "pix" in payment_type
    is_boleto = "boleto" in payment_type

    # ---- Event type mapping ----
    if status in ("aprovado", "integrado", "autorizado", "processing"):
        result['event_type'] = "compra_aprovada"
    elif status == "waiting_payment":
        if is_pix:
            result['event_type'] = "pix_gerado"
        elif is_boleto:
            result['event_type'] = "boleto_impresso"
        else:
            result['event_type'] = "boleto_impresso"
    elif status in ("estornado", "pending_refund"):
        result['event_type'] = "reembolso"
    elif status == "cancelado":
        if is_pix:
            result['event_type'] = "pix_expirado"
        elif is_boleto:
            result['event_type'] = "boleto_expirado"
        else:
            result['event_type'] = "cartao_recusado"
    elif status == "analyzing":
        result['event_type'] = "cartao_recusado"

    # Override for subscription-level status if present
    sub_status = str(subscription.get("status") or "").lower().strip()
    if sub_status == "canceled":
        result['event_type'] = "assinatura_cancelada"
    elif sub_status in ("unpaid", "overdue", "atrasada"):
        result['event_type'] = "assinatura_atrasada"
    elif sub_status in ("active", "renewed") and status in ("aprovado", "integrado", "autorizado"):
        result['event_type'] = "assinatura_renovada"

    # ---- Customer ----
    first = str(customer.get("firstname") or "").strip()
    last = str(customer.get("lastname") or "").strip()
    full_name = f"{first} {last}".strip() if first or last else None
    result['name'] = full_name or None
    result['email'] = customer.get("email") or None
    phone_raw = str(customer.get("telephone") or customer.get("phone") or "").strip().lstrip("+")
    result['phone'] = phone_raw if phone_raw else None

    # ---- Product ----
    if products:
        result['product_name'] = products[0].get("name") or None

    # ---- Price (BRL, not cents) ----
    raw_total = data.get("total") or data.get("full_payment_amount")
    if raw_total is not None:
        try:
            result['price'] = f"{float(raw_total):.2f}"
        except Exception:
            result['price'] = str(raw_total)

    # ---- Payment method ----
    result['payment_method'] = payment_type or None

    # ---- Country ----
    result['country'] = "BR"

    # ---- Raw status ----
    result['raw_status'] = status or None


def parse_zapgroup(payload: dict, result: dict) -> None:
    """Parser para a plataforma ZapGroup (Extração de Leads e Votos de Enquete de Grupos do WhatsApp)."""
    # 1. Nome e Telefone do Contato / Usuário
    usuario = payload.get("usuario")
    if isinstance(usuario, dict):
        result['name'] = usuario.get("nome") or usuario.get("name") or usuario.get("contact_name")
        phone_raw = usuario.get("numero") or usuario.get("phone") or usuario.get("whatsapp") or usuario.get("celular") or usuario.get("telefone") or usuario.get("jid")
        if phone_raw:
            phone_str = str(phone_raw).split("@")[0]
            result['phone'] = "".join(filter(str.isdigit, phone_str))
    else:
        result['name'] = payload.get("nome") or payload.get("name") or payload.get("contact_name")
        phone_raw = payload.get("numero") or payload.get("phone") or payload.get("whatsapp") or payload.get("celular") or payload.get("telefone")
        if phone_raw:
            result['phone'] = str(phone_raw).strip()
    
    # 2. Grupo -> Nome do Produto (Garante extração de string se grupo for um dict)
    grupo = payload.get("grupo") or payload.get("product_name") or payload.get("group_name") or payload.get("group")
    if isinstance(grupo, dict):
        result['product_name'] = grupo.get("nome") or grupo.get("name") or grupo.get("id") or str(grupo)
    elif grupo:
        result['product_name'] = str(grupo).strip()
    
    # 3. Enquete / Variáveis personalizadas
    enquete = payload.get("enquete")
    if isinstance(enquete, dict):
        if not result.get('variables'):
            result['variables'] = {}
        if enquete.get("titulo"):
            result['variables']['titulo_enquete'] = str(enquete.get("titulo"))
        if enquete.get("opcao_marcada"):
            result['variables']['opcao_marcada'] = str(enquete.get("opcao_marcada"))
        if enquete.get("opcoes_marcadas"):
            result['variables']['opcoes_marcadas'] = ", ".join(map(str, enquete.get("opcoes_marcadas")))

    # 4. Tipo de Evento
    event_val = payload.get("evento") or payload.get("event") or payload.get("event_type") or payload.get("status") or "lead_extraido"
    event_str = str(event_val).lower().strip()
    if "voto" in event_str or "enquete" in event_str:
        result['event_type'] = "voto_enquete"
    elif "lead" in event_str or "extra" in event_str:
        result['event_type'] = "lead_extraido"
    else:
        result['event_type'] = event_str
    
    # 5. Timestamp e Metadados do Evento
    result['event_time'] = payload.get("data_hora") or payload.get("extraido_em") or payload.get("created_at") or payload.get("timestamp")
    result['raw_status'] = str(event_val)
    result['country'] = "BR"
