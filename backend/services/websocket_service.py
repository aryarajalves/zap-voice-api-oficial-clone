import json
from fastapi import WebSocket
from websocket_manager import manager
from core.logger import logger

async def handle_websocket_connection(websocket: WebSocket, token: str = None):
    """
    Controla o ciclo de vida da conexão WebSocket:
    Autenticação JWT, mapeamento de permissões multi-tenant e subscrição de eventos.
    """
    from jose import jwt, JWTError
    from core.security import SECRET_KEY, ALGORITHM
    from database import SessionLocal
    import models

    if not token:
        await websocket.close(code=4001)
        return

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if not email:
            await websocket.close(code=4001)
            return
    except JWTError:
        await websocket.close(code=4001)
        return

    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.email == email, models.User.is_active == True).first()
        if not user:
            await websocket.close(code=4001)
            return

        is_super_admin = user.role == "super_admin"
        allowed_ids = {c.id for c in (user.accessible_clients or [])}
        if getattr(user, "client_id", None):
            allowed_ids.add(user.client_id)

        meta = {
            "user_id": user.id,
            "email": user.email,
            "role": user.role,
            "accessible_client_ids": allowed_ids if not is_super_admin else None,
            "client_id": None
        }
    finally:
        db.close()

    origin = websocket.headers.get("origin")
    logger.info(f"🔌 [WS] Conexão WS autenticada ({user.email}) de origin: {origin}")
    await manager.connect(websocket, metadata=meta)

    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                if message.get("event") == "subscribe_client":
                    raw_client_id = message.get("client_id")
                    if raw_client_id is not None:
                        try:
                            req_client_id = int(raw_client_id)
                        except (ValueError, TypeError):
                            await manager.send_personal_message({
                                "event": "error",
                                "detail": "Client ID inválido"
                            }, websocket)
                            continue

                        # Validação de isolamento multi-tenant
                        if not is_super_admin and req_client_id not in allowed_ids:
                            logger.warning(f"⚠️ [WS] Usuário {user.email} tentou assinar client_id={req_client_id} não autorizado.")
                            await manager.send_personal_message({
                                "event": "error",
                                "detail": "Acesso negado ao cliente solicitado."
                            }, websocket)
                            continue

                        await manager.update_metadata(websocket, {"client_id": req_client_id})
                        logger.info(f"👤 [WS] Cliente {req_client_id} assinado na conexão WS de {user.email}.")
                        
                        # Envia resposta imediata para não deixar a tela carregando
                        from services.monitor import SystemMonitor
                        stats = await SystemMonitor.collect_all(client_id=req_client_id)
                        await manager.send_personal_message({
                            "event": "system_stats",
                            "data": stats
                        }, websocket)
            except Exception as e:
                logger.error(f"Erro ao processar mensagem WS: {e}")
    except Exception as e:
        logger.info(f"🔌 Conexão WS encerrada: {str(e)}")
        manager.disconnect(websocket)
