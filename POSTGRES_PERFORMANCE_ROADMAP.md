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

### 🔹 Fase 1: Fila Atômica de Disparos (`FOR UPDATE SKIP LOCKED`)
- [ ] Criar/Ajustar modelo de fila de mensagens agendadas (`scheduled_messages` / `dispatch_queue`).
- [ ] Implementar a função de consumo com `with_for_update(skip_locked=True)` no SQLAlchemy.
- [ ] Configurar worker desacoplado para disparo em lotes (*batch processing*).
- [ ] Criar testes unitários simulando concorrência (múltiplas threads/workers pegando itens simultâneos).

---

### 🔹 Fase 2: Metadados Flexíveis de Leads (`JSONB` + Índices `GIN`)
- [ ] Adicionar coluna `metadata` do tipo `JSONB` no modelo de leads/contatos e integrações de webhooks.
- [ ] Criar índice `GIN` na coluna de metadados para consultas instantâneas por chave/valor:
  ```sql
  CREATE INDEX idx_leads_metadata_gin ON leads USING gin (metadata);
  ```
- [ ] Atualizar os handlers de webhooks (Hotmart, Kiwify, Chatwoot) para salvar o payload original e campos extras sem necessidade de novas colunas.
- [ ] Criar testes unitários para busca e persistência de dados em `JSONB`.

---

### 🔹 Fase 3: Migrações Automatizadas com Alembic
- [ ] Inicializar o ambiente Alembic na pasta `backend/` (`alembic init alembic`).
- [ ] Configurar `env.py` do Alembic para carregar os modelos do SQLAlchemy e a URL do banco a partir das variáveis de ambiente (`DATABASE_URL`).
- [ ] Gerar a migração inicial consolidada (`alembic revision --autogenerate -m "schema_inicial"`).
- [ ] Atualizar o fluxo de deploy e inicialização dos containers para rodar `alembic upgrade head` automaticamente.

---

### 🔹 Fase 4: Auditoria e Particionamento de Logs (`PARTITION BY RANGE`)
- [ ] Criar a tabela particionada de logs de disparos e histórico (`dispatch_logs` particionada por `created_at`).
- [ ] Configurar partições mensais automáticas (ex: `dispatch_logs_2026_08`, `dispatch_logs_2026_09`).
- [ ] Implementar política de retenção / expurgo rápido (desanexar e dropar partição antiga instantaneamente).
- [ ] Validar tempo de resposta de relatórios analíticos em tabelas particionadas.

---

### 🔹 Fase 5: Busca Rápida de Leads e Conversas (`pg_trgm` / FTS)
- [ ] Habilitar a extensão `pg_trgm` no PostgreSQL:
  ```sql
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  ```
- [ ] Criar índices trigram / GIN em colunas de texto de alta busca (`phone`, `name`, `content`).
- [ ] Implementar endpoint de busca no backend utilizando operadores de similaridade (`%` / `similarity()`).
- [ ] Criar testes de performance comparando busca com `LIKE '%termo%'` vs índice `pg_trgm`.

---

### 🔹 Fase 6: Eventos em Tempo Real (`LISTEN / NOTIFY`)
- [ ] Criar *triggers* no PostgreSQL para disparar notificações (`NOTIFY novo_lead, 'payload'`) em eventos críticos.
- [ ] Implementar listener assíncrono em Python (via `asyncpg` ou conexão dedicada) que escuta os canais do Postgres.
- [ ] Integrar o listener ao WebSocket do FastAPI para refletir novidades no frontend em milissegundos sem polling.

---

## 📌 Recomendações de Execução
1. **Comece pela Fase 1 (`FOR UPDATE SKIP LOCKED`)**: Traz benefício imediato na segurança dos disparos de WhatsApp e evita duplicações.
2. **Adote o Alembic (Fase 3) em seguida**: Para que todas as novas alterações de schema (JSONB, Particionamento, Extensões) já sejam versionadas de forma limpa.
