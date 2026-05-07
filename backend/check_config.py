import sqlite3
import os

db_path = r'c:\Users\aryar\.gemini\antigravity\scratch\Projetos Serios\Projeto - ZapVoice no Chatwoot\backend\database.db'
if not os.path.exists(db_path):
    print("Database not found")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT key, value, client_id FROM app_configs WHERE key = 'WA_BUSINESS_ACCOUNT_ID'")
    rows = cursor.fetchall()
    print(f"WA_BUSINESS_ACCOUNT_ID: {rows}")
    conn.close()
