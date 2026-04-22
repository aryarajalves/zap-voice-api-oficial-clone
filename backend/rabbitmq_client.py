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
        """Estabelece conexão com o RabbitMQ com Retry Infinito"""
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
        
        while True:
            try:
                logger.info(f"Tentando conectar ao RabbitMQ em {host}:{port} ({scheme})...")
                
                # ssl_context=None usa validação padrão segura se for amqps
                self.connection = await asyncio.wait_for(
                    aio_pika.connect_robust(dsn),
                    timeout=10.0
                )
                self.channel = await self.connection.channel()
                
                # 1. Declara Exchanges Principais
                await self.channel.declare_exchange(
                    "zapvoice_events", aio_pika.ExchangeType.FANOUT
                )
                
                # 2. Declara as filas principais para garantir que todas existam
                REQUIRED_QUEUES = [
                    "zapvoice_bulk_sends",
                    "zapvoice_funnel_executions",
                    "chatwoot_private_messages",
                    "n8n_delivery_notifications",
                    "ai_memory_queue",
                    "agent_memory_webhook_queue",
                    "whatsapp_events",
                    "zapvoice_external_delivery"
                ]
                
                for queue_name in REQUIRED_QUEUES:
                    await self.channel.declare_queue(queue_name, durable=True)
                
                logger.info("✅ Conectado ao RabbitMQ e infraestrutura (filas/exchanges) validada!")
                return # Sai do loop se conectar
            except Exception as e:
                logger.error(f"❌ Erro ao conectar no RabbitMQ: {e}. Tentando novamente em 5s...")
                await asyncio.sleep(5)

    async def publish(self, queue_name: str, message: dict):
        """Publica uma mensagem em uma fila específica"""
        if not self.channel or self.connection is None or self.connection.is_closed:
            await self.connect()
        
        # Se falhou ao conectar, tenta uma última vez forçada
        if not self.channel:
            logger.warning("Canal não disponível, tentando reconexão forçada...")
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
                logger.info(f"📤 Mensagem enviada para fila: {queue_name}")
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

    async def consume(
        self,
        queue_name: str,
        callback,
        prefetch_count: int = 1,
        requeue_on_error: bool = False,
        max_retries: int = 100,
    ):
        """Inicia o consumo de mensagens de uma fila específica.

        requeue_on_error=True: se o callback levantar exceção, a mensagem é
        republicada com backoff exponencial (10s → 20s → 40s → 60s cap) e
        um contador de tentativas no header 'x-retry-count'.
        Após max_retries tentativas, a mensagem é descartada com log de erro.

        Isso garante que mensagens críticas (ex: notas privadas) fiquem no
        RabbitMQ até o sistema externo (ex: Chatwoot) voltar a responder.
        """
        if not self.channel or self.connection.is_closed:
            await self.connect()

        if self.channel:
            await self.channel.set_qos(prefetch_count=prefetch_count)
            queue = await self.channel.declare_queue(queue_name, durable=True)

            async def wrapper(message: aio_pika.IncomingMessage):
                logger.debug(f"📥 [RABBITMQ] Recebida mensagem bruta da fila '{queue_name}'")
                # Sempre usamos requeue=False — o requeue manual via republish dá
                # controle total sobre backoff e limite de tentativas.
                async with message.process(requeue=False):
                    body = message.body.decode()
                    logger.debug(f"📥 [RABBITMQ] Body decodificado: {body[:100]}...")
                    data = json.loads(body)

                    logger.info(f"⚙️ [RABBITMQ] Acionando callback para fila '{queue_name}'")
                    try:
                        if asyncio.iscoroutinefunction(callback):
                            await callback(data)
                        else:
                            callback(data)
                    except Exception as e:
                        if not requeue_on_error:
                            raise

                        # Lê o contador de tentativas do header da mensagem
                        headers = message.headers or {}
                        retry_count = int(headers.get("x-retry-count", 0))

                        if retry_count >= max_retries:
                            logger.error(
                                f"❌ [{queue_name}] Mensagem descartada após {max_retries} tentativas. "
                                f"Phone: {data.get('phone', 'N/A')} | Erro: {e}"
                            )
                            return  # ACK e descarta (não republica)

                        # Backoff exponencial: 10s, 20s, 40s, 60s (cap)
                        delay = min(60, 10 * (2 ** min(retry_count, 3)))
                        logger.warning(
                            f"⚠️ [{queue_name}] Falha na tentativa {retry_count + 1}/{max_retries}. "
                            f"Reenfileirando em {delay}s. Phone: {data.get('phone', 'N/A')} | Erro: {e}"
                        )
                        await asyncio.sleep(delay)

                        # Republica com contador incrementado — persiste no RabbitMQ
                        await self.channel.default_exchange.publish(
                            aio_pika.Message(
                                body=message.body,
                                headers={"x-retry-count": retry_count + 1},
                                delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
                            ),
                            routing_key=queue_name,
                        )

            await queue.consume(wrapper)
            logger.info(f"Consumidor conectado na fila {queue_name} (prefetch: {prefetch_count})")

    async def close(self):
        if self.connection:
            await self.connection.close()

rabbitmq = RabbitMQClient()
