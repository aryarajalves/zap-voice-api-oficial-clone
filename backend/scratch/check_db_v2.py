import sqlite3
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv('backend/.env')
db_url = os.getenv("DATABASE_URL")

print(f"Connecting to {db_url}")

# Note: zapvoice-postgres is inside docker. Locally it might be localhost:5435
# But let's try to parse the URL and use localhost:5435 if it fails or if we are outside docker.
if "zapvoice-postgres" in db_url:
    db_url = db_url.replace("zapvoice-postgres", "localhost").replace(":5432", ":5435")

try:
    conn = psycopg2.connect(db_url)
    cursor = conn.cursor()

    print("\n--- Últimas Mensagens Interagidas ---")
    cursor.execute("""
        SELECT ms.id, ms.phone_number, ms.content, ms.updated_at, st.funnel_id, f.name
        FROM message_status ms
        JOIN scheduled_triggers st ON ms.trigger_id = st.id
        LEFT JOIN funnels f ON st.funnel_id = f.id
        WHERE ms.interaction_counted = TRUE
        ORDER BY ms.updated_at DESC
        LIMIT 5
    """)
    rows = cursor.fetchall()
    for row in rows:
        print(f"ID: {row[0]} | Fone: {row[1]} | Conteúdo: {row[2]} | Data: {row[3]} | Funil Pai: {row[5]}")

    print("\n--- Todos os Funis e Gatilhos ---")
    cursor.execute("SELECT id, name, trigger_phrase FROM funnels WHERE is_active = TRUE")
    rows = cursor.fetchall()
    for row in rows:
        print(f"ID: {row[0]} | Nome: {row[1]} | Gatilho: {row[2]}")

    conn.close()
except Exception as e:
    print(f"Erro ao conectar ao Postgres: {e}")
