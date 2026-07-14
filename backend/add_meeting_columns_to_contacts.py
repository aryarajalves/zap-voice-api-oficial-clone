"""
Script de migração: add_meeting_columns_to_contacts.py
Data: 2026-07-14

Adiciona as colunas google_meet_link e meeting_at na tabela de contatos
monitorados (contatos_monitorados ou SYNC_CONTACTS_TABLE configurado).

Este script é seguro para rodar múltiplas vezes (idempotente via IF NOT EXISTS).

Uso:
    docker exec zapvoice_app python add_meeting_columns_to_contacts.py
"""

import os
import sys

# Garante que o diretório do script está no path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("❌ DATABASE_URL não definida. Configure a variável de ambiente e tente novamente.")
    sys.exit(1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

# Nome da tabela — usa a mesma lógica do sistema (SYNC_CONTACTS_TABLE ou padrão)
sync_table_raw = os.getenv("SYNC_CONTACTS_TABLE", "contatos_monitorados")
safe_table = "".join(c for c in sync_table_raw if c.isalnum() or c == "_")

print(f"🔍 Iniciando migração na tabela: {safe_table}")

try:
    # Verifica se a tabela existe
    result = db.execute(text(
        "SELECT to_regclass(:table_name)"
    ), {"table_name": safe_table}).scalar()

    if not result:
        print(f"⚠️  Tabela '{safe_table}' não existe ainda. Ela será criada automaticamente quando o primeiro contato interagir.")
        print("✅ Migração ignorada — nenhuma ação necessária.")
        sys.exit(0)

    # Adiciona as colunas (IF NOT EXISTS garante idempotência)
    migrations = [
        ("google_meet_link", "TEXT"),
        ("meeting_at", "TIMESTAMP WITH TIME ZONE"),
    ]

    for col_name, col_type in migrations:
        try:
            db.execute(text(
                f"ALTER TABLE {safe_table} ADD COLUMN IF NOT EXISTS {col_name} {col_type}"
            ))
            db.commit()
            print(f"  ✅ Coluna '{col_name}' ({col_type}) adicionada ou já existia.")
        except Exception as e:
            db.rollback()
            print(f"  ❌ Erro ao adicionar coluna '{col_name}': {e}")

    print(f"\n✅ Migração concluída com sucesso na tabela '{safe_table}'!")
    print("   Campos disponíveis: google_meet_link (TEXT), meeting_at (TIMESTAMP WITH TIME ZONE)")

except Exception as e:
    print(f"❌ Erro durante a migração: {e}")
    sys.exit(1)
finally:
    db.close()
