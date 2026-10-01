import os
import sys
from datetime import datetime, timezone, timedelta
import random

# Configura path
sys.path.append(os.path.abspath("backend"))

import models
from database import SessionLocal

def seed_real_data():
    db = SessionLocal()
    try:
        client_id = 14
        print(f"🚀 Inserindo dados de conversas e mensagens para client_id = {client_id}...")

        # 1. Pega algumas conversas existentes do cliente 14
        convos = db.query(models.ChatConversation).filter(
            models.ChatConversation.client_id == client_id
        ).order_by(models.ChatConversation.id.desc()).limit(15).all()

        if not convos:
            print("❌ Nenhuma conversa encontrada para o cliente 14!")
            return

        now = datetime.now(timezone.utc)
        start_of_month = datetime(2026, 10, 1, 0, 0, 0, tzinfo=timezone.utc)

        # 2. Vamos gerar 1.250 mensagens de serviço (atendente/robô) distribuídas hoje (01/10/2026)
        # para que o usuário veja:
        # - 1.000 consumidas na franquia (100% da barra verde/roxa)
        # - 250 mensagens faturáveis a R$ 0,035 (R$ 8,75 de SAC)
        print("💬 Gerando 1.250 mensagens de atendimento (user/agent/system)...")
        messages_to_add = []
        
        exemplo_respostas_agente = [
            "Olá! Tudo bem? Como posso te ajudar hoje?",
            "Perfeito! Já localizei seu acesso aqui no sistema.",
            "Acabei de liberar seu acesso. Consegue testar por gentileza?",
            "Excelente! Qualquer dúvida adicional pode me chamar por aqui.",
            "Seu link de acesso direto é este: https://zapvoice.jords.site",
            "Entendido! Estou transferindo seu atendimento para a nossa equipe.",
            "Muito obrigado pelo retorno! Tenha um ótimo dia!"
        ]
        
        exemplo_perguntas_cliente = [
            "Olá, gostaria de saber mais sobre o curso.",
            "Como faço para acessar as aulas?",
            "Meu pagamento foi aprovado agora!",
            "Consegui acessar, muito obrigado!",
            "Pode me enviar o link novamente?",
            "Ok, obrigado pela atenção."
        ]

        total_agent_msgs = 1250
        # Gera timestamps ao longo do dia 01/10
        for i in range(total_agent_msgs):
            convo = convos[i % len(convos)]
            # Minutos aleatórios ao longo do dia
            minute_offset = random.randint(10, 680)
            msg_time = start_of_month + timedelta(minutes=minute_offset)
            
            # Mensagem do contato (pergunta) - a cada 3 do agente
            if i % 3 == 0:
                messages_to_add.append(models.ChatMessage(
                    conversation_id=convo.id,
                    sender_type="contact",
                    message_type="text",
                    content=random.choice(exemplo_perguntas_cliente),
                    status="read",
                    timestamp=msg_time - timedelta(seconds=random.randint(15, 60))
                ))

            # Mensagem do agente (faturável após franquia)
            messages_to_add.append(models.ChatMessage(
                conversation_id=convo.id,
                sender_type="user",
                message_type="text",
                content=random.choice(exemplo_respostas_agente),
                status="delivered",
                timestamp=msg_time
            ))

        db.add_all(messages_to_add)
        db.commit()
        print(f"✅ Inseridas {len(messages_to_add)} mensagens de chat no banco!")

        # 3. Vamos gerar alguns disparos de Marketing e Utilidade em outubro (01/10)
        print("📢 Gerando disparos de Marketing e Utilidade em Outubro...")
        
        # Disparo de Marketing (Campanha Black Friday / Oferta) - 300 mensagens entregues
        t_mkt = models.ScheduledTrigger(
            client_id=client_id,
            is_bulk=True,
            template_name="oferta_especial_outubro",
            total_sent=300,
            total_delivered=300,
            total_paid_templates=300,
            total_cost=round(300 * 0.35, 2), # R$ 105,00
            status="completed",
            created_at=now - timedelta(hours=3)
        )
        
        # Disparo de Utilidade (Notificação de Venda / Código de Rastreio) - 120 mensagens entregues
        import uuid
        t_util = models.ScheduledTrigger(
            client_id=client_id,
            integration_id=uuid.uuid4(),
            template_name="notificacao_pedido_confirmado",
            total_sent=120,
            total_delivered=120,
            total_paid_templates=120,
            total_cost=round(120 * 0.035, 2), # R$ 4,20
            status="completed",
            created_at=now - timedelta(hours=1)
        )

        db.add_all([t_mkt, t_util])
        db.commit()
        print("✅ Disparos de Marketing e Utilidade inseridos com sucesso!")

        print("🎉 Dados simulados criados com sucesso para o Cliente 14!")

    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao inserir dados: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_real_data()
