# 🚀 Plano de Otimização e Performance de Banco de Dados (PostgreSQL)

Este documento organiza o cronograma prático de melhorias de banco de dados e arquitetura para transformar a performance, resiliência e escalabilidade do projeto ZapVoice.

---

## 🎯 Visão Geral das Etapas

| Fase | Funcionalidade | Recurso PostgreSQL | Impacto no Sistema |
| :--- | :--- | :--- | :--- |
| **Fase 1** | **Fila Atômica de Disparos** | `FOR UPDATE SKIP LOCKED` | Evita disparos duplicados e permite múltiplos workers em paralelo sem conflito. |
| **Fase 2** | **Metadados Flexíveis de Leads** | `JSONB` + Índices `GIN` | Armazenamento dinâmico de tags, payloads de webhooks e variáveis sem quebrar o schema. |
| **Fase 3** | **Migrações Automatizadas** | **Alembic** | Versionamento profissional de banco de dados, eliminando scripts manuais de `ALTER TABLE`. |
| **Fase 4** | **Auditoria e Logs de Disparos** | Particionamento (`PARTITION BY RANGE`) | Consultas de relatórios ultra-rápidas e expurgo de logs antigos sem travar o banco. |
| **Fase 5** | **Busca Instantânea de Leads/Mensagens** | Full-Text Search / `pg_trgm` | Busca difusa (fuzzy search) de alta velocidade por nome, telefone e conteúdo de mensagens. |
| **Fase 6** | **Eventos em Tempo Real** | `LISTEN / NOTIFY` | Notificações push em tempo real para o backend/frontend, reduzindo requisições de polling. |

---

## 📋 Detalhamento das Tarefas de Execução

### 🔹 Fase 1: Fila Atômica de Disparos (`FOR UPDATE SKIP LOCKED`) [CONCLUÍDO]
- [x] Ajustar modelo de fila de mensagens agendadas e proteção em `ScheduledTrigger`, `RecurringTrigger` e `EmailDispatch`.
- [x] Implementar a função de consumo com `with_for_update(skip_locked=True)` no SQLAlchemy para Scheduler, Webhook Retry Worker e E-mail Processor.
- [x] Configurar suporte de workers desacoplados com trava em transação atômica (`with_for_update(skip_locked=True)`) e advisory lock (`pg_try_advisory_xact_lock`).
- [x] Criar testes unitários simulando concorrência multi-worker (`test_postgres_phase1_concurrency.py`).

---

### 🔹 Fase 2: Metadados Flexíveis de Leads (`JSONB` + Índices `GIN`) [CONCLUÍDO]
- [x] Adicionar coluna `metadata` do tipo `JSONB` no modelo `WebhookLead` para armazenamento flexível de metadados.
- [x] Criar índices `GIN` nas colunas de metadados e variáveis para consultas instantâneas por chave/valor no PostgreSQL (`idx_leads_metadata_gin`, `idx_leads_variables_gin`).
- [x] Atualizar handlers e serviço de leads (`services/leads.py`) para persistir o payload original e campos extras sem necessidade de novas colunas.
- [x] Criar testes unitários para busca e persistência de dados em `JSONB` (`test_postgres_phase2_jsonb.py`).

---

### 🔹 Fase 3: Migrações Automatizadas com Alembic [CONCLUÍDO]
- [x] Inicializar o ambiente Alembic na pasta `backend/` (`alembic.ini` e `alembic_migrations/`).
- [x] Configurar `alembic_migrations/env.py` para carregar os modelos do SQLAlchemy e a URL do banco a partir das variáveis de ambiente (`DATABASE_URL`).
- [x] Gerar a migração inicial consolidada (`0001_initial_baseline.py`).
- [x] Atualizar o fluxo de deploy e inicialização dos containers para rodar `alembic upgrade head` automaticamente via `update_schema.py`.
- [x] Criar testes unitários para o runner e arquivos de migração do Alembic (`test_postgres_phase3_alembic.py`).

---

### 🔹 Fase 4: Auditoria e Particionamento de Logs (`PARTITION BY RANGE`) e Índices Compostos [CONCLUÍDO]
- [x] Criar a tabela particionada de logs de disparos e histórico (`dispatch_logs` particionada por `created_at`).
- [x] Configurar partições mensais automáticas (`dispatch_logs_2026_08`, `dispatch_logs_2026_09`, `dispatch_logs_2026_10`, `dispatch_logs_default`).
- [x] Criar índices compostos B-Tree de alta performance para zerar *full-table scans* em `scheduled_triggers`, `webhook_leads`, `webhook_integrations`, `webhook_history` e `webhook_events`.
- [x] Migrações Alembic `0002_perf_indexes.py` e `0003_dispatch_logs.py` aplicadas e validadas no banco de dados.
- [x] Criar testes unitários para os índices compostos e modelo particionado (`test_postgres_phase4_indexes.py`, `test_postgres_phase4_partitioning.py`).

---

### 🔹 Fase 5: Busca Rápida de Leads e Conversas (`pg_trgm` / FTS) [CONCLUÍDO]
- [x] Habilitar a extensão `pg_trgm` no PostgreSQL (`CREATE EXTENSION IF NOT EXISTS pg_trgm;`).
- [x] Criar índices Trigram GIN (`gin_trgm_ops`) em colunas de texto de alta busca:
  - `trgm_idx_leads_name`, `trgm_idx_leads_phone`, `trgm_idx_leads_email` em `webhook_leads`.
  - `trgm_idx_chat_messages_content` em `chat_messages`.
  - `trgm_idx_chat_conversations_name`, `trgm_idx_chat_conversations_phone` em `chat_conversations`.
- [x] Sincronização e migração Alembic `0004_add_trigram_indexes.py` aplicada com sucesso.
- [x] Criar testes unitários para a extensão trigram e buscas com substring wildcard (`test_postgres_phase5_trgm.py`).

---

### 🔹 Fase 6: Eventos em Tempo Real (`LISTEN / NOTIFY`) [CONCLUÍDO]
- [x] Criar *triggers* e função PL/pgSQL no PostgreSQL para disparar notificações (`PERFORM pg_notify('zapvoice_realtime_events', ...)`):
  - `trg_realtime_webhook_leads` em `webhook_leads`.
  - `trg_realtime_chat_messages` em `chat_messages`.
  - `trg_realtime_scheduled_triggers` em `scheduled_triggers`.
- [x] Implementar listener assíncrono em Python ([`services/pg_realtime_listener.py`](file:///c:/Users/aryar/.gemini/antigravity/scratch/Projetos%20Serios/Projeto%20-%20ZapVoice%20no%20Chatwoot/backend/services/pg_realtime_listener.py)) escutando continuamente o canal `zapvoice_realtime_events`.
- [x] Integrar o listener ao WebSocket Manager do FastAPI no startup da aplicação para propagar novidades instantaneamente ao frontend.
- [x] Migração Alembic `0005_add_pg_listen_notify_triggers.py` aplicada no PostgreSQL.
- [x] Criar testes unitários para a rotina de LISTEN/NOTIFY (`test_postgres_phase6_listen_notify.py`).

---

## 📌 Recomendações de Execução
1. **Comece pela Fase 1 (`FOR UPDATE SKIP LOCKED`)**: Traz benefício imediato na segurança dos disparos de WhatsApp e evita duplicações.
2. **Adote o Alembic (Fase 3) em seguida**: Para que todas as novas alterações de schema (JSONB, Particionamento, Extensões) já sejam versionadas de forma limpa.
