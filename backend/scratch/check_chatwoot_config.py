import os
import psycopg2
from dotenv import load_dotenv

load_dotenv('backend/.env')
db_url = os.getenv("DATABASE_URL").replace("zapvoice-postgres", "localhost").replace(":5432", ":5435")

try:
    conn = psycopg2.connect(db_url)
    cursor = conn.cursor()
    cursor.execute("SELECT client_id, key, value FROM app_config WHERE key = 'CHATWOOT_ACCOUNT_ID'")
    rows = cursor.fetchall()
    print("--- CHATWOOT_ACCOUNT_ID Config ---")
    for row in rows:
        print(f"Client: {row[0]} | Account ID: {row[2]}")
    conn.close()
except Exception as e:
    print(f"Erro: {e}")
