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
    cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'funnels'")
    columns = [r[0] for r in cursor.fetchall()]
    print(f"Colunas de funnels: {columns}")
    conn.close()
except Exception as e:
    print(f"Erro: {e}")
