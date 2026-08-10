import os
import sys
from sqlalchemy import create_engine, text

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from database import SQLALCHEMY_DATABASE_URL

def migrate():
    print("🏗️  Iniciando migração: Adicionar coluna waba_card_last4 em scheduled_triggers...")
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            # 1. Adicionar coluna se não existir
            conn.execute(text("ALTER TABLE scheduled_triggers ADD COLUMN IF NOT EXISTS waba_card_last4 VARCHAR;"))
            print("✅ Coluna waba_card_last4 adicionada com sucesso.")

            # 2. Preencher disparos já existentes retroativamente com a configuração atual do cliente
            result = conn.execute(text("""
                UPDATE scheduled_triggers 
                SET waba_card_last4 = (
                    SELECT value FROM app_config 
                    WHERE app_config.client_id = scheduled_triggers.client_id 
                      AND app_config.key = 'WA_WABA_CARD_LAST4' 
                    LIMIT 1
                )
                WHERE waba_card_last4 IS NULL OR waba_card_last4 = '';
            """))
            print(f"✅ Disparos existentes atualizados retroativamente: {result.rowcount} registros afetados.")

            trans.commit()
            print("✨ Migração de cartão WABA concluída com sucesso!")
        except Exception as e:
            trans.rollback()
            print(f"❌ Erro ao aplicar migração: {e}")
            raise

if __name__ == "__main__":
    migrate()
