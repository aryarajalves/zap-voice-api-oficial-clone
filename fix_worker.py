
with open('backend/worker.py', 'r', encoding='utf-8') as f:
    content = f.read()

target = '                                            logger.error(f"❌ [AI MEMORY] Error notifying AI Memory: {e_ai}")'
replacement = '''                                            logger.error(f"❌ [AI MEMORY] Error notifying AI Memory: {e_ai}")

                                        # NEW: Trigger Agent Memory Webhook for Templates/Individual too
                                        try:
                                            from services.ai_memory import notify_agent_memory_webhook
                                            tpl_name = None
                                            if message_record.content and "[Template:" in message_record.content:
                                                import re
                                                match = re.search(r"\[Template:\\s*(.*?)\\]", message_record.content)
                                                tpl_name = match.group(1) if match else "Template"

                                            await notify_agent_memory_webhook(
                                                client_id=trigger.client_id,
                                                phone=message_record.phone_number,
                                                name=trigger.contact_name,
                                                template_name=tpl_name or "Mensagem Individual",
                                                content=message_record.content,
                                                trigger_id=trigger.id
                                            )
                                            logger.info(f"🧠 [AGENT MEMORY] Template/Individual delivery queued for {message_record.phone_number}")
                                        except Exception as e_agent:
                                            logger.error(f"❌ [AGENT MEMORY] Error notifying Agent Memory: {e_agent}")'''

if target in content:
    new_content = content.replace(target, replacement)
    with open('backend/worker.py', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Done")
else:
    print("Target not found")
    # Debug: show what was expected vs actual
    print(f"Target length: {len(target)}")
