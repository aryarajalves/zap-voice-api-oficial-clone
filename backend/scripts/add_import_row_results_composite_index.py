import os
import sys
from sqlalchemy import text

# Garantir que a raiz do backend esteja no sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine

def migrate():
    print("🚀 Criando índice composto idx_import_row_results_import_status na tabela import_row_results...")
    with engine.connect() as conn:
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_import_row_results_import_status ON import_row_results (import_id, status);"))
        conn.commit()
    print("✅ Índice idx_import_row_results_import_status criado com sucesso!")

if __name__ == "__main__":
    migrate()
