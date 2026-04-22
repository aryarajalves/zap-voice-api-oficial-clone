
import os
import psycopg2
from dotenv import load_dotenv

def test_conn():
    load_dotenv()
    # Try localhost
    url = "postgresql://postgres:postgres@localhost:5432/zapvoice"
    print(f"Testing connection to {url}...")
    try:
        conn = psycopg2.connect(url)
        print("Success!")
        conn.close()
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    test_conn()
