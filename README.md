
# ⚡ ZapVoice - Automação Chatwoot + WhatsApp

Bem-vindo ao **ZapVoice**! Este é um sistema poderoso de automação de marketing e atendimento projetado para se integrar perfeitamente ao **Chatwoot**. Ele permite disparos em massa, criação de funis de mensagens complexos (com delays e mídias) e gerenciamento de templates do WhatsApp Business API.

---

## 🚀 O que este projeto faz?

O **ZapVoice** atua como um "cérebro" extra para o seu Chatwoot.
*   **Disparos em Massa (Bulk Send):** Envie mensagens para milhares de contatos usando Templates aprovados pela Meta.
*   **Funis Automáticos:** Crie sequências de mensagens (ex: Bom dia > Delay 1h > PDF > Delay 1 dia > Oferta) que rodam sozinhas.
*   **Execução Não-Bloqueante:** O sistema é capaz de lidar com delays longos (dias ou semanas) sem travar o processamento, liberando recursos do servidor.
*   **Integração Nativa:** Lê contatos e conversas diretamente do Chatwoot via API.

---

## 🏗️ Arquitetura

O sistema roda em **Docker** e é composto por 3 serviços principais:

1.  **Backend (API):** Feito em Python (FastAPI). Gerencia as regras de negócio, recebe webhooks e comanda o banco.
2.  **Worker:** Processo em segundo plano (Python) que executa o trabalho pesado: filas de envio, processamento de funis e delays.
3.  **Frontend:** Interface visual moderna (React + Vite) onde você configura os disparos e vê relatórios.

**Infraestrutura de apoio:**
*   **PostgreSQL:** Banco de dados principal para salvar agendamentos e logs.
*   **RabbitMQ:** Sistema de filas que garante que nenhuma mensagem seja perdida, mesmo se o servidor reiniciar.

---

## 🛠️ Como Instalar e Rodar

### Pré-requisitos
*   Docker e Docker Compose instalados.
*   Uma instância do **Chatwoot** rodando.
*   Uma conta na **Meta for Developers** (WhatsApp Business API) configurada.

### Rodando com Docker Compose

1.  Clone este repositório.
2.  Configure o arquivo `.env` (ou variáveis de ambiente no Portainer).
3.  Suba os containers:
    ```bash
    docker-compose up -d --build
    ```
4.  Acesse o painel em `http://seu-ip:80` (ou domínio configurado).

### Deploy no Portainer (Stack)
Use o arquivo `docker-compose.yml` ou `KARINE-STACK-CORRIGIDA.yml` como modelo para criar uma Stack no Portainer. Certifique-se de adicionar as variáveis de ambiente na aba "Environment".

---

## 🔑 Variáveis de Ambiente (Configuração)

Para o sistema funcionar, você **PRECISA** configurar estas variáveis. Sem elas, o sistema não liga ou não envia mensagens.

### 🚨 Críticas (Obrigatórias)
*   `DATABASE_URL`: String de conexão do PostgreSQL (ex: `postgresql://user:pass@host:5432/db`).
*   `RABBITMQ_HOST`: Endereço do RabbitMQ (normalmente o nome do serviço no docker: `rabbitmq`).
*   `CHATWOOT_API_URL`: URL da sua instalação do Chatwoot (ex: `https://chat.suaempresa.com/api/v1`).
*   `CHATWOOT_API_TOKEN`: Token de acesso de um admin ou bot no Chatwoot.
*   `CHATWOOT_ACCOUNT_ID`: ID da conta no Chatwoot (geralmente `1`).

### 💬 WhatsApp (Meta API)
*   `WA_BUSINESS_ACCOUNT_ID`: ID da conta comercial.
*   `WA_PHONE_NUMBER_ID`: ID do número de telefone.
*   `WA_ACCESS_TOKEN`: Token permanente ou temporário da Meta.

### ☁️ Uploads (MinIO/S3) - Opcional
Se não configurado, o sistema salva arquivos localmente no container.
*   `S3_ENDPOINT_URL`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET_NAME`.

---

## 🚑 Solução de Problemas (Troubleshooting)

### O Banco de Dados travou ("LockNotAvailable")?
Se você vir erros de `LockNotAvailable` nos logs durante uma atualização, significa que uma migração anterior travou.
**Solução:**
1.  Acesse o console do container `zapvoice_app`.
2.  Rode o script "matador": `python scripts/utils/kill_locks.py` (mata processos zumbis).
3.  Rode a migração forçada: `python scripts/database/force_schema_update.py`.
4.  Reinicie o container.

### As mensagens não chegam?
1.  Verifique se o `worker` está rodando (`docker logs zapvoice_worker`).
2.  Confira se o `WA_ACESS_TOKEN` é válido e tem permissão de envio.
3.  Veja se o template usado foi aprovado pela Meta.

### Erro 502 Bad Gateway?
Geralmente indica que o Backend ainda não terminou de iniciar (provavelmente rodando migrações) ou falhou. Verifique os logs do container `zapvoice_app`.

---

**Desenvolvido com foco em Alta Performance e Estabilidade.** 🚀
