import os
import sys
from sqlalchemy import text, inspect

# Adiciona o diretório backend ao sys.path se necessário
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine

def migrate():
    """
    Cria a tabela contact_template_history e adiciona as colunas
    last_template_name e last_template_dispatched_at na tabela webhook_leads.
    """
    print("🚀 Executando migração: contact_template_history e colunas de template em webhook_leads...")
    
    with engine.connect() as conn:
        # 1. Criar tabela contact_template_history se não existir
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS contact_template_history (
            id SERIAL PRIMARY KEY,
            client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
            phone VARCHAR NOT NULL,
            template_name VARCHAR NOT NULL,
            trigger_id INTEGER REFERENCES scheduled_triggers(id) ON DELETE SET NULL,
            dispatched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS ix_contact_template_history_client_id ON contact_template_history(client_id);
        CREATE INDEX IF NOT EXISTS ix_contact_template_history_phone ON contact_template_history(phone);
        CREATE INDEX IF NOT EXISTS ix_contact_template_history_template_name ON contact_template_history(template_name);
        CREATE INDEX IF NOT EXISTS ix_contact_template_history_dispatched_at ON contact_template_history(dispatched_at);
        """
        conn.execute(text(create_table_sql))
        conn.commit()
        print("✅ Tabela 'contact_template_history' e índices verificados/criados com sucesso.")

        # 2. Adicionar colunas em webhook_leads se não existirem
        inspector = inspect(engine)
        existing_cols = [c['name'] for c in inspector.get_columns('webhook_leads')]

        if 'last_template_name' not in existing_cols:
            conn.execute(text('ALTER TABLE webhook_leads ADD COLUMN last_template_name VARCHAR;'))
            conn.commit()
            print("➕ Coluna 'last_template_name' adicionada em webhook_leads.")
        else:
            print("ℹ️ Coluna 'last_template_name' já existe em webhook_leads.")

        if 'last_template_dispatched_at' not in existing_cols:
            conn.execute(text('ALTER TABLE webhook_leads ADD COLUMN last_template_dispatched_at TIMESTAMP WITH TIME ZONE;'))
            conn.commit()
            print("➕ Coluna 'last_template_dispatched_at' adicionada em webhook_leads.")
        else:
            print("ℹ️ Coluna 'last_template_dispatched_at' já existe em webhook_leads.")

    print("🎉 Migração concluída com sucesso!")

if __name__ == "__main__":
    migrate()
