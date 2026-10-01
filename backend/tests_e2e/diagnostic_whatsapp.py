import asyncio
import os
import sys
from dotenv import load_dotenv

# Path adjust
sys.path.append(os.path.join(os.getcwd(), 'backend'))

# Load .env
dotenv_path = os.path.join(os.getcwd(), 'backend', '.env')
load_dotenv(dotenv_path)

# Correct DATABASE_URL for local execution
db_url = os.getenv("DATABASE_URL")
if db_url and "zapvoice-postgres" in db_url:
    db_url = db_url.replace("zapvoice-postgres", "localhost")
os.environ["DATABASE_URL"] = db_url or ""

from chatwoot_client import ChatwootClient
from database import SessionLocal
import models

async def diagnostic_trigger():
    phone = "558596123586"
    client_id = 1 # Sarah Ferreira
    
    print(f"--- Diagnóstico de Envio para {phone} ---")
    
    # 1. Initialize Client
    chatwoot = ChatwootClient(client_id=client_id)
    print(f"Chatwoot API URL: {chatwoot.api_url}")
    print(f"Chatwoot Account ID: {chatwoot.account_id}")
    
    if not chatwoot.api_token:
        print("❌ Token do Chatwoot nao configurado no AppConfig para este cliente.")
        return

    # 2. Resolve Conversation
    print(f"\nTentando resolver conversa no Chatwoot para {phone}...")
    try:
        # We need an inbox_id. Let's find one.
        inboxes = await chatwoot.get_inboxes()
        if not inboxes:
            print("❌ Nenhuma inbox do WhatsApp encontrada no Chatwoot para este cliente.")
            return
        
        inbox_id = inboxes[0]['id']
        print(f"Usando Inbox ID: {inbox_id} ({inboxes[0].get('name')})")
        
        conversation_id = await chatwoot.ensure_conversation(phone, "Teste Diagnóstico", inbox_id)
        if not conversation_id:
            print("❌ Nao foi possivel criar/encontrar conversa no Chatwoot.")
            return
        
        print(f"✅ Conversa resolvida: ID {conversation_id}")
        
    except Exception as e:
        print(f"❌ Erro ao resolver conversa: {e}")
        return

    # 3. Try Sending a Test Message
    print(f"\nEnviando mensagem de teste via Chatwoot API...")
    try:
        result = await chatwoot.send_message(conversation_id, "Teste de Diagnóstico ZapVoice - Verificando conectividade.")
        print(f"✅ Resultado do Chatwoot: {result}")
        print("A mensagem foi aceita pelo Chatwoot.")
        print("Se ela NAO chegar ao celular, o problema esta na conexao entre Chatwoot e WhatsApp (Meta/Official API).")
    except Exception as e:
        print(f"❌ Erro ao enviar mensagem pelo Chatwoot: {e}")

if __name__ == "__main__":
    asyncio.run(diagnostic_trigger())
