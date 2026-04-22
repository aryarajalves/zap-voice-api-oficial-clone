import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import json

# Adiciona o diretório atual ao path para importar models e database
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SQLALCHEMY_DATABASE_URL
from models import ScheduledTrigger, WebhookEventMapping

def migrate():
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()

    print("🚀 Iniciando migração de etiquetas Chatwoot de String para JSON...")

    try:
        # 1. Obter todos os WebhookEventMapping
        mappings = session.query(WebhookEventMapping).all()
        print(f"📦 Processando {len(mappings)} mapeamentos de eventos...")
        for m in mappings:
            if m.chatwoot_label and isinstance(m.chatwoot_label, str):
                # Se for uma string, divide por vírgula e limpa espaços
                labels = [l.strip() for l in m.chatwoot_label.split(',') if l.strip()]
                m.chatwoot_label = labels
        
        # 2. Obter todos os ScheduledTrigger
        triggers = session.query(ScheduledTrigger).all()
        print(f"📦 Processando {len(triggers)} triggers agendados...")
        for t in triggers:
            if t.chatwoot_label and isinstance(t.chatwoot_label, str):
                labels = [l.strip() for l in t.chatwoot_label.split(',') if l.strip()]
                t.chatwoot_label = labels

        session.commit()
        print("✅ Migração concluída com sucesso!")
    except Exception as e:
        session.rollback()
        print(f"❌ Erro durante a migração: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    migrate()
