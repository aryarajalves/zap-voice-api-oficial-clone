import os
import sys

# Adiciona o diretorio backend ao path para podermos importar
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend'))
sys.path.append(backend_dir)

from database import SessionLocal
import models
from datetime import datetime, timezone

def create_dummies():
    db = SessionLocal()
    try:
        # Procurar o usuario pelo email
        user = db.query(models.User).filter(models.User.email == "aryarajmarketing@gmail.com").first()
        if not user:
            print("Usuario aryarajmarketing@gmail.com nao encontrado!")
            return
        
        client_id = user.client_id
        print(f"Usuario encontrado. ID do cliente: {client_id}")
        
        # Inserir 2 historicos de importacao
        h1 = models.ContactImportHistory(
            client_id=client_id,
            filename="lista_leads_premium_2026.csv",
            status="completed",
            total_rows=150,
            imported_rows=148,
            error_rows=2,
            created_at=datetime.now(timezone.utc)
        )
        
        h2 = models.ContactImportHistory(
            client_id=client_id,
            filename="lista_contatos_marketing.xlsx",
            status="completed",
            total_rows=320,
            imported_rows=320,
            error_rows=0,
            created_at=datetime.now(timezone.utc)
        )
        
        db.add(h1)
        db.add(h2)
        db.commit()
        print("Registros de teste adicionados com sucesso no banco de dados!")
        
    except Exception as e:
        print(f"Erro ao inserir dados: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_dummies()
