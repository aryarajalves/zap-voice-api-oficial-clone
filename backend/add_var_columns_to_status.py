
import sqlite3
import os

# Caminho para o banco de dados
DB_PATH = "database.db"

def migrate():
    if not os.path.exists(DB_PATH):
        print(f"❌ Banco de dados não encontrado em {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    columns_to_add = ["var1", "var2", "var3", "var4", "var5"]
    
    print(f"Iniciando migracao da tabela 'message_status'...")
    
    for col in columns_to_add:
        try:
            cursor.execute(f"ALTER TABLE message_status ADD COLUMN {col} TEXT;")
            print(f"Coluna '{col}' adicionada com sucesso.")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e).lower():
                print(f"Coluna '{col}' ja existe. Pulando.")
            else:
                print(f"Erro ao adicionar coluna '{col}': {e}")

    conn.commit()
    conn.close()
    print("✨ Migração concluída.")

if __name__ == "__main__":
    migrate()
