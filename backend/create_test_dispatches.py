import os
import sys
import uuid
from datetime import datetime, timezone

# Garantir que o diretório /app está no path
sys.path.append('/app')

from database import SessionLocal
import models

def main():
    db = SessionLocal()
    try:
        # Buscar o client_id 4 (do usuário logado no teste visual)
        client = db.query(models.Client).filter(models.Client.id == 4).first()
        if not client:
            print("Cliente 4 não encontrado. Buscando por nome...")
            client = db.query(models.Client).filter(models.Client.name == "Cliente de Teste Automatizado").first()
            
        if not client:
            print("Cliente não encontrado.")
            return

        # Buscar a primeira integração deste cliente
        integration = db.query(models.WebhookIntegration).filter(
            models.WebhookIntegration.client_id == client.id
        ).first()

        if not integration:
            print("Nenhuma integração encontrada para o cliente 4. Criando uma fictícia...")
            integration = models.WebhookIntegration(
                id=uuid.uuid4(),
                client_id=client.id,
                name="Webhook - Hotmart",
                platform="hotmart",
                status="active"
            )
            db.add(integration)
            db.commit()
            db.refresh(integration)

        print(f"Usando a integração {integration.name} (ID: {integration.id}) do Cliente: {client.name} (ID: {client.id})")

        # Criar dois ScheduledTriggers pendentes de teste
        t1 = models.ScheduledTrigger(
            client_id=client.id,
            integration_id=integration.id,
            event_type="compra_aprovada",
            scheduled_time=datetime.now(timezone.utc),
            status="pending",
            contact_phone="5511999999991",
            contact_name="Disparo Teste A",
            template_name="boas_vindas",
            is_bulk=False
        )

        t2 = models.ScheduledTrigger(
            client_id=client.id,
            integration_id=integration.id,
            event_type="compra_aprovada",
            scheduled_time=datetime.now(timezone.utc),
            status="pending",
            contact_phone="5511999999992",
            contact_name="Disparo Teste B",
            template_name="boas_vindas",
            is_bulk=False
        )

        db.add(t1)
        db.add(t2)
        db.commit()
        print("Disparos de teste criados com sucesso no banco de dados para o Cliente 4!")
    except Exception as e:
        print(f"Erro: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
