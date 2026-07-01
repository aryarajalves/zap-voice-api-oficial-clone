# Registrar a alteração no esquema
## [2026-06-29] Novas Colunas em chat_conversations
- Adicionadas as colunas `pinned` (BOOLEAN DEFAULT FALSE) e `private_note` (TEXT) à tabela `chat_conversations`.

## [2026-06-29] Nova Coluna em chat_messages
- Adicionada a coluna `meta_data` (JSON/JSONB) à tabela `chat_messages` para armazenar metadados estruturados de templates e disparos.
- Script de Migração: `add_chat_message_meta_data.py` sob a pasta `backend/`.

## [2026-06-29] Nova Coluna em webhook_leads
- Adicionada a coluna `bsud` (VARCHAR/String) à tabela `webhook_leads` para associar o Business-scoped User ID da Meta API Oficial do WhatsApp ao contato.
- Script de Migração: `add_bsud_column.py` sob a pasta `backend/`.

## [2026-06-30] Novas Colunas em chat_messages
- Adicionadas as colunas `agentflow_webhook_status` (VARCHAR) e `agentflow_webhook_error` (VARCHAR) à tabela `chat_messages` para armazenar o status de envio de eventos para o webhook do AgentFlow.
- Script de Migração: `add_agentflow_logs_columns.py` sob a pasta `backend/`.

## [2026-06-30] Nova Coluna em webhook_event_mappings
- Adicionada a coluna `button_actions` (JSON/JSONB) à tabela `webhook_event_mappings` para armazenar as configurações e comportamentos dos botões dos templates.
- Script de Migração: `add_button_actions_to_mappings.py` sob a pasta `backend/scripts/database/`.
