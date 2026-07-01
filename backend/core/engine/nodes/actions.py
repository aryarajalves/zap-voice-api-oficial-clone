import random
from core.logger import setup_logger
from datetime import datetime, timezone
import models
from ..utils import apply_vars
from ..logging import log_node_execution

logger = setup_logger("FunnelEngine.Nodes.Actions")

async def handle_update_contact_node(db, trigger, node, chatwoot, contact_phone, apply_vars_func):
    current_node_id = node.get("id")
    log_node_execution(db, trigger, current_node_id, "processing", "✏️ Atualizando contato no Atendimento...")
    try:
        data = node.get("data", {})
        name_type = data.get("nameType", "fixed")
        new_name = (trigger.contact_name or "Cliente WhatsApp") if name_type == "official" else apply_vars_func(data.get("newName", ""))

        if new_name:
            clean_phone = ''.join(filter(str.isdigit, contact_phone))
            contact_res = await chatwoot.search_contact(clean_phone)
            if contact_res and contact_res.get("payload"):
                await chatwoot.update_contact(contact_res["payload"][0]["id"], {"name": new_name})
        log_node_execution(db, trigger, current_node_id, "completed", f"Contato atualizado para '{new_name}'.")
    except Exception as e:
        log_node_execution(db, trigger, current_node_id, "failed", f"Erro ao atualizar contato: {e}")
        raise e
    return "continue"

async def handle_label_node(db, trigger, node, chatwoot, contact_phone, conversation_id):
    current_node_id = node.get("id")
    log_node_execution(db, trigger, current_node_id, "processing", "🏷️ Processando etiquetas no Atendimento...")
    label = node.get("data", {}).get("label")
    remove_label = node.get("data", {}).get("remove_label")
    try:
        # Adicionar etiquetas
        if label:
            if conversation_id and int(conversation_id) > 0:
                await chatwoot.add_label_to_conversation(conversation_id, label)
            clean_phone = ''.join(filter(str.isdigit, contact_phone))
            contact_res = await chatwoot.search_contact(clean_phone)
            if contact_res and contact_res.get("payload"):
                await chatwoot.add_label_to_contact(contact_res["payload"][0]["id"], label)

        # Remover etiquetas
        if remove_label:
            if conversation_id and int(conversation_id) > 0:
                await chatwoot.remove_label_from_conversation(conversation_id, remove_label)
            clean_phone = ''.join(filter(str.isdigit, contact_phone))
            contact_res = await chatwoot.search_contact(clean_phone)
            if contact_res and contact_res.get("payload"):
                await chatwoot.remove_label_from_contact(contact_res["payload"][0]["id"], remove_label)

        log_node_execution(db, trigger, current_node_id, "completed", f"Etiquetas processadas. Adicionadas: '{label or 'Nenhuma'}'. Removidas: '{remove_label or 'Nenhuma'}'.")
    except Exception as e:
        log_node_execution(db, trigger, current_node_id, "failed", f"Erro ao processar etiquetas: {e}")
        raise e
    return "continue"

async def handle_randomizer_node(db, trigger, node):
    current_node_id = node.get("id")
    data = node.get("data", {})
    mode = data.get("mode", "random")  # "random" ou "round_robin"
    
    # caminhos configurados
    paths = data.get("paths", [])
    if not paths:
        percent_a = int(data.get("percentA", 50))
        paths = [
            {"id": "a", "percent": percent_a},
            {"id": "b", "percent": 100 - percent_a}
        ]

    log_node_execution(
        db, trigger, current_node_id, "processing",
        f"🔀 Processando roteamento dinâmico (Modo: {mode}, Caminhos: {len(paths)})..."
    )

    if not paths:
        log_node_execution(db, trigger, current_node_id, "failed", "Nenhum caminho configurado no nó.")
        return None

    if mode == "round_robin":
        try:
            # 1. Buscar estado anterior do Round Robin
            state = db.query(models.RoundRobinState).filter(
                models.RoundRobinState.client_id == trigger.client_id,
                models.RoundRobinState.funnel_id == trigger.funnel_id,
                models.RoundRobinState.node_id == current_node_id
            ).first()

            path_ids = [p["id"] for p in paths if "id" in p]
            if not path_ids:
                raise ValueError("Nenhum ID de caminho válido encontrado.")

            selected_path = path_ids[0]
            if state:
                try:
                    last_index = path_ids.index(state.last_path_id)
                    next_index = (last_index + 1) % len(path_ids)
                    selected_path = path_ids[next_index]
                except ValueError:
                    selected_path = path_ids[0]

                state.last_path_id = selected_path
            else:
                new_state = models.RoundRobinState(
                    client_id=trigger.client_id,
                    funnel_id=trigger.funnel_id,
                    node_id=current_node_id,
                    last_path_id=selected_path
                )
                db.add(new_state)

            db.commit()
            log_node_execution(
                db, trigger, current_node_id, "completed",
                f"Roteamento Sequencial: Selecionado o caminho '{selected_path}'."
            )
            return selected_path
        except Exception as e:
            logger.error(f"Erro ao processar Round Robin no nó {current_node_id}: {e}")
            db.rollback()
            selected_path = paths[0]["id"]
            log_node_execution(
                db, trigger, current_node_id, "completed",
                f"Erro no Round Robin. Usando fallback no primeiro caminho: '{selected_path}'."
            )
            return selected_path
    else:
        # Weighted Random (Aleatório por Peso)
        try:
            weights = []
            for p in paths:
                try:
                    weights.append(max(0, int(p.get("percent", 0))))
                except Exception:
                    weights.append(0)

            total_weight = sum(weights)
            if total_weight <= 0:
                weights = [1] * len(paths)
                total_weight = len(paths)

            roll = random.randint(1, total_weight)
            current_sum = 0
            selected_path = paths[0]["id"]

            for p, w in zip(paths, weights):
                current_sum += w
                if roll <= current_sum:
                    selected_path = p["id"]
                    break

            log_node_execution(
                db, trigger, current_node_id, "completed",
                f"Roteamento Aleatório: Selecionado o caminho '{selected_path}' (Rolagem: {roll}/{total_weight})."
            )
            return selected_path
        except Exception as e:
            logger.error(f"Erro ao processar Roteamento Aleatório no nó {current_node_id}: {e}")
            selected_path = paths[0]["id"] if paths else "a"
            log_node_execution(
                db, trigger, current_node_id, "completed",
                f"Erro no Roteamento Aleatório. Usando fallback no primeiro caminho: '{selected_path}'."
            )
            return selected_path


async def handle_link_funnel_node(db, trigger, node, contact_phone, conversation_id):
    current_node_id = node.get("id")
    log_node_execution(db, trigger, current_node_id, "processing", "🔗 Direcionando para outro funil...")
    try:
        target_funnel_id = node.get("data", {}).get("funnelId")
        if target_funnel_id:
            db.add(models.ScheduledTrigger(
                client_id=trigger.client_id, funnel_id=target_funnel_id, parent_id=trigger.id,
                conversation_id=conversation_id, contact_phone=contact_phone, status='queued',
                scheduled_time=datetime.now(timezone.utc), is_bulk=False, product_name="HIDDEN_CHILD"
            ))
            db.commit()
        log_node_execution(db, trigger, current_node_id, "completed", "Link de funil processado com sucesso.")
    except Exception as e:
        log_node_execution(db, trigger, current_node_id, "failed", f"Erro ao criar link de funil: {e}")
        raise e
    return "continue"

