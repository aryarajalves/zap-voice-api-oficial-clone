import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

import asyncio
import httpx
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from database import SessionLocal
from models import AppConfig

async def register_number():
    db = SessionLocal()
    try:
        # Pega as configurações do banco de dados (assumindo client_id = 1 ou o primeiro que achar)
        token_config = db.query(AppConfig).filter(AppConfig.key == "WA_ACCESS_TOKEN").first()
        phone_id_config = db.query(AppConfig).filter(AppConfig.key == "WA_PHONE_NUMBER_ID").first()
        
        wa_phone_id_config = db.query(AppConfig).filter(AppConfig.key == "WA_PHONE_NUMBER_ID", AppConfig.client_id == 3).first()
        wa_phone_id = wa_phone_id_config.value if wa_phone_id_config else None
        
        wa_token_config = db.query(AppConfig).filter(AppConfig.key == "WA_ACCESS_TOKEN", AppConfig.client_id == 3).first()
        wa_token = wa_token_config.value if wa_token_config else None

        print(f"📡 Buscando status do número ID: {wa_phone_id} (Client 3)")

        async with httpx.AsyncClient() as client:
            # Check name status
            res_status = await client.get(
                f"https://graph.facebook.com/v24.0/{wa_phone_id}?fields=name_status,verified_name&access_token={wa_token}"
            )
            print(f"Status Code (Get Info): {res_status.status_code}")
            print(f"Response (Get Info): {res_status.text}")
            
            # Register number (force)
            print(f"📡 Disparando requisição de registro/certificado...")
            res_reg = await client.post(
                f"https://graph.facebook.com/v24.0/{wa_phone_id}/register",
                headers={"Authorization": f"Bearer {wa_token}"},
                json={
                    "messaging_product": "whatsapp",
                    "pin": "000000"
                }
            )
            print(f"Status Code (Register): {res_reg.status_code}")
            print(f"Response (Register): {res_reg.text}")

    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(register_number())
