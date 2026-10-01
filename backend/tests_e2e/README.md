# Guia de Testes Automatizados - ZapVoice

Este diretório contém os scripts necessários para validar o funcionamento do ecossistema ZapVoice.

## 📋 Pré-requisitos

Para que os testes funcionem corretamente, garanta que:

1. **Containers Ativos**: A infraestrutura (Postgres, RabbitMQ, MinIO) deve estar rodando.
   - Se estiver usando Docker local: `docker-compose -f docker/docker-compose.local.yml up -d`

   - Se eu quiser apenas reiniciar os conteiners é só usar isso: 'docker-compose -f docker/docker-compose.local.yml restart worker'
2. **Backend Rodando**: O servidor FastAPI deve estar ativo na porta `8000`.
   - Rodar no backend: `python main.py` ou via Docker.
3. **Ambiente Python**: As dependências do backend devem estar instaladas localmente (requests, psycopg2, python-dotenv).
   - `pip install requests psycopg2-binary python-dotenv`

## ⚙️ Configuração

Os scripts leem automaticamente o arquivo `.env` localizado na pasta `backend/`. 
Garante que as seguintes variáveis estejam configuradas para o ambiente de teste local:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/zapvoice"
VITE_API_URL="http://localhost:8000/api"
SUPER_ADMIN_EMAIL="seu_email@admin.com"
SUPER_ADMIN_PASSWORD="sua_senha_aqui"
```

> [!IMPORTANT]
> Se o `DATABASE_URL` no seu `.env` aponta para um host do Docker (ex: `zapvoice-postgres`), o script tentará converter automaticamente para `localhost` para execução fora do container.

## 🚀 Como Executar

### 1. Executar Todos os Testes
O script `run_all.py` orquestra a execução de todos os testes em sequência e fornece um resumo final.
```bash
python tests/run_all.py
```

### 2. Executar Testes Individuais
Você pode rodar qualquer teste isoladamente para focar em uma falha específica:

- **Infraestrutura**: `python tests/test_01_infra.py`
- **Autenticação**: `python tests/test_02_auth.py`
- **Clientes**: `python tests/test_03_clients_settings.py`
- **Funis**: `python tests/test_04_funnels.py`
- **Agendamentos**: `python tests/test_05_triggers.py`
- **Webhooks & Bloqueio**: `python tests/test_06_webhooks_blocked.py` - Testa bloqueio de contatos e recebimento de webhooks.
- **Upload de Mídia**: `python tests/test_07_uploads.py` - Valida o sistema de upload de arquivos para o MinIO.
- **Nós do Visual Builder**: `python tests/test_08_funnel_nodes.py` - Testa a lógica de todos os nós (Mensagem, Mídia, Delay, Condição, Randomizador e Link de Funil).

## 🛠️ Resolução de Problemas

- **Connection Refused (10061)**: O serviço alvo não está rodando ou a porta está bloqueada. Verifique se o Docker e o Backend estão ativos.
- **Timed Out**: O serviço está rodando mas não respondeu a tempo. Verifique a rede ou se o host está correto.
- **Configurações Ausentes**: Certifique-se de que o arquivo `backend/.env` existe e contém as credenciais necessárias.
