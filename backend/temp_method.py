
    async def is_within_24h_window(self, conversation_id: int) -> bool:
        """
        Verifica se a conversa está dentro da janela de 24 horas do WhatsApp.
        Regra: Última mensagem do tipo INCOMING (do usuário) deve ter ocorrido há menos de 24h.
        """
        if not self.api_token:
            return False # Mock conservative

        async with httpx.AsyncClient() as client:
            try:
                # Buscar mensagens da conversa
                # Chatwoot retorna paginado, mas queremos as mais recentes.
                # Geralmente a API retorna as últimas.
                response = await client.get(
                    f"{self.base_url}/conversations/{conversation_id}/messages",
                    headers=self.headers
                )
                
                if response.status_code != 200:
                    logger.error(f"Erro ao verificar janela 24h: {response.status_code}")
                    return False

                messages = response.json().get("payload", [])
                
                if not messages:
                    return False

                # Iterar de trás para frente (mais recentes primeiro) para achar a última INCOMING
                # message_type 0 = Incoming, 1 = Outgoing
                last_incoming_time = None
                
                # Chatwoot messages are usually predictable, but let's sort to be sure if API changes
                # But implementation usually returns sorted. We traverse reversed.
                for msg in reversed(messages):
                    if msg.get("message_type") == 0: # Incoming
                        created_at = msg.get("created_at")
                        if created_at:
                            last_incoming_time = datetime.fromtimestamp(created_at, tz=timezone.utc)
                        break
                
                if not last_incoming_time:
                    return False
                
                # Verificar diferença de tempo
                now = datetime.now(timezone.utc)
                diff = now - last_incoming_time
                
                is_open = diff < timedelta(hours=24)
                logger.info(f"🕒 24h Window Check | Conv: {conversation_id} | Last Incoming: {last_incoming_time} | Diff: {diff} | Open: {is_open}")
                
                return is_open

            except Exception as e:
                logger.error(f"Erro exception verificação 24h: {e}")
                return False
