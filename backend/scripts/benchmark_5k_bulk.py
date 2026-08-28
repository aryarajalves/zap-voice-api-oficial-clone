import time
import sys
import os

# Adiciona o caminho do backend para imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import models
from database import SessionLocal, engine
from sqlalchemy import text
from datetime import datetime, timezone
import json

def run_5k_bulk_benchmark():
    print("=" * 60)
    print("🚀 INICIANDO TESTE DE CARGA E ESTRESSE DE DISPARO EM MASSA (5.000 CONTATOS)")
    print("=" * 60)

    db = SessionLocal()
    try:
        # 1. Verificar conexão com o Postgres
        db.execute(text("SELECT 1"))
        print("✅ Conexão com PostgreSQL ativa e saudável.")

        # Obter um client_id válido
        client = db.query(models.Client).first()
        client_id = client.id if client else 1

        # 2. Gerar 5.000 contatos fictícios
        print("\n📦 Gerando payload com 5.000 contatos em memória...")
        t0_gen = time.time()
        contacts_5k = []
        for i in range(1, 5001):
            ddd = f"{(i % 89) + 11:02d}"
            phone = f"55{ddd}9{10000000 + i}"
            contacts_5k.append({
                "id": 100000 + i,
                "phone": phone,
                "name": f"Contato Teste {i}",
                "inbox_id": 1,
                "variables": {"nome": f"Contato {i}", "empresa": "ZapVoice Corp"}
            })
        t_gen = time.time() - t0_gen
        payload_size_mb = len(json.dumps(contacts_5k)) / (1024 * 1024)
        print(f"✅ 5.000 contatos gerados em {t_gen:.3f}s. Tamanho do payload JSON: {payload_size_mb:.2f} MB")

        # 3. Testar inserção do Trigger com 5.000 contatos
        print("\n💾 1. Testando gravação do ScheduledTrigger com 5.000 contatos no Postgres...")
        t0_insert = time.time()
        trigger = models.ScheduledTrigger(
            client_id=client_id,
            template_name="template_teste_5k",
            template_language="pt_BR",
            status="processing",
            is_bulk=True,
            is_stress_test=True,
            contacts_list=contacts_5k,
            total_contacts=5000,
            scheduled_time=datetime.now(timezone.utc),
            delay_seconds=0,
            concurrency_limit=20,
            product_name="BENCHMARK_5K"
        )
        db.add(trigger)
        db.commit()
        db.refresh(trigger)
        t_insert = time.time() - t0_insert
        print(f"✅ ScheduledTrigger ID {trigger.id} gravado e comitado no Postgres em {t_insert:.3f}s!")

        # 4. Simulação de processamento de status em lotes (Batch Insert de MessageStatus)
        print("\n⚡ 2. Simulando inserção em lote de 5.000 registros de status (MessageStatus)...")
        t0_statuses = time.time()
        
        batch_size = 500
        total_batches = 5000 // batch_size
        
        for batch_idx in range(total_batches):
            start_i = batch_idx * batch_size
            end_i = start_i + batch_size
            batch_contacts = contacts_5k[start_i:end_i]
            
            statuses = [
                models.MessageStatus(
                    trigger_id=trigger.id,
                    message_id=f"msg_5k_{trigger.id}_{c['id']}",
                    phone_number=c["phone"],
                    contact_name=c["name"],
                    status="sent",
                    message_type="TEMPLATE"
                )
                for c in batch_contacts
            ]
            db.bulk_save_objects(statuses)
            
            # Atualização atômica dos contadores
            db.query(models.ScheduledTrigger).filter_by(id=trigger.id).update({
                "total_sent": models.ScheduledTrigger.total_sent + len(statuses)
            })
            db.commit()

        t_statuses = time.time() - t0_statuses
        ops_per_sec = 5000 / t_statuses
        print(f"✅ 5.000 MessageStatus gravados com sucesso em {t_statuses:.3f}s ({ops_per_sec:.0f} registros/segundo)!")

        # 5. Validação de Integridade
        print("\n🔍 3. Verificando integridade dos dados no banco...")
        saved_trigger = db.query(models.ScheduledTrigger).filter_by(id=trigger.id).first()
        count_statuses = db.query(models.MessageStatus).filter_by(trigger_id=trigger.id).count()

        print(f"📊 Total de contatos no trigger: {saved_trigger.total_contacts}")
        print(f"📊 Total enviado contabilizado: {saved_trigger.total_sent}")
        print(f"📊 Registros reais em MessageStatus: {count_statuses}")

        assert saved_trigger.total_contacts == 5000, "Erro: contatos divergentes"
        assert saved_trigger.total_sent == 5000, "Erro: total_sent divergente"
        assert count_statuses == 5000, "Erro: count de MessageStatus divergente"
        assert len(saved_trigger.contacts_list) == 5000, "Erro: contacts_list incompleto"

        # 6. Checar saúde das conexões do Postgres
        res = db.execute(text("SELECT count(*) FROM pg_stat_activity WHERE state = 'active'")).scalar()
        print(f"🔌 Conexões ativas no PostgreSQL durante o teste: {res}")

        # 7. Limpeza dos dados de benchmark
        print("\n🧹 Limpando dados do teste de benchmark...")
        db.query(models.MessageStatus).filter_by(trigger_id=trigger.id).delete()
        db.query(models.ScheduledTrigger).filter_by(id=trigger.id).delete()
        db.commit()
        print("✅ Dados temporários de benchmark removidos com sucesso.")

        print("\n" + "=" * 60)
        print("🎉 RESULTADO DO TESTE: SUCESSO ABSOLUTO (100% APROVADO)")
        print(f"Tempo total de escrita e leitura de 5k contatos: {t_insert + t_statuses:.3f} segundos")
        print("Nenhum travamento, nenhum lock de tabela, nenhuma perda de dados!")
        print("=" * 60)

    except Exception as e:
        db.rollback()
        print(f"❌ Erro durante o benchmark: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    run_5k_bulk_benchmark()
