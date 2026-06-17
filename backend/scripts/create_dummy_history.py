import os
import sys

sys.path.append('/app')

from database import SessionLocal
import models
from datetime import datetime, timezone

def create_dummies():
    db = SessionLocal()
    try:
        clients = db.query(models.Client).all()
        print(f"Encontrados {len(clients)} clientes.")
        
        for client in clients:
            client_id = client.id
            print(f"Inserindo historicos para o cliente ID {client_id} ({client.name})...")
            
            # Inserir 2 historicos de importacao
            h1 = models.ContactImportHistory(
                client_id=client_id,
                filename=f"lista_leads_client_{client_id}_2026.csv",
                status="completed",
                total_rows=150,
                imported_rows=148,
                error_rows=2,
                created_at=datetime.now(timezone.utc)
            )
            
            h2 = models.ContactImportHistory(
                client_id=client_id,
                filename=f"lista_marketing_client_{client_id}.xlsx",
                status="completed",
                total_rows=320,
                imported_rows=320,
                error_rows=0,
                created_at=datetime.now(timezone.utc)
            )
            
            db.add(h1)
            db.add(h2)
            
        db.commit()
        print("Registros de teste adicionados para todos os clientes!")
        
    except Exception as e:
        print(f"Erro ao inserir dados: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_dummies()
