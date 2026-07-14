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

## [2026-07-08] Alteração de Chave Primária em whatsapp_template_cache
- Alterada a chave primária da tabela `whatsapp_template_cache` para ser uma chave composta por `(id, client_id)` para isolar templates de diferentes inquilinos compartilhando a mesma conta da Meta.
- Script de Migração: `migrate_template_cache_pk.py` sob a pasta `backend/scripts/`.

## [2026-07-08] Nova Coluna em whatsapp_template_cache
- Adicionado mapeamento e coluna `category` (VARCHAR/String) na tabela `whatsapp_template_cache` para armazenar de forma persistente e isolada as categorias reais (marketing/utility) dos templates.
- Script de Migração: `add_category_column.py` sob a pasta `backend/scripts/`.

## [2026-07-09] Novo Índice Composto em chat_messages
- Adicionado índice composto `idx_chat_messages_convo_time` na tabela `chat_messages` sobre as colunas `(conversation_id, timestamp)` para otimizar a paginação de mensagens de conversas ativas.
- Script de Migração: `add_composite_chat_index.py` sob a pasta `backend/`.

## [2026-07-14] Novas Colunas na Tabela de Contatos Monitorados
- Adicionadas as colunas `google_meet_link` (TEXT) e `meeting_at` (TIMESTAMP WITH TIME ZONE) à tabela dinâmica de contatos (`contatos_monitorados` ou `SYNC_CONTACTS_TABLE`).
- Estas colunas permitem associar reuniões do Google Meet aos contatos monitorados via o endpoint `POST /api/contacts/{phone}/update`.
- A migração é aplicada automaticamente pelo `sync_contact_to_custom_table()` (com `ADD COLUMN IF NOT EXISTS`) e pelo router `contacts_public`.
- Script de Migração Manual: `add_meeting_columns_to_contacts.py` sob a pasta `backend/`.

