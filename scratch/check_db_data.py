import sys
import os
from sqlalchemy import create_engine, text
import json

DATABASE_URL = "postgresql://postgres:5f90d6ef-f64a-44c7-9d68-b928d50ceb8f@localhost:5435/zapvoice"

def main():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        res_funnels = conn.execute(text("SELECT id, name, client_id, steps FROM funnels")).fetchall()
        print(f"=== DETALHES DOS FUNIS ({len(res_funnels)}) ===")
        for f in res_funnels:
            f_id, name, client_id, steps = f
            print(f"\nFunil ID: {f_id} | Nome: {name} | Client ID: {client_id}")
            if steps:
                try:
                    if isinstance(steps, str):
                        steps_data = json.loads(steps)
                    else:
                        steps_data = steps
                    
                    if isinstance(steps_data, dict):
                        has_nodes = "nodes" in steps_data
                        has_edges = "edges" in steps_data
                        nodes_count = len(steps_data.get("nodes", [])) if has_nodes else 0
                        edges_count = len(steps_data.get("edges", [])) if has_edges else 0
                        print(f"  Tipo: Flow Builder (Nodes: {nodes_count}, Edges: {edges_count})")
                    else:
                        print(f"  Tipo: Legado / Lista (Tamanho: {len(steps_data)})")
                except Exception as e:
                    print(f"  Erro ao decodificar steps: {e}")
            else:
                print("  Sem passos configurados (None)")

if __name__ == "__main__":
    main()
