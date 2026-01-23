from fastapi import WebSocket
from typing import List
import json

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"🔌 WebSocket conectado. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(f"🔌 WebSocket desconectado. Total: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        """Envia uma mensagem JSON para TODOS os clientes conectados"""
        if not self.active_connections:
            return
            
        payload = json.dumps(message)
        to_remove = []
        
        for connection in self.active_connections:
            try:
                await connection.send_text(payload)
            except Exception as e:
                print(f"⚠️ Erro ao enviar WS (cliente caiu?): {e}")
                to_remove.append(connection)
        
        # Limpa conexões mortas
        for dead in to_remove:
            self.disconnect(dead)

manager = ConnectionManager()
