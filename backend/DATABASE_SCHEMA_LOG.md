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

## [2026-08-19] Indexação de 18 Chaves Estrangeiras (Foreign Keys) - Melhoria 1
- Criados 18 índices B-Tree para eliminar Sequential Scans em JOINs e evitar table locks em cascata:
  - `idx_fk_users_client_id` em `users(client_id)`
  - `idx_fk_scheduled_triggers_funnel_id` em `scheduled_triggers(funnel_id)`
  - `idx_fk_recurring_triggers_funnel_id` em `recurring_triggers(funnel_id)`
  - `idx_fk_chat_messages_user_id` em `chat_messages(user_id)`
  - `idx_fk_api_keys_user_id` em `api_keys(user_id)`
  - `idx_fk_user_clients_client_id` em `user_clients(client_id)`
  - `idx_fk_invitation_clients_client_id` em `invitation_clients(client_id)`
  - `idx_fk_user_invitations_created_by_id` em `user_invitations(created_by_id)`
  - `idx_fk_webhook_configs_funnel_id` em `webhook_configs(funnel_id)`
  - `idx_fk_webhook_event_mappings_funnel_id` em `webhook_event_mappings(funnel_id)`
  - `idx_fk_webhook_leads_imported_by` em `webhook_leads(imported_by_client_id)`
  - `idx_fk_instagram_automations_funnel_id` em `instagram_automations(funnel_id)`
  - `idx_fk_contact_import_history_project_id` em `contact_import_history(project_id)`
  - `idx_fk_clients_project_id` em `clients(project_id)`
  - `idx_fk_email_dispatches_template_id` em `email_dispatches(template_id)`
  - `idx_fk_email_inbounds_dispatch_id` em `email_inbounds(dispatch_id)`
  - `idx_fk_email_inbounds_lead_id` em `email_inbounds(lead_id)`
  - `idx_fk_contact_template_history_trigger_id` em `contact_template_history(trigger_id)`
- Migração Alembic: `0006_add_missing_fk_indexes.py` sob a pasta `backend/alembic_migrations/versions/`.
- Script de Migração: `add_missing_fk_indexes.py` sob a pasta `backend/scripts/`.

## [2026-08-19] Índices Compostos de Alto Tráfego - Melhoria 2
- Criados 8 índices compostos B-Tree de alta performance para acelerar consultas frequentes, métricas e listagens:
  - `idx_message_status_phone_time` em `message_status (phone_number, timestamp DESC)`
  - `idx_message_status_trigger_status` em `message_status (trigger_id, status)`
  - `idx_contact_windows_client_phone` em `contact_windows (client_id, phone)`
  - `idx_contact_windows_client_last_interaction` em `contact_windows (client_id, last_interaction_at DESC)`
  - `idx_template_cache_client_name_lang` em `whatsapp_template_cache (client_id, name, language)`
  - `idx_template_cache_client_pinned_name` em `whatsapp_template_cache (client_id, is_pinned DESC, name ASC)`
  - `idx_chat_convo_client_unread_last` em `chat_conversations (client_id, unread_count DESC, last_message_at DESC NULLS LAST)`
  - `idx_contatos_monitorados_inbox_time` em `contatos_monitorados (inbox_id, last_interaction_at DESC NULLS LAST)`
- Migração Alembic: `0007_add_high_traffic_composite_indexes.py` sob a pasta `backend/alembic_migrations/versions/`.
- Script de Migração: `add_high_traffic_composite_indexes.py` sob a pasta `backend/scripts/`.

## [2026-08-19] Migração Completa de JSON para JSONB - Melhoria 3
- Convertidas 24 colunas de 12 tabelas do formato `json` legado (texto) para `jsonb` binário otimizado.
- Criados índices GIN:
  - `idx_chat_conversations_labels_gin` em `chat_conversations USING gin (labels)`
  - `idx_chat_messages_metadata_gin` em `chat_messages USING gin (meta_data)`
- Migração Alembic: `0008_migrate_json_to_jsonb.py` sob a pasta `backend/alembic_migrations/versions/`.
- Script de Migração: `migrate_json_to_jsonb.py` sob a pasta `backend/scripts/`.

## [2026-08-19] Políticas de Retenção e Expurgos Automáticos (Data Purge) - Melhoria 4
- Implementadas rotinas de expurgo em lotes (`LIMIT 1000`) para manter o banco leve sem travamento de tabelas:
  - `run_waba_payment_checks_purge`: Expurga `waba_payment_checks` com mais de `WABA_CHECK_RETENTION_DAYS` (padrão 30 dias).
  - `run_webhook_events_purge`: Expurga eventos processados de `webhook_events` com mais de `WEBHOOK_EVENT_RETENTION_DAYS` (padrão 15 dias).
  - `run_old_message_status_purge`: Expurga `message_status` antigas com mais de `MESSAGE_STATUS_RETENTION_DAYS` (padrão 90 dias).
- Script de Execução: `purge_old_database_records.py` sob a pasta `backend/scripts/`.
- Módulo Scheduler: Atualizado em `services/scheduler/cleanup_tasks.py` e `services/scheduler/__init__.py`.

## [2026-08-19] Ajuste Fino de Autovacuum - Melhoria 5
- Configurados parâmetros agressivos de limpeza automática em 6 tabelas de alta escrita (`message_status`, `webhook_events`, `chat_messages`, `scheduled_triggers`, `contact_windows`, `waba_payment_checks`):
  - `autovacuum_vacuum_scale_factor = 0.05` (5% de linhas mortas)
  - `autovacuum_vacuum_threshold = 50`
  - `autovacuum_analyze_scale_factor = 0.02` (2% de alterações)
  - `autovacuum_analyze_threshold = 25`
- Migração Alembic: `0009_tune_autovacuum_settings.py` sob a pasta `backend/alembic_migrations/versions/`.
- Script de Migração: `tune_autovacuum_settings.py` sob a pasta `backend/scripts/`.
