import sys
import os
from sqlalchemy import create_engine, text

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SQLALCHEMY_DATABASE_URL, engine


def run_migration():
    print(f"🛠️ Executando migração de banco de dados para E-mail Marketing...")
    with engine.connect() as conn:
        # Table 1: email_configs
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS email_configs (
                id SERIAL PRIMARY KEY,
                client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                provider VARCHAR(50) NOT NULL DEFAULT 'ses',
                aws_access_key_id VARCHAR(255),
                aws_secret_access_key VARCHAR(255),
                aws_region VARCHAR(50) DEFAULT 'us-east-1',
                resend_api_key VARCHAR(255),
                smtp_host VARCHAR(255),
                smtp_port INTEGER DEFAULT 587,
                smtp_user VARCHAR(255),
                smtp_password VARCHAR(255),
                smtp_encryption VARCHAR(20) DEFAULT 'tls',
                from_email VARCHAR(255) NOT NULL,
                from_name VARCHAR(255),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS ix_email_configs_client_id ON email_configs(client_id);
        """))
        
        # Table 2: email_templates
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS email_templates (
                id SERIAL PRIMARY KEY,
                client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                subject VARCHAR(500) NOT NULL,
                body_html TEXT NOT NULL,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS ix_email_templates_client_id ON email_templates(client_id);
        """))

        # Table 3: email_dispatches
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS email_dispatches (
                id SERIAL PRIMARY KEY,
                client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                template_id INTEGER REFERENCES email_templates(id) ON DELETE SET NULL,
                title VARCHAR(255) NOT NULL,
                subject VARCHAR(500) NOT NULL,
                tag_name VARCHAR(255),
                status VARCHAR(50) NOT NULL DEFAULT 'queued',
                total_contacts INTEGER DEFAULT 0,
                total_sent INTEGER DEFAULT 0,
                total_failed INTEGER DEFAULT 0,
                scheduled_time TIMESTAMP WITH TIME ZONE,
                contacts_list JSONB,
                failure_reason TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS ix_email_dispatches_client_id ON email_dispatches(client_id);
        """))

        conn.commit()
        print("✅ Tabelas `email_configs`, `email_templates` e `email_dispatches` criadas com sucesso!")

if __name__ == "__main__":
    run_migration()
