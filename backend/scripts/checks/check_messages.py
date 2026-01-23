"""
Script para verificar message_ids no banco de dados
"""
from database import SessionLocal
import models

db = SessionLocal()

# Buscar todas as mensagens
messages = db.query(models.MessageStatus).all()

print(f"\n📬 Total de mensagens no banco: {len(messages)}\n")

if messages:
    print(f"{'ID':<5} {'Message ID':<60} {'Phone':<15} {'Status':<10} {'Trigger ID':<10}")
    print("-" * 110)
    for msg in messages:
        print(f"{msg.id:<5} {msg.message_id:<60} {msg.phone_number:<15} {msg.status:<10} {msg.trigger_id:<10}")
else:
    print("❌ Nenhuma mensagem encontrada!")
    print("\n🔍 Verificando triggers recentes...")
    
    triggers = db.query(models.ScheduledTrigger).order_by(models.ScheduledTrigger.created_at.desc()).limit(5).all()
    
    if triggers:
        print(f"\n📋 Últimos 5 triggers:")
        print(f"{'ID':<5} {'Template':<30} {'Status':<12} {'Enviados':<10} {'Entregues':<10}")
        print("-" * 80)
        for t in triggers:
            template = t.template_name or (t.funnel.name if t.funnel else "N/A")
            print(f"{t.id:<5} {template:<30} {t.status:<12} {t.total_sent:<10} {t.total_delivered or 0:<10}")

# Buscar o message_id específico que veio do webhook
target_id = "wamid.HBgMNTU4NTk2MTIzNTg2FQIAERgSNzlFQTZBNTc2Nzc2NTcyQUYyAA=="
msg = db.query(models.MessageStatus).filter(models.MessageStatus.message_id == target_id).first()

print(f"\n\n🔎 Procurando message_id específico do webhook:")
print(f"   {target_id}")

if msg:
    print(f"✅ ENCONTRADO! Status: {msg.status}, Trigger ID: {msg.trigger_id}")
else:
    print(f"❌ NÃO ENCONTRADO no banco de dados")

db.close()
