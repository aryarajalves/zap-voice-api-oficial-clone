import os
import sys
import argparse
import random
from datetime import datetime, timezone, timedelta

# Adicionar pasta backend ao path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
import models
from sqlalchemy import func

def seed_contacts(count=10000, client_identifier="SST", db=None):
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True
    try:
        # Localiza o cliente
        client = None
        if str(client_identifier).isdigit():
            client = db.query(models.Client).filter(models.Client.id == int(client_identifier)).first()
        if not client:
            client = db.query(models.Client).filter(models.Client.name.ilike(f"%{client_identifier}%")).first()
        if not client:
            client = db.query(models.Client).first()

        if not client:
            print("[AVISO] Nenhum cliente encontrado no banco de dados!")
            return False

        print(f"[SEED] Iniciando geracao de {count} contatos para o Cliente: #{client.id} - {client.name}")

        first_names = [
            "Ana", "Bruno", "Carlos", "Daniela", "Eduardo", "Fernanda", "Gabriel", "Helena",
            "Igor", "Juliana", "Lucas", "Mariana", "Natan", "Patricia", "Rafael", "Sophia",
            "Thiago", "Vanessa", "Wagner", "Yasmin", "Felipe", "Camila", "Rodrigo", "Beatriz"
        ]
        last_names = [
            "Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves", "Pereira",
            "Lima", "Gomes", "Costa", "Ribeiro", "Martins", "Carvalho", "Almeida", "Lopes",
            "Soares", "Fernandes", "Vieira", "Barbosa", "Nunes", "Mendes", "Cardoso", "Freitas"
        ]
        sample_messages = [
            "Olá, gostaria de saber mais informações sobre os cursos.",
            "Boa tarde! Como funciona o atendimento?",
            "Oi! Recebi uma notificação e gostaria de tirar uma dúvida.",
            "Tudo bem? Gostaria de saber os valores disponíveis.",
            "Olá! Vocês têm suporte hoje?",
            "Oi, preciso de ajuda com o meu acesso.",
            "Boa tarde! Esse número é oficial?",
            "Olá, gostaria de agendar uma demonstração.",
            "Oi! Consegue me mandar mais detalhes pelo WhatsApp?",
            "Boa tarde, gostaria de falar com um atendente."
        ]

        start_phone_base = 558591000000
        now = datetime.now(timezone.utc)
        max_id = db.query(func.max(models.ChatConversation.id)).scalar() or 0
        phone_offset = max_id + random.randint(1000, 9999)

        batch_size = 1000
        total_created = 0

        for batch_start in range(0, count, batch_size):
            current_batch_size = min(batch_size, count - batch_start)
            convos_batch = []
            
            for i in range(current_batch_size):
                idx = batch_start + i
                fn = first_names[idx % len(first_names)]
                ln = last_names[(idx // len(first_names)) % len(last_names)]
                name = f"{fn} {ln} #{idx + 1}"
                phone = str(start_phone_base + phone_offset + idx)
                msg_text = sample_messages[idx % len(sample_messages)]
                msg_time = now - timedelta(minutes=random.randint(1, 20000))

                convo = models.ChatConversation(
                    client_id=client.id,
                    phone=phone,
                    contact_name=name,
                    last_message_content=msg_text,
                    last_message_at=msg_time,
                    status="open",
                    unread_count=random.choice([0, 1, 2]),
                    last_contact_message_at=msg_time,
                    created_at=msg_time
                )
                convos_batch.append((convo, msg_text, msg_time))

            # Adiciona as conversas do lote
            for convo, _, _ in convos_batch:
                db.add(convo)
            db.flush()

            # Cria mensagens vinculadas às conversas recém geradas
            messages_batch = []
            for convo, msg_text, msg_time in convos_batch:
                msg = models.ChatMessage(
                    conversation_id=convo.id,
                    sender_type="contact",
                    content=msg_text,
                    message_type="text",
                    timestamp=msg_time
                )
                messages_batch.append(msg)

            db.add_all(messages_batch)
            db.commit()

            total_created += current_batch_size
            print(f"[PROGRESSO] {total_created}/{count} contatos criados...")

        print(f"[SUCESSO] {total_created} conversas e contatos criados para #{client.id} - {client.name}.")
        return True
    except Exception as e:
        db.rollback()
        print(f"[ERRO] Erro ao criar contatos: {e}")
        return False
    finally:
        if should_close:
            db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed 10k contatos para teste de deleção em massa")
    parser.add_argument("--count", type=int, default=10000, help="Quantidade de contatos (default: 10000)")
    parser.add_argument("--client", type=str, default="SST", help="ID ou nome do cliente (default: SST)")
    args = parser.parse_args()

    seed_contacts(count=args.count, client_identifier=args.client)
