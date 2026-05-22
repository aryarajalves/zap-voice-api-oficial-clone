import sys
import os
from sqlalchemy import create_engine, text

# Ajusta para se conectar ao banco interno do container ou local do host
# Usando a variável de ambiente DATABASE_URL se disponível, senão fallback para local
db_url = os.getenv("DATABASE_URL")
if not db_url:
    db_url = "postgresql://postgres:5f90d6ef-f64a-44c7-9d68-b928d50ceb8f@localhost:5435/zapvoice"

print(f"Conectando ao banco de dados: {db_url}")

try:
    engine = create_engine(db_url)
    with engine.connect() as conn:
        # Encontrar mappings com followup_active=True e delay < 1
        query_find = text("""
            SELECT id, integration_id, event_type, followup_delay_value 
            FROM webhook_event_mappings 
            WHERE followup_active = True AND (followup_delay_value IS NULL OR followup_delay_value < 1)
        """)
        results = conn.execute(query_find).fetchall()
        print(f"Encontrados {len(results)} mapeamentos com follow-up ativo e delay inválido (< 1).")
        
        if results:
            for r in results:
                print(f"Corrigindo Mapping ID {r[0]} (Integração {r[1]}, Evento {r[2]}): delay era {r[3]} -> mudando para 1")
            
            # Atualizar
            query_update = text("""
                UPDATE webhook_event_mappings 
                SET followup_delay_value = 1 
                WHERE followup_active = True AND (followup_delay_value IS NULL OR followup_delay_value < 1)
            """)
            res = conn.execute(query_update)
            conn.commit()
            print("Correção realizada com sucesso no banco de dados!")
        else:
            print("Nenhum registro inválido encontrado. O banco de dados está íntegro!")
            
except Exception as e:
    print(f"Erro ao executar script de correção: {e}")
    sys.exit(1)
