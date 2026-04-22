from fastapi import WebSocket
from typing import List
import json
import asyncio
from core.logger import logger

class ConnectionManager:
    def __init__(self):
        # socket -> metadata (dict with client_id, user_role, etc)
        self.active_connections: dict[WebSocket, dict] = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[websocket] = {"client_id": None, "role": None}
        logger.info(f" WebSocket conectado. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            del self.active_connections[websocket]
            logger.info(f" WebSocket desconectado. Total: {len(self.active_connections)}")

    async def update_metadata(self, websocket: WebSocket, metadata: dict):
        """Atualiza informações da conexão (ex: qual cliente está visualizando)"""
        if websocket in self.active_connections:
            self.active_connections[websocket].update(metadata)

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Envia mensagem para uma única conexão específica"""
        payload = json.dumps(message)
        await websocket.send_text(payload)

    async def broadcast(self, message: dict):
        """Envia uma mensagem JSON para TODOS os clientes conectados de forma não-bloqueante"""
        if not self.active_connections:
            return
            
        payload = json.dumps(message)
        
        # Cria tarefas para enviar para todos simultaneamente
        tasks = []
        for connection in list(self.active_connections.keys()):
            tasks.append(self._safe_send(connection, payload))
        
        if tasks:
            await asyncio.gather(*tasks)

    async def _safe_send(self, websocket: WebSocket, payload: str):
        """Envia mensagem de forma segura e remove conexão se falhar"""
        try:
            # Timeout de 2s para evitar que um cliente lento trave a resposta do Webhook
            await asyncio.wait_for(websocket.send_text(payload), timeout=2.0)
        except Exception as e:
            logger.warning(f"⚠️ Erro ao enviar WS (cliente caiu ou lento): {e}")
            self.disconnect(websocket)

manager = ConnectionManager()
