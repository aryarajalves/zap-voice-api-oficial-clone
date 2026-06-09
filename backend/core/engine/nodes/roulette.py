import random
from datetime import datetime, date, time, timezone
from sqlalchemy import func
from core.logger import setup_logger
from ..logging import log_node_execution
from models.trigger import RouletteLog

logger = setup_logger("FunnelEngine.Nodes.Roulette")

async def handle_roulette_node(db, trigger, node, contact_phone):
    current_node_id = node.get("id")
    data = node.get("data", {})
    
    # 1. Obter configurações do nó
    try:
        win_chance = int(data.get("winChance", 10))
    except Exception:
        win_chance = 10
        
    try:
        daily_limit = int(data.get("dailyLimit", 5))
    except Exception:
        daily_limit = 5

    log_node_execution(
        db, trigger, current_node_id, "processing", 
        f"🎲 Processando roleta (Chance: {win_chance}%, Limite Diário: {daily_limit} prêmios)..."
    )

    try:
        # 2. Consultar o total de ganhadores no dia de hoje para este nó específico
        today_start = datetime.combine(date.today(), time.min).replace(tzinfo=timezone.utc)
        today_end = datetime.combine(date.today(), time.max).replace(tzinfo=timezone.utc)
        
        winners_today = db.query(RouletteLog).filter(
            RouletteLog.client_id == trigger.client_id,
            RouletteLog.node_id == current_node_id,
            RouletteLog.win_date >= today_start,
            RouletteLog.win_date <= today_end
        ).count()
        
        # 3. Validar contra o limite diário
        if winners_today >= daily_limit:
            log_node_execution(
                db, trigger, current_node_id, "completed",
                f"Limite diário de prêmios ({daily_limit}) já foi atingido hoje. Resultado: Perdeu."
            )
            return "perdeu"
            
        # 4. Processar probabilidade
        roll = random.randint(1, 100)
        if roll <= win_chance:
            # Salvando log de vitória no banco
            log_win = RouletteLog(
                client_id=trigger.client_id,
                phone=contact_phone,
                funnel_id=trigger.funnel_id,
                node_id=current_node_id
            )
            db.add(log_win)
            db.commit()
            
            log_node_execution(
                db, trigger, current_node_id, "completed",
                f"Parabéns! Ganhou na roleta (Rolou: {roll} <= Chance: {win_chance}%). Registro de vitória salvo."
            )
            return "ganhou"
        else:
            log_node_execution(
                db, trigger, current_node_id, "completed",
                f"Não foi dessa vez (Rolou: {roll} > Chance: {win_chance}%). Resultado: Perdeu."
            )
            return "perdeu"
            
    except Exception as e:
        logger.error(f"Erro na execução da roleta no nó {current_node_id}: {e}")
        db.rollback()
        log_node_execution(
            db, trigger, current_node_id, "failed",
            f"Erro interno ao processar roleta: {str(e)}"
        )
        return "perdeu"
