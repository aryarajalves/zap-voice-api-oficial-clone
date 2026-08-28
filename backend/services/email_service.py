import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import httpx
from core.logger import setup_logger
from core.encryption import decrypt_token

logger = setup_logger("email_service")

async def send_single_email(config, to_email: str, subject: str, body_html: str, recipient_name: str = None) -> dict:
    """
    Envia um único e-mail utilizando a configuração do cliente (Amazon SES, Resend ou SMTP).
    """
    if not config:
        return {"success": False, "error": "Configuração de e-mail não encontrada"}

    if not to_email or "@" not in to_email:
        return {"success": False, "error": "E-mail de destino inválido"}

    provider = (config.provider or "smtp").lower()
    from_name = config.from_name or "ZapVoice"
    from_email = config.from_email
    sender_header = f"{from_name} <{from_email}>" if from_name else from_email

    # Substituir variáveis dinâmicas do contato (suporta dict ou string com o nome)
    rec_dict = recipient_name if isinstance(recipient_name, dict) else {"name": str(recipient_name or "")}
    name_val = rec_dict.get("name") or rec_dict.get("nome") or ""
    phone_val = rec_dict.get("phone") or rec_dict.get("telefone") or ""
    prod_val = rec_dict.get("product_name") or rec_dict.get("produto") or ""
    plat_val = rec_dict.get("platform") or rec_dict.get("plataforma") or ""
    price_val = rec_dict.get("price") or rec_dict.get("valor") or ""
    pay_val = rec_dict.get("payment_method") or rec_dict.get("forma_pagamento") or ""
    tags_val = rec_dict.get("tags") or rec_dict.get("etiquetas") or ""

    replacements = {
        "{{nome}}": name_val,
        "{{name}}": name_val,
        "{{1}}": name_val,
        "{{email}}": to_email,
        "{{phone}}": phone_val,
        "{{telefone}}": phone_val,
        "{{produto}}": prod_val,
        "{{product_name}}": prod_val,
        "{{plataforma}}": plat_val,
        "{{platform}}": plat_val,
        "{{valor}}": price_val,
        "{{price}}": price_val,
        "{{forma_pagamento}}": pay_val,
        "{{payment_method}}": pay_val,
        "{{etiquetas}}": tags_val,
        "{{tags}}": tags_val,
    }

    for key, val in replacements.items():
        body_html = body_html.replace(key, str(val))
        subject = subject.replace(key, str(val))

    # 1. RESEND (API HTTP)
    if provider == "resend":
        resend_key = decrypt_token(config.resend_api_key)
        if not resend_key:
            return {"success": False, "error": "Chave API do Resend não configurada"}
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(
                    "https://api.resend.com/emails",
                    headers={
                        "Authorization": f"Bearer {resend_key.strip()}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "from": sender_header,
                        "to": [to_email],
                        "subject": subject,
                        "html": body_html
                    }
                )
                if res.status_code in (200, 201):
                    logger.info(f"📧 [EMAIL-RESEND] E-mail enviado para {to_email}")
                    return {"success": True, "message_id": res.json().get("id")}
                else:
                    err_msg = res.json().get("message") or res.text
                    logger.error(f"❌ [EMAIL-RESEND] Erro {res.status_code}: {err_msg}")
                    return {"success": False, "error": f"Resend: {err_msg}"}
        except Exception as e:
            logger.error(f"❌ [EMAIL-RESEND] Exceção: {e}")
            return {"success": False, "error": str(e)}

    # 2. AMAZON SES (via Boto3 / API / SMTP)
    elif provider == "ses":
        aws_key = config.aws_access_key_id
        aws_secret = decrypt_token(config.aws_secret_access_key)
        region = config.aws_region or "us-east-1"

        if not aws_key or not aws_secret:
            return {"success": False, "error": "Credenciais AWS SES (Key ID e Secret Key) não informadas"}

        try:
            import boto3
            client = boto3.client(
                'ses',
                aws_access_key_id=aws_key.strip(),
                aws_secret_access_key=aws_secret.strip(),
                region_name=region.strip()
            )
            response = client.send_email(
                Source=sender_header,
                Destination={'ToAddresses': [to_email]},
                Message={
                    'Subject': {'Data': subject, 'Charset': 'UTF-8'},
                    'Body': {'Html': {'Data': body_html, 'Charset': 'UTF-8'}}
                }
            )
            message_id = response.get("MessageId")
            logger.info(f"📧 [EMAIL-SES] E-mail enviado para {to_email} | MessageID: {message_id}")
            return {"success": True, "message_id": message_id}
        except Exception as e_ses:
            logger.error(f"❌ [EMAIL-SES] Erro ao enviar via Amazon SES: {e_ses}")
            return {"success": False, "error": f"Amazon SES: {str(e_ses)}"}

    # 3. ENVIO DIRETO / SENDMAIL LOCAL (SEM CREDENCIAIS SMTP)
    elif provider in ("direct", "sendmail", "local"):
        try:
            domain = to_email.split("@")[-1]
            try:
                import dns.resolver
                records = dns.resolver.resolve(domain, 'MX')
                mx_record = str(records[0].exchange).rstrip('.')
            except Exception as e_dns:
                logger.warning(f"⚠️ [EMAIL-DIRECT] Resolução MX falhou ({e_dns}), usando fallback para '{domain}'")
                mx_record = domain  # Fallback direto pro domínio se o DNS falhar

            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = sender_header
            msg["To"] = to_email
            msg.attach(MIMEText(body_html, "html", "utf-8"))

            # Envia diretamente na porta 25 do servidor MX de destino
            server = smtplib.SMTP(mx_record, 25, timeout=15)
            server.sendmail(from_email, [to_email], msg.as_string())
            server.quit()
            logger.info(f"📧 [EMAIL-DIRECT] E-mail enviado diretamente para {to_email} via MX {mx_record}")
            return {"success": True, "message_id": f"direct_{to_email}"}
        except Exception as e_direct:
            logger.error(f"❌ [EMAIL-DIRECT] Erro no envio direto: {e_direct}")
            return {"success": False, "error": f"Envio Direto: {str(e_direct)}"}

    # 4. SMTP CUSTOMIZADO (ou Fallback SMTP da SES)
    else:
        smtp_host = config.smtp_host
        smtp_port = config.smtp_port or 587
        smtp_user = config.smtp_user
        smtp_pass = decrypt_token(config.smtp_password)

        encryption = (config.smtp_encryption or "tls").lower()

        if not smtp_host:
            return {"success": False, "error": "Servidor SMTP Host não informado"}

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = sender_header
            msg["To"] = to_email
            msg.attach(MIMEText(body_html, "html", "utf-8"))

            if encryption == "ssl" or smtp_port == 465:
                server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=15)
            else:
                server = smtplib.SMTP(smtp_host, smtp_port, timeout=15)
                if encryption != "none":
                    server.starttls()

            if smtp_user and smtp_pass:
                server.login(smtp_user, smtp_pass)

            server.sendmail(from_email, [to_email], msg.as_string())
            server.quit()
            logger.info(f"📧 [EMAIL-SMTP] E-mail enviado para {to_email}")
            return {"success": True, "message_id": f"smtp_{to_email}"}
        except Exception as e_smtp:
            logger.error(f"❌ [EMAIL-SMTP] Erro ao enviar via SMTP: {e_smtp}")
            return {"success": False, "error": f"SMTP: {str(e_smtp)}"}

