import sqlite3
import os
import psycopg2
from dotenv import load_dotenv

# Carrega variáveis de ambiente
load_dotenv()

def migrate():
    database_url = os.getenv("DATABASE_URL", "sqlite:///./database.db")
    
    if database_url.startswith("postgresql"):
        print("Migrating PostgreSQL...")
        try:
            conn = psycopg2.connect(database_url.replace("postgresql://", "postgres://"))
            cursor = conn.cursor()
            
            # Adiciona a coluna total_contacts
            cursor.execute("ALTER TABLE scheduled_triggers ADD COLUMN IF NOT EXISTS total_contacts INTEGER DEFAULT 0;")
            
            conn.commit()
            cursor.close()
            conn.close()
            print("PostgreSQL migration completed successfully.")
        except Exception as e:
            print(f"Error migrating PostgreSQL: {e}")
    else:
        print("Migrating SQLite...")
        db_path = "./database.db"
        if not os.path.exists(db_path):
            print(f"Database file {db_path} not found.")
            return

        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # Verifica se a coluna já existe
            cursor.execute("PRAGMA table_info(scheduled_triggers);")
            columns = [column[1] for column in cursor.fetchall()]
            
            if "total_contacts" not in columns:
                cursor.execute("ALTER TABLE scheduled_triggers ADD COLUMN total_contacts INTEGER DEFAULT 0;")
                print("Column total_contacts added to SQLite.")
            else:
                print("Column total_contacts already exists in SQLite.")
            
            conn.commit()
            conn.close()
            print("SQLite migration completed successfully.")
        except Exception as e:
            print(f"Error migrating SQLite: {e}")

if __name__ == "__main__":
    migrate()
