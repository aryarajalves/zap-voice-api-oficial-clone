"""
Script para simular webhook do WhatsApp com dados do banco
"""
import httpx
import asyncio
from database import SessionLocal
import models

async def test_webhook():
    db = SessionLocal()
    
    # Buscar a mensagem mais recente
    msg = db.query(models.MessageStatus).order_by(models.MessageStatus.timestamp.desc()).first()
    
    if not msg:
        print("❌ Nenhuma mensagem no banco! Faça um disparo primeiro.")
        db.close()
        return
    
    print(f"\n✅ Mensagem encontrada:")
    print(f"   ID: {msg.message_id}")
    print(f"   Phone: {msg.phone_number}")
    print(f"   Status atual: {msg.status}")
    print(f"   Trigger ID: {msg.trigger_id}")
    
    # Simular webhook
    webhook_payload = {
        "entry": [{
            "changes": [{
                "value": {
                    "statuses": [{
                        "id": msg.message_id,
                        "status": "delivered"
                    }]
                }
            }]
        }]
    }
    
    print(f"\n🚀 Enviando webhook simulado para localhost:8000...")
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "http://localhost:8000/webhooks/whatsapp/status",
                json=webhook_payload,
                timeout=10.0
            )
            
            print(f"\n📬 Resposta: {response.status_code}")
            print(f"   Body: {response.json()}")
            
            # Verificar se foi atualizado
            db.refresh(msg)
            print(f"\n🔄 Status após webhook: {msg.status}")
            
            # Verificar trigger
            trigger = db.query(models.ScheduledTrigger).get(msg.trigger_id)
            if trigger:
                print(f"\n📊 Trigger #{trigger.id}:")
                print(f"   Total enviados: {trigger.total_sent}")
                print(f"   Total entregues: {trigger.total_delivered}")
                print(f"   Custo total: R$ {trigger.total_cost:.2f}")
            
        except Exception as e:
            print(f"\n❌ Erro: {e}")
    
    db.close()

if __name__ == "__main__":
    asyncio.run(test_webhook())
