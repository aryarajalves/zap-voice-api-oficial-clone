import httpx
import logging
from config_loader import get_settings

logger = logging.getLogger("manychat_service")

async def sync_to_manychat(client_id: int, name: str, phone: str, tag: str):
    """
    Sincroniza contato com ManyChat e adiciona etiqueta.
    """
    settings = get_settings(client_id)
    api_key = settings.get("MANYCHAT_API_KEY")
    
    if not api_key or api_key == "seu_token_aqui":
        logger.warning(f"ManyChat API Key não configurada para o cliente {client_id}")
        return

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "accept": "application/json"
    }

    try:
        async with httpx.AsyncClient() as client:
            # 1. Criar ou Atualizar Contato
            logger.info(f"Sincronizando contato {phone} ({name}) no ManyChat...")
            
            # Limpa o telefone (ManyChat prefere com + e sem espaços)
            clean_phone = "".join(filter(str.isdigit, str(phone)))
            if not clean_phone.startswith("+"):
                clean_phone = "+" + clean_phone

            subscriber_data = {
                "first_name": name,
                "phone": clean_phone,
                "has_opt_in_sms": True,
                "has_opt_in_email": True,
                "consent_phrase": "Ao fornecer seu número, você concorda em receber mensagens de marketing."
            }

            resp = await client.post(
                "https://api.manychat.com/fb/subscriber/createSubscriber",
                json=subscriber_data,
                headers=headers
            )
            
            if resp.status_code != 200:
                logger.error(f"Erro ao criar contato no ManyChat: {resp.text}")
                return

            result = resp.json()
            subscriber_id = result.get("data", {}).get("id")

            if not subscriber_id:
                logger.error("Internal Error: ManyChat não retornou subscriber_id")
                return

            # 2. Garantir que a Tag existe no ManyChat (Cria se não existir)
            if tag:
                logger.info(f"Garantindo que a tag '{tag}' existe no ManyChat...")
                create_tag_payload = {"name": tag}
                
                # Chamamos createTag. O ManyChat retorna erro se já existir, mas nós ignoramos.
                tag_create_resp = await client.post(
                    "https://api.manychat.com/fb/page/createTag",
                    json=create_tag_payload,
                    headers=headers
                )
                
                if tag_create_resp.status_code == 200:
                    logger.info(f"Tag '{tag}' criada com sucesso.")
                else:
                    # Se o erro for "Tag with this name already exists", está tudo bem
                    logger.info(f"Tag '{tag}' já existia ou erro ao criar (OK para prosseguir).")

                # 3. Adicionar Tag ao Subscriber
                logger.info(f"Adicionando tag '{tag}' ao subscriber {subscriber_id} no ManyChat...")
                tag_payload = {
                    "subscriber_id": subscriber_id,
                    "tag_name": tag
                }
                
                tag_resp = await client.post(
                    "https://api.manychat.com/fb/subscriber/addTagByName",
                    json=tag_payload,
                    headers=headers
                )
                
                if tag_resp.status_code != 200:
                    logger.error(f"Erro ao adicionar tag no ManyChat: {tag_resp.text}")
                else:
                    logger.info("Tag adicionada com sucesso no ManyChat.")

    except Exception as e:
        logger.error(f"Exceção ao sincronizar com ManyChat: {e}")
