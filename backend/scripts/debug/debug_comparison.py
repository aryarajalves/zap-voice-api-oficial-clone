
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

from chatwoot import ChatwootClient
from baserow_client import BaserowClient

async def test_comparison():
    print("--- STARTING COMPARISON TEST ---")
    
    # Init Clients
    chatwoot = ChatwootClient()
    baserow = BaserowClient()
    
    # 1. Fetch Chatwoot
    print("Fetching Chatwoot conversations...")
    cw_data = await chatwoot.get_conversations(inbox_id=os.getenv("CHATWOOT_SELECTED_INBOX_ID"))
    conversations = cw_data.get("data", {}).get("payload", [])
    print(f"Chatwoot Count: {len(conversations)}")
    
    cw_phones = []
    for c in conversations:
        sender = c.get("meta", {}).get("sender", {})
        phone = sender.get("phone_number", "")
        if phone:
            clean = "".join(filter(str.isdigit, str(phone)))
            suffix = clean[-8:] if len(clean) >= 8 else clean
            cw_phones.append({"full": phone, "suffix": suffix, "id": c.get("id"), "name": sender.get("name")})
            
    print(f"Chatwoot Phones found: {len(cw_phones)}")
    if cw_phones:
        print(f"Sample Chatwoot: {[p['suffix'] for p in cw_phones[:3]]}")

    # 2. Fetch Baserow
    table_id = os.getenv("BASEROW_TABLE_ID")
    print(f"\nFetching Baserow rows from table {table_id}...")
    
    all_rows = await baserow.get_all_rows(table_id)
    print(f"Baserow Count: {len(all_rows)}")
    
    br_phones = []
    if all_rows:
        print(f"DEBUG: First row keys: {list(all_rows[0].keys())}")
        
    for row in all_rows:
        # Check Allowed
        is_allowed = row.get("Janela de 24 Horas")
        if isinstance(is_allowed, str): is_allowed = is_allowed.lower() == 'true'
        
        raw_phone = row.get("Telefone") or row.get("Celular") or row.get("Whatsapp") or row.get("Phone")
        if raw_phone:
            clean = "".join(filter(str.isdigit, str(raw_phone)))
            suffix = clean[-8:] if len(clean) >= 8 else clean
            br_phones.append({"full": raw_phone, "suffix": suffix, "allowed": is_allowed, "row_id": row.get("id")})

    print(f"Baserow Phones found: {len(br_phones)}")
    allowed_list = [p for p in br_phones if p['allowed']]
    print(f"Baserow ALLOWED (True): {len(allowed_list)}")
    if allowed_list:
        print(f"Sample Baserow Allowed Suffixes: {[p['suffix'] for p in allowed_list[:3]]}")

    # 3. Compare
    print("\n--- COMPARISON RESULTS ---")
    matches = 0
    allowed_count = 0
    
    allowed_suffixes = {p['suffix'] for p in allowed_list}
    
    for cw in cw_phones:
        is_match = cw['suffix'] in allowed_suffixes
        status = "MATCH & ALLOWED" if is_match else "NO MATCH"
        
        # Check if exists but not allowed
        if not is_match:
             exists_blocked = any(p['suffix'] == cw['suffix'] for p in br_phones)
             if exists_blocked:
                 status = "MATCH but BLOCKED (False)"
        
        print(f"Chatwoot: {cw['name']} ({cw['suffix']}) -> {status}")
        
        if is_match:
            matches += 1

    print(f"\nTotal Matches Allowed: {matches}")
    print("--- END TEST ---")

if __name__ == "__main__":
    asyncio.run(test_comparison())
