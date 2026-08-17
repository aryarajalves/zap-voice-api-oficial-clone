import re as _re
from .common import get_doc_label


def parse_ticto(payload: dict, result: dict) -> None:
    """Parser unificado para webhooks da Ticto."""
    event = str(payload.get("event") or "").lower()
    order = payload.get("order") or payload
    status = str(order.get("status") or "").lower()
    payment_method = str(order.get("payment_method") or order.get("payment_type") or "").lower()

    EVENT_MAP = {
        "purchase.approved":       "compra_aprovada",
        "purchase.refused":        "cartao_recusado",
        "purchase.canceled":       "compra_cancelada",
        "purchase.refunded":       "reembolso",
        "purchase.chargeback":     "chargeback",
        "purchase.abandoned_cart": "carrinho_abandonado",
        "abandoned_cart":          "carrinho_abandonado",
        "subscription.canceled":   "assinatura_cancelada",
        "subscription.renewed":    "assinatura_renovada",
        "subscription.overdue":    "assinatura_vencida",
        "subscription.late":       "assinatura_atrasada",
    }

    if event in EVENT_MAP:
        result['event_type'] = EVENT_MAP[event]
    elif "waiting" in event or "waiting_payment" in event or status in ["waiting_payment", "pending"]:
        if "pix" in payment_method or "pix" in event:
            result['event_type'] = "pix_gerado"
        else:
            result['event_type'] = "boleto_impresso"
    elif status == "approved": result['event_type'] = "compra_aprovada"
    elif status in ["refused", "canceled"]: result['event_type'] = "cartao_recusado"
    elif status == "refunded": result['event_type'] = "reembolso"

    buyer = order.get("buyer") or order.get("customer") or {}
    result['name'] = buyer.get("name") or buyer.get("full_name")
    result['email'] = buyer.get("email")
    result['phone'] = buyer.get("phone_number") or buyer.get("phone") or buyer.get("cellphone")

    product = order.get("product") or order.get("products") or {}
    if isinstance(product, list) and product:
        product = product[0]
    result['product_name'] = product.get("name") or product.get("title")
    result['price'] = order.get("total_price") or order.get("price")
    result['payment_method'] = payment_method or None
    result['raw_status'] = event.upper().replace(".", "_") if event else status.upper()

    # OB: detecta order_bumps da Ticto e ajusta event_type
    ob_list = order.get("order_bumps") or []
    if ob_list and result.get("event_type") == "compra_aprovada":
        result["order_bump"] = True
        result["event_type"] = "compra_aprovada_ob"


def parse_pepper(payload: dict, result: dict) -> None:
    """Parser unificado para webhooks da Pepper."""
    event = str(payload.get("event") or "").upper()
    data = payload.get("data") or payload

    EVENT_MAP = {
        "PURCHASE_APPROVED":   "compra_aprovada",
        "PURCHASE_CANCELED":   "compra_cancelada",
        "PURCHASE_REFUSED":    "cartao_recusado",
        "PURCHASE_REFUNDED":   "reembolso",
        "PURCHASE_CHARGEBACK": "chargeback",
        "BILLET_GENERATED":    "boleto_impresso",
        "PIX_GENERATED":       "pix_gerado",
        "ABANDONED_CART":      "carrinho_abandonado",
    }
    result['event_type'] = EVENT_MAP.get(event, "outros")

    # Detecta order bumps e reclassifica se necessário
    if event == "PURCHASE_APPROVED":
        ob_products = data.get("order_bumps") or []
        if ob_products:
            result['event_type'] = "compra_aprovada_com_ob"
            bump_names = ", ".join(str(ob.get("product", {}).get("name") or "Produto OB") for ob in ob_products)
            result.setdefault("custom_fields", {})["Produto(s) Order Bump"] = bump_names
            result["order_bump"] = True

    customer = data.get("customer") or {}
    result['name'] = customer.get("name") or customer.get("full_name")
    result['email'] = customer.get("email")
    result['phone'] = customer.get("phone") or customer.get("phone_number")

    product = data.get("product") or {}
    result['product_name'] = product.get("name") or product.get("title")
    transaction = data.get("transaction") or {}
    result['price'] = transaction.get("price") or transaction.get("amount")
    result['payment_method'] = transaction.get("payment_method")
    result['raw_status'] = event


def parse_braip(payload: dict, result: dict) -> None:
    """Parser unificado para webhooks da Braip."""
    event = str(payload.get("event") or payload.get("status") or "").lower()

    if event in ["approved", "sale_approved"]:
        ob = payload.get("order_bump")
        if ob:
            result['event_type'] = "compra_aprovada_com_ob"
            ob_name = ob.get("product_title") or ob.get("name") or "Produto OB"
            result.setdefault("custom_fields", {})["Produto(s) Order Bump"] = ob_name
            result["order_bump"] = True
        else:
            result['event_type'] = "compra_aprovada"
    elif event in ["refused", "declined"]: result['event_type'] = "cartao_recusado"
    elif event == "canceled": result['event_type'] = "compra_cancelada"
    elif event == "refunded": result['event_type'] = "reembolso"
    elif event == "chargeback": result['event_type'] = "chargeback"
    elif event in ["billet", "boleto", "waiting_payment"]:
        payment = str(payload.get("payment_method") or "").lower()
        if "pix" in payment: result['event_type'] = "pix_gerado"
        else: result['event_type'] = "boleto_impresso"
    elif "abandon" in event: result['event_type'] = "carrinho_abandonado"

    result['name'] = payload.get("contact_name") or payload.get("name")
    result['email'] = payload.get("contact_email") or payload.get("email")
    result['phone'] = payload.get("contact_phone") or payload.get("phone")
    result['product_name'] = payload.get("product_title") or payload.get("product_name")
    result['price'] = payload.get("price") or payload.get("total_price")
    result['payment_method'] = payload.get("payment_method")
    result['raw_status'] = event.upper()


def parse_guru(payload: dict, result: dict) -> None:
    """Parser unificado para webhooks da Digital Manager Guru (Transaction e Subscription)."""
    webhook_type = str(payload.get("webhook_type") or "").lower()

    # ---- TRANSACTION webhook ----
    if webhook_type == "transaction":
        status = str(payload.get("status") or "").lower()
        payment = payload.get("payment") or {}
        method = str(payment.get("method") or "").lower()
        product = payload.get("product") or {}

        # Detecta upsell se o nome do produto contiver "upsell" ou "upgrade"
        prod_name_lower = str(product.get("name") or "").lower()
        is_upsell = "upsell" in prod_name_lower or "upgrade" in prod_name_lower

        # Detecta order bump na lista products no plural
        products = payload.get("products") or []
        ob_products = [p for p in products if p.get("is_order_bump")]

        if status == "approved":
            if is_upsell:
                result['event_type'] = "compra_aprovada_upsell"
            elif ob_products:
                result['event_type'] = "compra_aprovada_com_ob"
            else:
                result['event_type'] = "compra_aprovada"
        elif status in ("refused", "declined", "refused_by_antifraud"):
            result['event_type'] = "cartao_recusado"
        elif status == "refunded":
            result['event_type'] = "reembolso"
        elif status == "chargeback":
            result['event_type'] = "chargeback"
        elif status in ("canceled", "cancelled"):
            result['event_type'] = "compra_cancelada"
        elif status in ("billet_printed", "waiting_payment"):
            if "pix" in method:
                result['event_type'] = "pix_gerado"
            else:
                result['event_type'] = "boleto_impresso"
        elif status == "expired":
            if "pix" in method:
                result['event_type'] = "pix_expirado"
            else:
                result['event_type'] = "boleto_expirado"
        elif status == "abandoned":
            result['event_type'] = "carrinho_abandonado"

        contact = payload.get("contact") or {}
        phone_code = str(contact.get("phone_local_code") or "")
        phone_num  = str(contact.get("phone_number") or "")
        result['name']  = contact.get("name")
        result['email'] = contact.get("email")
        
        # Limpa telefone
        phone_raw = phone_code + phone_num
        phone_clean = _re.sub(r'\D', '', phone_raw)
        result['phone'] = phone_clean if phone_clean else None

        product = payload.get("product") or {}
        result['product_name'] = product.get("name")
        raw_price = payment.get("total") or product.get("total_value")
        if raw_price is not None:
            try:
                result['price'] = f"{float(raw_price):.2f}"
            except Exception:
                result['price'] = str(raw_price)

        result['payment_method'] = method or None
        result['currency']       = str(payment.get("currency") or "").upper() or None
        result['checkout_url']   = payload.get("checkout_url")

        # PIX qrcode
        pix = payment.get("pix") or {}
        qrcode = (pix.get("qrcode") or {}) if pix else {}
        result['pix_qrcode'] = qrcode.get("signature") or qrcode.get("url")

        # Boleto URL
        billet = payment.get("billet") or {}
        result['checkout_url'] = result.get('checkout_url') or billet.get("url")

        # Country: from infrastructure (geo-IP) then contact address
        infra = payload.get("infrastructure") or {}
        result['country'] = (
            str(infra.get("country") or "").upper()
            or str(contact.get("address_country") or "").upper()
            or None
        )

        result['raw_status'] = status.upper() if status else None

        # CPF / CNPJ do comprador (contact.doc)
        custom_fields = {}
        doc = str(contact.get("doc") or "").strip()
        if doc:
            doc_label = get_doc_label(doc)
            custom_fields[doc_label] = doc

        # Order Bump e Upsell
        if ob_products:
            bump_names = ", ".join(str(p.get("name") or "Produto OB") for p in ob_products)
            custom_fields["Produto(s) Order Bump"] = bump_names
            result["order_bump"] = True

        if is_upsell:
            result["is_upsell"] = True

        if custom_fields:
            result['custom_fields'] = custom_fields

    # ---- SUBSCRIPTION webhook ----
    elif webhook_type == "subscription":
        last_status = str(payload.get("last_status") or "").lower()

        if last_status == "active":
            result['event_type'] = "assinatura_renovada"
        elif last_status in ("canceled", "cancelled"):
            result['event_type'] = "assinatura_cancelada"
        elif last_status == "delayed":
            result['event_type'] = "assinatura_atrasada"
        elif last_status in ("trialing", "trial"):
            result['event_type'] = "compra_aprovada"

        subscriber = payload.get("subscriber") or {}
        phone_code = str(subscriber.get("phone_local_code") or "")
        phone_num  = str(subscriber.get("phone_number") or "")
        result['name']  = subscriber.get("name")
        result['email'] = subscriber.get("email")
        
        # Limpa telefone
        phone_raw = phone_code + phone_num
        phone_clean = _re.sub(r'\D', '', phone_raw)
        result['phone'] = phone_clean if phone_clean else None

        product = payload.get("product") or {}
        result['product_name'] = product.get("name")
        invoice = payload.get("current_invoice") or {}
        raw_price = invoice.get("value")
        if raw_price is not None:
            try:
                result['price'] = f"{float(raw_price):.2f}"
            except Exception:
                result['price'] = str(raw_price)

        result['payment_method'] = str(payload.get("payment_method") or "").lower() or None
        result['country'] = str(subscriber.get("address_country") or "").upper() or None
        result['raw_status'] = last_status.upper() if last_status else None

        # CPF / CNPJ do comprador (subscriber.doc)
        custom_fields = {}
        doc = str(subscriber.get("doc") or "").strip()
        if doc:
            doc_label = get_doc_label(doc)
            custom_fields[doc_label] = doc

        # Detecta upsell se o nome do produto contiver "upsell" ou "upgrade"
        prod_name_lower = str(product.get("name") or "").lower()
        is_upsell = "upsell" in prod_name_lower or "upgrade" in prod_name_lower
        if is_upsell:
            result["is_upsell"] = True
            if last_status in ("trialing", "trial"):
                result['event_type'] = "compra_aprovada_upsell"

        if custom_fields:
            result['custom_fields'] = custom_fields


def parse_lastlink(payload: dict, result: dict) -> None:
    """Parser unificado para webhooks da Lastlink."""
    event = str(payload.get("Event") or payload.get("event") or "").strip()
    data  = payload.get("Data") or payload.get("data") or {}

    buyer    = data.get("Buyer") or data.get("buyer") or {}
    products = data.get("Products") or data.get("products") or []
    purchase = data.get("Purchase") or data.get("purchase") or {}
    payment  = purchase.get("Payment") or purchase.get("payment") or {}
    method   = str(payment.get("PaymentMethod") or payment.get("paymentMethod") or "").lower()

    # ---- Event mapping ----
    if event == "Purchase_Order_Confirmed":
        is_upsell = bool(purchase.get("IsUpsell") or purchase.get("isUpsell"))
        result['event_type'] = "compra_aprovada_upsell" if is_upsell else "compra_aprovada"
    elif event == "Recurrent_Payment":
        result['event_type'] = "assinatura_renovada"
    elif event == "Payment_Refund":
        result['event_type'] = "reembolso"
    elif event == "Refund_Requested":
        result['event_type'] = "reembolso"
    elif event == "Payment_Chargeback":
        result['event_type'] = "chargeback"
    elif event == "Purchase_Request_Canceled":
        result['event_type'] = "compra_cancelada"
    elif event == "Purchase_Request_Confirmed":
        # Fatura criada — antes do pagamento (pix/boleto pendente)
        if "pix" in method:
            result['event_type'] = "pix_gerado"
        else:
            result['event_type'] = "boleto_impresso"
    elif event == "Purchase_Request_Expired":
        if "pix" in method:
            result['event_type'] = "pix_expirado"
        else:
            result['event_type'] = "boleto_expirado"
    elif event == "Abandoned_Cart":
        result['event_type'] = "carrinho_abandonado"
    elif event == "Subscription_Canceled":
        result['event_type'] = "assinatura_cancelada"
    elif event in ("Subscription_Expired", "Subscription_Renewal_Pending"):
        result['event_type'] = "assinatura_atrasada"
    elif event == "Refund_Period_Over":
        result['event_type'] = "compra_concluida"

    # ---- Buyer ----
    result['name']  = buyer.get("Name") or buyer.get("name")
    result['email'] = buyer.get("Email") or buyer.get("email")
    phone_raw = buyer.get("PhoneNumber") or buyer.get("phoneNumber") or ""
    # PhoneNumber comes as "+5511987654321" — strip leading "+"
    result['phone'] = phone_raw.lstrip('+') if phone_raw else None

    # ---- Product ----
    if products:
        p0 = products[0]
        result['product_name'] = p0.get("Name") or p0.get("name")
        raw_price = p0.get("Price") or p0.get("price")
        if raw_price is not None:
            try:
                result['price'] = f"{float(raw_price):.2f}"
            except Exception:
                result['price'] = str(raw_price)

    # Override price with what the buyer actually paid if available
    paid_price = (purchase.get("Price") or {}).get("Value")
    if paid_price is not None:
        try:
            result['price'] = f"{float(paid_price):.2f}"
        except Exception:
            pass

    # ---- Payment details ----
    result['payment_method'] = method or None
    result['checkout_url'] = (
        purchase.get("InvoiceUrl") or purchase.get("invoiceUrl")
        or (data.get("Offer") or {}).get("Url")
        or (data.get("offer") or {}).get("url")
    )

    result['raw_status'] = event


def parse_hubla(payload: dict, result: dict) -> None:
    """Parser para webhooks da Hubla v2.0.0."""
    event_type = str(payload.get("type") or "").strip()
    event = payload.get("event") or {}

    # ---- Common helpers ----
    invoice = event.get("invoice") or {}
    subscription = event.get("subscription") or {}
    user = event.get("user") or {}
    product = event.get("product") or {}
    payer = invoice.get("payer") or {}
    lead = event.get("lead") or {}

    payment_method = str(
        invoice.get("paymentMethod") or subscription.get("paymentMethod") or ""
    ).lower()
    invoice_status = str(invoice.get("status") or "").lower()

    # ---- Event type mapping ----
    if event_type == "invoice.payment_succeeded":
        result['event_type'] = "compra_aprovada"
    elif event_type == "invoice.payment_failed":
        if "pix" in payment_method:
            result['event_type'] = "pix_expirado"
        elif "bank_slip" in payment_method or "boleto" in payment_method:
            result['event_type'] = "boleto_expirado"
        else:
            result['event_type'] = "cartao_recusado"
    elif event_type == "invoice.refunded":
        result['event_type'] = "reembolso"
    elif event_type == "invoice.expired":
        if "pix" in payment_method:
            result['event_type'] = "pix_expirado"
        elif "bank_slip" in payment_method or "boleto" in payment_method:
            result['event_type'] = "boleto_expirado"
        else:
            result['event_type'] = "compra_cancelada"
    elif event_type == "invoice.created":
        if "pix" in payment_method:
            result['event_type'] = "pix_gerado"
        elif "bank_slip" in payment_method or "boleto" in payment_method:
            result['event_type'] = "boleto_impresso"
    elif event_type == "invoice.status_updated":
        if invoice_status in ("chargeback", "disputed"):
            result['event_type'] = "chargeback"
        elif invoice_status == "refunded":
            result['event_type'] = "reembolso"
        elif invoice_status == "paid":
            result['event_type'] = "compra_aprovada"
        elif invoice_status in ("overdue", "unpaid"):
            result['event_type'] = "cartao_recusado"
    elif event_type == "subscription.activated":
        result['event_type'] = "assinatura_renovada"
    elif event_type in ("subscription.deactivated", "subscription.renewal_disabled"):
        result['event_type'] = "assinatura_cancelada"
    elif event_type == "subscription.expiring":
        result['event_type'] = "assinatura_atrasada"
    elif event_type in ("lead.created", "lead.abandoned_cart"):
        result['event_type'] = "carrinho_abandonado"

    # ---- Name ----
    first = (
        payer.get("firstName") or user.get("firstName") or lead.get("firstName") or ""
    )
    last = (
        payer.get("lastName") or user.get("lastName") or lead.get("lastName") or ""
    )
    full_name = f"{first} {last}".strip() or None
    result['name'] = full_name

    # ---- Email ----
    result['email'] = (
        payer.get("email") or user.get("email") or lead.get("email") or None
    )

    # ---- Phone ----
    phone_raw = (
        payer.get("phone") or user.get("phone") or lead.get("phone") or ""
    )
    if phone_raw:
        result['phone'] = str(phone_raw).lstrip("+")
    else:
        result['phone'] = None

    # ---- Product ----
    result['product_name'] = product.get("name") or None

    # ---- Price (cents → BRL) ----
    amount = invoice.get("amount") or subscription.get("amount") or {}
    total_cents = amount.get("totalCents")
    if total_cents is not None:
        try:
            result['price'] = f"{float(total_cents) / 100:.2f}"
        except Exception:
            result['price'] = str(total_cents)

    # ---- Payment method ----
    result['payment_method'] = payment_method or None

    # ---- Currency ----
    currency = str(invoice.get("currency") or subscription.get("currency") or "").upper()
    result['currency'] = currency or None

    # ---- Country ----
    billing = invoice.get("billingAddress") or subscription.get("billingAddress") or {}
    country = str(billing.get("countryCode") or "").upper()
    result['country'] = country or None

    # ---- Raw status ----
    result['raw_status'] = event_type
