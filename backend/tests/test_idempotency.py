
import sys
import os
from datetime import datetime, timezone, timedelta

# Adiciona o diretório backend ao path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# IMPORTANTE: A variável de ambiente DATABASE_URL deve estar definida como sqlite antes de importar
# Ex: $env:DATABASE_URL="sqlite:///./test_zapvoice.db"

import models
from database import SessionLocal, engine

# Cria as tabelas necessárias se estiver usando SQLite
if str(engine.url).startswith("sqlite"):
    models.Base.metadata.create_all(bind=engine)

def test_trigger_idempotency():
    db = SessionLocal()
    client_id = 1
    funnel_id = 999 
    phone = "5585999999999"
    
    # Garante Funil
    if not db.query(models.Funnel).get(funnel_id):
        f = models.Funnel(id=funnel_id, name="Test Funnel", client_id=client_id, trigger_phrase="test")
        db.add(f)
        db.commit()

    print(f"--- Iniciando Teste de Idempotência (Engine: {engine.url}) ---")

    def create_trigger_with_check(cid, fid, ph):
        now = datetime.now(timezone.utc)
        time_limit = now - timedelta(seconds=30)
        
        existing = db.query(models.ScheduledTrigger).filter(
            models.ScheduledTrigger.client_id == cid,
            models.ScheduledTrigger.funnel_id == fid,
            models.ScheduledTrigger.contact_phone == ph,
            models.ScheduledTrigger.created_at >= time_limit,
            models.ScheduledTrigger.status != 'cancelled'
        ).first()
        
        if existing:
            print(f"  [TEST] Bloqueado! Trigger já existe: ID {existing.id} (Criado em: {existing.created_at})")
            return None
            
        new_t = models.ScheduledTrigger(
            client_id=cid,
            funnel_id=fid,
            contact_phone=ph,
            status='queued',
            scheduled_time=now,
            created_at=now
        )
        db.add(new_t)
        db.commit()
        db.refresh(new_t)
        print(f"  [TEST] Criado com sucesso! ID {new_t.id}")
        return new_t

    # 1. Primeiro Trigger
    t1 = create_trigger_with_check(client_id, funnel_id, phone)
    assert t1 is not None, "O primeiro deveria ser criado"
    
    # 2. Segundo Trigger (Imediato)
    t2 = create_trigger_with_check(client_id, funnel_id, phone)
    assert t2 is None, "O segundo deveria ser bloqueado"
    
    # 3. Terceiro (Simulando 31s depois)
    t1.created_at = datetime.now(timezone.utc) - timedelta(seconds=35)
    db.commit()
    
    t3 = create_trigger_with_check(client_id, funnel_id, phone)
    assert t3 is not None, "O terceiro deveria ser criado após o cooldown"
    
    print(f"✅ Teste de Idempotência PASSOU!")
    db.close()

if __name__ == "__main__":
    test_trigger_idempotency()
