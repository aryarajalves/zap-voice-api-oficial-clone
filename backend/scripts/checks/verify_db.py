
import sqlite3
import json

db_path = 'sql_app.db' # Correct name from database.py

# Check if file exists
import os
if not os.path.exists(db_path):
    print(f"Error: {db_path} not found.")
    # Try looking in backend folder if we are in root, or current dir
    if os.path.exists('backend/zapvoice.db'):
        db_path = 'backend/zapvoice.db'
    elif os.path.exists('../backend/zapvoice.db'):
        db_path = '../backend/zapvoice.db'

print(f"Opening DB: {db_path}")

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, name, steps FROM funnels")
    rows = cursor.fetchall()
    
    for row in rows:
        fid, name, steps_json = row
        print(f"\nFunnel {fid}: {name}")
        try:
            steps = json.loads(steps_json)
            for idx, step in enumerate(steps):
                if step.get('type') == 'condition_date':
                     print(f"  Step {idx} [condition_date]:")
                     print(f"    onMatch: {step.get('onMatch')}")
                     match_id = step.get('triggerFunnelIdMatch')
                     print(f"    triggerFunnelIdMatch: '{match_id}' (Type: {type(match_id).__name__})")
                     
        except Exception as e:
            print(f"  Error parsing steps: {e}")

    conn.close()
except Exception as e:
    print(f"DB Error: {e}")
