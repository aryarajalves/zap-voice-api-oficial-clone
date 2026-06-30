import sys
import os
import asyncio
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from database import SessionLocal
import models
from core.worker.handlers.whatsapp_inbound import handle_whatsapp_inbound_messages

# Mocks para o teste
payload = {
  "entry": [
    {
      "id": "1149902341541904",
      "changes": [
        {
          "field": "messages",
          "value": {
            "contacts": [
              {
                "wa_id": "558596123586",
                "profile": {
                  "name": "Aryaraj"
                },
                "user_id": "BR.2035734117013218"
              }
            ],
            "messages": [
              {
                "id": "wamid.HBgMNTU4NTk2MTIzNTg2FQIAEhggQUMxMTE4RjQyMUMxNjZDM0YyNEZDNkFGM0Y1NTdBQkUA",
                "from": "558596123586",
                "type": "interactive",
                "context": {
                  "id": "wamid.HBgMNTU4NTk2MTIzNTg2FQIAERgSRkUxOEZEOUZCNjIxRTZFODk1AA==",
                  "from": "5511936218210"
                },
                "timestamp": "1782767158",
                "interactive": {
                  "type": "button_reply",
                  "button_reply": {
                    "id": "btn_1",
                    "title": "Cancelar envios"
                  }
                },
                "from_user_id": "BR.2035734117013218"
              }
            ],
            "metadata": {
              "phone_number_id": "1149902341541904",
              "display_phone_number": "5511936218210"
            },
            "messaging_product": "whatsapp"
          }
        }
      ]
    }
  ],
  "object": "whatsapp_business_account"
}

async def main():
    db = SessionLocal()
    # Garantir que temos um lead com o telefone correspondente para o cliente ID 9 (ou outro client)
    # Primeiro vamos ver quais clientes existem
    client = db.query(models.Client).first()
    if not client:
        print("Nenhum cliente cadastrado no banco.")
        return
        
    client_id = client.id
    print(f"Testando com Client ID: {client_id}")
    
    # Criar ou redefinir o lead Aryaraj para o teste com BSUD = None
    phone_test = "558596123586"
    lead = db.query(models.WebhookLead).filter(
        models.WebhookLead.client_id == client_id,
        models.WebhookLead.phone == phone_test
    ).first()
    
    if not lead:
        lead = models.WebhookLead(
            client_id=client_id,
            name="Aryaraj Teste",
            phone=phone_test,
            bsud=None,
            platform="whatsapp",
            total_events=1
        )
        db.add(lead)
        db.commit()
        db.refresh(lead)
        print(f"Lead criado para teste: {lead.id}")
    else:
        lead.bsud = None
        db.commit()
        print(f"Lead existente redefinido para teste: {lead.id}")

    # Chamar o handler do worker diretamente simulando o processamento do RabbitMQ
    # Injetamos o client_id no metadata para o handler do worker saber o ID do cliente
    meta_val = payload["entry"][0]["changes"][0]["value"]
    messages_list = meta_val.get("messages", [])
    metadata_dict = meta_val.get("metadata", {})
    metadata_dict["client_id"] = client_id
    
    print("Chamando handle_whatsapp_inbound_messages...")
    await handle_whatsapp_inbound_messages(db, messages_list, meta_val, metadata_dict)
    
    # Verificar se o BSUD foi salvo no banco de dados!
    db.refresh(lead)
    print(f"RESULTADO: Lead ID: {lead.id} | Phone: {lead.phone} | BSUD final no Banco: {lead.bsud}")
    
    db.close()

if __name__ == "__main__":
    asyncio.run(main())
