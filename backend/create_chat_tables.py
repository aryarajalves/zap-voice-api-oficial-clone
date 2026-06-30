import sys
import os

# Adiciona o diretório atual ao path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine
from models import Base
import models.chat  # Garante que as classes do chat sejam carregadas no Base

def run_migration():
    print("⏳ Iniciando criação das tabelas de chat local...")
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Tabelas chat_conversations e chat_messages criadas com sucesso no banco de dados!")
    except Exception as e:
        print(f"❌ Erro ao criar as tabelas de chat: {e}")

if __name__ == "__main__":
    run_migration()
