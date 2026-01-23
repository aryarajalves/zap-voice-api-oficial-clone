
import asyncio
import aio_pika
import os

async def check_rabbit():
    try:
        connection = await aio_pika.connect_robust(
            "amqp://guest:guest@localhost:5672/",
        )
        channel = await connection.channel()
        print("✅ Conectado ao RabbitMQ Local!")
        
        # List queues (tentando declarar para ver se existem)
        q1 = await channel.declare_queue("zapvoice_bulk_sends", passive=False, durable=True)
        q2 = await channel.declare_queue("zapvoice_funnel_executions", passive=False, durable=True)
        
        print(f"📂 Fila 'zapvoice_bulk_sends': OK")
        print(f"📂 Fila 'zapvoice_funnel_executions': OK")
        
        await connection.close()
    except Exception as e:
        print(f"❌ Erro: {e}")

if __name__ == "__main__":
    asyncio.run(check_rabbit())
