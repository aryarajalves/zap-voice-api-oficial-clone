import sys
import os
from datetime import datetime, timezone, timedelta

# Adiciona o diretório atual do backend ao path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
import models

def setup_mocks():
    db = SessionLocal()
    try:
        # 1. Encontrar o cliente do usuário aryarajmarketing@gmail.com
        user = db.query(models.User).filter(models.User.email == "aryarajmarketing@gmail.com").first()
        client_id = user.client_id if user else None
        
        if not client_id:
            client = db.query(models.Client).first()
            if not client:
                print("❌ Nenhum cliente encontrado no banco de dados!")
                return
            client_id = client.id
            print(f"⚠️ Usando o primeiro cliente cadastrado: ID {client_id}")
        else:
            print(f"✅ Cliente encontrado para o usuário: ID {client_id}")

        # 2. Criar um RecurringTrigger fictício se não houver
        rt = db.query(models.RecurringTrigger).filter(models.RecurringTrigger.client_id == client_id).first()
        if not rt:
            rt = models.RecurringTrigger(
                client_id=client_id,
                frequency="weekly",
                scheduled_time="10:00",
                is_active=True,
                next_run_at=datetime.now(timezone.utc) + timedelta(days=2),
                contacts_list=[{"phone": "5511999999999", "name": "João Mock"}]
            )
            db.add(rt)
            db.commit()
            db.refresh(rt)
            print(f"✅ RecurringTrigger mock criado com ID {rt.id}")
        else:
            print(f"✅ Usando RecurringTrigger existente ID {rt.id}")

        # 3. Criar os ScheduledTriggers mockados recorrentes
        # A) Um normal enfileirado
        st_queued = models.ScheduledTrigger(
            client_id=client_id,
            funnel_id=None,
            template_name="Envio Recorrente Semanal",
            contacts_list=[{"phone": "5511999999999", "name": "João Mock"}],
            status="queued",
            is_bulk=True,
            is_recurring=True,
            recurring_trigger_id=rt.id,
            scheduled_time=datetime.now(timezone.utc) + timedelta(minutes=15)
        )
        db.add(st_queued)

        # B) Um executado com sucesso (completed)
        st_completed = models.ScheduledTrigger(
            client_id=client_id,
            funnel_id=None,
            template_name="Envio Recorrente Semanal",
            contacts_list=[{"phone": "5511999999999", "name": "João Mock"}],
            status="completed",
            is_bulk=True,
            is_recurring=True,
            recurring_trigger_id=rt.id,
            scheduled_time=datetime.now(timezone.utc) - timedelta(hours=1),
            total_contacts=1,
            total_sent=1,
            total_delivered=1
        )
        db.add(st_completed)

        # C) Um abortado por atraso (aborted)
        failure_msg = (
            "Disparo abortado: Limite de atraso (30 minutos) excedido. "
            "O disparo deveria ter ocorrido às 14:00:00 UTC, mas o scheduler "
            "executou às 14:45:12 UTC (45 minutos de atraso)."
        )
        st_aborted = models.ScheduledTrigger(
            client_id=client_id,
            funnel_id=None,
            template_name="Envio Recorrente Mensal",
            contacts_list=[{"phone": "5511999999999", "name": "João Mock"}],
            status="aborted",
            is_bulk=True,
            is_recurring=True,
            recurring_trigger_id=rt.id,
            scheduled_time=datetime.now(timezone.utc) - timedelta(hours=2),
            failure_reason=failure_msg
        )
        db.add(st_aborted)

        db.commit()
        print("✅ ScheduledTriggers mocks de recorrência inseridos com sucesso no banco de dados!")
    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao inserir mocks: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    setup_mocks()
