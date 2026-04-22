import httpx
from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://postgres:postgres@zapvoice-postgres:5432/zapvoice"

def test_chatwoot():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        token = conn.execute(text("SELECT value FROM app_config WHERE client_id=1 AND key='CHATWOOT_API_TOKEN'")).fetchone()[0]
        api_url = conn.execute(text("SELECT value FROM app_config WHERE client_id=1 AND key='CHATWOOT_API_URL'")).fetchone()[0]
        
    if not api_url.startswith("http"):
         api_url = f"https://{api_url}"
    
    # Standard profile endpoint to check account access
    profile_url = f"{api_url.rstrip('/')}/api/v1/accounts/1/profile"
    headers = {"api_access_token": token}
    
    print(f"Testing URL: {profile_url}")
    try:
        resp = httpx.get(profile_url, headers=headers)
        print(f"Status: {resp.status_code}")
        print(f"Body: {resp.text[:500]}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_chatwoot()
