"""
Script de Retenção e Expurgos Periódicos de Banco de Dados (Data Purge)
Remove registros obsoletos e volumosos em lotes seguros para manter o banco leve.

Uso: python backend/scripts/purge_old_database_records.py
"""

import os
import sys
import asyncio
from pathlib import Path
from datetime import datetime, timezone, timedelta
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Ajusta path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from database import SQLALCHEMY_DATABASE_URL
import models

def run_purge_sync():
    if not SQLALCHEMY_DATABASE_URL:
        print("[ERRO] DATABASE_URL não configurada.")
        return 1

    print("=" * 70)
    print("🧹 INICIANDO POLÍTICA DE EXPURGO DE DADOS (DATA PURGE)")
    print(f"Timestamp: {datetime.now(timezone.utc).isoformat()}")
    print("=" * 70)

    waba_days = int(os.getenv("WABA_CHECK_RETENTION_DAYS", "30"))
    webhook_event_days = int(os.getenv("WEBHOOK_EVENT_RETENTION_DAYS", "15"))
    webhook_hist_days = int(os.getenv("HISTORY_RETENTION_DAYS", "30"))
    msg_status_days = int(os.getenv("MESSAGE_STATUS_RETENTION_DAYS", "90"))

    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    Session = sessionmaker(bind=engine)
    db = Session()

    total_expunged = 0

    try:
        # 1. WABA Payment Checks
        if waba_days > 0:
            cutoff = datetime.now(timezone.utc) - timedelta(days=waba_days)
            deleted = db.query(models.WabaPaymentCheck).filter(
                models.WabaPaymentCheck.checked_at < cutoff
            ).delete(synchronize_session=False)
            db.commit()
            total_expunged += deleted
            print(f"✅ [WABA CHECKS] {deleted} registro(s) expurgado(s) (retenção: {waba_days} dias)")

        # 2. Webhook Events processados
        if webhook_event_days > 0:
            cutoff = datetime.now(timezone.utc) - timedelta(days=webhook_event_days)
            deleted = db.query(models.WebhookEvent).filter(
                models.WebhookEvent.created_at < cutoff,
                models.WebhookEvent.status.in_(["processed", "failed", "completed"])
            ).delete(synchronize_session=False)
            db.commit()
            total_expunged += deleted
            print(f"✅ [WEBHOOK EVENTS] {deleted} evento(s) bruto(s) expurgado(s) (retenção: {webhook_event_days} dias)")

        # 3. Webhook History
        if webhook_hist_days > 0:
            cutoff = datetime.now(timezone.utc) - timedelta(days=webhook_hist_days)
            deleted = db.query(models.WebhookHistory).filter(
                models.WebhookHistory.created_at < cutoff
            ).delete(synchronize_session=False)
            db.commit()
            total_expunged += deleted
            print(f"✅ [WEBHOOK HISTORY] {deleted} histórico(s) expurgado(s) (retenção: {webhook_hist_days} dias)")

        # 4. Message Status antigas
        if msg_status_days > 0:
            cutoff = datetime.now(timezone.utc) - timedelta(days=msg_status_days)
            deleted = db.query(models.MessageStatus).filter(
                models.MessageStatus.timestamp < cutoff
            ).delete(synchronize_session=False)
            db.commit()
            total_expunged += deleted
            print(f"✅ [MESSAGE STATUS] {deleted} status de mensagem expurgado(s) (retenção: {msg_status_days} dias)")

        print("=" * 70)
        print(f"🎉 SUCESSO TOTAL: {total_expunged} registro(s) obsoleto(s) expurgado(s) do banco de dados!")
        print("=" * 70)
        return 0

    except Exception as e:
        print(f"❌ [ERRO] Falha durante expurgo de dados: {e}")
        db.rollback()
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(run_purge_sync())
