import sys
import os
from datetime import datetime, timezone

# Adiciona o path para encontrar os módulos
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
import models
from services.triggers_service import reconcile_trigger_stats_logic

def test_financial_logic():
    db = SessionLocal()
    try:
        # 1. Criar um Trigger de teste
        trigger = models.ScheduledTrigger(
            client_id=1,
            template_name="test_financial",
            is_bulk=True,
            status="completed",
            cost_per_unit=0.35,
            total_cost=999.0 # Valor errado inicial
        )
        db.add(trigger)
        db.commit()
        db.refresh(trigger)
        
        # 2. Criar mensagens com diferentes status
        # Uma enviada (não deve cobrar)
        msg_sent = models.MessageStatus(
            trigger_id=trigger.id,
            message_id="m1",
            phone_number="123",
            status="sent"
        )
        # Uma entregue (deve cobrar)
        msg_delivered = models.MessageStatus(
            trigger_id=trigger.id,
            message_id="m2",
            phone_number="456",
            status="delivered"
        )
        # Uma falha (não deve cobrar)
        msg_failed = models.MessageStatus(
            trigger_id=trigger.id,
            message_id="m3",
            phone_number="789",
            status="failed"
        )
        
        db.add_all([msg_sent, msg_delivered, msg_failed])
        db.commit()
        
        # 3. Rodar a reconciliação
        import asyncio
        async def run():
            return await reconcile_trigger_stats_logic(trigger.id, 1, db)
        
        result = asyncio.run(run())
        
        db.refresh(trigger)
        
        print(f"--- RESULTADOS ---")
        print(f"Total Sent (Trigger): {trigger.total_sent}")
        print(f"Total Delivered (Trigger): {trigger.total_delivered}")
        print(f"Total Cost (Trigger): {trigger.total_cost}")
        
        # Validações
        # Sent deve ser 2 (m1 + m2) - status 'sent' e 'delivered' contam como enviados
        assert trigger.total_sent == 2
        assert trigger.total_delivered == 1
        # Custo deve ser apenas da m2 (0.35)
        assert trigger.total_cost == 0.35
        
        print("✅ TESTE APROVADO: Apenas mensagens entregues foram cobradas!")
        
    finally:
        # Cleanup
        db.query(models.MessageStatus).filter(models.MessageStatus.trigger_id == trigger.id).delete()
        db.delete(trigger)
        db.commit()
        db.close()

if __name__ == "__main__":
    test_financial_logic()
