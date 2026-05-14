import os
import psycopg2
from dotenv import load_dotenv

load_dotenv('backend/.env')
db_url = os.getenv("DATABASE_URL").replace("zapvoice-postgres", "localhost").replace(":5432", ":5435")

try:
    conn = psycopg2.connect(db_url)
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, trigger_phrase, is_active FROM funnels WHERE client_id = 3")
    rows = cursor.fetchall()
    print("--- Funnels for Client 3 ---")
    for row in rows:
        print(f"ID: {row[0]} | Name: {row[1]} | Trigger: {row[2]} | Active: {row[3]}")
    conn.close()
except Exception as e:
    print(f"Erro: {e}")
