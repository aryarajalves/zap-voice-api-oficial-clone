import copy

def render_template_body(body: str, components: list, contact_name: str = None, var1: str = None, var2: str = None, var3: str = None, var4: str = None, var5: str = None) -> str:
    """Substitui {{1}}, {{2}}... e {{nome}}, {{telefone}} no corpo da mensagem."""
    if not body:
        return ""
        
    # Proteção: Se o nome for "1", tratamos como vazio
    real_name = contact_name if str(contact_name) != "1" else ""

    # 0. Prioridade absoluta: Variáveis persistidas (var1-var5)
    persist_vars = {
        "1": var1,
        "2": var2,
        "3": var3,
        "4": var4,
        "5": var5
    }
    
    for idx_s, val in persist_vars.items():
        if val: # Só substitui se houver valor preenchido (não vazio e não None)
             body = body.replace(f"{{{{{idx_s}}}}}", str(val))

    # 1. Substituição de variáveis nomeadas (padrão amigável)
    body = body.replace("{{nome}}", real_name or "")
    body = body.replace("{{name}}", real_name or "")
    first_name = real_name.strip().split()[0] if real_name else ""
    body = body.replace("{{primeiro_nome}}", first_name)
    body = body.replace("{{first_name}}", first_name)
    
    body_comp = next(
        (c for c in components if isinstance(c, dict) and str(c.get("type", "")).lower() == "body"),
        None
    )
    
    # 2. Se houver componentes (Template Meta), processa variáveis numéricas {{1}}, {{2}}...
    # Apenas se as variáveis persistidas não tiverem preenchido tudo ou se preferirmos fallback
    if body_comp:
        for idx, param in enumerate(body_comp.get("parameters", []), 1):
            # Se já preenchemos via persist_vars, pulamos ou usamos o valor persistido
            if persist_vars.get(str(idx)) is not None:
                continue
                
            value = param.get("text", "") if isinstance(param, dict) else str(param)
            
            # Se o valor for "1" e for o primeiro parâmetro, tentamos usar o nome do contato
            if idx == 1 and str(value) == "1" and real_name:
                value = real_name
            elif str(value) == "1":
                value = ""
                
            body = body.replace(f"{{{{{idx}}}}}", str(value))
    
    # 3. Fallback final para {{1}} (comum em CRM) mesmo sem body_comp
    if "{{1}}" in body:
        # Se var1 não foi passado ou está vazio, usamos real_name
        fallback_val = persist_vars.get("1") or real_name or ""
        body = body.replace("{{1}}", fallback_val)
        
    return body


def extract_body_from_components(components: list) -> str | None:
    """
    Extrai o texto do corpo (BODY) diretamente dos components enviados para a Meta API.
    Os parâmetros já estão com os valores reais preenchidos (após sanitize_template_components),
    portanto não precisamos do template_body_cache para reconstruir o texto.
    
    Retorna o texto concatenado dos parâmetros do body, ou None se não for possível extrair.
    """
    if not components:
        return None

    for comp in components:
        if not isinstance(comp, dict):
            continue
        if str(comp.get("type", "")).upper() != "BODY":
            continue
        params = comp.get("parameters", [])
        if not params:
            return None
        # Extrai e une todos os textos dos parâmetros do body
        texts = []
        for param in params:
            if isinstance(param, dict):
                text = param.get("text", "")
                if text:
                    texts.append(str(text))
            elif isinstance(param, str) and param:
                texts.append(param)
        return " ".join(texts) if texts else None

    return None

def sanitize_template_components(components: list, contact_name: str = None, contact_phone: str = None) -> list:
    """
    Remove ou substitui valores inválidos (como '1') nos componentes do template
    antes de enviar para a Meta API. Também realiza a substituição dinâmica
    de variáveis como {{nome}} e {{telefone}} pelos dados reais do contato.
    """
    if not components:
        return []
    
    try:
        new_components = copy.deepcopy(components)
        for comp in new_components:
            if isinstance(comp, dict) and comp.get("type", "").lower() == "body":
                params = comp.get("parameters", [])
                for param in params:
                    if isinstance(param, dict) and param.get("type") == "text":
                        val = str(param.get("text", "")).strip()
                        if val == "1":
                            # Substitui pelo nome do contato se disponível, senão vazio
                            param["text"] = contact_name if contact_name else ""
                        else:
                            # Substituição dinâmica de variáveis escolhidas
                            if "{{nome}}" in val:
                                val = val.replace("{{nome}}", contact_name or "")
                            if "{{name}}" in val:
                                val = val.replace("{{name}}", contact_name or "")
                            if "{{primeiro_nome}}" in val:
                                first_name = contact_name.strip().split()[0] if contact_name else ""
                                val = val.replace("{{primeiro_nome}}", first_name)
                            if "{{first_name}}" in val:
                                first_name = contact_name.strip().split()[0] if contact_name else ""
                                val = val.replace("{{first_name}}", first_name)
                            if "{{telefone}}" in val:
                                val = val.replace("{{telefone}}", contact_phone or "")
                            if "{{phone}}" in val:
                                val = val.replace("{{phone}}", contact_phone or "")
                            param["text"] = val
        return new_components
    except Exception as e:
        print(f"Erro ao sanitizar componentes: {e}")
        return components


def extract_template_buttons(components: list) -> dict:
    """
    Extrai informações de botões dos componentes do template da Meta.
    Retorna: {
        "quick_replies": [str], 
        "has_special_buttons": bool (URL/Phone)
    }
    """
    quick_replies = []
    has_special_buttons = False
    
    if not components:
        return {"quick_replies": [], "has_special_buttons": False}
        
    for comp in components:
        if isinstance(comp, dict) and comp.get("type", "").upper() == "BUTTONS":
            buttons = comp.get("buttons", [])
            for btn in buttons:
                b_type = str(btn.get("type", "")).upper()
                if b_type == "QUICK_REPLY":
                    text = btn.get("text")
                    if text:
                        quick_replies.append(text)
                elif b_type in ["URL", "PHONE_NUMBER"]:
                    has_special_buttons = True
    
    return {
        "quick_replies": quick_replies,
        "has_special_buttons": has_special_buttons
    }


async def resolve_template_body_with_sync(db, client_id: int, template_name: str) -> tuple:
    """
    Busca o corpo do template e botões no cache local.
    Se não encontrar, sincroniza da Meta API e tenta novamente.
    """
    import models
    from core.logger import setup_logger
    logger = setup_logger("TemplateSyncHelper")
    
    t_name = template_name.split('|')[0] if '|' in template_name else template_name
    tpl = db.query(models.WhatsAppTemplateCache).filter_by(client_id=client_id, name=t_name).first()
    
    if not tpl:
        logger.info(f"🔍 [TEMPLATE-SYNC] Template '{t_name}' não encontrado no cache. Sincronizando com a Meta...")
        try:
            from chatwoot_client import ChatwootClient
            chatwoot_cl = ChatwootClient(client_id=client_id)
            await chatwoot_cl.get_whatsapp_templates()
            # Recarrega do banco
            tpl = db.query(models.WhatsAppTemplateCache).filter_by(client_id=client_id, name=t_name).first()
        except Exception as e_sync:
            logger.error(f"❌ [TEMPLATE-SYNC] Falha ao sincronizar templates com a Meta: {e_sync}")
            
    body = None
    btn_info = {"quick_replies": [], "has_special_buttons": False}
    if tpl:
        body = tpl.body
        if tpl.components:
            btn_info = extract_template_buttons(tpl.components)
            
    return body, btn_info

