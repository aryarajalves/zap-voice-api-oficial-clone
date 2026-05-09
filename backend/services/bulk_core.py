import asyncio
from datetime import datetime, timezone, timedelta
import zoneinfo
from core.logger import setup_logger
from services.utils.bulk_helpers import render_template_body, sanitize_template_components

logger = setup_logger(__name__)
BRAZIL_TZ = zoneinfo.ZoneInfo("America/Sao_Paulo")

async def send_smart_message(
    chatwoot, 
    phone: str, 
    trigger_id: int,
    template_name: str,
    language: str,
    components: list = None,
    direct_message: str = None,
    direct_message_params: dict = None,
    last_interaction: datetime = None,
    template_body_cache: str = None,
    template_btn_info: dict = None,
    contact_name: str = None
):
    try:
        effective_components = components # No engine, components ja sao por contato se necessario
        
        # 1. Verificação Local da Janela 24h
        can_use_smart_send = True
        if template_btn_info and template_btn_info.get("has_special_buttons"):
            can_use_smart_send = False
            logger.info(f"⏭️ [Smart Send] Ignorado para {phone}: Template contém botões de URL/Link.")

        if can_use_smart_send and last_interaction and (direct_message or template_body_cache):
            if last_interaction.tzinfo is None:
                last_interaction = last_interaction.replace(tzinfo=timezone.utc)

            now = datetime.now(timezone.utc)
            diff = now - last_interaction
            safety_limit = timedelta(hours=23, minutes=59)

            if diff < safety_limit:
                logger.info(f"🟢 [Smart Send] Janela ABERTA para {phone} (Última: {diff.total_seconds()/3600:.2f}h atrás).")

                free_text = render_template_body(direct_message, effective_components or [], contact_name=contact_name) if direct_message else None
                
                if not free_text and template_body_cache:
                    try:
                        free_text = render_template_body(template_body_cache, effective_components or [], contact_name=contact_name)
                        logger.info(f"📝 [Smart Send] Renderização Automática para {phone}: {free_text[:80]}...")
                    except Exception as render_err:
                        logger.warning(f"⚠️ [Smart Send] Falha na renderização automática: {render_err}. Tentando template oficial.")
                        free_text = None

                if free_text:
                    btn_texts = []
                    if direct_message and direct_message_params:
                        buttons = direct_message_params if isinstance(direct_message_params, list) else direct_message_params.get("buttons", [])
                        for b in buttons:
                            btn_texts.append(b if isinstance(b, str) else b.get("text", "Botão"))
                    
                    if not btn_texts and template_btn_info and template_btn_info.get("quick_replies"):
                        btn_texts = template_btn_info["quick_replies"][:3]

                    logger.info(f"📤 [Smart Send] Tentando Mensagem Livre (Sessão) para {phone}...")
                    res = await chatwoot.send_interactive_buttons(phone, free_text, btn_texts) if btn_texts else await chatwoot.send_text_direct(phone, free_text)

                    is_success = False
                    if isinstance(res, dict):
                        if res.get("messages") or res.get("id") or res.get("success") is True or (not res.get("error") and res.get("messaging_product") == "whatsapp"):
                            is_success = True

                    if is_success:
                        now_br = datetime.now(BRAZIL_TZ).strftime("%d/%m/%Y %H:%M:%S")
                        logger.info(f"🚀 [DISPARO] [Trigger {trigger_id}] [{now_br}] [{phone}] Tipo: LIVRE (Sessão) | Sucesso")
                        return {"result": res, "type": "FREE_MESSAGE", "success": True}

                    err_msg = str(res.get("detail", "")).lower() if isinstance(res, dict) else str(res).lower()
                    if any(msg in err_msg for msg in ["within 24 hours", "window", "expired", "session"]):
                        logger.info(f"🔄 [Smart Send] Erro de janela detectado. Fazendo fallback para Template Oficial.")
                    else:
                        return {"error": True, "detail": f"Falha na Mensagem Livre: {err_msg}", "success": False}

        # 2. Envio Via Template Oficial
        if template_name:
            now_br = datetime.now(BRAZIL_TZ).strftime("%d/%m/%Y %H:%M:%S")
            logger.info(f"🚀 [DISPARO] [Trigger {trigger_id}] [{now_br}] [{phone}] Tipo: TEMPLATE ({template_name})")
            
            clean_components = sanitize_template_components(effective_components or [], contact_name=contact_name)
            res = await chatwoot.send_template(phone, template_name, language, components=clean_components)
            if res and not res.get("error"):
                return {"result": res, "type": "TEMPLATE"}
            
            return res
        
        return {"error": True, "detail": "Nenhum conteúdo configurado"}
    except Exception as e:
        logger.error(f"❌ [Smart Send CRITICAL] Exceção inesperada: {e}")
        return {"error": True, "detail": str(e), "success": False}
