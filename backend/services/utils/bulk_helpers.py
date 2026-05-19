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
