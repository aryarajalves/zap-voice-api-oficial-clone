import asyncio
import sys
import os
from datetime import datetime, timezone

# Adiciona o diretório atual ao path para importar módulos locais
sys.path.append(os.getcwd())

import models
from database import SessionLocal
from core.worker.handlers.whatsapp import handle_whatsapp_event

async def test_interaction_metadata():
    print("🧪 Iniciando teste de metadados de interação...")
    
    # Mock do evento do WhatsApp
    mock_data = {
        "entry": [{
            "changes": [{
                "value": {
                    "messaging_product": "whatsapp",
                    "metadata": {
                        "display_phone_number": "15550269411",
                        "phone_number_id": "111867168604732"
                    },
                    "contacts": [{
                        "profile": {"name": "Test User"},
                        "wa_id": "5585996123586"
                    }],
                    "messages": [{
                        "from": "5585996123586",
                        "id": f"wamid.{int(datetime.now().timestamp())}",
                        "timestamp": str(int(datetime.now().timestamp())),
                        "text": {"body": "Continuar"},
                        "type": "text"
                    }]
                }
            }]
        }]
    }

    db = SessionLocal()
    try:
        # 1. Garantir que o funil 'Continuar' exista
        funnel = db.query(models.Funnel).filter(models.Funnel.trigger_phrase.ilike("%continuar%")).first()
        if not funnel:
            print("⚠️ Funil 'Continuar' não encontrado. Criando um temporário...")
            funnel = models.Funnel(
                client_id=1,
                name="Funil Teste",
                trigger_phrase="continuar",
                steps={"nodes": [], "edges": []}
            )
            db.add(funnel)
            db.commit()
            db.refresh(funnel)

        # 2. Executar o handler
        print("⏳ Processando evento de interação...")
        await handle_whatsapp_event(mock_data)
        
        # 3. Verificar o trigger criado
        await asyncio.sleep(2) # Aguardar processamento async se houver
        
        trigger = db.query(models.ScheduledTrigger)\
            .filter(models.ScheduledTrigger.contact_phone == "5585996123586")\
            .order_by(models.ScheduledTrigger.id.desc())\
            .first()
            
        if trigger:
            print(f"✅ Trigger encontrado: ID {trigger.id}")
            print(f"📊 Account ID: {trigger.chatwoot_account_id}")
            print(f"📊 Contact ID: {trigger.chatwoot_contact_id}")
            
            if trigger.chatwoot_account_id:
                print("🎉 SUCESSO: Account ID capturado!")
            else:
                print("❌ FALHA: Account ID continua N/A.")
        else:
            print("❌ FALHA: Nenhum trigger foi criado.")

    except Exception as e:
        print(f"❌ Erro no teste: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_interaction_metadata())
