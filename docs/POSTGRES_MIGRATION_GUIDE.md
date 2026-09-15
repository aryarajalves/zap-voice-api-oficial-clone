# 🗄️ Guia de Migração e Resolução de Travamentos - PostgreSQL

Este guia serve como documentação de referência para realizar migrações manuais de banco de dados e resolver problemas de travamento (deadlock/fila de locks) durante o boot dos containers do **ZapVoice**.

> [!IMPORTANT]
> **O SISTEMA CONTINUA TRAVADO OU DANDO O MESMO ERRO?**
> Se você aplicou as alterações e o painel ainda continua carregando infinito ou travando no boot, isso significa que conexões residuais estão gerando *deadlocks* no banco. **Você DEVE realizar exatamente este procedimento de emergência:**
> 1. **Pausar/Parar** o container do **Worker** (`zapvoice_worker`).
> 2. **Reiniciar** o container do **PostgreSQL** (`zapvoice-postgres`).
> 3. **Reiniciar** o container do **Backend** (`zapvoice_app`).
> 4. **Iniciar/Reiniciar** o container do **Worker** (`zapvoice_worker`).
>
> *(Seguir essa ordem exata elimina os bloqueios de memória do Postgres e faz o sistema voltar ao ar na hora).*

---

## 📌 1. Por que ocorrem travamentos no Boot?

Durante o início do container do backend (`zapvoice_app`), o sistema executa o script `update_schema.py` para sincronizar os modelos Python com o banco de dados PostgreSQL. 

Esse processo pode travar indefinidamente (ficando parado na linha `➕ [AUTO-MIGRATE] Adicionando coluna...`) devido a duas causas principais:

1. **Locks do PostgreSQL (Fila de Espera):**
   O comando `ALTER TABLE` exige um bloqueio exclusivo absoluto (*Access Exclusive Lock*). Se o container do **Worker** ou outra conexão estiver realizando qualquer consulta (mesmo um simples `SELECT`) na tabela afetada, o Postgres coloca o comando de alteração em uma fila de espera eterna. O backend não termina de subir até que essa fila seja liberada.

2. **Restrições de NOT NULL com Dados Existentes:**
   Se uma nova coluna é definida como `NOT NULL` (como `client_id`) e a tabela já possui registros antigos, o PostgreSQL impede a migração automática e gera um erro silencioso, impedindo a sincronização.

---

## 🛠️ 2. Procedimento de Destravamento de Fila (Passo a Passo)

Se o log do backend travar durante a aplicação de migrações, execute este protocolo para limpar as filas do Postgres:

1. **Parar o container do Worker:**
   No Portainer, selecione o container `zapvoice_worker` e clique em **Stop**.
   *(Isso impede novos SELECTs e consultas em segundo plano que geram locks).*

2. **Reiniciar o container do PostgreSQL:**
   Selecione o container `zapvoice-postgres` e clique em **Restart**.
   *(Isso derruba instantaneamente todas as conexões presas ou ociosas na memória do banco de dados).*

3. **Reiniciar o container do Backend:**
   Selecione o container `zapvoice_app` e clique em **Restart**.
   *(Agora sem concorrência, o script de sincronização rodará e completará a migração em menos de 2 segundos).*

4. **Iniciar o container do Worker:**
   Selecione o container `zapvoice_worker` e clique em **Start**.

---

## 🖥️ 3. Script SQL de Sincronização Manual (Burlar NOT NULL)

Caso precise rodar a migração manualmente direto no Postgres para contornar problemas de tabela com dados pré-existentes, siga o método abaixo.

### Como acessar o terminal do banco:
1. No Portainer, abra o console (`bash`) do container `zapvoice-postgres`.
2. Execute o comando para limpar conexões ociosas:
   ```bash
   psql -U postgres -d zapvoice -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'zapvoice' AND pid <> pg_backend_pid() AND state = 'idle';"
   ```
3. Acesse o console interativo:
   ```bash
   psql -U postgres -d zapvoice
   ```

### Código SQL para executar de uma só vez:
Cole este bloco para criar de forma segura todas as colunas mais recentes do ecossistema:

```sql
-- Garante a coluna de cliente com valor padrão 1 (evita erro de NOT NULL com linhas existentes)
ALTER TABLE webhook_leads ADD COLUMN IF NOT EXISTS client_id INTEGER DEFAULT 1;

-- Criação das colunas necessárias para sincronização com Chatwoot e status de bloqueio
ALTER TABLE webhook_leads ADD COLUMN IF NOT EXISTS chatwoot_conversation_id INTEGER;
ALTER TABLE webhook_leads ADD COLUMN IF NOT EXISTS chatwoot_account_id INTEGER;
ALTER TABLE webhook_leads ADD COLUMN IF NOT EXISTS chatwoot_inbox_id INTEGER;
ALTER TABLE webhook_leads ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE;

-- Garantir colunas de controle e ordenação da listagem
ALTER TABLE webhook_leads ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE webhook_leads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Sincronização dos funis (arquivamento, classificação por tags e fixação no topo)
ALTER TABLE funnels ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE funnels ADD COLUMN IF NOT EXISTS tag VARCHAR;
ALTER TABLE funnels ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE;

-- Sincronização dos templates (arquivamento e fixação no topo)
ALTER TABLE whatsapp_template_cache ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE whatsapp_template_cache ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE;
```

4. Digite `\q` e aperte **Enter** para sair.

### 📋 Estrutura Completa de Criação da Tabela `webhook_leads` (Do Zero)
Caso precise criar a tabela de contatos totalmente do zero em uma nova base de dados, execute este script:

```sql
CREATE TABLE IF NOT EXISTS webhook_leads (
    -- 1. Colunas Originais (Base)
    id SERIAL PRIMARY KEY,
    name VARCHAR,
    phone VARCHAR,
    email VARCHAR,
    last_event_type VARCHAR,
    last_event_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    product_name VARCHAR,
    platform VARCHAR,
    payment_method VARCHAR,
    price VARCHAR,
    tags VARCHAR,
    total_events INTEGER DEFAULT 1,
    
    -- 2. Colunas Adicionadas em Atualizações Recentes
    client_id INTEGER DEFAULT 1,
    chatwoot_conversation_id INTEGER,
    chatwoot_account_id INTEGER,
    chatwoot_inbox_id INTEGER,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices recomendados para alta performance de busca por contato
CREATE INDEX IF NOT EXISTS idx_webhook_leads_phone ON webhook_leads(phone);
CREATE INDEX IF NOT EXISTS idx_webhook_leads_client_id ON webhook_leads(client_id);
```

---

## 📝 4. Comando Python de Emergência (Sob Demanda)

Se preferir fazer a sincronização dinâmica direto pelo Python debaixo dos panos, acesse o terminal do container do **Backend** (`zapvoice_app`) e execute:

```bash
python super_db_fix.py
```
*(Este script varre todo o código em busca de colunas faltantes no Postgres e as cria dinamicamente).*
