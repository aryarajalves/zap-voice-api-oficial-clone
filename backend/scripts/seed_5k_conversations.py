import os
import sys
import random
import uuid
from datetime import datetime, timedelta, timezone

# Adicionar pasta raiz do backend ao sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, engine
from models.chat import ChatConversation, ChatMessage
from models.chat_label import ChatLabel
from sqlalchemy import text

FIRST_NAMES = [
    "Ana", "Aryaraj", "Bruno", "Beatriz", "Carlos", "Camila", "Daniel", "Debora",
    "Eduardo", "Erika", "Felipe", "Fernanda", "Gabriel", "Gabriela", "Henrique", "Helena",
    "Igor", "Isabela", "João", "Juliana", "Lucas", "Larissa", "Mateus", "Mariana",
    "Natanael", "Nathalia", "Otávio", "Olivia", "Pedro", "Patricia", "Rafael", "Renata",
    "Rodrigo", "Sabrina", "Thiago", "Talita", "Victor", "Vanessa", "Wagner", "Yasmin"
]

LAST_NAMES = [
    "Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves", "Pereira",
    "Lima", "Gomes", "Costa", "Ribeiro", "Martins", "Carvalho", "Almeida", "Lopes",
    "Soares", "Fernandes", "Vieira", "Barbosa", "Rocha", "Dias", "Nascimento", "Andrade",
    "Moreira", "Nunes", "Marques", "Machado", "Mendes", "Freitas", "Cardoso", "Ramos"
]

LABELS_POOL = [
    ["whatsApp", "robo"],
    ["humano", "whatsApp"],
    ["compra-aprovada"],
    ["suporte"],
    ["teste"],
    ["dia"],
    ["noite"],
    ["amanheceu-ontem-de"],
    ["whatsApp"],
    ["robo"],
    ["humano"],
    []
]

INQUIRIES = [
    "Olá! Gostaria de saber mais informações sobre o produto.",
    "Bom dia! Como funciona o acesso à plataforma?",
    "Boa tarde, vocês aceitam Pix parcelado? 💳",
    "Qual é o prazo de entrega do material? 📦",
    "Oi! Estou com uma dúvida sobre a última aula.",
    "Vocês têm suporte aos finais de semana? 🛠️",
    "Tem algum cupom de desconto disponível para hoje? 🏷️",
    "Consigo emitir nota fiscal para pessoa jurídica? 📄",
    "Como faço para renovar minha assinatura? 🔄",
    "Gostaria de falar com o atendente humano, por favor. 🙋‍♂️",
    "Amei o conteúdo do módulo 3! Parabéns à equipe 👏🔥",
    "Poderia me enviar o link atualizado da comunidade no WhatsApp? 🔗",
    "Fiz o pagamento agora via Pix, já compensou? 💰",
    "Tem certificado de conclusão no final do curso? 🎓",
    "Qual o horário de atendimento de vocês? ⏰"
]

RESPONSES = [
    "Olá! Tudo bem? Com certeza, vou te passar todos os detalhes agora mesmo! 😊",
    "Bom dia! O acesso é liberado imediatamente no seu e-mail logo após a confirmação.",
    "Sim! Aceitamos Pix, cartão de crédito em até 12x e boleto bancário. 🚀",
    "Nosso suporte funciona de segunda a sábado das 08h às 20h. Conte com a gente! 💬",
    "Segue o link direto para você acessar sem complicação: https://zapvoice.exemplo.com/acesso 🔗",
    "Confirmamos o seu pagamento aqui no sistema com sucesso! Bem-vindo(a)! 🎉✅",
    "O certificado é gerado automaticamente assim que você concluir 100% das aulas 🎓",
    "Perfeito! Já transferi seu atendimento para um de nossos especialistas. 👨‍💻",
    "Qualquer outra dúvida estou à disposição para te ajudar! 👍",
    "Excelente pergunta! Vou te mandar um áudio explicando o passo a passo. 🎧",
    "Acabei de verificar seu cadastro e está tudo 100% regularizado! ✨",
    "Muito obrigado pelo feedback! Ficamos muito felizes em saber disso! ❤️"
]

EMOJI_REACTIONS = ["👍", "❤️", "🔥", "🙏", "😂", "🎉"]

SAMPLE_IMAGES = [
    "/static/uploads/002f7716-c6cd-482a-8878-92ba0fb874ea.jpeg",
    "/static/uploads/220c05f3-4350-4ec2-88be-cb944e4abfa8.jpg",
    "/static/uploads/c58e5b77-ebde-45ad-bb51-f78b07fed4b5.png"
]

SAMPLE_AUDIOS = [
    "/static/uploads/83e3e4bf-5e38-4a31-a047-4b0997008136.mp3",
    "/static/uploads/8910e90f-705d-426b-ab93-93934f8a04a6.mp3",
    "/static/uploads/7ea5926f-7a6b-4352-9535-33061f5a615f.opus"
]

SAMPLE_DOCS = [
    "/static/uploads/97db6347-f2de-4a7a-a623-bf724985915a.pdf"
]

SAMPLE_VIDEOS = [
    "/static/uploads/4eceb57e-d786-40c6-b287-996137c6dd71.mp4"
]

def generate_wamid():
    return f"wamid.HBgM{uuid.uuid4().hex[:16].upper()}="

def seed_conversations_and_messages(target_client_id=11, total_convos=5000):
    print(f"🚀 Iniciando geração de {total_convos} conversas para o Client ID {target_client_id}...")
    
    db = SessionLocal()
    
    # 1. Definir a distribuição de mensagens por conversa
    # 20 conversas com 500 msgs = 10.000 msgs
    # 50 conversas com 300 msgs = 15.000 msgs
    # 100 conversas com 200 msgs = 20.000 msgs
    # 3.500 conversas com 100 msgs = 350.000 msgs
    # 1.330 conversas com 80 msgs = 106.400 msgs
    # Total = 5.000 conversas / ~501.400 mensagens (Média ~100.28 msgs/conversa)
    
    msg_counts = []
    msg_counts.extend([500] * 20)
    msg_counts.extend([300] * 50)
    msg_counts.extend([200] * 100)
    msg_counts.extend([100] * 3500)
    remaining = total_convos - len(msg_counts)
    if remaining > 0:
        msg_counts.extend([80] * remaining)
    
    # Embaralhar para distribuir os chats pesados no meio da lista
    random.seed(42)
    random.shuffle(msg_counts)

    now = datetime.now(timezone.utc)
    
    print(f"📊 Criando {total_convos} conversas no banco de dados...")
    
    # Criar conversas em lotes de 1.000
    convo_batch_size = 1000
    created_conversations = []
    
    for i in range(0, total_convos, convo_batch_size):
        batch_limit = min(i + convo_batch_size, total_convos)
        batch_objs = []
        
        for idx in range(i, batch_limit):
            phone_num = f"551198{idx:07d}"
            name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
            if idx < 10:  # Primeiros contatos identificados
                name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)} (VIP 500 msgs)" if msg_counts[idx] == 500 else f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
            
            labels = random.choice(LABELS_POOL)
            pinned = idx < 5  # Fixar os primeiros 5 chats
            urgent = random.random() < 0.05
            unread = random.randint(1, 4) if random.random() < 0.15 else 0
            status = "resolved" if random.random() < 0.1 else "open"
            
            # Data de criação espalhada nos últimos 30 dias
            days_ago = random.uniform(0.1, 30.0)
            created_at = now - timedelta(days=days_ago)
            
            convo = ChatConversation(
                client_id=target_client_id,
                phone=phone_num,
                contact_name=name,
                status=status,
                unread_count=unread,
                assigned_user_id=1 if random.random() < 0.7 else None,
                labels=labels,
                pinned=pinned,
                urgent=urgent,
                private_note="Lead interessado no plano anual" if random.random() < 0.05 else None,
                created_at=created_at,
                updated_at=now - timedelta(minutes=random.randint(1, 1440))
            )
            batch_objs.append(convo)
            
        db.bulk_save_objects(batch_objs, return_defaults=True)
        db.commit()
        created_conversations.extend(batch_objs)
        print(f"  ✓ {len(created_conversations)}/{total_convos} conversas criadas.")

    print(f"\n📩 Gerando mensagens para as {total_convos} conversas (Meta: ~500.000 mensagens)...")
    
    total_messages_created = 0
    message_batch = []
    convo_updates = []
    
    # Processar cada conversa gerando o histórico de mensagens
    for c_idx, convo in enumerate(created_conversations):
        num_msgs = msg_counts[c_idx]
        convo_id = convo.id
        
        # Iniciar as mensagens a partir da data de criação da conversa até recente
        start_time = convo.created_at or (now - timedelta(days=10))
        time_step = (now - start_time) / max(num_msgs, 1)
        
        current_msg_time = start_time
        last_contact_msg_time = None
        last_msg_content = ""
        
        convo_wamids = []
        
        for m_idx in range(num_msgs):
            current_msg_time += time_step * random.uniform(0.7, 1.3)
            if current_msg_time > now:
                current_msg_time = now - timedelta(seconds=(num_msgs - m_idx) * 10)
                
            sender_type = "contact" if m_idx % 2 == 0 else "user"
            user_id = 1 if sender_type == "user" else None
            
            if sender_type == "contact":
                last_contact_msg_time = current_msg_time
                
            msg_wamid = generate_wamid()
            convo_wamids.append((msg_wamid, sender_type))
            
            # Determinar tipo de mensagem
            # 78% texto, 7% imagem, 7% audio, 4% pdf, 2% video, 2% template
            rand_type = random.random()
            
            message_type = "text"
            content = None
            media_url = None
            meta_data = None
            quoted_id = None
            
            # Citação / Resposta (10% das mensagens após a 3ª mensagem citam uma mensagem anterior)
            if m_idx > 2 and random.random() < 0.12 and len(convo_wamids) > 1:
                target_prev = random.choice(convo_wamids[:-1])
                quoted_id = target_prev[0]
            
            # Reações (8% das mensagens recebem reação de emoji)
            if random.random() < 0.08:
                emoji = random.choice(EMOJI_REACTIONS)
                react_sender = "contact" if sender_type == "user" else "user"
                meta_data = {
                    "reactions": [
                        {"emoji": emoji, "sender": react_sender}
                    ]
                }
                
            if rand_type < 0.78:
                message_type = "text"
                content = random.choice(INQUIRIES) if sender_type == "contact" else random.choice(RESPONSES)
            elif rand_type < 0.85:
                message_type = "image"
                media_url = random.choice(SAMPLE_IMAGES)
                content = "📷 Segue a foto do comprovante de pagamento!" if sender_type == "contact" else "📷 Segue o infográfico com o passo a passo!"
            elif rand_type < 0.92:
                message_type = "audio"
                media_url = random.choice(SAMPLE_AUDIOS)
                content = "🎵 Áudio recebido" if sender_type == "contact" else "🎵 Áudio explicativo do suporte"
            elif rand_type < 0.96:
                message_type = "document"
                media_url = random.choice(SAMPLE_DOCS)
                content = "📄 Segue o contrato assinado em PDF" if sender_type == "contact" else "📄 Segue a proposta comercial em PDF"
                if not meta_data:
                    meta_data = {}
                meta_data["filename"] = "Contrato_Assinado_2026.pdf" if sender_type == "contact" else "Proposta_Comercial_ZapVoice.pdf"
            elif rand_type < 0.98:
                message_type = "video"
                media_url = random.choice(SAMPLE_VIDEOS)
                content = "🎥 Vídeo demonstrativo da ferramenta"
            else:
                # Template
                message_type = "template"
                content = "Olá {{1}}, confirmamos a sua matrícula no curso com sucesso! 🎉"
                if not meta_data:
                    meta_data = {}
                meta_data["is_template"] = True
                meta_data["template_name"] = "confirmacao_matricula"
            
            last_msg_content = content or "[Mídia]"
            
            message_batch.append({
                "conversation_id": convo_id,
                "sender_type": sender_type,
                "user_id": user_id,
                "message_type": message_type,
                "content": content,
                "media_url": media_url,
                "timestamp": current_msg_time,
                "wa_message_id": msg_wamid,
                "meta_data": meta_data,
                "quoted_message_id": quoted_id
            })
            
            # Se atingir 10.000 mensagens no buffer, efetuar o bulk insert
            if len(message_batch) >= 10000:
                db.bulk_insert_mappings(ChatMessage, message_batch)
                db.commit()
                total_messages_created += len(message_batch)
                message_batch.clear()
                print(f"  ⚡ Inseridas {total_messages_created:,} mensagens no banco...")

        convo_updates.append({
            "id": convo_id,
            "last_message_content": last_msg_content[:150],
            "last_message_at": current_msg_time,
            "last_contact_message_at": last_contact_msg_time or current_msg_time
        })
        
        if (c_idx + 1) % 500 == 0:
            print(f"  📌 Processadas {c_idx + 1}/{total_convos} conversas...")

    # Inserir o restante das mensagens
    if message_batch:
        db.bulk_insert_mappings(ChatMessage, message_batch)
        db.commit()
        total_messages_created += len(message_batch)
        message_batch.clear()
        print(f"  ⚡ Total final de {total_messages_created:,} mensagens inseridas!")

    print(f"\n🔄 Atualizando dados finais de cabeçalho das conversas (last_message, timestamps)...")
    # Atualizar metadados das conversas em lote
    for i in range(0, len(convo_updates), 1000):
        batch = convo_updates[i:i+1000]
        db.bulk_update_mappings(ChatConversation, batch)
        db.commit()

    db.close()
    print(f"\n✅ Concluído com sucesso! {total_convos} conversas e {total_messages_created:,} mensagens criadas para o Client {target_client_id}.")

if __name__ == "__main__":
    seed_conversations_and_messages(target_client_id=11, total_convos=5000)
