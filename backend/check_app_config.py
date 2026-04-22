from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://postgres:postgres@zapvoice-postgres:5432/zapvoice"

def check_app_config():
    engine = create_engine(DATABASE_URL)
    
    query = text("SELECT client_id, key, value FROM app_config")
    
    print("--- APP CONFIG CONTENTS ---")
    try:
        with engine.connect() as conn:
            result = conn.execute(query)
            for row in result:
                client_id, key, value = row
                # Redact sensitive info
                display_value = value
                if any(secret in key.upper() for secret in ["KEY", "TOKEN", "SECRET", "PASS"]):
                    if value and len(value) > 8:
                        display_value = value[:4] + "..." + value[-4:]
                    else:
                        display_value = "********"
                
                print(f"[Client {client_id}] {key}: {display_value}")
    except Exception as e:
        print(f"Error reading app_config: {e}")
    print("---------------------------")

if __name__ == "__main__":
    check_app_config()
