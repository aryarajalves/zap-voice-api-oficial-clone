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

## [2026-08-17] Nova Tabela quick_messages
- Criada a tabela `quick_messages` com colunas `id` (PK), `client_id` (FK clients.id), `shortcut` (VARCHAR), `title` (VARCHAR), `content` (TEXT), `created_at` e `updated_at` com índice composto `idx_quick_messages_client_shortcut`.
- Permite o cadastro e utilização de Respostas Rápidas / Mensagens Automáticas com o gatilho `/` no chat de atendimento.
- Script de Migração: `create_quick_messages_table.py` sob a pasta `backend/scripts/`.

## [2026-08-17] Nova Coluna metadata (JSONB) e Índices GIN em webhook_leads
- Adicionada a coluna `metadata` (JSON/JSONB DEFAULT '{}') na tabela `webhook_leads` para armazenamento de dados flexíveis e payloads de integrações.
- Criados índices GIN (`idx_leads_metadata_gin`, `idx_leads_variables_gin`, `idx_webhook_history_payload_gin`, `idx_webhook_history_processed_data_gin`, `idx_scheduled_triggers_processed_data_gin`) para consultas sub-milissegundo em campos JSONB.
- Script de Migração: `add_metadata_jsonb_to_leads.py` sob a pasta `backend/scripts/`.

## [2026-08-17] Novos Índices Compostos de Alta Performance (Fase 4 Roadmap PostgreSQL)
- Criados índices compostos B-Tree para eliminar full-table scans e acelerar queries de workers e dashboards:
  - `ix_scheduled_triggers_client_status_time` em `scheduled_triggers (client_id, status, scheduled_time)`
  - `ix_scheduled_triggers_client_created` em `scheduled_triggers (client_id, created_at)`
  - `ix_scheduled_triggers_client_is_bulk` em `scheduled_triggers (client_id, is_bulk)`
  - `ix_webhook_leads_client_phone` em `webhook_leads (client_id, phone)`
  - `ix_webhook_leads_project_phone` em `webhook_leads (project_id, phone)`
  - `ix_webhook_leads_client_last_event_at` em `webhook_leads (client_id, last_event_at)`
  - `ix_webhook_integrations_client_status` em `webhook_integrations (client_id, status)`
  - `ix_webhook_history_integration_created` em `webhook_history (integration_id, created_at)`
  - `ix_webhook_history_integration_status` em `webhook_history (integration_id, status)`
  - `ix_webhook_events_webhook_status` em `webhook_events (webhook_id, status)`
  - `ix_webhook_events_webhook_external` em `webhook_events (webhook_id, external_id)`
- Migração Alembic: `0002_perf_indexes.py` sob a pasta `backend/alembic_migrations/versions/`.
- Script de Migração: `add_composite_performance_indexes.py` sob a pasta `backend/scripts/`.

## [2026-08-17] Nova Tabela Particionada dispatch_logs (Fase 4 Roadmap PostgreSQL)
- Criada a tabela mestre particionada `dispatch_logs` (`PARTITION BY RANGE (created_at)`) e partições mensais automáticas (`dispatch_logs_2026_08`, `dispatch_logs_2026_09`, `dispatch_logs_2026_10` e `dispatch_logs_default`).
- Índices: `ix_dispatch_logs_client_created`, `ix_dispatch_logs_status_created`, `ix_dispatch_logs_trigger_created`.
- Migração Alembic: `0003_dispatch_logs.py` sob a pasta `backend/alembic_migrations/versions/`.
- Script de Migração: `create_partitioned_dispatch_logs.py` sob a pasta `backend/scripts/`.

## [2026-08-17] Extensão pg_trgm e Índices Trigram GIN (Fase 5 Roadmap PostgreSQL)
- Habilitada a extensão PostgreSQL `pg_trgm` para busca rápida por texto difuso (*fuzzy search*) e substrings com wildcard (`ILIKE '%termo%'`).
- Criados índices Trigram GIN (`gin_trgm_ops`):
  - `trgm_idx_leads_name` em `webhook_leads (name)`
  - `trgm_idx_leads_phone` em `webhook_leads (phone)`
  - `trgm_idx_leads_email` em `webhook_leads (email)`
  - `trgm_idx_chat_messages_content` em `chat_messages (content)`
  - `trgm_idx_chat_conversations_name` em `chat_conversations (contact_name)`
  - `trgm_idx_chat_conversations_phone` em `chat_conversations (phone)`
- Migração Alembic: `0004_add_trigram_indexes.py` sob a pasta `backend/alembic_migrations/versions/`.
- Script de Migração: `enable_pg_trgm_and_indexes.py` sob a pasta `backend/scripts/`.

## [2026-08-17] Triggers de Realtime LISTEN / NOTIFY (Fase 6 Roadmap PostgreSQL)
- Criada a função PL/pgSQL `notify_zapvoice_event()` e canal pub/sub `zapvoice_realtime_events`.
- Triggers ativados:
  - `trg_realtime_webhook_leads` em `webhook_leads` (AFTER INSERT OR UPDATE)
  - `trg_realtime_chat_messages` em `chat_messages` (AFTER INSERT)
  - `trg_realtime_scheduled_triggers` em `scheduled_triggers` (AFTER UPDATE OF status)
- Migração Alembic: `0005_add_pg_listen_notify_triggers.py` sob a pasta `backend/alembic_migrations/versions/`.
- Script de Migração: `setup_postgres_listen_notify.py` sob a pasta `backend/scripts/`.
