# ⚡ ZapVoice - Automação Chatwoot + WhatsApp (v1.0 Official)

Bem-vindo à versão **1.0 oficial** do **ZapVoice**! Este é um sistema robusto e profissional de automação de marketing e atendimento, projetado para transformar seu **Chatwoot** em uma máquina de vendas e engajamento.

---

## 🚀 O que o ZapVoice faz?

O **ZapVoice** foi configurado para ser a solução definitiva em automação para WhatsApp Business API (Meta):

*   **Disparos em Massa (Bulk Send):** Envie templates aprovados para milhares de contatos com alta performance.
*   **Funis de Mensagens Inteligentes:** Crie réguas de relacionamento complexas com áudios, vídeos, imagens e PDFs, intercalados por delays inteligentes.
*   **Gestão de Fluxos:** Controle total sobre o que foi enviado, entregue e lido.
*   **Integração Nativa com Chatwoot:** Sincronização automática de contatos e caixas de entrada.
*   **Configuração Dinâmica:** Gerencie suas credenciais de WhatsApp, RabbitMQ, S3 e Chatwoot diretamente pela interface, sem precisar reiniciar servidores.

---

## 🏗️ Estrutura do Projeto

O projeto segue uma organização modular e limpa:

```text
/
├── docker/                  # Configurações de Deploy e Containers
│   ├── docker-compose.yml   # Produção (Enxuto - Swarm/Traefik)
│   ├── docker-compose.local.yml # Local (Full Stack - Tudo incluso)
│   └── Dockerfile, entrypoint.sh, ...
├── backend/                 # API FastAPI (Python)
│   ├── core/                # Segurança e Lógica Central
│   ├── routers/             # Endpoints da API
│   ├── scripts/             # Utilitários (Admin, Database, Tests, Debug)
│   └── main.py, models.py, ...
├── frontend/                # Painel Administrativo (React + Vite)
└── .gitignore               # Proteção total contra vazamento de segredos
```

---

## 🛠️ Como Iniciar

### 1. Requisitos
*   Docker e Docker Compose instalados.
*   Um servidor com suporte a Docker Swarm (para produção) ou Docker padrão (local).

### 2. Escolha seu ambiente

#### **Ambiente Local (Desenvolvimento/Teste)**
Para subir tudo (Banco de Dados, Fila, MinIO e a App) de uma só vez:
```bash
docker-compose -f docker/docker-compose.local.yml up -d --build
```
*Acesse em: `http://localhost:5173` (Frontend) ou `http://localhost:8000` (API)*

#### **Ambiente de Produção**
Para rodar de forma enxuta em seu servidor:
```bash
docker-compose -f docker/docker-compose.yml up -d --build
```

---

## 🔑 Configuração de Variáveis

O ZapVoice utiliza um modelo híbrido de configuração para máxima flexibilidade:

### � Variáveis de Ambiente (Obrigatórias no Docker/Portainer)
Estas variáveis são necessárias para o sistema "ligar":
*   `DATABASE_URL`: Conexão com o PostgreSQL.
*   `SECRET_KEY`: Chave para segurança dos tokens JWT.
*   `SUPER_ADMIN_EMAIL` & `SUPER_ADMIN_PASSWORD`: Seus dados para o **primeiro login**.
*   `REGISTER_API_KEY`: Chave mestra para manutenção externa.

### 🌐 Configuração via Interface (UI)
Após o primeiro login, você configura os seguintes itens diretamente no painel:
*   **WhatsApp**: IDs e Tokens da Meta API.
*   **Chatwoot**: URLs e Tokens de acesso.
*   **Infra**: RabbitMQ e S3/MinIO.

---

## 🚑 Troubleshooting (Manutenção)

Caso precise de manutenção, os scripts foram movidos para pastas organizadas:

*   **Destravar Banco de Dados:**
    `python backend/scripts/utils/kill_locks.py`
*   **Forçar Atualização de Esquema:**
    `python backend/scripts/database/force_schema_update.py`
*   **Verificar Conexão:**
    `python backend/scripts/checks/check_infra.py`

---

## 🏆 Marco v1.0
Esta versão marca a maturidade do projeto, com foco em:
1.  **Segurança**: Isolamento total de credenciais.
2.  **Organização**: Estrutura de pastas profissional.
3.  **Simplicidade**: Configuração via interface amigável.
4.  **Estabilidade**: Processamento de filas via Worker dedicado.

**Desenvolvido para escala e confiabilidade.** 🚀
