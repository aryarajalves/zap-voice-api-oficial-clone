import sqlite3
conn = sqlite3.connect('zapvoice.db')
print("CHATWOOT_API_URL in app_config:")
print(conn.execute("SELECT key, value FROM app_config WHERE key = 'CHATWOOT_API_URL'").fetchall())
print("\nAll config keys:")
print(conn.execute("SELECT key, value FROM app_config").fetchall())
conn.close()
