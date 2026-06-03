import os
import sys

# Adicionar o diretório raiz ao sys.path para permitir imports de database
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from database import SessionLocal
import models

def seed():
    db = SessionLocal()
    try:
        # Seed for all clients
        clients = db.query(models.Client).all()
        if not clients:
            client = models.Client(name="Cliente Teste Mapeamento")
            db.add(client)
            db.commit()
            db.refresh(client)
            clients = [client]
            print(f"Criou cliente ID: {client.id}")
            
        for client in clients:
            print(f"Verificando cliente ID: {client.id}")
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
                print(f"Criou mapeamento de teste para cliente {client.id}.")
            else:
                print(f"Mapeamento de teste já existe para cliente {client.id}.")
            
    finally:
        db.close()

if __name__ == "__main__":
    seed()
