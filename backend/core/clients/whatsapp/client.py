import os
import httpx
import re
import json
from datetime import datetime, timezone
from core.logger import setup_logger
from config_loader import get_setting

logger = setup_logger("WhatsAppClient")

class WhatsAppClient:
    def __init__(self, client_id: int = None):
        self.client_id = client_id

    async def send_template(self, phone_number: str, template_name: str, language_code: str = "pt_BR", components: list = None):
        wa_phone_id = get_setting("WA_PHONE_NUMBER_ID", "", client_id=self.client_id)
        wa_token = get_setting("WA_ACCESS_TOKEN", "", client_id=self.client_id)
        
        if not wa_phone_id or not wa_token:
            return {"error": True, "detail": "Configuração do WhatsApp ausente"}
            
        clean_phone = ''.join(filter(str.isdigit, phone_number))
        url = f"https://graph.facebook.com/v25.0/{wa_phone_id}/messages"
        headers = {"Authorization": f"Bearer {wa_token}", "Content-Type": "application/json"}
        
        # Self-healing logic for parameters
        components = await self._validate_template_params(template_name, components)
        
        # Resolve any local/S3/B2 media links in components to Meta media IDs
        if components:
            for comp in components:
                params = comp.get("parameters", [])
                for param in params:
                    p_type = param.get("type", "").lower()
                    if p_type in ["image", "video", "document"]:
                        media_data = param.get(p_type) or param.get(p_type.upper())
                        if isinstance(media_data, dict):
                            actual_key = p_type if p_type in param else p_type.upper()
                            await self._resolve_and_upload_media_param(p_type, param[actual_key])

        # Transform and check components (Media, etc)
        send_components = []
        if components:
            for comp in components:
                comp_copy = comp.copy()
                comp_type = comp.get('type', '').lower()
                if comp_type == 'buttons': comp_type = 'button'
                comp_copy['type'] = comp_type
                send_components.append(comp_copy)
        
        payload = {
            "messaging_product": "whatsapp",
            "to": clean_phone,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": language_code},
                "components": send_components
            }
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                logger.info(f"📤 [Meta API] Enviando Template '{template_name}' para {clean_phone}")
                response = await client.post(url, json=payload, headers=headers)
                if response.status_code not in [200, 201]:
                    err_data = response.json()
                    err_detail = err_data.get("error", {}).get("message", response.text)
                    logger.error(f"❌ [Meta API Error] Template send failed! {err_detail}")
                    return {"error": True, "detail": err_detail, "code": err_data.get("error", {}).get("code")}
                return {**response.json(), "success": True}
            except Exception as e:
                logger.error(f"Error in send_template: {e}")
                return {"error": True, "detail": str(e)}

    async def get_whatsapp_templates(self):
        wa_account_id = get_setting("WA_BUSINESS_ACCOUNT_ID", "", client_id=self.client_id)
        wa_token = get_setting("WA_ACCESS_TOKEN", "", client_id=self.client_id)
        if not wa_account_id or not wa_token: return []

        url = f"https://graph.facebook.com/v25.0/{wa_account_id}/message_templates?limit=250"
        headers = {"Authorization": f"Bearer {wa_token}", "Content-Type": "application/json"}
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                # Debug log for credentials
                masked_token = (wa_token[:10] + "...") if wa_token else "NONE"
                logger.info(f"🔍 [Meta API] Fetching templates for Client ID: {self.client_id} | WABA: {wa_account_id} | Token: {masked_token}")
                
                response = await client.get(url, headers=headers)
                response.raise_for_status()
                data = response.json()
                raw_list = data.get("data", [])
                
                logger.info(f"📊 [Meta API] Recebidos {len(raw_list)} templates da Meta.")
                
                templates = []
                for t in raw_list:
                    name = t.get("name")
                    status = t.get("status")
                    logger.info(f"🔍 [TEMPLATE_INSPECT] Name: {name} | Status: {status}")

                    body_text = next((c.get("text") for c in t.get("components", []) if c.get("type") == "BODY"), None)
                    templates.append({
                        "name": name,
                        "language": t.get("language"),
                        "category": t.get("category"),
                        "id": t.get("id"),
                        "status": status,
                        "body_text": body_text,
                        "components": t.get("components", [])
                    })
                
                self._update_template_cache(templates)
                return templates
            except Exception as e:
                logger.error(f"Error fetching WA templates: {e}")
                return []

    async def create_whatsapp_template(self, data: dict):
        wa_account_id = get_setting("WA_BUSINESS_ACCOUNT_ID", "", client_id=self.client_id)
        wa_token = get_setting("WA_ACCESS_TOKEN", "", client_id=self.client_id)
        if not wa_account_id or not wa_token: return {"error": "Credenciais ausentes"}

        url = f"https://graph.facebook.com/v25.0/{wa_account_id}/message_templates"
        headers = {"Authorization": f"Bearer {wa_token}", "Content-Type": "application/json"}

        payload = {
            "name": data.get("name").lower().replace(" ", "_"),
            "category": data.get("category", "MARKETING").upper(),
            "language": data.get("language", "pt_BR"),
            "components": self._build_template_components(data)
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(url, json=payload, headers=headers)
                if response.status_code not in [200, 201]:
                    logger.error(f"❌ Erro ao criar template na Meta (Status {response.status_code}): {response.text}")
                    err = response.json().get("error", {})
                    return {"error": err.get("message", "Erro desconhecido na Meta API"), "status_code": response.status_code, "meta_raw": response.text}
                
                logger.info(f"✅ Template '{payload.get('name')}' criado com sucesso!")
                return response.json()
            except Exception as e:
                return {"error": str(e)}

    async def delete_whatsapp_template(self, name: str):
        wa_account_id = get_setting("WA_BUSINESS_ACCOUNT_ID", "", client_id=self.client_id)
        wa_token = get_setting("WA_ACCESS_TOKEN", "", client_id=self.client_id)
        if not wa_account_id or not wa_token: return {"error": "Credenciais ausentes"}
        url = f"https://graph.facebook.com/v25.0/{wa_account_id}/message_templates"
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.delete(url, params={"name": name, "access_token": wa_token})
                return {"success": True} if response.status_code in [200, 204] else {"error": response.text}
            except Exception as e:
                return {"error": str(e)}

    async def send_interactive_poll(self, phone_number: str, question: str, options: list):
        # Implementation using button/list fallback as in original
        valid_options = options[:10]
        if not valid_options: return None
        clean_phone = ''.join(filter(str.isdigit, phone_number))
        
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": clean_phone,
            "type": "interactive",
            "interactive": {}
        }

        if len(valid_options) <= 3:
            buttons = [{"type": "reply", "reply": {"id": f"btn_{i}", "title": opt[:20]}} for i, opt in enumerate(valid_options)]
            payload["interactive"] = {"type": "button", "body": {"text": question[:1024]}, "action": {"buttons": buttons}}
        else:
            rows = [{"id": f"row_{i}", "title": opt[:24]} for i, opt in enumerate(valid_options)]
            payload["interactive"] = {"type": "list", "body": {"text": question[:1024]}, "action": {"button": "Ver Opções", "sections": [{"title": "Opções", "rows": rows}]}}

        return await self._meta_request("POST", "messages", json=payload)

    async def send_text_official(self, phone_number: str, text: str):
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": ''.join(filter(str.isdigit, phone_number)),
            "type": "text",
            "text": {"body": text}
        }
        return await self._meta_request("POST", "messages", json=payload)

    async def upload_media_to_meta(self, file_path: str, mime_type: str = 'audio/ogg') -> str:
        wa_phone_id = get_setting("WA_PHONE_NUMBER_ID", "", client_id=self.client_id)
        wa_token = get_setting("WA_ACCESS_TOKEN", "", client_id=self.client_id)
        if not wa_phone_id or not wa_token: return None
        url = f"https://graph.facebook.com/v25.0/{wa_phone_id}/media"
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                with open(file_path, "rb") as f:
                    response = await client.post(url, headers={"Authorization": f"Bearer {wa_token}"}, files={'file': (os.path.basename(file_path), f, mime_type)}, data={'messaging_product': 'whatsapp'})
                    return response.json().get('id') if response.status_code == 200 else None
            except: return None

    async def _meta_request(self, method: str, path: str, **kwargs):
        wa_phone_id = get_setting("WA_PHONE_NUMBER_ID", "", client_id=self.client_id)
        wa_token = get_setting("WA_ACCESS_TOKEN", "", client_id=self.client_id)
        if not wa_phone_id or not wa_token: return {"error": True, "detail": "Configuração do WhatsApp ausente"}
        url = f"https://graph.facebook.com/v25.0/{wa_phone_id}/{path}"
        headers = {"Authorization": f"Bearer {wa_token}", "Content-Type": "application/json"}
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.request(method, url, headers=headers, **kwargs)
                if response.status_code not in [200, 201]:
                    err_data = response.json()
                    err_detail = err_data.get("error", {}).get("message", response.text)
                    return {"error": True, "detail": err_detail, "code": err_data.get("error", {}).get("code")}
                return response.json()
            except Exception as e:
                return {"error": True, "detail": str(e)}

    async def _validate_template_params(self, template_name, components):
        try:
            from database import SessionLocal
            from models import WhatsAppTemplateCache
            db = SessionLocal()
            tpl = db.query(WhatsAppTemplateCache).filter(WhatsAppTemplateCache.name == template_name, WhatsAppTemplateCache.client_id == self.client_id).first()
            db.close()
            if tpl and tpl.body:
                placeholders = re.findall(r"\{\{(\d+)\}\}", tpl.body)
                required = len(set(placeholders))
                body_comp = next((c for c in components if c.get("type") == "body"), None)
                if body_comp:
                    current = body_comp.get("parameters", [])
                    if len(current) > required: body_comp["parameters"] = current[:required]
        except: pass
        return components

    def _update_template_cache(self, templates):
        try:
            from database import SessionLocal
            from models import WhatsAppTemplateCache
            db = SessionLocal()
            incoming_ids = {int(t["id"]) for t in templates if t.get("id")}
            for t in templates:
                if not t.get("id"):
                    continue
                template_id = int(t["id"])

                # Busca primeiro pelo ID exato
                existing = db.query(WhatsAppTemplateCache).filter(
                    WhatsAppTemplateCache.id == template_id
                ).first()

                # Se não encontrou pelo ID, busca pela constraint única (client_id, name, language)
                # Isso cobre o caso onde a Meta regenerou o ID do mesmo template
                if not existing:
                    existing = db.query(WhatsAppTemplateCache).filter(
                        WhatsAppTemplateCache.client_id == self.client_id,
                        WhatsAppTemplateCache.name == t["name"],
                        WhatsAppTemplateCache.language == t["language"]
                    ).first()

                if existing:
                    # Atualiza todos os campos, incluindo o ID caso tenha mudado na Meta
                    existing.id = template_id
                    existing.name = t["name"]
                    existing.language = t["language"]
                    existing.body = t["body_text"]
                    existing.components = t["components"]
                else:
                    db.add(WhatsAppTemplateCache(
                        id=template_id,
                        client_id=self.client_id,
                        name=t["name"],
                        language=t["language"],
                        body=t["body_text"],
                        components=t["components"],
                        is_archived=False,
                        is_pinned=False
                    ))

            # Arquivar localmente qualquer template deste cliente que não esteja mais ativo na Meta
            db.query(WhatsAppTemplateCache).filter(
                WhatsAppTemplateCache.client_id == self.client_id,
                WhatsAppTemplateCache.id.notin_(incoming_ids)
            ).update({
                WhatsAppTemplateCache.is_archived: True,
                WhatsAppTemplateCache.is_pinned: False
            }, synchronize_session=False)
            db.commit()
            db.close()
        except Exception as e:
            logger.error(f"Erro ao sincronizar cache de templates: {e}")
            try:
                db.rollback()
                db.close()
            except Exception:
                pass


    def _build_template_components(self, data):
        components = []
        h_type = data.get("header_type", "NONE").upper()
        if h_type != "NONE":
            h_comp = {"type": "HEADER", "format": h_type}
            if h_type == "TEXT": h_comp["text"] = data.get("header_text")
            elif h_type in ["IMAGE", "VIDEO", "DOCUMENT"]:
                h_url = data.get("header_media_url")
                if h_url:
                    h_comp["example"] = {"header_handle": [h_url]}
                else:
                    logger.warning(f"⚠️ Cabeçalho do tipo {h_type} selecionado mas 'header_media_url' está vazio.")
            components.append(h_comp)
        
        body_text = data.get("body_text", "")
        body_comp = {"type": "BODY", "text": body_text}
        vars = sorted(set(int(v) for v in re.findall(r'\{\{(\d+)\}\}', body_text)))
        if vars: body_comp["example"] = {"body_text": [["Exemplo" + str(i) for i in vars]]}
        components.append(body_comp)
        
        if data.get("footer_text"): components.append({"type": "FOOTER", "text": data.get("footer_text")})
        if data.get("buttons"): components.append({"type": "BUTTONS", "buttons": data.get("buttons")})
        return components

    async def edit_whatsapp_template(self, template_id: str, data: dict):
        wa_token = get_setting("WA_ACCESS_TOKEN", "", client_id=self.client_id)
        if not wa_token: return {"error": "Credenciais ausentes"}

        url = f"https://graph.facebook.com/v25.0/{template_id}"
        headers = {"Authorization": f"Bearer {wa_token}", "Content-Type": "application/json"}

        payload = {"components": self._build_template_components(data)}
        if data.get("category"): payload["category"] = data.get("category").upper()

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(url, json=payload, headers=headers)
                return response.json() if response.status_code in [200, 201] else {"error": response.text}
            except Exception as e:
                return {"error": str(e)}

    async def update_template_status(self, template_id: str, status: str):
        wa_token = get_setting("WA_ACCESS_TOKEN", "", client_id=self.client_id)
        if not wa_token: return {"error": "Credenciais ausentes"}

        status_upper = status.upper()
        if status_upper == "UNPAUSED":
            url = f"https://graph.facebook.com/v25.0/{template_id}/unpause"
            payload = {}
        else:
            url = f"https://graph.facebook.com/v25.0/{template_id}"
            payload = {"status": status_upper}

        headers = {"Authorization": f"Bearer {wa_token}", "Content-Type": "application/json"}
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(url, json=payload, headers=headers)
                if response.status_code not in [200, 201]:
                    err_msg = response.json().get("error", {}).get("message", "Erro desconhecido")
                    if status_upper == "PAUSED" and "invalid" in err_msg.lower():
                        err_msg = "A Meta não permite pausar templates manualmente via API."
                    return {"error": err_msg}
                return {"success": True}
            except Exception as e:
                return {"error": str(e)}

    async def send_interactive_buttons(self, contact_phone: str, body_text: str, buttons: list):
        to_phone = ''.join(filter(str.isdigit, contact_phone))
        action_buttons = []
        for idx, btn_text in enumerate(buttons[:3]):
            action_buttons.append({"type": "reply", "reply": {"id": f"btn_{idx}", "title": btn_text[:20]}})

        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to_phone,
            "type": "interactive",
            "interactive": {
                "type": "button",
                "body": {"text": body_text},
                "action": {"buttons": action_buttons}
            }
        }
        return await self._meta_request("POST", "messages", json=payload)

    async def send_official_audio(self, phone_number: str, media_id: str):
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": ''.join(filter(str.isdigit, phone_number)),
            "type": "audio",
            "audio": {"id": media_id}
        }
        return await self._meta_request("POST", "messages", json=payload)

    async def send_audio_official(self, phone_number: str, url: str):
        # Legacy method that downloads and then sends
        import tempfile
        from urllib.parse import unquote
        
        file_path = None
        temp_download_path = None
        
        # Resolve Local Path (Simplified logic from original)
        if "static/uploads" in url:
            try:
                file_name_part = unquote(url.split("/static/")[1])
                base_path = os.path.dirname(os.path.abspath(__file__))
                project_root = os.path.dirname(os.path.dirname(os.path.dirname(base_path)))
                file_path = os.path.join(project_root, "static", *file_name_part.split('/'))
            except: pass

        if not file_path or not os.path.exists(file_path):
            file_path, temp_download_path = await self._download_file(url)

        if not file_path or not os.path.exists(file_path):
            return {"error": "Arquivo não encontrado"}

        try:
            media_id = await self.upload_media_to_meta(file_path, "audio/ogg")
            if not media_id: return {"error": "Falha no upload para Meta"}
            return await self.send_official_audio(phone_number, media_id)
        finally:
            if temp_download_path and os.path.exists(temp_download_path):
                try: os.remove(temp_download_path)
                except: pass

    async def send_image_official(self, phone_number: str, image_url: str, caption: str = ""):
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": ''.join(filter(str.isdigit, phone_number)),
            "type": "image",
            "image": {"link": image_url, "caption": caption}
        }
        return await self._meta_request("POST", "messages", json=payload)

    async def send_video_official(self, phone_number: str, video_url: str, caption: str = ""):
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": ''.join(filter(str.isdigit, phone_number)),
            "type": "video",
            "video": {"link": video_url, "caption": caption}
        }
        return await self._meta_request("POST", "messages", json=payload)

    async def send_document_official(self, phone_number: str, document_url: str, caption: str = "", filename: str = ""):
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": ''.join(filter(str.isdigit, phone_number)),
            "type": "document",
            "document": {"link": document_url, "caption": caption, "filename": filename or "documento"}
        }
        return await self._meta_request("POST", "messages", json=payload)

    async def send_text_direct(self, phone_number: str, content: str):
        return await self.send_text_official(phone_number, content)

    async def _resolve_and_upload_media_param(self, media_type: str, media_data: dict):
        url = media_data.get("link")
        if not url:
            return

        if media_data.get("id"):
            return

        # Upload ANY S3, Backblaze B2, localhost, 127.0.0.1 or non-http URLs to Meta to avoid CORS/crawler errors
        is_external_hosting = any(domain in url for domain in ["backblazeb2.com", "backblazebb2.com", "amazonaws.com", "localhost", "127.0.0.1"])
        is_local_or_relative = not url.startswith("http")
        
        if is_external_hosting or is_local_or_relative:
            import mimetypes
            from urllib.parse import unquote
            file_path = None
            temp_download_path = None
            
            # Resolve Local Path
            if "static/uploads" in url:
                try:
                    file_name_part = unquote(url.split("/static/")[1])
                    base_path = os.path.dirname(os.path.abspath(__file__))
                    project_root = os.path.dirname(os.path.dirname(os.path.dirname(base_path)))
                    file_path = os.path.join(project_root, "static", *file_name_part.split('/'))
                except Exception as e:
                    logger.error(f"Error resolving local path for media: {e}")

            if not file_path or not os.path.exists(file_path):
                file_path, temp_download_path = await self._download_file_with_ext(url)

            if file_path and os.path.exists(file_path):
                try:
                    mime_type, _ = mimetypes.guess_type(file_path)
                    if not mime_type:
                        if media_type == "video": mime_type = "video/mp4"
                        elif media_type == "image": mime_type = "image/png"
                        elif media_type == "document": mime_type = "application/pdf"
                        else: mime_type = "application/octet-stream"
                    
                    media_id = await self.upload_media_to_meta(file_path, mime_type)
                    if media_id:
                        logger.info(f"✅ Mídia de template ({media_type}) carregada com sucesso na Meta. ID: {media_id}")
                        media_data["id"] = media_id
                        if "link" in media_data:
                            del media_data["link"]
                except Exception as e:
                    logger.error(f"Erro ao carregar mídia do template para a Meta: {e}")
                finally:
                    if temp_download_path and os.path.exists(temp_download_path):
                        try: os.remove(temp_download_path)
                        except: pass

    async def _download_file_with_ext(self, url):
        import tempfile
        from urllib.parse import urlparse
        try:
            async with httpx.AsyncClient(timeout=45.0) as dl:
                r = await dl.get(url)
                if r.status_code == 200:
                    t_dir = tempfile.gettempdir()
                    fname = f"wa_temp_media_{int(datetime.now(timezone.utc).timestamp())}"
                    
                    # Tenta obter a extensão a partir do path ou content-type
                    ext = ""
                    path_parsed = urlparse(url)
                    ext = os.path.splitext(path_parsed.path)[1]
                    if not ext:
                        ct = r.headers.get("content-type", "")
                        import mimetypes
                        guessed_ext = mimetypes.guess_extension(ct)
                        if guessed_ext:
                            ext = guessed_ext
                    fname += ext
                    path = os.path.join(t_dir, fname)
                    with open(path, "wb") as f: f.write(r.content)
                    return path, path
        except Exception as e:
            logger.error(f"Erro ao baixar arquivo externo {url}: {e}")
        return None, None

    async def _download_file(self, url):
        import tempfile
        try:
            async with httpx.AsyncClient(timeout=30.0) as dl:
                r = await dl.get(url)
                if r.status_code == 200:
                    t_dir = tempfile.gettempdir()
                    fname = f"wa_audio_{int(datetime.now(timezone.utc).timestamp())}.ogg"
                    path = os.path.join(t_dir, fname)
                    with open(path, "wb") as f: f.write(r.content)
                    return path, path
        except: pass
        return None, None
