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

    print("\n--- Colunas de Funnels ---")
    cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'funnels'")
    rows = cursor.fetchall()
    for row in rows:
        print(row[0])

    print("\n--- Colunas de Scheduled Triggers ---")
    cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'scheduled_triggers'")
    rows = cursor.fetchall()
    for row in rows:
        print(row[0])

    conn.close()
except Exception as e:
    print(f"Erro: {e}")
