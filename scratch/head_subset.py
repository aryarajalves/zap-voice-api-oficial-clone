                contacts_map = {c.get("wa_id"): c.get("profile", {}).get("name") for c in value.get("contacts", [])}
                
                for msg in value.get("messages", []):
                    raw_from = msg.get("from")
                    from_phone = normalize_phone_inbound(raw_from)
                    msg_id = msg.get("id")
                    
                    db_lock_key = f"inbound_{from_phone}"
                    # Lock não-bloqueante para evitar travar o event loop do worker
                    if db.bind.dialect.name == 'postgresql':
                        while True:
                            locked = db.execute(text("SELECT pg_try_advisory_xact_lock(hashtext(:key))"), {"key": db_lock_key}).scalar()
                            if locked: break
                            await asyncio.sleep(0.05)
                    
                    try:
                        db.expire_all()
                        
                        # Cancelar follow-ups pendentes devido a interacao detectada no WhatsApp
                        from services.triggers_service import cancel_pending_followups_for_phone
                        cancel_pending_followups_for_phone(db, from_phone)
                        
                        mem_lock_key = f"mem_lock_{from_phone}_{msg_id}"
                        now = datetime.now(timezone.utc)
                        if mem_lock_key in GLOBAL_PROCESSING_LOCKS:
                            if now - GLOBAL_PROCESSING_LOCKS[mem_lock_key] < timedelta(seconds=10):
                                logger.warning(f"🚫 [MEM_LOCK] Ignorando mensagem repetida {msg_id}")
                                continue
                        GLOBAL_PROCESSING_LOCKS[mem_lock_key] = now

