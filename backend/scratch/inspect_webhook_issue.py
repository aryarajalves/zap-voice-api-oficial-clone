import sqlite3
import json

def inspect():
    conn = sqlite3.connect('zapvoice.db')
    cursor = conn.cursor()
    
    print("--- Recent Webhook History ---")
    cursor.execute("SELECT id, integration_id, event_type, status, processed_data FROM webhook_history ORDER BY created_at DESC LIMIT 5")
    rows = cursor.fetchall()
    for row in rows:
        print(f"ID: {row[0]} | Integration: {row[1]} | Event: {row[2]} | Status: {row[3]}")
        print(f"Processed Data: {row[4]}")
        print("-" * 20)
        
    print("\n--- Event Mappings for integration 40cef9fa-6904-4c83-9a92-28108f5337a6 ---")
    cursor.execute("SELECT id, event_type, funnel_id, template_name FROM webhook_event_mappings WHERE integration_id = '40cef9fa-6904-4c83-9a92-28108f5337a6'")
    rows = cursor.fetchall()
    for row in rows:
        print(f"ID: {row[0]} | Event: {row[1]} | Funnel: {row[2]} | Template: {row[3]}")
        
    conn.close()

if __name__ == "__main__":
    inspect()
