import asyncio
import sys
import os
import httpx
from datetime import datetime, timezone, timedelta

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from chatwoot_client import ChatwootClient

async def main():
    # Set encoding for Windows
    if sys.platform == 'win32':
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

    phone = "558596123586"
    print(f"----- ANALISANDO CONVERSAS PARA {phone} -----")
    
    client = ChatwootClient(client_id=1)
    search_res = await client.search_contact(phone)
    
    if not search_res or not search_res.get("payload"):
        print("❌ Contato não encontrado no Chatwoot.")
        return

    contact = search_res["payload"][0]
    contact_id = contact.get("id")
    print(f"✅ Contato: {contact.get('name')} (ID: {contact_id})")
    
    conv_res = await client.get_contact_conversations(contact_id)
    if not conv_res or not conv_res.get("payload"):
        print("❌ Nenhuma conversa encontrada.")
        return
    
    conversations = conv_res["payload"]
    print(f"Total de conversas: {len(conversations)}")
    
    for conv in conversations:
        conv_id = conv.get("id")
        inbox_id = conv.get("inbox_id")
        last_activity = conv.get("last_activity_at")
        
        la_dt = datetime.fromtimestamp(last_activity, tz=timezone.utc) if last_activity else "N/A"
        
        print(f"\n--- Conversa {conv_id} | Inbox {inbox_id} | Last Activity: {la_dt} ---")
        
        # Check window
        url = f"{client.base_url}/conversations/{conv_id}/messages"
        async with httpx.AsyncClient() as h_client:
            res = await h_client.get(url, headers=client.headers)
            if res.status_code == 200:
                messages = res.json().get("payload", [])
                sorted_msgs = sorted(messages, key=lambda x: x.get('created_at', 0), reverse=True)
                
                last_incoming_ts = None
                for msg in sorted_msgs:
                    if msg.get("message_type") == 0:
                        last_incoming_ts = msg.get("created_at")
                        m_content = (msg.get("content") or "")[:30]
                        m_dt = datetime.fromtimestamp(last_incoming_ts, tz=timezone.utc)
                        print(f"   Última msg do CLIENTE: {m_dt} | Texto: {m_content}")
                        break
                
                if last_incoming_ts:
                    last_incoming_dt = datetime.fromtimestamp(last_incoming_ts, tz=timezone.utc)
                    now_dt = datetime.now(timezone.utc)
                    diff = now_dt - last_incoming_dt
                    is_open = diff < timedelta(hours=24)
                    print(f"   Resultado Janela: {'ABERTA ✅' if is_open else 'FECHADA 🔒'} (Diff: {diff})")
                else:
                    print("   Resultado Janela: FECHADA 🔒 (Nenhuma mensagem do cliente)")
            else:
                print(f"   Erro ao carregar mensagens: {res.status_code}")

if __name__ == "__main__":
    asyncio.run(main())
