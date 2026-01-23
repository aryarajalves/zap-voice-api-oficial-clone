
import os
from sqlalchemy import create_engine, text

def kill_locking_sessions():
    """Kills any session holding a lock on scheduled_triggers"""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ DATABASE_URL not found.")
        return

    print("🔪 Iniciando verificação de bloqueios...")
    engine = create_engine(database_url)

    kill_query = text("""
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE pid != pg_backend_pid()
        AND datname = current_database()
        AND state IN ('idle in transaction', 'active')
        AND pid IN (
            SELECT pid
            FROM pg_locks l
            JOIN pg_class t ON l.relation = t.oid
            WHERE t.relname = 'scheduled_triggers'
        );
    """)

    with engine.connect() as conn:
        with conn.begin():
            print("🛑 Buscando e matando sessões travadas...")
            result = conn.execute(kill_query)
            # O retorno pode variar dependendo do driver, mas executamos o comando.
            print("✅ Comando de kill enviado para sessões bloqueadoras.")
            
if __name__ == "__main__":
    kill_locking_sessions()
