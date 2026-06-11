import asyncio
import random
import os
import json
from datetime import datetime
from database import SessionLocal
import models
from rabbitmq_client import rabbitmq
from core.logger import setup_logger

logger = setup_logger("Simulator.Interaction")

async def simulate_funnel_interaction(trigger_id: int):
    # Aguardar alguns segundos para simular a resposta de um humano
    delay_seconds = random.uniform(2.0, 5.0)
    logger.info(f"🤖 [SIMULATOR] Agendando clique/interação simulada para Trigger #{trigger_id} em {delay_seconds:.1f}s...")
    await asyncio.sleep(delay_seconds)
    
    db = SessionLocal()
    try:
        trigger = db.query(models.ScheduledTrigger).filter_by(id=trigger_id).first()
        if not trigger or trigger.status != 'suspended':
            return
            
        # Verificar se é um contato simulado
        phone = trigger.contact_phone or ""
        is_simulated = phone.startswith("+551199999") or phone.startswith("551199999") or "simulado" in (trigger.contact_name or "").lower()
        
        # Verificar se o pai do disparo é o teste de escala
        if not is_simulated and trigger.parent_id:
            parent = db.query(models.ScheduledTrigger).filter_by(id=trigger.parent_id).first()
            if parent and (parent.product_name == "SCALE_TEST" or (parent.contact_phone or "").startswith("551199999")):
                is_simulated = True
                
        if not is_simulated:
            logger.info(f"🤖 [SIMULATOR] Trigger #{trigger_id} não é um contato simulado. Abortando simulação.")
            return
            
        logger.info(f"🤖 [SIMULATOR] Iniciando simulação de interação para Trigger #{trigger.id} (Contato: {phone})")
        
        # 1. Encontrar o nó atual no funil
        funnel = trigger.funnel
        if not funnel or not funnel.steps or not trigger.current_node_id:
            logger.warning(f"⚠️ [SIMULATOR] Funil ou Nó atual não encontrado para o Trigger #{trigger_id}")
            return
            
        steps = funnel.steps
        nodes = steps.get("nodes", []) if isinstance(steps, dict) else []
        current_node = next((n for n in nodes if n.get("id") == trigger.current_node_id), None)
        
        if not current_node:
            logger.warning(f"⚠️ [SIMULATOR] Nó '{trigger.current_node_id}' não encontrado na estrutura do funil")
            return
            
        node_type = current_node.get("type")
        node_data = current_node.get("data", {})
        
        # Obter o ID do número de telefone cadastrado
        wa_phone_id = "123456789"
        config = db.query(models.AppConfig).filter_by(client_id=trigger.client_id, key="WA_PHONE_NUMBER_ID").first()
        if config:
            wa_phone_id = config.value
            
        # 2. Simular a resposta baseada no tipo de nó
        buttons = []
        user_input = "Sim"
        is_button_click = False
        
        if node_type == "messageNode":
            buttons = [b.strip() for b in node_data.get("buttons", []) if b.strip()]
        elif node_type in ("templateNode", "sendTemplateNode"):
            template_name = node_data.get("templateName") or trigger.template_name
            if template_name:
                cache = db.query(models.WhatsAppTemplateCache).filter_by(client_id=trigger.client_id, name=template_name).first()
                if cache and cache.buttons:
                    try:
                        btn_data = json.loads(cache.buttons) if isinstance(cache.buttons, str) else cache.buttons
                        buttons = [b.get("text") for b in btn_data.get("quick_replies", []) if b.get("text")]
                    except Exception as e_btns:
                        logger.error(f"Erro ao extrair botões do cache do template: {e_btns}")
        
        if buttons:
            user_input = random.choice(buttons)
            is_button_click = True
        elif node_type == "inputDataNode":
            var_name = (node_data.get("varName") or "").lower()
            validation_type = node_data.get("validationType", "text")
            if var_name == "cpf":
                # Gerar CPF numérico simulado válido ou aceitável de 11 dígitos
                user_input = "".join([str(random.randint(0, 9)) for _ in range(11)])
            elif validation_type == "number":
                user_input = str(random.randint(1, 100))
            elif validation_type == "email":
                user_input = "simulado@teste.com"
            else:
                user_input = "Resposta simulada"
        
        # 3. Montar a carga de mensagem recebida
        clean_phone = ''.join(filter(str.isdigit, phone))
        if is_button_click:
            payload = {
                "entry": [{
                    "changes": [{
                        "value": {
                            "metadata": {
                                "phone_number_id": wa_phone_id
                            },
                            "messages": [{
                                "from": clean_phone,
                                "id": f"wamid.simulated_click_{random.randint(100000, 999999)}",
                                "timestamp": str(int(datetime.utcnow().timestamp())),
                                "type": "interactive",
                                "interactive": {
                                    "type": "button_reply",
                                    "button_reply": {
                                        "id": f"btn_{random.randint(100, 999)}",
                                        "title": user_input
                                    }
                                }
                            }],
                            "contacts": [{"wa_id": clean_phone, "profile": {"name": trigger.contact_name or "Contato Simulado"}}]
                        }
                    }]
                }]
            }
        else:
            payload = {
                "entry": [{
                    "changes": [{
                        "value": {
                            "metadata": {
                                "phone_number_id": wa_phone_id
                            },
                            "messages": [{
                                "from": clean_phone,
                                "id": f"wamid.simulated_text_{random.randint(100000, 999999)}",
                                "timestamp": str(int(datetime.utcnow().timestamp())),
                                "type": "text",
                                "text": {"body": user_input}
                            }],
                            "contacts": [{"wa_id": clean_phone, "profile": {"name": trigger.contact_name or "Contato Simulado"}}]
                        }
                    }]
                }]
            }
            
        logger.info(f"📤 [SIMULATOR] Publicando clique/resposta simulada: '{user_input}' para o telefone {clean_phone}")
        await rabbitmq.publish("whatsapp_events", payload)
        
    except Exception as e:
        logger.error(f"❌ [SIMULATOR] Erro na simulação de interação: {e}")
    finally:
        db.close()
