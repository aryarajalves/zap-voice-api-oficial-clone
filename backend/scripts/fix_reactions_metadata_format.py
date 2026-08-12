import os
import sys
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
import models
from sqlalchemy.orm.attributes import flag_modified

def fix_reactions_format():
    db = SessionLocal()
    try:
        print("🛠️ Verificando e corrigindo formato de meta_data.reactions nas mensagens do chat...")
        msgs = db.query(models.ChatMessage).filter(models.ChatMessage.meta_data.isnot(None)).all()
        updated_count = 0

        for m in msgs:
            meta = dict(m.meta_data or {})
            raw_reactions = meta.get("reactions")
            if not raw_reactions:
                continue

            # Se for um dicionário (ex: {"agent": "❤️"} ou {"contact": "❤️"})
            if isinstance(raw_reactions, dict):
                newList = []
                for sender, emoji in raw_reactions.items():
                    if isinstance(emoji, dict):
                        newList.append(emoji)
                    elif isinstance(emoji, str) and emoji:
                        newList.append({"emoji": emoji, "sender": sender})
                meta["reactions"] = newList
                m.meta_data = meta
                flag_modified(m, "meta_data")
                updated_count += 1
            elif isinstance(raw_reactions, list):
                # Garantir que todos os itens da lista sejam dicts com emoji e sender
                fixed_list = []
                for item in raw_reactions:
                    if isinstance(item, dict) and item.get("emoji"):
                        fixed_list.append(item)
                    elif isinstance(item, str) and item:
                        fixed_list.append({"emoji": item, "sender": "contact"})
                if fixed_list != raw_reactions:
                    meta["reactions"] = fixed_list
                    m.meta_data = meta
                    flag_modified(m, "meta_data")
                    updated_count += 1

        db.commit()
        print(f"✅ Sucesso: {updated_count} mensagens tiveram o formato de reações corrigido para array estandardizado!")
    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao atualizar reações: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fix_reactions_format()
