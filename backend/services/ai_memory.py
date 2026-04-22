
import logging
import httpx
from datetime import datetime, timezone
from rabbitmq_client import rabbitmq
from config_loader import get_setting

logger = logging.getLogger("AIMemory")

async def notify_ai_memory(client_id: int, phone: str, content: str, msg_type: str = "text", direction: str = "incoming", metadata: dict = None):
    """
    Envia uma notificação para a fila do RabbitMQ toda vez que uma mensagem é recebida ou entregue,
    permitindo que o n8n ou outro sistema processe a memória do agente de IA.
    """
    try:
        enabled = get_setting("AI_MEMORY_ENABLED", "false", client_id=client_id)
        if str(enabled).lower() != "true":
            return

        # Limpar o número do telefone (apenas dígitos)
        clean_phone = "".join(filter(str.isdigit, str(phone)))
        
        payload = {
            "phone": clean_phone,
            "content": content,
            "type": msg_type,
            "direction": direction,
            "client_id": client_id,
            "Dono": "agente" if direction == "outgoing" else "usuario",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        if metadata:
            payload.update(metadata)

        print(f"DEBUG: [AI Memory] Sending payload: {payload}")

        # Publicar na fila do RabbitMQ
        await rabbitmq.publish("ai_memory_queue", payload)
        logger.info(f"🧠 [AI Memory] Mensagem ({direction}) de {clean_phone} enviada para a fila.")
                
    except Exception as e:
        logger.error(f"❌ [AI Memory] Erro ao enviar para o RabbitMQ: {e}")
        # Falha silenciosa para não quebrar o fluxo principal

async def notify_agent_memory_webhook(client_id: int, phone: str, name: str = None, template_name: str = None, content: str = None, trigger_id: int = None, node_id: str = None, internal_contact_id: int = None):
    """
    Envia os dados do template ou nó de funil para um webhook externo configurado.
    Focado na integração com n8n/agentes de memória.
    """
    try:
        webhook_url = get_setting("AGENT_MEMORY_WEBHOOK_URL", "", client_id=client_id)
        if not webhook_url or not str(webhook_url).strip():
            return

        # Limpar o número do telefone (apenas dígitos)
        clean_phone = "".join(filter(str.isdigit, str(phone)))
        
        payload = {
            "contact_phone": clean_phone,
            "contact_name": name or f"Cliente_{clean_phone}",
            "contact_id": internal_contact_id, # Vincular ao ID interno do sistema
            "template_name": template_name or "Mensagem",
            "template_content": content or "",
            "Dono": "agente", # Novo campo solicitado
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "client_id": client_id,
            "trigger_id": trigger_id,
            "node_id": node_id
        }

        # DEBUG: Print to stdout so it shows in docker logs -f zapvoice_worker
        print(f"🚀 [MEMORIA DEBUG] Enviando Payload: {payload}")
        logger.info(f"🔗 [Webhook Memory] Payload: {payload}")
        logger.info(f"🔗 [Webhook Memory] Publicando dados de {clean_phone} na fila para processamento assíncrono.")
        
        # Jogar na fila para o Worker processar sequencialmente (1 por vez)
        await rabbitmq.publish("agent_memory_webhook_queue", payload)
        return True
                
    except Exception as e:
        logger.error(f"❌ [Webhook Memory] Erro ao enviar para o webhook: {e}")
        # Falha silenciosa para não quebrar o fluxo principal
