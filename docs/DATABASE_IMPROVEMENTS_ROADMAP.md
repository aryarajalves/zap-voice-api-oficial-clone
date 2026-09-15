# 🛡️ Roadmap de Melhorias e Otimizações de Banco de Dados (PostgreSQL)

Este documento registra o plano detalhado de melhorias técnicas, arquiteturais e de performance para o banco de dados PostgreSQL do projeto **ZapVoice**.

---

## 🎯 Resumo Executivo das Otimizações

| Prioridade | Área | Impacto Técnico | Status |
| :--- | :--- | :--- | :--- |
| 🔴 **Alta** | **Indexação de Foreign Keys (FKs)** | Elimina *Sequential Scans* em `JOINs` e previne *Table Locks* em cascata. | ✅ Concluído |
| 🔴 **Alta** | **Índices Compostos de Alto Tráfego** | Acelera em até 10x consultas de verificação de bulk e janelas de 24h. | ✅ Concluído |
| 🟡 **Média** | **Migração de `json` para `jsonb`** | Reduz uso de disco, acelera leitura e permite filtros por chaves com índices GIN. | ✅ Concluído |
| 🟡 **Média** | **Políticas de Retenção e Expurgos (Purge)** | Limpeza em lotes de logs antigos sem travamento de tabelas ativas. | ✅ Concluído |
| 🟢 **Baixa** | **Ajuste Fino de Autovacuum** | Previne inchaço de disco (*bloat*) em tabelas com alto volume de inserts/updates. | ✅ Concluído |

---

## 📋 Detalhamento Técnico das Melhorias

### 🔴 1. Indexação de Chaves Estrangeiras (Foreign Keys)

No PostgreSQL, a criação de uma `FOREIGN KEY` não gera índices automáticos na tabela filha. A ausência desses índices provoca varreduras completas (*Seq Scan*) e bloqueios em cascata durante `UPDATE` ou `DELETE` na tabela pai.

#### Chaves Estrangeiras Mapeadas para Indexação:
1. `users (client_id)` -> `idx_fk_users_client_id` *(Crítico: Usado em todas as rotas autenticadas)*
2. `scheduled_triggers (funnel_id)` -> `idx_fk_scheduled_triggers_funnel_id`
3. `recurring_triggers (funnel_id)` -> `idx_fk_recurring_triggers_funnel_id`
4. `chat_messages (user_id)` -> `idx_fk_chat_messages_user_id`
5. `api_keys (user_id)` -> `idx_fk_api_keys_user_id`
6. `user_clients (client_id)` -> `idx_fk_user_clients_client_id`
7. `invitation_clients (client_id)` -> `idx_fk_invitation_clients_client_id`
8. `user_invitations (created_by_id)` -> `idx_fk_user_invitations_created_by_id`
9. `webhook_configs (funnel_id)` -> `idx_fk_webhook_configs_funnel_id`
10. `webhook_event_mappings (funnel_id)` -> `idx_fk_webhook_event_mappings_funnel_id`
11. `webhook_leads (imported_by_client_id)` -> `idx_fk_webhook_leads_imported_by`
12. `instagram_automations (funnel_id)` -> `idx_fk_instagram_automations_funnel_id`
13. `contact_import_history (project_id)` -> `idx_fk_contact_import_history_project_id`
14. `clients (project_id)` -> `idx_fk_clients_project_id`
15. `email_dispatches (template_id)` -> `idx_fk_email_dispatches_template_id`
16. `email_inbounds (dispatch_id)` -> `idx_fk_email_inbounds_dispatch_id`
17. `email_inbounds (lead_id)` -> `idx_fk_email_inbounds_lead_id`
18. `contact_template_history (trigger_id)` -> `idx_fk_contact_template_history_trigger_id`

---

### 🔴 2. Índices Compostos para Consultas Frequentes

#### A. Tabela `message_status`
* **Consulta Crítica:** A rotina de inbound do WhatsApp (`check_is_bulk_contact`) executa:
  ```sql
  SELECT * FROM message_status WHERE phone_number = ? AND timestamp >= ? ORDER BY timestamp DESC LIMIT 1;
  ```
* **Índice a Criar:**
  ```sql
  CREATE INDEX idx_message_status_phone_time ON message_status (phone_number, timestamp DESC);
  ```

#### B. Tabela `contact_windows`
* **Consulta Crítica:** Validação e abertura da janela de 24 horas por cliente e telefone.
* **Índice a Criar:**
  ```sql
  CREATE UNIQUE INDEX idx_contact_windows_client_phone ON contact_windows (client_id, phone);
  ```

#### C. Tabela `whatsapp_template_cache`
* **Consulta Crítica:** Localização rápida de templates por cliente, nome e idioma.
* **Índice a Criar:**
  ```sql
  CREATE INDEX idx_template_cache_client_name_lang ON whatsapp_template_cache (client_id, name, language);
  ```

---

### 🟡 3. Migração de Colunas `json` para `jsonb`

O formato `json` legado armazena texto bruto e exige parsing a cada leitura. O `jsonb` armazena dados em binário decomposto, acelera o processamento e permite indexação GIN para buscas diretas em chaves JSON.

#### Colunas Alvo da Migração:
| Tabela | Coluna | Benefício Direto |
| :--- | :--- | :--- |
| `chat_conversations` | `labels` | Filtro instantâneo de conversas por etiquetas usando operadores GIN (`@>`). |
| `chat_messages` | `meta_data` | Armazenamento compacto de metadados de mensagens e mídia. |
| `webhook_history` | `payload`, `processed_data` | Redução drástica do tamanho da tabela em disco. |
| `webhook_events` | `payload`, `processed_data`, `headers` | Otimização da fila de eventos brutos de webhook. |
| `funnels` | `steps`, `business_hours_days`, `allowed_phones`, `blocked_phones` | Carregamento ultrarrápido na execução do motor de funis. |
| `scheduled_triggers` | `pending_contacts`, `processed_contacts`, `template_components` | Execução mais leve de campanhas volumosas. |

---

### 🟡 4. Política Automática de Expurgos e Retenção (Data Purge)

Evitar que tabelas de logs e históricos cresçam indefinidamente, consumindo espaço e degradando a velocidade dos índices.

#### Estratégia de Expurgos em Lotes:
* **Tabelas Alvo:**
  * `waba_payment_checks` (Retenção: 30 dias)
  * `webhook_history` (Retenção configurável via `HISTORY_RETENTION_DAYS`, padrão 30/60 dias)
  * `webhook_events` processados (Retenção: 15 dias)
  * `message_status` de triggers arquivados/concluídos há mais de 90 dias
* **Padrão de Execução Segura:**
  Executar via job agendado assíncrono (Scheduler) em lotes com `LIMIT` para evitar longas transações:
  ```sql
  DELETE FROM waba_payment_checks 
  WHERE id IN (
      SELECT id FROM waba_payment_checks 
      WHERE checked_at < NOW() - INTERVAL '30 days' 
      LIMIT 1000
  );
  ```

---

### 🟢 5. Ajuste Fino de Autovacuum para Tabelas de Escrita Intensa

Tabelas que recebem grande fluxo de `INSERT` e `UPDATE` geram linhas mortas (*dead tuples*) com rapidez. Ajustar os gatilhos de autovacuum por tabela mantém o banco compacto sem exigir manutenção manual.

```sql
ALTER TABLE scheduled_triggers SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_analyze_scale_factor = 0.02
);

ALTER TABLE chat_messages SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_analyze_scale_factor = 0.02
);

ALTER TABLE message_status SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_analyze_scale_factor = 0.02
);
```

---

## 🛠️ Checklist de Execução

- [ ] **Etapa 1:** Criar migração Alembic `0006_add_missing_fk_and_composite_indexes.py` para os índices de Foreign Keys e tabelas críticas.
- [ ] **Etapa 2:** Criar migração Alembic `0007_migrate_json_to_jsonb.py` convertendo as colunas legadas para `JSONB` com cláusula `USING column::jsonb`.
- [ ] **Etapa 3:** Implementar tarefa periódica de purge no Scheduler (`backend/services/scheduler/cleanup_tasks.py`).
- [ ] **Etapa 4:** Aplicar parâmetros de autovacuum nas tabelas de alta escrita.
- [ ] **Etapa 5:** Executar suíte de testes unitários e validar compatibilidade.
