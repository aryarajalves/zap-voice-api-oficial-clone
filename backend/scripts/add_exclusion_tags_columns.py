import os
from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = "postgresql://postgres:5f90d6ef-f64a-44c7-9d68-b928d50ceb8f@localhost:5435/zapvoice"

def migrate():
    engine = create_engine(DATABASE_URL)
    is_sqlite = DATABASE_URL.startswith("sqlite")
    
    migrations = [
        ("scheduled_triggers", [
            ("exclusion_tags", "JSON" if is_sqlite else "JSONB"),
            ("exclusion_tag_mode", "VARCHAR DEFAULT 'OR'"),
            ("exclusion_list", "JSON" if is_sqlite else "JSONB")
        ]),
        ("recurring_triggers", [
            ("exclusion_tags", "JSON" if is_sqlite else "JSONB"),
            ("exclusion_tag_mode", "VARCHAR DEFAULT 'OR'")
        ])
    ]

    print("Conectando ao banco de dados para adicionar colunas de exclusao dinamica...")
    with engine.connect() as conn:
        for table_name, columns in migrations:
            for col_name, col_type in columns:
                already_exists = False
                if is_sqlite:
                    pragma = conn.execute(text(f"PRAGMA table_info({table_name})")).fetchall()
                    already_exists = any(row[1] == col_name for row in pragma)
                else:
                    check_sql = text(f"SELECT column_name FROM information_schema.columns WHERE table_name='{table_name}' AND column_name='{col_name}'")
                    already_exists = conn.execute(check_sql).fetchone() is not None
                
                if already_exists:
                    print(f"Coluna '{col_name}' ja existe em '{table_name}'.")
                else:
                    print(f"Adicionando coluna '{col_name}' ({col_type}) a '{table_name}'...")
                    try:
                        with engine.begin() as tconn:
                            tconn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}"))
                        print(f"Coluna '{col_name}' adicionada com sucesso.")
                    except Exception as e:
                        print(f"Erro ao adicionar coluna '{col_name}' em '{table_name}': {e}")

if __name__ == "__main__":
    migrate()
