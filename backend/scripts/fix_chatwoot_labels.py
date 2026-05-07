import json
from database import SessionLocal
from models import WebhookEventMapping, WebhookHistory, ScheduledTrigger
from sqlalchemy import text

def clean_label(label):
    if not label:
        return []
    
    curr = label
    # Descobrir recursivamente se é uma string que contém JSON
    max_depth = 5
    while isinstance(curr, str) and max_depth > 0:
        curr = curr.strip()
        if (curr.startswith('[') and curr.endswith(']')) or (curr.startswith('"') and curr.endswith('"')):
            try:
                curr = json.loads(curr)
            except:
                break
        else:
            break
        max_depth -= 1
    
    if isinstance(curr, list):
        return curr
    if isinstance(curr, str) and curr:
        return [curr]
    return []

def fix_database():
    db = SessionLocal()
    print("Iniciando limpeza de etiquetas Chatwoot...")
    
    # 1. WebhookEventMapping
    mappings = db.query(WebhookEventMapping).all()
    m_fixed = 0
    for m in mappings:
        if m.chatwoot_label:
            cleaned = clean_label(m.chatwoot_label)
            if cleaned != m.chatwoot_label:
                m.chatwoot_label = cleaned
                m_fixed += 1
    print(f"Mapeamentos corrigidos: {m_fixed}")
    
    # 2. ScheduledTrigger
    triggers = db.query(ScheduledTrigger).all()
    t_fixed = 0
    for t in triggers:
        if t.chatwoot_label:
            cleaned = clean_label(t.chatwoot_label)
            if cleaned != t.chatwoot_label:
                t.chatwoot_label = cleaned
                t_fixed += 1
    print(f"Triggers agendados corrigidos: {t_fixed}")

    # 3. WebhookHistory (processed_data)
    history = db.query(WebhookHistory).all()
    h_fixed = 0
    for h in history:
        if h.processed_data and "chatwoot_label" in h.processed_data:
            data = dict(h.processed_data)
            cleaned = clean_label(data["chatwoot_label"])
            if cleaned != data["chatwoot_label"]:
                data["chatwoot_label"] = cleaned
                h.processed_data = data
                h_fixed += 1
    print(f"Histórico de Webhooks corrigido: {h_fixed}")

    db.commit()
    db.close()
    print("Limpeza concluída!")

if __name__ == "__main__":
    fix_database()
