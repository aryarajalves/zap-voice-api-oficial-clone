from fastapi import WebSocket
from typing import List, Optional, Dict, Any
import json
import asyncio
from core.logger import logger

class ConnectionManager:
    def __init__(self):
        # socket -> metadata (dict with client_id, user_id, email, role, accessible_client_ids)
        self.active_connections: dict[WebSocket, dict] = {}

    async def connect(self, websocket: WebSocket, metadata: Optional[dict] = None):
        await websocket.accept()
        initial_meta = {"client_id": None, "user_id": None, "role": None, "accessible_client_ids": None}
        if metadata:
            initial_meta.update(metadata)
        self.active_connections[websocket] = initial_meta
        logger.info(f"🔌 [WS] WebSocket conectado ({initial_meta.get('email', 'anon')}). Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            meta = self.active_connections.pop(websocket, {})
            logger.info(f"🔌 [WS] WebSocket desconectado ({meta.get('email', 'anon')}). Total: {len(self.active_connections)}")

    async def update_metadata(self, websocket: WebSocket, metadata: dict):
        """Atualiza informações da conexão (ex: qual cliente está visualizando)"""
        if websocket in self.active_connections:
            self.active_connections[websocket].update(metadata)

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Envia mensagem para uma única conexão específica"""
        payload = json.dumps(message)
        await websocket.send_text(payload)

    async def broadcast_to_client(self, client_id: int, message: dict):
        """
        Envia mensagem exclusivamente para conexões autenticadas e associadas ao client_id informado
        (ou conexões de super_admin).
        """
        if not self.active_connections or client_id is None:
            return

        payload = json.dumps(message)
        tasks = []
        for connection, meta in list(self.active_connections.items()):
            conn_client_id = meta.get("client_id")
            conn_role = meta.get("role")
            
            # Entrega para quem está com o client_id ativo ou super admin
            if conn_client_id == client_id or conn_role == "super_admin":
                tasks.append(self._safe_send(connection, payload))

        if tasks:
            await asyncio.gather(*tasks)

    async def broadcast(self, message: dict):
        """
        Envia uma mensagem JSON para clientes conectados.
        Se a mensagem contiver 'client_id' (no topo ou em 'data'), isola o envio para aquele tenant.
        Se for global (sem client_id), envia para todos os clientes conectados.
        """
        if not self.active_connections:
            return

        # Tenta extrair client_id do payload para isolar por tenant
        target_client_id = message.get("client_id")
        if target_client_id is None and isinstance(message.get("data"), dict):
            target_client_id = message.get("data", {}).get("client_id")

        if target_client_id is not None:
            try:
                target_client_id = int(target_client_id)
                await self.broadcast_to_client(target_client_id, message)
                return
            except (ValueError, TypeError):
                pass

        payload = json.dumps(message)
        
        # Envio global para mensagens sem client_id
        tasks = []
        for connection in list(self.active_connections.keys()):
            tasks.append(self._safe_send(connection, payload))
        
        if tasks:
            await asyncio.gather(*tasks)

    async def _safe_send(self, websocket: WebSocket, payload: str):
        """Envia mensagem de forma segura e remove conexão se falhar"""
        try:
            # Timeout de 2s para evitar que um cliente lento trave o servidor
            await asyncio.wait_for(websocket.send_text(payload), timeout=2.0)
        except Exception as e:
            logger.warning(f"⚠️ [WS] Erro ao enviar WS (cliente caiu ou lento): {e}")
            self.disconnect(websocket)

manager = ConnectionManager()

