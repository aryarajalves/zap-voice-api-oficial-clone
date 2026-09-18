import os
import sys
import random
import uuid
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
import models
from models import ChatConversation, ChatMessage

TEMPLATES = [
    {
        "template_name": "confirmacao_pedido",
        "format": "TEXT",
        "text": "Olá {first_name}, confirmamos o seu pedido #{order_id} com sucesso! 📦 Acompanhe seu envio pelo link ou tire dúvidas com nossa equipe.",
        "buttons": ["Rastrear Pedido", "Falar com Atendente"],
        "media_url": None,
        "header": None
    },
    {
        "template_name": "lembrete_consulta",
        "format": "TEXT",
        "text": "Olá {first_name}! Lembramos da sua sessão agendada para amanhã às 14h30. Você confirma a sua presença?",
        "buttons": ["Sim, confirmo", "Remarcar horário"],
        "media_url": None,
        "header": None
    },
    {
        "template_name": "oferta_exclusiva_vip",
        "format": "IMAGE",
        "text": "Condição Exclusiva VIP liberada! 🔥 Garanta 35% de desconto na assinatura anual da ZapVoice com automações ilimitadas.",
        "buttons": ["Ativar Desconto", "Ver Detalhes"],
        "media_url": "https://images.unsplash.com/photo-1556742049-0a67e5572243?w=800",
        "header": {"format": "IMAGE"}
    },
    {
        "template_name": "pesquisa_satisfacao",
        "format": "TEXT",
        "text": "Olá {first_name}, seu atendimento foi finalizado. Como avalia a agilidade e o suporte prestado hoje?",
        "buttons": ["⭐⭐⭐⭐⭐ Excelente", "Precisa Melhorar"],
        "media_url": None,
        "header": None
    },
    {
        "template_name": "codigo_verificacao",
        "format": "TEXT",
        "text": "Seu código de segurança para confirmação na ZapVoice é: {code}. Não compartilhe este código com terceiros.",
        "buttons": ["Copiar Código"],
        "media_url": None,
        "header": None
    },
    {
        "template_name": "pix_pagamento_pendente",
        "format": "TEXT",
        "text": "Olá {first_name}! Identificamos que sua chave Pix para ativação expirará em breve. Deseja que reenviemos o código Pix Copia e Cola?",
        "buttons": ["Copiar Chave Pix", "Já Realizei o Pagamento"],
        "media_url": None,
        "header": None
    }
]

def generate_wamid():
    random_hex = uuid.uuid4().hex[:20].upper()
    return f"wamid.HBgLNTU{random_hex}"

def add_templates_to_conversations(target_client_id=11, total_templates_to_add=350):
    db = SessionLocal()
    try:
        print(f"🔍 Buscando conversas do cliente #{target_client_id}...")
        convos = (
            db.query(ChatConversation)
            .filter(ChatConversation.client_id == target_client_id)
            .order_by(ChatConversation.last_message_at.desc())
            .all()
        )
        
        if not convos:
            print("❌ Nenhuma conversa encontrada para o cliente!")
            return False
            
        print(f"✓ Total de conversas encontradas: {len(convos)}")
        
        top_convos = convos[:15]
        remaining_convos = random.sample(convos[15:], min(total_templates_to_add - 15, len(convos) - 15))
        
        selected_convos = top_convos + remaining_convos
        print(f"🎯 Total de conversas selecionadas para receber templates: {len(selected_convos)}")
        
        new_messages = []
        updated_convos_count = 0
        now = datetime.now(timezone.utc)
        
        for idx, convo in enumerate(selected_convos):
            tpl_def = TEMPLATES[idx % len(TEMPLATES)]
            first_name = (convo.contact_name or "Cliente").split()[0]
            order_id = random.randint(10450, 99990)
            code = f"{random.randint(100, 999)}-{random.randint(100, 999)}"
            
            rendered_text = tpl_def["text"].format(
                first_name=first_name,
                order_id=order_id,
                code=code
            )
            
            meta_data = {
                "is_template": True,
                "template_name": tpl_def["template_name"],
                "buttons": tpl_def["buttons"],
                "status": "delivered"
            }
            if tpl_def["header"]:
                meta_data["header"] = tpl_def["header"]
                
            if idx < 10:
                msg_time = (convo.last_message_at or now) + timedelta(minutes=1)
                is_last = True
            else:
                msg_time = (convo.created_at or now) + timedelta(minutes=random.randint(1, 10))
                is_last = False
                
            msg = ChatMessage(
                conversation_id=convo.id,
                sender_type="user",
                user_id=1,
                message_type="template",
                content=rendered_text,
                media_url=tpl_def["media_url"],
                timestamp=msg_time,
                wa_message_id=generate_wamid(),
                meta_data=meta_data,
                quoted_message_id=None
            )
            new_messages.append(msg)
            
            if is_last:
                convo.last_message_content = rendered_text
                convo.last_message_at = msg_time
                updated_convos_count += 1
                
        print(f"💾 Inserindo {len(new_messages)} mensagens de template...")
        db.bulk_save_objects(new_messages)
        db.commit()
        
        print(f"🎉 [SUCESSO] {len(new_messages)} mensagens de template adicionadas com sucesso em {len(selected_convos)} contatos do Cliente #{target_client_id}!")
        print(f"   ✓ {updated_convos_count} conversas de topo atualizadas com o template como última mensagem visível.")
        return True
        
    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao adicionar mensagens de template: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    add_templates_to_conversations(target_client_id=11, total_templates_to_add=350)
