import os
from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = "postgresql://postgres:postgres@zapvoice-postgres:5432/zapvoice"

def migrate():
    engine = create_engine(DATABASE_URL)
    table_name = "scheduled_triggers"
    columns_to_add = [
        ("is_dynamic_label", "BOOLEAN DEFAULT FALSE NOT NULL"),
        ("dynamic_label_name", "VARCHAR")
    ]

    print(f"Conectando ao banco de dados para adicionar colunas dinâmicas de etiqueta em '{table_name}'...")
    with engine.connect() as conn:
        for col_name, col_type in columns_to_add:
            check_sql = text(f"SELECT column_name FROM information_schema.columns WHERE table_name='{table_name}' AND column_name='{col_name}'")
            result = conn.execute(check_sql).fetchone()
            
            if result:
                print(f"Coluna '{col_name}' já existe em '{table_name}'.")
            else:
                print(f"Adicionando coluna '{col_name}' a '{table_name}'...")
                try:
                    with engine.begin() as transaction_conn:
                        transaction_conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}"))
                    print(f"Coluna '{col_name}' adicionada com sucesso.")
                except Exception as e:
                    print(f"Erro ao adicionar coluna '{col_name}': {e}")

if __name__ == "__main__":
    migrate()
