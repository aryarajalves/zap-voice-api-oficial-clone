import random
from datetime import datetime
from core.logger import setup_logger
from ..logging import log_node_execution
from models.trigger import HotLead, RoundRobinState
from models.auth import User
from websocket_manager import manager

logger = setup_logger("FunnelEngine.Nodes.HotLeads")

async def handle_hot_leads_node(db, trigger, node, contact_phone):
    current_node_id = node.get("id")
    data = node.get("data", {})
    
    alert_name = data.get("alertName", "Interesse")
    priority = data.get("priority", "Média")
    context_message = data.get("contextMessage", "")
    sellers_queue_type = data.get("sellersQueueType", "all")
    selected_seller_ids = data.get("selectedSellerIds", [])
    distribution_mode = data.get("distributionMode", "round_robin")

    log_node_execution(
        db, trigger, current_node_id, "processing",
        f"🔥 Processando alerta de Lead Quente (Categoria: {alert_name}, Prioridade: {priority})..."
    )

    try:
        # 1. Buscar vendedores elegíveis e ativos para o cliente
        if sellers_queue_type == "selected" and selected_seller_ids:
            # Filtra pelos IDs selecionados (e garante que sejam vendedores ativos deste cliente)
            # Para manter compatibilidade, convertemos IDs de string para int se necessário
            try:
                seller_ids = [int(sid) for sid in selected_seller_ids]
            except Exception:
                seller_ids = []
            
            users = db.query(User).join(User.accessible_clients).filter(
                models.Client.id == trigger.client_id,
                User.id.in_(seller_ids),
                User.role == "vendedor",
                User.is_active == True
            ).all()
        else:
            # Todos os vendedores ativos do cliente
            users = db.query(User).join(User.accessible_clients).filter(
                models.Client.id == trigger.client_id,
                User.role == "vendedor",
                User.is_active == True
            ).all()

        assigned_user_id = None

        if not users:
            logger.warning(f"Nenhum vendedor ativo encontrado para o cliente {trigger.client_id}. O lead ficará sem atribuição.")
            log_node_execution(
                db, trigger, current_node_id, "processing",
                "⚠️ Nenhum vendedor ativo disponível para atribuição. O lead ficará sem vendedor associado."
            )
        else:
            if distribution_mode == "random":
                # Distribuição Aleatória Ponderada (Probabilidade baseada em pesos)
                # Garantir peso >= 1
                weights = [max(1, u.seller_weight or 1) for u in users]
                chosen_user = random.choices(users, weights=weights, k=1)[0]
                assigned_user_id = chosen_user.id
                logger.info(f"Distribuição Aleatória Ponderada: Lead atribuído ao vendedor ID {assigned_user_id} (Peso: {chosen_user.seller_weight})")
            else:
                # Round Robin / Rodízio Sequencial Ponderado (Ciclo Ponderado Simples)
                # Ordena primeiro pelo ID do usuário
                sorted_users = sorted(users, key=lambda x: x.id)
                
                # Gera o ciclo ponderado repetindo cada vendedor de acordo com o seu peso
                weighted_cycle = []
                for user in sorted_users:
                    weight = max(1, user.seller_weight or 1)
                    # Repete o ID na fila de acordo com o peso
                    weighted_cycle.extend([user.id] * weight)
                
                # Buscar estado anterior de Round Robin
                state = db.query(RoundRobinState).filter(
                    RoundRobinState.client_id == trigger.client_id,
                    RoundRobinState.funnel_id == trigger.funnel_id,
                    RoundRobinState.node_id == current_node_id
                ).first()

                if state:
                    try:
                        # Recupera o último índice salvo do estado do Round Robin ponderado.
                        # Adicionamos compatibilidade para ler o ID salvo do estado antigo se necessário.
                        last_saved = state.last_path_id
                        
                        # Se contiver ':' no estado, significa que salvamos 'indice:id' para precisão ponderada.
                        if last_saved and ":" in last_saved:
                            parts = last_saved.split(":")
                            last_index = int(parts[0])
                        else:
                            # Fallback para compatibilidade com estado antigo
                            last_id = int(last_saved) if last_saved else -1
                            if last_id in weighted_cycle:
                                last_index = weighted_cycle.index(last_id)
                            else:
                                last_index = -1
                        
                        next_index = (last_index + 1) % len(weighted_cycle)
                        assigned_user_id = weighted_cycle[next_index]
                        # Salva 'indice:id' no estado
                        state.last_path_id = f"{next_index}:{assigned_user_id}"
                    except Exception as robin_err:
                        logger.error(f"Erro ao recuperar estado do Round Robin ponderado: {robin_err}")
                        assigned_user_id = weighted_cycle[0]
                        state.last_path_id = f"0:{assigned_user_id}"
                else:
                    assigned_user_id = weighted_cycle[0]
                    new_state = RoundRobinState(
                        client_id=trigger.client_id,
                        funnel_id=trigger.funnel_id,
                        node_id=current_node_id,
                        last_path_id=f"0:{assigned_user_id}"
                    )
                    db.add(new_state)
                
                logger.info(f"Distribuição Sequencial Ponderada (Round Robin): Lead atribuído ao vendedor ID {assigned_user_id}")

        # 2. Criar e salvar o registro do Lead Quente
        # Usamos o contact_name do trigger se disponível, senão tentamos um fallback inteligente
        contact_name = trigger.contact_name or contact_phone
        
        hot_lead = HotLead(
            client_id=trigger.client_id,
            contact_name=contact_name,
            contact_phone=contact_phone,
            alert_name=alert_name,
            priority=priority,
            context_message=context_message,
            assigned_user_id=assigned_user_id
        )
        db.add(hot_lead)
        db.commit()
        db.refresh(hot_lead)

        log_node_execution(
            db, trigger, current_node_id, "completed",
            f"✅ Lead Quente registrado com sucesso! Atribuído ao vendedor ID: {assigned_user_id}."
        )

        # 3. Notificar o frontend via WebSocket
        assigned_user_name = None
        if assigned_user_id:
            assigned_user = db.query(User).filter(User.id == assigned_user_id).first()
            if assigned_user:
                assigned_user_name = assigned_user.full_name or assigned_user.email

        payload = {
            "event": "new_hot_lead",
            "client_id": trigger.client_id,
            "data": {
                "id": hot_lead.id,
                "client_id": hot_lead.client_id,
                "contact_name": hot_lead.contact_name,
                "contact_phone": hot_lead.contact_phone,
                "alert_name": hot_lead.alert_name,
                "priority": hot_lead.priority,
                "context_message": hot_lead.context_message,
                "assigned_user_id": hot_lead.assigned_user_id,
                "assigned_user_name": assigned_user_name,
                "created_at": hot_lead.created_at.isoformat() if hot_lead.created_at else None
            }
        }
        await manager.broadcast(payload)

        # Retorna default para continuar o fluxo pela porta de saída única
        return "default"

    except Exception as e:
        logger.error(f"Erro ao processar nó de Lead Quente {current_node_id}: {e}")
        db.rollback()
        log_node_execution(
            db, trigger, current_node_id, "failed",
            f"Erro interno ao processar lead quente: {str(e)}"
        )
        return "default"
