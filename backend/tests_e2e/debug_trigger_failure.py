import os
import sys
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Path adjust
sys.path.append(os.path.join(os.getcwd(), 'backend'))

# Load .env
dotenv_path = os.path.join(os.getcwd(), 'backend', '.env')
load_dotenv(dotenv_path)

# Correct DATABASE_URL for local execution if running outside docker
db_url = os.getenv("DATABASE_URL")
if "zapvoice-postgres" in db_url:
    db_url = db_url.replace("zapvoice-postgres", "localhost")
os.environ["DATABASE_URL"] = db_url

try:
    from database import SessionLocal
    import models
    db = SessionLocal()
except Exception as e:
    print(f"Erro ao conectar no banco: {e}")
    sys.exit(1)

def debug_trigger():
    phone_number = "558596123586"
    funnel_name = "Novo Funil 25/01/2026"
    
    print(f"--- Debugging Trigger for {phone_number} ---")
    
    # 1. Find Funnel
    funnel = db.query(models.Funnel).filter(models.Funnel.name == funnel_name).first()
    if not funnel:
        print(f"Funil '{funnel_name}' nao encontrado.")
        return
    
    print(f"Funil encontrado: ID {funnel.id}")
    
    # 2. Find recent triggers for this funnel
    since = datetime.now() - timedelta(hours=24)
    triggers = db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.funnel_id == funnel.id,
        models.ScheduledTrigger.created_at >= since
    ).all()
    
    if not triggers:
        print(f"Nenhum disparo (ScheduledTrigger) encontrado nas ultimas 24 horas para este funil.")
        return
    
    print(f"Encontrados {len(triggers)} registros de disparo recentes.")
    
    for t in triggers:
        print(f"\nDisparo ID: {t.id} | Status: {t.status} | Criado em: {t.created_at}")
        
        # Check if phone is in contacts_list
        in_list = False
        if t.contacts_list:
            for c in t.contacts_list:
                # Search for phone in meta or other fields
                phone_in_c = str(c.get('phone', '')) or str(c.get('meta', {}).get('sender', {}).get('phone_number', ''))
                if phone_number in phone_in_c:
                    in_list = True
                    break
        
        print(f"  - Contato na lista? {'Sim' if in_list else 'Nao'}")
        
        # Check MessageStatus
        statuses = db.query(models.MessageStatus).filter(
            models.MessageStatus.trigger_id == t.id,
            models.MessageStatus.phone_number.contains(phone_number)
        ).all()
        
        if not statuses:
            print(f"  - Status da Mensagem: Nao encontrado na tabela message_status")
        else:
            for s in statuses:
                print(f"  - Status: {s.status} | Motivo Falha: {s.failure_reason} | ID Whatsapp: {s.message_id}")

if __name__ == "__main__":
    debug_trigger()
