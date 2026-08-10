import uuid
from datetime import datetime, timezone, timedelta
from database import SessionLocal
import models

def seed_hotmart_integration():
    db = SessionLocal()
    try:
        # Busca usuário/cliente default (client_id = 1 ou primeiro cliente)
        client = db.query(models.Client).first()
        if not client:
            print("Nenhum cliente encontrado para vincular a integração.")
            return

        # 1. Criar Nova Integração Hotmart
        integration_id = uuid.uuid4()
        integration = models.WebhookIntegration(
            id=integration_id,
            client_id=client.id,
            name="Hotmart Oficial",
            platform="hotmart",
            status="active"
        )
        db.add(integration)
        db.commit()
        db.refresh(integration)
        print(f"✅ Integração Criada: {integration.name} (ID: {integration.id})")

        # 2. Criar 5 Históricos com 2 Produtos Diferentes
        now = datetime.now(timezone.utc)

        histories_data = [
            {
                "event_type": "compra_aprovada",
                "price": "297.00",
                "product_name": "Curso de Automação WhatsApp",
                "buyer_name": "Carlos Eduardo",
                "payment_method": "Cartão de Crédito",
                "raw_status": "APPROVED",
                "minutes_ago": 120
            },
            {
                "event_type": "compra_aprovada",
                "price": "297.00",
                "product_name": "Curso de Automação WhatsApp",
                "buyer_name": "Mariana Lima",
                "payment_method": "Pix",
                "raw_status": "APPROVED",
                "minutes_ago": 90
            },
            {
                "event_type": "compra_aprovada",
                "price": "997.00",
                "product_name": "Mentoria Agente IA Pro",
                "buyer_name": "Roberto Alves",
                "payment_method": "Cartão de Crédito",
                "raw_status": "APPROVED",
                "minutes_ago": 60
            },
            {
                "event_type": "reembolso",
                "price": "297.00",
                "product_name": "Curso de Automação WhatsApp",
                "buyer_name": "Fernanda Souza",
                "payment_method": "Pix",
                "raw_status": "REFUNDED",
                "minutes_ago": 30
            },
            {
                "event_type": "compra_aprovada",
                "price": "997.00",
                "product_name": "Mentoria Agente IA Pro",
                "buyer_name": "Juliana Martins",
                "payment_method": "Pix",
                "raw_status": "APPROVED",
                "minutes_ago": 10
            }
        ]

        for idx, item in enumerate(histories_data, start=1):
            history_time = now - timedelta(minutes=item["minutes_ago"])
            
            raw_payload = {
                "id": f"hotmart_evt_{idx}_{uuid.uuid4().hex[:6]}",
                "creation_date": int(history_time.timestamp() * 1000),
                "event": "PURCHASE_APPROVED" if item["event_type"] == "compra_aprovada" else "PURCHASE_REFUNDED",
                "version": "2.0.0",
                "data": {
                    "product": {
                        "id": 123456 if "Curso" in item["product_name"] else 789012,
                        "name": item["product_name"],
                        "ucode": "ucode_sample_123"
                    },
                    "buyer": {
                        "email": f"cliente{idx}@teste.com",
                        "name": item["buyer_name"],
                        "checkout_phone": "5511999999999"
                    },
                    "purchase": {
                        "approved_date": int(history_time.timestamp() * 1000),
                        "full_price": {"value": float(item["price"]), "currency_value": "BRL"},
                        "price": {"value": float(item["price"]), "currency_value": "BRL"},
                        "payment": {"type": "CREDIT_CARD" if "Cartão" in item["payment_method"] else "PIX"},
                        "status": item["raw_status"],
                        "transaction": f"HP{idx}000{uuid.uuid4().hex[:6].upper()}"
                    }
                }
            }

            processed_data = {
                "price": item["price"],
                "product_name": item["product_name"],
                "platform": "hotmart",
                "payment_method": item["payment_method"],
                "name": item["buyer_name"],
                "raw_status": item["raw_status"],
                "buyer_email": f"cliente{idx}@teste.com",
                "phone": "5511999999999"
            }

            history = models.WebhookHistory(
                integration_id=integration.id,
                event_type=item["event_type"],
                payload=raw_payload,
                processed_data=processed_data,
                status="success",
                created_at=history_time
            )
            db.add(history)

        db.commit()
        print("✅ 5 Históricos Hotmart inseridos com sucesso!")

    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao popular banco: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_hotmart_integration()
