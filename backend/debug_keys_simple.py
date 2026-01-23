
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

from baserow_client import BaserowClient

async def get_keys():
    baserow = BaserowClient()
    table_id = os.getenv("BASEROW_TABLE_ID")
    
    rows = await baserow.get_all_rows(table_id)
    
    if rows:
        print(f"KEYS: {list(rows[0].keys())}")
        
        true_count = 0
        for r in rows:
            val = r.get("Janela de 24 Horas")
            # Loose check
            if val is True or str(val).lower() == 'true':
                true_count += 1
                
        print(f"TOTAL ROWS: {len(rows)}")
        print(f"ROWS WITH Janela=True: {true_count}")
    else:
        print("No rows.")

if __name__ == "__main__":
    asyncio.run(get_keys())
