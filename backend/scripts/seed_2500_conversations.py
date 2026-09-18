import os
import sys
import random
import uuid
from datetime import datetime, timedelta, timezone

# Adicionar pasta raiz do backend ao sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
import models
from models import ChatConversation, ChatMessage, WebhookLead, Client

FIRST_NAMES = [
    "Lucas", "Mariana", "Gabriel", "Beatriz", "Rafael", "Camila", "Matheus", "Larissa",
    "Felipe", "Juliana", "Rodrigo", "Amanda", "Bruno", "Fernanda", "Guilherme", "Carolina",
    "Gustavo", "Bruna", "Leonardo", "Leticia", "Vinicius", "Natalia", "Thiago", "Patricia",
    "Diego", "Bianca", "Caio", "Jessica", "Renan", "Vanessa", "Danilo", "Aline",
    "Eduardo", "Helena", "Igor", "Debora", "Otavio", "Olivia", "Wagner", "Yasmin",
    "Marcos", "Priscila", "Andre", "Sabrina", "Vitor", "Renata", "Arthur", "Laura"
]

LAST_NAMES = [
    "Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves", "Pereira",
    "Lima", "Gomes", "Costa", "Ribeiro", "Martins", "Carvalho", "Almeida", "Lopes",
    "Soares", "Fernandes", "Vieira", "Barbosa", "Rocha", "Dias", "Nascimento", "Andrade",
    "Moreira", "Nunes", "Marques", "Machado", "Mendes", "Freitas", "Cardoso", "Ramos",
    "Teixeira", "Moura", "Cavalcanti", "Castro", "Campos", "Cardoso", "Pinto", "Correia"
]

LABELS_POOL = [
    ["whatsApp"],
    ["robo"],
    ["whatsApp", "robo"],
    ["compra-aprovada"],
    ["suporte"],
    ["24-horas"],
    ["whatsApp", "compra-aprovada"],
    ["robo", "24-horas"],
    ["suporte", "whatsApp"],
    []
]

# Diálogos realistas sequenciais (Pergunta do contato -> Resposta do usuário)
CONVERSATION_SCRIPTS = [
    [
        ("contact", "Olá! Gostaria de saber mais sobre como funciona o serviço."),
        ("user", "Olá! Tudo bem? Com certeza, nosso sistema automatiza o atendimento e os disparos no WhatsApp."),
        ("contact", "Legal! Vocês têm integração com o Chatwoot?"),
        ("user", "Sim, integração nativa e 100% sincronizada com o Chatwoot e API Oficial da Meta."),
        ("contact", "Consigo testar antes de assinar?"),
        ("user", "Com certeza! Posso liberar um acesso de teste para você agora mesmo."),
        ("contact", "Perfeito, vou querer sim! Como faço?"),
        ("user", "Só me confirmar seu e-mail que envio os dados de acesso imediatamente. 👍"),
        ("contact", "Meu e-mail é contato@exemplo.com. Muito obrigado!"),
        ("user", "Acesso liberado com sucesso! Seja muito bem-vindo! 🚀")
    ],
    [
        ("contact", "Bom dia! Estou com uma dúvida sobre os planos disponíveis."),
        ("user", "Bom dia! Nossos planos começam a partir de R$ 97/mês com recursos completos."),
        ("contact", "Qual a diferença do plano Pro para o Lite?"),
        ("user", "O plano Pro inclui funis de inteligência artificial, múltiplos números e webhooks ilimitados."),
        ("contact", "Entendi! O suporte é por WhatsApp também?"),
        ("user", "Sim, nosso time de suporte fica disponível de segunda a sábado no WhatsApp."),
        ("contact", "Excelente, vou assinar o Pro então."),
        ("user", "Maravilha! Segue o link de checkout seguro: https://zapvoice.exemplo.com/checkout"),
        ("contact", "Pagamento aprovado via Pix! Já compensou aí?"),
        ("user", "Sim, confirmado! Seu painel já está 100% ativo! 🎉")
    ],
    [
        ("contact", "Oi, boa tarde! Meu disparo de mensagens pausou, podem me ajudar?"),
        ("user", "Boa tarde! Vamos verificar agora mesmo. Pode me passar o nome da campanha?"),
        ("contact", "É a campanha 'Promocao Relampago'. Tinha uns 500 contatos."),
        ("user", "Localizei aqui. O disparo pausou porque atingiu o limite de horário programado."),
        ("contact", "Ah entendi! Consigo retomar agora?"),
        ("user", "Sim, acabei de reativar para você. As mensagens já estão saindo normalmente."),
        ("contact", "Que rápido! Já vi que começou a enviar aqui, obrigado!"),
        ("user", "Disponha sempre! Qualquer outra dúvida só chamar. Tenha uma ótima tarde! 😊")
    ],
    [
        ("contact", "Olá, vocês aceitam pagamento anual com desconto?"),
        ("user", "Olá! Sim, no plano anual oferecemos 20% de desconto e 2 meses grátis."),
        ("contact", "Consigo parcelar no cartão de crédito?"),
        ("user", "Sim, em até 12 vezes sem juros."),
        ("contact", "Pode me gerar o link do anual com esse desconto?"),
        ("user", "Claro! Aqui está o link especial: https://zapvoice.exemplo.com/anual-vip"),
        ("contact", "Finalizei a compra aqui!"),
        ("user", "Confirmadíssimo! Parabéns pela adesão e bons resultados com suas automações!")
    ],
    [
        ("contact", "Oi! Gostaria de agendar uma demonstração da plataforma."),
        ("user", "Olá! Claro, temos horários disponíveis hoje às 15h e amanhã às 10h."),
        ("contact", "Amanhã às 10h fica perfeito para mim."),
        ("user", "Agendado! Te enviei o convite no Google Meet por e-mail."),
        ("contact", "Recebi aqui. Até amanhã então!"),
        ("user", "Combinado! Até amanhã, tenha um ótimo dia!")
    ]
]

DDDS = ["11", "21", "31", "41", "51", "61", "71", "81", "85", "19"]

def generate_wamid():
    return f"wamid.HBgM{uuid.uuid4().hex[:16].upper()}="

def seed_2500_conversations(target_client_id=11, total_convos=2500):
    print(f"🚀 Iniciando geração de {total_convos} contatos/conversas com mensagens de troca para Client ID {target_client_id}...")
    db = SessionLocal()
    
    try:
        client = db.query(Client).filter(Client.id == target_client_id).first()
        if not client:
            print(f"❌ Cliente {target_client_id} não encontrado!")
            return False
            
        print(f"✓ Cliente selecionado: #{client.id} - {client.name}")
        
        now = datetime.now(timezone.utc)
        
        # 1. Gerar as conversas e contatos
        convos_to_insert = []
        leads_to_insert = []
        conversation_configs = []
        
        used_phones = set()
        # Buscar telefones existentes do cliente para não colidir
        existing_phones = db.query(ChatConversation.phone).filter(ChatConversation.client_id == target_client_id).all()
        for ep in existing_phones:
            if ep[0]:
                used_phones.add(ep[0])
                
        print("📝 Gerando dados de 2.500 contatos e conversas...")
        
        for idx in range(total_convos):
            # Gera telefone único
            while True:
                ddd = random.choice(DDDS)
                num = random.randint(90000000, 99999999)
                phone = f"55{ddd}9{num}"
                if phone not in used_phones:
                    used_phones.add(phone)
                    break
                    
            first_name = random.choice(FIRST_NAMES)
            last_name = random.choice(LAST_NAMES)
            contact_name = f"{first_name} {last_name}"
            
            labels = random.choice(LABELS_POOL)
            status = "resolved" if random.random() < 0.08 else "open"
            unread_count = random.choice([0, 0, 0, 1, 2]) if status == "open" else 0
            
            # Escolhe o script de diálogo e quantidade de mensagens (entre 4 e 10 mensagens)
            dialogue_template = random.choice(CONVERSATION_SCRIPTS)
            num_messages = random.randint(4, min(10, len(dialogue_template)))
            dialogue = dialogue_template[:num_messages]
            
            # Timestamps
            days_ago = random.uniform(0.05, 15.0)
            convo_start_time = now - timedelta(days=days_ago)
            
            last_msg_sender, last_msg_content = dialogue[-1]
            last_msg_time = convo_start_time + timedelta(minutes=num_messages * random.randint(2, 8))
            if last_msg_time > now:
                last_msg_time = now - timedelta(minutes=random.randint(1, 10))
                
            last_contact_time = last_msg_time if last_msg_sender == "contact" else last_msg_time - timedelta(minutes=3)
            
            convo = ChatConversation(
                client_id=target_client_id,
                phone=phone,
                contact_name=contact_name,
                status=status,
                unread_count=unread_count,
                labels=labels,
                pinned=False,
                urgent=False,
                last_message_content=last_msg_content,
                last_message_at=last_msg_time,
                last_contact_message_at=last_contact_time,
                created_at=convo_start_time,
                updated_at=last_msg_time
            )
            convos_to_insert.append(convo)
            
            # Dados para gerar as mensagens associadas
            conversation_configs.append({
                "dialogue": dialogue,
                "start_time": convo_start_time,
                "last_time": last_msg_time
            })
            
            # WebhookLead correspondente
            leads_to_insert.append({
                "client_id": target_client_id,
                "name": contact_name,
                "phone": phone,
                "email": f"{first_name.lower()}.{last_name.lower()}{idx}@emailteste.com",
                "tags": ", ".join(labels) if labels else None,
                "product_name": "ZapVoice Atendimento",
                "platform": "WhatsApp",
                "payment_method": "Pix",
                "total_events": 1,
                "last_event_type": "chat_message",
                "last_event_at": last_msg_time,
                "created_at": convo_start_time,
                "updated_at": last_msg_time
            })
            
        # 2. Inserir conversas em lotes de 500
        print("💾 Inserindo conversas no banco de dados...")
        batch_size = 500
        created_conversations = []
        for i in range(0, len(convos_to_insert), batch_size):
            chunk = convos_to_insert[i:i + batch_size]
            db.bulk_save_objects(chunk, return_defaults=True)
            db.commit()
            created_conversations.extend(chunk)
            print(f"  ✓ {len(created_conversations)}/{total_convos} conversas gravadas...")
            
        # 3. Inserir leads na tabela WebhookLead
        print("💾 Inserindo contatos na tabela de Leads/CRM...")
        for i in range(0, len(leads_to_insert), batch_size):
            chunk_leads = leads_to_insert[i:i + batch_size]
            db.bulk_insert_mappings(WebhookLead, chunk_leads)
            db.commit()
            
        # 4. Gerar e inserir mensagens de cada conversa
        print("💬 Gerando mensagens de troca (entre WhatsApp e Usuário)...")
        all_messages = []
        total_msgs_count = 0
        
        for c_idx, convo in enumerate(created_conversations):
            cfg = conversation_configs[c_idx]
            dialogue = cfg["dialogue"]
            start_t = cfg["start_time"]
            end_t = cfg["last_time"]
            
            time_step = (end_t - start_t) / max(len(dialogue), 1)
            cur_time = start_t
            
            for m_idx, (sender_type, content) in enumerate(dialogue):
                cur_time += time_step * random.uniform(0.8, 1.2)
                if cur_time > now:
                    cur_time = now - timedelta(seconds=(len(dialogue) - m_idx) * 15)
                    
                msg = {
                    "conversation_id": convo.id,
                    "sender_type": sender_type,
                    "user_id": 1 if sender_type == "user" else None,
                    "message_type": "text",
                    "content": content,
                    "media_url": None,
                    "timestamp": cur_time,
                    "wa_message_id": generate_wamid(),
                    "meta_data": None,
                    "quoted_message_id": None
                }
                all_messages.append(msg)
                
            if len(all_messages) >= 5000:
                db.bulk_insert_mappings(ChatMessage, all_messages)
                db.commit()
                total_msgs_count += len(all_messages)
                all_messages.clear()
                print(f"  ⚡ {total_msgs_count} mensagens gravadas...")
                
        if all_messages:
            db.bulk_insert_mappings(ChatMessage, all_messages)
            db.commit()
            total_msgs_count += len(all_messages)
            all_messages.clear()
            
        print(f"\n🎉 [SUCESSO TOTAL] {len(created_conversations)} contatos e {total_msgs_count} mensagens de troca criadas com sucesso para o Cliente #{target_client_id} ({client.name})!")
        return True
        
    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao gerar dados de teste: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    seed_2500_conversations(target_client_id=11, total_convos=2500)
