import psycopg2
import json

def main():
    conn = psycopg2.connect("postgresql://postgres:5f90d6ef-f64a-44c7-9d68-b928d50ceb8f@localhost:5435/zapvoice")
    cur = conn.cursor()
    cur.execute("""
        SELECT id, created_at, payload, processed_data, status, error_message 
        FROM webhook_history 
        ORDER BY created_at DESC 
        LIMIT 5
    """)
    rows = cur.fetchall()
    print("=== ÚLTIMOS 5 WEBHOOKS ===")
    for row in rows:
        print(f"\nID: {row[0]} | Data: {row[1]} | Status: {row[4]}")
        print(f"Erro: {row[5]}")
        print("Payload Bruto:")
        print(json.dumps(row[2], indent=2))
        print("Dados Processados:")
        print(json.dumps(row[3], indent=2))
        print("-" * 50)
    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
