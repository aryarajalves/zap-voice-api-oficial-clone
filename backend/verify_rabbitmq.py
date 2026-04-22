
import asyncio
import os
import sys

# Adiciona o diretório atual ao sys.path para importar os módulos do backend
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(backend_dir)

from rabbitmq_client import rabbitmq

async def verify():
    print("🔍 Iniciando verificação do RabbitMQ...")
    try:
        # Tenta conectar. O connect() agora declara todas as filas e exchanges.
        await rabbitmq.connect()
        print("✅ Conexão e declaração de infraestrutura concluídas com sucesso!")
        
        # Opcional: listar o que foi declarado (apenas log visual)
        # Note: aio-pika não tem um método simples para listar filas sem permissões de admin da API HTTP
        # mas o fato de não dar erro já prova a idempotência e conexão.
        
        await rabbitmq.close()
        print("👋 Conexão fechada.")
    except Exception as e:
        print(f"❌ Erro durante a verificação: {e}")

if __name__ == "__main__":
    asyncio.run(verify())
