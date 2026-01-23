"""
Script para verificar triggers pendentes
"""
from database import SessionLocal
import models
from datetime import datetime, timezone

db = SessionLocal()

# Buscar todos os triggers
triggers = db.query(models.ScheduledTrigger).order_by(models.ScheduledTrigger.created_at.desc()).limit(10).all()

print(f"\n📋 Últimos 10 triggers:\n")
print(f"{'ID':<5} {'Template/Funil':<30} {'Status':<12} {'Agendado':<20} {'Enviados':<10} {'Entregues':<10}")
print("-" * 100)

now = datetime.now(timezone.utc)

for t in triggers:
    template = t.template_name or (t.funnel.name if t.funnel else "N/A")
    scheduled = t.scheduled_time.strftime("%d/%m %H:%M") if t.scheduled_time else "N/A"
    
    # Check if it's due
    is_due = ""
    if t.scheduled_time:
        # Make sure both datetimes are timezone-aware
        if t.scheduled_time.tzinfo is None:
            from datetime import timezone as tz
            scheduled_aware = t.scheduled_time.replace(tzinfo=tz.utc)
        else:
            scheduled_aware = t.scheduled_time
        is_due = "✅ PRONTO" if scheduled_aware <= now else "⏰ Futuro"
    
    print(f"{t.id:<5} {template:<30} {t.status:<12} {scheduled:<20} {t.total_sent:<10} {t.total_delivered or 0:<10} {is_due}")


# Buscar triggers pendentes que deveriam ter sido executados
pending = db.query(models.ScheduledTrigger).filter(
    models.ScheduledTrigger.status == "pending",
    models.ScheduledTrigger.scheduled_time <= now
).all()

print(f"\n\n⚠️ Triggers PENDENTES que já deveriam ter sido executados: {len(pending)}")
for t in pending:
    template = t.template_name or (t.funnel.name if t.funnel else "N/A")
    print(f"   - ID {t.id}: {template} (agendado para {t.scheduled_time})")

db.close()
