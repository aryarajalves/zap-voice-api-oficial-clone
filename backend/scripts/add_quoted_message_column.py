"""
Script de migração: adiciona a coluna quoted_message_id à tabela chat_messages.
Essa coluna armazena o wamid da mensagem citada em um quote reply.

Uso:
    python backend/scripts/add_quoted_message_column.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine
from sqlalchemy import text

def run_migration():
    with engine.connect() as conn:
        # Verifica se a coluna já existe antes de tentar adicionar
        try:
            result = conn.execute(text("SELECT quoted_message_id FROM chat_messages LIMIT 1"))
            print("✅ Coluna 'quoted_message_id' já existe. Nenhuma alteração necessária.")
            return
        except Exception:
            pass

        # Adiciona a coluna
        conn.execute(text(
            "ALTER TABLE chat_messages ADD COLUMN quoted_message_id VARCHAR"
        ))
        conn.commit()
        print("✅ Coluna 'quoted_message_id' adicionada com sucesso à tabela chat_messages.")

if __name__ == "__main__":
    run_migration()
