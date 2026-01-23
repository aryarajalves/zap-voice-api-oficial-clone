"""
Script para testar o webhook do WhatsApp com dados reais do banco
"""
from database import SessionLocal
import models

db = SessionLocal()

# Buscar mensagens recentes
messages = db.query(models.MessageStatus).order_by(models.MessageStatus.timestamp.desc()).limit(5).all()

print("\n📬 Mensagens Recentes no Banco:\n")
print(f"{'ID':<10} {'Message ID':<50} {'Phone':<15} {'Status':<10}")
print("-" * 90)

if not messages:
    print("❌ Nenhuma mensagem encontrada no banco!")
    print("\n💡 Faça um disparo em massa primeiro para gerar message_ids")
else:
    for msg in messages:
        print(f"{msg.id:<10} {msg.message_id:<50} {msg.phone_number:<15} {msg.status:<10}")
    
    print("\n\n🧪 Para testar o webhook, use este comando:\n")
    first_msg = messages[0]
    print(f"""curl -X POST https://053a5b7c66dc.ngrok-free.app/webhooks/whatsapp/status \\
  -H "Content-Type: application/json" \\
  -d '{{
    "entry": [{{
      "changes": [{{
        "value": {{
          "statuses": [{{
            "id": "{first_msg.message_id}",
            "status": "delivered"
          }}]
        }}
      }}]
    }}]
  }}'
""")

db.close()
