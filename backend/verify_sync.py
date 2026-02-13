from dotenv import load_dotenv
load_dotenv()
from database import SessionLocal
from sqlalchemy import text
import os

db = SessionLocal()
try:
    # 1. Pega o nome da tabela do cliente 6
    sql_table = text("SELECT value FROM app_config WHERE client_id = 6 AND key = 'SYNC_CONTACTS_TABLE'")
    table_name = db.execute(sql_table).scalar()
    print(f"Verificando tabela: {table_name}")
    
    if table_name:
        sql_data = text(f"SELECT phone, name, last_interaction_at FROM {table_name}")
        results = db.execute(sql_data).fetchall()
        for row in results:
            print(f"Phone: {row[0]} | Name: {row[1]} | Last: {row[2]}")
    else:
        print("Tabela não configurada.")
finally:
    db.close()
