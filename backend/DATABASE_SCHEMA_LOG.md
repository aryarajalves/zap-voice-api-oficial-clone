# Registrar a alteração no esquema
## [2026-06-29] Novas Colunas em chat_conversations
- Adicionadas as colunas `pinned` (BOOLEAN DEFAULT FALSE) e `private_note` (TEXT) à tabela `chat_conversations`.

## [2026-06-29] Nova Coluna em chat_messages
- Adicionada a coluna `meta_data` (JSON/JSONB) à tabela `chat_messages` para armazenar metadados estruturados de templates e disparos.
- Script de Migração: `add_chat_message_meta_data.py` sob a pasta `backend/`.

## [2026-06-29] Nova Coluna em webhook_leads
- Adicionada a coluna `bsud` (VARCHAR/String) à tabela `webhook_leads` para associar o Business-scoped User ID da Meta API Oficial do WhatsApp ao contato.
- Script de Migração: `add_bsud_column.py` sob a pasta `backend/`.
