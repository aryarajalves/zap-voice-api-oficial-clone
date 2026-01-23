
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

from baserow_client import BaserowClient

async def get_keys():
    baserow = BaserowClient()
    table_id = os.getenv("BASEROW_TABLE_ID")
    
    print(f"Fetching rows from table {table_id}...")
    rows = await baserow.get_all_rows(table_id)
    
    if rows:
        print("\n--- KEYS IN FIRST ROW ---")
        keys = list(rows[0].keys())
        for k in keys:
            print(f"Key: '{k}' Value: {rows[0][k]}")
            
        print("\n--- CHECKING 'Janela de 24 Horas' ---")
        param_values = [r.get("Janela de 24 Horas") for r in rows[:10]]
        print(f"First 10 values: {param_values}")
    else:
        print("No rows found.")

if __name__ == "__main__":
    asyncio.run(get_keys())
