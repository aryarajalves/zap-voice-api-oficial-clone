import os
import psycopg2
from dotenv import load_dotenv

load_dotenv('backend/.env')
db_url = os.getenv("DATABASE_URL")
if "zapvoice-postgres" in db_url:
    db_url = db_url.replace("zapvoice-postgres", "localhost").replace(":5432", ":5435")

try:
    conn = psycopg2.connect(db_url)
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, trigger_phrase FROM funnels")
    rows = cursor.fetchall()
    print("--- Funis no Banco ---")
    for row in rows:
        print(f"ID: {row[0]} | Nome: {row[1]} | Gatilho: {row[2]}")
    conn.close()
except Exception as e:
    print(f"Erro: {e}")
