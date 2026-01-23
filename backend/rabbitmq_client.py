import os
import json
import aio_pika
import asyncio
from dotenv import load_dotenv

load_dotenv()
from core.logger import setup_logger

logger = setup_logger(__name__)

class RabbitMQClient:
    def __init__(self):
        self.connection = None
        self.channel = None

    async def connect(self):
        """Estabelece conexão com o RabbitMQ"""
        if self.connection and not self.connection.is_closed:
            return

        # Busca configurações do banco de dados (prioridade) ou env
        from config_loader import get_setting

        host = get_setting("RABBITMQ_HOST", "localhost")
        port = int(get_setting("RABBITMQ_PORT", "5672"))
        user = get_setting("RABBITMQ_USER", "guest")
        password = get_setting("RABBITMQ_PASSWORD", "guest")
        vhost = get_setting("RABBITMQ_VHOST", "/")
        
        # Determina protocolo (AMQP vs AMQPS) - 5671 = Padrão SSL
        scheme = "amqps" if port == 5671 else "amqp"
        
        # Codifica senha para evitar erro com caracteres especiais no DSN
        from urllib.parse import quote_plus
        encoded_password = quote_plus(password)

        dsn = f"{scheme}://{user}:{encoded_password}@{host}:{port}/{quote_plus(vhost)}"
        
        try:
            logger.info(f"Tentando conectar ao RabbitMQ em {host}:{port} ({scheme})...")
            
            # ssl_context=None usa validação padrão segura se for amqps
            self.connection = await aio_pika.connect_robust(dsn)
            self.channel = await self.connection.channel()
            
            # Declara as filas principais para garantir que existam
            await self.channel.declare_queue("zapvoice_bulk_sends", durable=True)
            await self.channel.declare_queue("zapvoice_funnel_executions", durable=True)
            
            logger.info("Conectado ao RabbitMQ com sucesso!")
        except Exception as e:
            logger.error(f"Erro ao conectar no RabbitMQ: {e}")
            # Não lança erro para não derrubar o app, mas o sistema de fila não funcionará

    async def publish(self, queue_name: str, message: dict):
        """Publica uma mensagem em uma fila específica"""
        if not self.channel or self.connection.is_closed:
            await self.connect()
        
        if self.channel:
            try:
                await self.channel.default_exchange.publish(
                    aio_pika.Message(
                        body=json.dumps(message).encode(),
                        delivery_mode=aio_pika.DeliveryMode.PERSISTENT
                    ),
                    routing_key=queue_name
                )
                logger.debug(f"Mensagem enviada para fila {queue_name}")
                return True
            except Exception as e:
                logger.error(f"Erro ao publicar mensagem na fila {queue_name}: {e}")
                return False
                return False
        return False

    async def publish_event(self, event_type: str, data: dict):
        """Publica um evento para todos os ouvintes (Fanout)"""
        if not self.channel or self.connection.is_closed:
            await self.connect()
            
        if self.channel:
            try:
                # Declara exchange fanout de eventos
                exchange = await self.channel.declare_exchange(
                    "zapvoice_events", aio_pika.ExchangeType.FANOUT
                )
                
                payload = {"event": event_type, "data": data}
                
                await exchange.publish(
                    aio_pika.Message(body=json.dumps(payload).encode()),
                    routing_key="" # Fanout ignora routing key
                )
                return True
            except Exception as e:
                logger.error(f"Erro ao publicar evento: {e}")
                return False

    async def subscribe_events(self, callback):
        """Escuta eventos do sistema (Fanout)"""
        if not self.channel or self.connection.is_closed:
            await self.connect()
            
        if self.channel:
            exchange = await self.channel.declare_exchange(
                "zapvoice_events", aio_pika.ExchangeType.FANOUT
            )
            # Fila temporária exclusiva para este consumidor
            queue = await self.channel.declare_queue(exclusive=True)
            await queue.bind(exchange)
            
            async def wrapper(message: aio_pika.IncomingMessage):
                async with message.process():
                    body = json.loads(message.body.decode())
                    await callback(body)
            
            await queue.consume(wrapper)
            logger.info("Escutando eventos de sistema (Realtime)")

    async def consume(self, queue_name: str, callback, prefetch_count: int = 1):
        """Inicia o consumo de mensagens de uma fila específica"""
        if not self.channel or self.connection.is_closed:
            await self.connect()
            
        if self.channel:
            # Limita quantas mensagens não processadas o worker pega por vez
            await self.channel.set_qos(prefetch_count=prefetch_count)
            
            queue = await self.channel.declare_queue(queue_name, durable=True)
            
            async def wrapper(message: aio_pika.IncomingMessage):
                async with message.process():
                    try:
                        body = json.loads(message.body.decode())
                        await callback(body)
                    except Exception as e:
                        logger.error(f"Erro no processamento da mensagem do RabbitMQ ({queue_name}): {e}")
                        # Se der erro grave, a mensagem é descartada ou vai pra DLQ (configurar depois)

            await queue.consume(wrapper)
            logger.info(f"Consumidor conectado na fila {queue_name} (prefetch: {prefetch_count})")

    async def close(self):
        if self.connection:
            await self.connection.close()

rabbitmq = RabbitMQClient()
