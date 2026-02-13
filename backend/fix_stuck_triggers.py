
from database import SessionLocal
import models
from datetime import datetime, timezone, timedelta

def fix_stuck():
    db = SessionLocal()
    try:
        # 1. Encontrar agendamentos que estão 'processing' há mais de 10 minutos
        ten_mins_ago = datetime.now(timezone.utc) - timedelta(minutes=10)
        
        stuck = db.query(models.ScheduledTrigger).filter(
            models.ScheduledTrigger.status == 'processing',
            models.ScheduledTrigger.updated_at <= ten_mins_ago
        ).all()
        
        print(f"Encontrados {len(stuck)} disparos possivelmente travados.")
        
        for t in stuck:
            print(f"🔄 Resetando Trigger ID {t.id} ({t.template_name}) para 'queued'...")
            t.status = 'queued'
            t.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        print("✅ Concluído!")
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_stuck()
