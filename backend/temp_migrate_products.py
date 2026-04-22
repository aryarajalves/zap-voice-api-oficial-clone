
import sys
import os

# Adiciona o diretório atual ao sys.path para importar database e models
sys.path.append(os.getcwd())

from database import engine
from sqlalchemy import text

def migrate():
    print("🚀 Iniciando migração de produtos...")
    
    with engine.connect() as conn:
        # 1. Adicionar colunas em webhook_integrations
        print("📦 Atualizando tabela 'webhook_integrations'...")
        columns_integrations = [
            ("product_filtering", "BOOLEAN DEFAULT FALSE"),
            ("product_whitelist", "JSONB DEFAULT '[]'::jsonb"),
            ("discovered_products", "JSONB DEFAULT '[]'::jsonb")
        ]
        
        for col_name, col_type in columns_integrations:
            try:
                conn.execute(text(f"ALTER TABLE webhook_integrations ADD COLUMN {col_name} {col_type}"))
                conn.commit()
                print(f"✅ Coluna '{col_name}' adicionada.")
            except Exception as e:
                print(f"⚠️ Erro/Já existe '{col_name}': {e}")

        # 2. Adicionar coluna em webhook_event_mappings
        print("📦 Atualizando tabela 'webhook_event_mappings'...")
        try:
            conn.execute(text("ALTER TABLE webhook_event_mappings ADD COLUMN product_name VARCHAR"))
            conn.commit()
            print("✅ Coluna 'product_name' adicionada.")
        except Exception as e:
            print(f"⚠️ Erro/Já existe 'product_name': {e}")

    print("✨ Migração concluída!")

if __name__ == "__main__":
    migrate()
