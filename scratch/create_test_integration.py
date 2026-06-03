from database import SessionLocal
import models

def seed():
    db = SessionLocal()
    try:
        # Get or create client
        client = db.query(models.Client).first()
        if not client:
            client = models.Client(name="Cliente Teste Mapeamento")
            db.add(client)
            db.commit()
            db.refresh(client)
            print(f"Criou cliente ID: {client.id}")
        else:
            print(f"Cliente existente ID: {client.id}")

        # Check integrations
        integration = db.query(models.WebhookIntegration).filter_by(client_id=client.id).first()
        if not integration:
            integration = models.WebhookIntegration(
                client_id=client.id,
                name="Integração Teste ManyChat",
                platform="hotmart",
                status="active"
            )
            db.add(integration)
            db.commit()
            db.refresh(integration)
            print(f"Criou integração ID: {integration.id}")
        else:
            print(f"Integração existente ID: {integration.id}")

        # Ensure we have at least one mapping
        mapping = db.query(models.WebhookEventMapping).filter_by(integration_id=integration.id).first()
        if not mapping:
            mapping = models.WebhookEventMapping(
                integration_id=integration.id,
                event_type="compra_aprovada",
                manychat_active=True,
                manychat_name="{{name}}",
                manychat_phone="{{phone}}",
                manychat_tag="tag_padrao"
            )
            db.add(mapping)
            db.commit()
            print("Criou mapeamento de teste.")
        else:
            print("Mapeamento de teste já existe.")
            
    finally:
        db.close()

if __name__ == "__main__":
    seed()
