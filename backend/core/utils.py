import re
import logging
import json
from typing import Any, List

logger = logging.getLogger("CoreUtils")

def get_nested(data, path):
    """
    Retrieves a nested value from a dictionary using a dot-separated path.
    """
    if not path: return None
    try:
        parts = path.split('.')
        curr = data
        for p in parts:
            if isinstance(curr, dict):
                curr = curr.get(p)
            else:
                return None
        return curr
    except Exception as e:
        logger.error(f"Error in get_nested: {e}")
        return None

def extract_value_by_path(data, path):
    """
    Legacy wrapper for get_nested to maintain compatibility.
    """
    val = get_nested(data, path)
    return val, path if val is not None else None

def format_phone(phone, country="Brasil"):
    """
    Sanitizes and formats a phone number.
    """
    if not phone: return None
    clean = "".join(filter(str.isdigit, str(phone)))
    # Add Brazil country code if missing and length is 10-11
    if not clean.startswith("55") and 10 <= len(clean) <= 11 and country == "Brasil":
         clean = "55" + clean
    return clean

def find_phone_in_payload(payload, key):
    """
    Finds a phone number in the payload using a specific key or path.
    """
    val = get_nested(payload, key)
    return val, key if val is not None else (None, None)

def find_name_in_payload(payload, key):
    """
    Finds a name in the payload using a specific key or path.
    """
    val = get_nested(payload, key)
    return val, key if val is not None else (None, None)

def robust_extract_labels(value: Any) -> list:
    """
    Extrai uma lista de etiquetas de diversos formatos recursivamente.
    Resolve problemas de múltiplas serializações/escapamentos do SQLAlchemy.
    """
    if not value:
        return []
    
    # Se já for lista, apenas garantir que são strings limpas
    if isinstance(value, list):
        return [str(l).strip() for l in value if l and str(l).strip()]
    
    # Se for string, tentar parsear JSON sucessivamente
    if isinstance(value, str):
        curr = value.strip()
        # Se for string vazia ou nula em formato string
        if not curr or curr.lower() in ["null", "none", "[]"]:
            return []
            
        # Tentar até 10 níveis de decodificação para casos de banco de dados extremos
        for _ in range(10):
            try:
                # Remover aspas extras externas antes do json.loads
                if curr.startswith('"') and curr.endswith('"') and len(curr) > 2:
                    # Tenta carregar para ver se é uma string JSON contendo JSON
                    temp = json.loads(curr)
                    if isinstance(temp, str):
                        curr = temp.strip()
                    else:
                        curr = temp
                        break
                else:
                    curr = json.loads(curr)
                
                if isinstance(curr, list):
                    return [str(l).strip() for l in curr if l and str(l).strip()]
                if not isinstance(curr, str):
                    break
                curr = curr.strip()
            except:
                # Se falhar o JSON parse, mas parece uma lista simples separada por vírgula
                if "," in curr and not curr.startswith("["):
                    return [s.strip() for s in curr.split(",") if s.strip()]
                break
        
        # Fallback: se sobrou uma string que não é JSON, mas não é vazia
        if isinstance(curr, str) and curr.strip() and not curr.startswith("["):
             return [curr.strip()]
    
    return []

async def update_node_history_extra(db, trigger_id: int, node_id: str, key: str, value: Any):
    """
    Utility to update the execution history with extra data.
    """
    import models
    trigger = db.query(models.ScheduledTrigger).get(trigger_id)
    if not trigger: return
    
    history = list(trigger.execution_history or [])
    updated = False
    for node in history:
        if node.get("node_id") == node_id:
            if "extra_data" not in node:
                node["extra_data"] = {}
            node["extra_data"][key] = value
            updated = True
            break
            
    if updated:
        trigger.execution_history = history
        db.commit()
