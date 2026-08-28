import os
import httpx
from core.logger import setup_logger

logger = setup_logger("brevo_service")

def generate_verification_email_html(code: str, recipient_name: str = None) -> str:
    """
    Gera o conteúdo HTML moderno e responsivo do e-mail de verificação de conta.
    """
    greeting_name = recipient_name.strip() if recipient_name and recipient_name.strip() else "Usuário"
    formatted_code = f"{code[:3]} {code[3:]}" if len(code) == 6 else code

    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Código de Verificação - ZapVoice</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0b1120; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
          <!-- Header com Logo/Badge -->
          <tr>
            <td style="padding: 36px 32px 20px 32px; text-align: center; border-bottom: 1px solid #334155; background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);">
              <div style="display: inline-block; width: 48px; height: 48px; line-height: 48px; border-radius: 12px; background-color: #2563eb; color: #ffffff; font-size: 24px; font-weight: bold; text-align: center; margin-bottom: 12px; border: 1px solid #3b82f6;">
                Z
              </div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                ZapVoice <span style="color: #3b82f6;">Funnels</span>
              </h1>
            </td>
          </tr>

          <!-- Corpo Principal -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; text-align: center;">
              <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #ffffff;">
                Confirmação de Cadastro
              </h2>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 24px; color: #94a3b8;">
                Olá, <strong style="color: #f1f5f9;">{greeting_name}</strong>! Você foi convidado para acessar a plataforma. Utilize o código de 6 dígitos abaixo para confirmar seu e-mail e ativar sua conta:
              </p>

              <!-- Bloco do Código -->
              <div style="margin: 28px 0; text-align: center;">
                <div style="display: inline-block; background-color: #0f172a; border: 2px solid #2563eb; border-radius: 12px; padding: 16px 32px; box-shadow: 0 0 20px rgba(37, 99, 235, 0.2);">
                  <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #60a5fa; display: block;">
                    {formatted_code}
                  </span>
                </div>
              </div>

              <!-- Aviso de Expiração -->
              <div style="background-color: #1e1b4b; border: 1px solid #4338ca; border-radius: 8px; padding: 12px 16px; margin-top: 24px; text-align: center;">
                <p style="margin: 0; font-size: 13px; color: #a5b4fc; font-weight: 500;">
                  ⏱️ Este código de segurança expira em <strong>15 minutos</strong>.
                </p>
              </div>
            </td>
          </tr>

          <!-- Rodapé / Segurança -->
          <tr>
            <td style="padding: 20px 32px 32px 32px; text-align: center; border-top: 1px solid #334155; background-color: #0f172a;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; line-height: 18px;">
                Se você não solicitou este cadastro ou não reconhece este convite, nenhuma ação é necessária e você pode desconsiderar esta mensagem com segurança.
              </p>
              <p style="margin: 12px 0 0 0; font-size: 11px; color: #475569;">
                ZapVoice Funnels • Mensagem automática do sistema
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


async def send_verification_email(
    to_email: str,
    code: str,
    recipient_name: str = None
) -> dict:
    """
    Envia o e-mail transacional com o código de validação via API do Brevo (Sendinblue).
    Se BREVO_API_KEY não estiver configurada no .env, realiza o mock seguro (log informativo)
    sem derrubar o fluxo de desenvolvimento.
    """
    if not to_email or "@" not in to_email:
        logger.error(f"❌ [BREVO] E-mail de destino inválido: '{to_email}'")
        return {"success": False, "error": "E-mail de destino inválido."}

    api_key = os.getenv("BREVO_API_KEY", "").strip()
    sender_email = os.getenv("BREVO_SENDER_EMAIL", "").strip() or "noreply@zapvoice.com"
    sender_name = os.getenv("BREVO_SENDER_NAME", "").strip() or "ZapVoice Funnels"

    subject = f"Seu código de ativação: {code} - ZapVoice"
    html_content = generate_verification_email_html(code, recipient_name)

    # Modo Mock / Fallback se a chave não estiver preenchida no .env
    if not api_key:
        logger.warning(
            f"⚠️ [BREVO-MOCK] BREVO_API_KEY não configurada. Código de verificação para '{to_email}': {code}"
        )
        return {
            "success": True,
            "mock": True,
            "message": "Código gerado com sucesso (Modo Simulação local)."
        }

    try:
        payload = {
            "sender": {
                "name": sender_name,
                "email": sender_email
            },
            "to": [
                {
                    "email": to_email,
                    "name": recipient_name or to_email
                }
            ],
            "subject": subject,
            "htmlContent": html_content
        }

        headers = {
            "api-key": api_key,
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                "https://api.brevo.com/v3/smtp/email",
                json=payload,
                headers=headers
            )

            if response.status_code in (200, 201, 202):
                data = response.json()
                message_id = data.get("messageId")
                logger.info(f"📧 [BREVO] E-mail com código enviado com sucesso para '{to_email}' (MessageId: {message_id})")
                return {"success": True, "message_id": message_id}
            else:
                err_text = response.text
                logger.error(f"❌ [BREVO] Erro {response.status_code} ao disparar e-mail: {err_text}")
                return {"success": False, "error": f"Falha no envio via Brevo ({response.status_code}): {err_text}"}

    except Exception as e:
        logger.error(f"❌ [BREVO] Exceção inesperada ao enviar e-mail para '{to_email}': {e}")
        return {"success": False, "error": f"Erro de conexão com o provedor de e-mail: {str(e)}"}
