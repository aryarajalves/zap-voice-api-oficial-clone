import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
import models
from datetime import datetime, timezone

db = SessionLocal()
try:
    # Buscar todos os clientes
    clients = db.query(models.Client).all()
    if not clients:
        print("Erro: Nenhum cliente cadastrado no sistema.")
        sys.exit(1)
        
    contacts = []
    for client in clients:
        print(f"Inserindo 50 contatos de teste para o cliente '{client.name}' (ID: {client.id})...")
        for i in range(1, 51):
            phone = f"551198888{client.id}_{i:04d}"
            name = f"Contato Teste {i} (Clid {client.id})"
            status = "open"
            
            private_note = ""
            if i % 3 == 0:
                private_note = f"Nota privada de teste para o contato {i}."
                
            convo = models.ChatConversation(
                client_id=client.id,
                phone=phone,
                contact_name=name,
                last_message_content="Olá, gostaria de testar o sistema.",
                last_message_at=datetime.now(),
                status=status,
                unread_count=0,
                pinned=False,
                private_note=private_note
            )
            contacts.append(convo)
        
    db.add_all(contacts)
    db.commit()
    print(f"✅ Sucesso! Inseridos {len(contacts)} contatos de teste no banco de dados.")
    
finally:
    db.close()
