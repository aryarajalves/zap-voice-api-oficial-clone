"""
Script de Ajuste Fino de Autovacuum no PostgreSQL
Aplica parâmetros otimizados para tabelas de alta rotatividade para prevenir inchaço de disco (bloat).

Uso: python backend/scripts/tune_autovacuum_settings.py
"""

import os
import sys
from pathlib import Path
from sqlalchemy import create_engine, text

# Ajusta path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from database import SQLALCHEMY_DATABASE_URL

TARGET_TABLES = [
    "message_status",
    "webhook_events",
    "chat_messages",
    "scheduled_triggers",
    "contact_windows",
    "waba_payment_checks",
]


def apply_autovacuum_tuning():
    if not SQLALCHEMY_DATABASE_URL:
        print("[ERRO] DATABASE_URL não configurada.")
        return 1

    print("=" * 70)
    print("🚀 APLICANDO AJUSTE FINO DE AUTOVACUUM NO POSTGRESQL")
    print("=" * 70)

    engine = create_engine(SQLALCHEMY_DATABASE_URL)

    with engine.begin() as conn:
        for table_name in TARGET_TABLES:
            try:
                table_check = conn.execute(text("""
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.tables 
                        WHERE table_schema = 'public' AND table_name = :tbl
                    );
                """), {"tbl": table_name}).scalar()

                if not table_check:
                    print(f"⚠️  Tabela '{table_name}' não encontrada no banco. Pulando.")
                    continue

                sql = f"""
                    ALTER TABLE "{table_name}" SET (
                        autovacuum_vacuum_scale_factor = 0.05,
                        autovacuum_vacuum_threshold = 50,
                        autovacuum_analyze_scale_factor = 0.02,
                        autovacuum_analyze_threshold = 25
                    );
                """
                conn.execute(text(sql))
                print(f"✅ Autovacuum otimizado para a tabela '{table_name}'.")
            except Exception as e:
                print(f"❌ Erro ao configurar Autovacuum em '{table_name}': {e}")

    print("=" * 70)
    print("🎉 SUCESSO: Autovacuum ajustado em todas as tabelas de alta escrita!")
    print("=" * 70)
    return 0


if __name__ == "__main__":
    sys.exit(apply_autovacuum_tuning())
