-- Migração: adicionar coluna is_locked na tabela webhook_leads
-- Execute uma vez no banco de dados

ALTER TABLE webhook_leads
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE;
