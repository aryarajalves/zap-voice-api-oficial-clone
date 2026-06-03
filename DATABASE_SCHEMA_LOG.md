# 🗄️ Log de Esquema do Banco de Dados (Database Schema Log)

Este arquivo registra a estrutura atual do banco de dados e todas as alterações (migrações) realizadas. Utilize este log para garantir que novos servidores estejam com o banco de dados sincronizado com o código.

## 📌 Estado Atual do Esquema (Snapshot)

### Tabelas Principais:
- **`users`**: Gestão de acesso e permissões.
- **`clients`**: Multi-tenancy (isolamento de dados por cliente).
- **`funnels`**: Definição de fluxos e passos de automação.
- **`webhook_configs`**: Configuração de tokens e delays de webhooks.
- **`webhook_event_mappings`**: Regras de mapeamento entre eventos e templates/funis.
- **`scheduled_triggers`**: Fila de execução de disparos (individuais e bulk).
- **`message_status`**: Tracking de entrega e leitura via Webhooks da Meta.
- **`webhook_history`**: Log de payloads brutos recebidos.
- **`webhook_leads`**: Visão consolidada de contatos capturados via integração.
- **`recurring_triggers`**: Agendamentos recorrentes (Semanais/Mensais).
- **`global_variables`**: Variáveis globais reutilizáveis em funis.
- **`app_config`**: Configurações dinâmicas (WhatsApp/Chatwoot tokens).
- **`blocked_contacts`**: Whitelist/Blacklist de contatos.
- **`contact_windows`**: Cache de janelas de 24h para envio de mensagens grátis.

---

## 🕒 Histórico de Migrações (Últimas Alterações)

| Data | Alteração | Tabela | Colunas Adicionadas | Script de Migração |
| :--- | :--- | :--- | :--- | :--- |
| 01/05/2026 | Adição de Tracking de Custos | `scheduled_triggers` | `cost_per_unit`, `total_cost`, `total_delivered`, `total_read` | `migrate_db.py` |
| 01/05/2026 | Persistência de Variáveis | `message_status` | `var1`, `var2`, `var3`, `var4`, `var5` | `add_var_columns_to_status.py` |
| 01/05/2026 | Automação ManyChat | `webhook_event_mappings` | `manychat_tag_automation`, `manychat_tag_prefix`, `manychat_tag_rotation_day` | `migrate_chatwoot_labels.py` |
| 01/05/2026 | Delay em Webhooks | `webhook_configs` | `delay_amount`, `delay_unit` | `add_delay_columns.py` |
| 01/05/2026 | Delay em Disparos Aprovados | `scheduled_triggers` | `delay_seconds`, `concurrency_limit` | `add_approved_delay_columns.py` |
| 02/05/2026 | Suporte a Múltiplas Etiquetas JSONB | `webhook_event_mappings` | `chatwoot_label` (Type change to JSONB) | `migrate_labels_to_jsonb.py` |
| 07/05/2026 | Interrupção Inteligente | `webhook_event_mappings` | `cancel_pending_on_trigger`, `cancel_event_types` | `add_cancel_columns.py` |
| 09/05/2026 | Correção Geral de Webhooks | `webhook_event_mappings` | 17 colunas (Cancelamento, ManyChat, Custos) | `fix_missing_webhook_columns.py` |
| 09/05/2026 | Sincronização Global (Super Fix) | **Todas as Tabelas** | Qualquer coluna faltante nos modelos | `super_db_fix.py` |
| 09/05/2026 | Rastreamento de Interações (Clicks) | `message_status` | `interaction_counted` | `add_interaction_counted_column.py` |
| 20/05/2026 | Automação de Follow-up | `webhook_event_mappings`, `scheduled_triggers` | `followup_active`, `followup_template_name`, `followup_template_id`, `followup_delay_value`, `followup_delay_unit`, `followup_variables_mapping`, `is_followup` | `backend/scripts/add_followup_columns.py` |
| 20/05/2026 | Horário Comercial no Follow-up | `webhook_event_mappings` | `followup_business_hours_active`, `followup_business_hours_start`, `followup_business_hours_end`, `followup_business_hours_days` | `backend/scripts/add_followup_business_hours.py` |
| 22/05/2026 | Sistema de Convites de Usuário | `user_invitations`, `invitation_clients` | Tabela inteira de convites, relacionamento de clientes | `backend/scripts/add_user_invitations_table.py` |
| 22/05/2026 | Etiquetas de Classificação de Templates | `whatsapp_template_cache` | `tags` | `backend/scripts/database/add_template_tags_col.py` |
| 23/05/2026 | Rastreamento de Recorrências | `scheduled_triggers` | `is_recurring`, `recurring_trigger_id` | `backend/add_recurring_columns.py` |
| 24/05/2026 | Timestamps de Funis | `funnels` | `created_at`, `updated_at` | `backend/add_funnel_timestamp_columns.py` |
| 25/05/2026 | Arquivamento de Templates | `whatsapp_template_cache` | `is_archived` | `backend/scripts/add_archived_column_to_templates.py` |
| 27/05/2026 | Funis de Interação e Bloqueio no Teste | `scheduled_triggers` | `interaction_funnel_id`, `block_funnel_id` | `backend/scripts/add_interactive_funnels_to_trigger.py` |
| 30/05/2026 | Arquivamento e Etiquetas de Funis | `funnels` | `is_archived`, `tag` | `backend/add_funnel_archive_tag_columns.py` |
| 30/05/2026 | Fixação de Funis no Topo | `funnels` | `is_pinned` | `backend/add_funnel_pinned_column.py` |
| 30/05/2026 | Fixação de Templates no Topo | `whatsapp_template_cache` | `is_pinned` | `backend/add_template_pinned_column.py` |
| 30/05/2026 | Configuração de Backup Automático | `backup_config` | Tabela nova: `enabled`, `interval_type`, `interval_value`, `retention_count`, `last_backup_at`, `next_backup_at`, `last_backup_filename`, `last_backup_status`, `last_backup_error` | `backend/migrations/add_backup_config_table.py` |
| 30/05/2026 | Metadados de Backups (Pinar e Etiquetas) | `backup_metadata` | Tabela nova: `filename`, `is_pinned`, `tag` | `backend/migrations/add_backup_metadata_table.py` |
| 30/05/2026 | Data de Início e Etiqueta Alternativa ManyChat | `webhook_event_mappings` | `manychat_start_date`, `manychat_tag_alternative` | `backend/scripts/database/add_manychat_alternative_tag_columns.py` |
| 03/06/2026 | Persistência de Ações de Botões em Recorrências | `recurring_triggers` | `button_actions` | `backend/scripts/database/add_button_actions_to_recurring.py` |





---

## ⚙️ Como Aplicar Mudanças
Sempre que o projeto for movido para um novo servidor:
1. Certifique-se de que o `DATABASE_URL` no `.env` está correto.
2. O sistema tentará executar o `auto_migrate` no `main.py`.
3. Caso ocorra erro de "Column Missing", execute os scripts listados na tabela acima manualmente:
   ```bash
   python backend/add_delay_columns.py
   python backend/add_var_columns_to_status.py
   # ... etc
   ```
