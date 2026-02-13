import asyncio
import sys
import os
import httpx
from datetime import datetime, timezone

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from chatwoot_client import ChatwootClient

async def main():
    phone = "558596123586"
    print(f"----- ANALISANDO MENSAGENS PARA {phone} -----")
    
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
        
    for conv in conv_res["payload"]:
        conv_id = conv.get("id")
        inbox_id = conv.get("inbox_id")
        print(f"\n--- Conversa {conv_id} (Inbox {inbox_id}) ---")
        
        url = f"{client.base_url}/accounts/{client.account_id}/conversations/{conv_id}/messages"
        async with httpx.AsyncClient() as session:
            res = await session.get(url, headers=client.headers)
            if res.status_code == 200:
                messages = res.json().get("payload", [])
                print(f"Total de mensagens: {len(messages)}")
                
                # Sort by reverse chronological order
                sorted_msgs = sorted(messages, key=lambda x: x.get('created_at', 0), reverse=True)
                
                for i, msg in enumerate(sorted_msgs[:5]):
                    m_type = msg.get("message_type") # 0=Incoming, 1=Outgoing
                    m_ts = msg.get("created_at")
                    m_content = (msg.get("content") or "")[:50]
                    try:
                        m_dt = datetime.fromtimestamp(m_ts, tz=timezone.utc)
                    except:
                        m_dt = "N/A"
                    
                    type_str = "📥 CLIENTE" if m_type == 0 else "📤 AGENTE/SISTEMA"
                    print(f"  [{i}] {type_str} | Data: {m_dt} | Texto: {m_content}...")
            else:
                print(f"❌ Erro ao buscar mensagens: {res.status_code}")

if __name__ == "__main__":
    asyncio.run(main())
