# ⚡ ZapVoice - Automação WhatsApp API Oficial (v1.0 Official)

Bem-vindo à versão **1.0 oficial** do **ZapVoice**! Este é um sistema robusto e profissional focado em extrair o máximo poder da **API Oficial do WhatsApp (Meta)**. Projetado para automação de alta performance, disparos em massa e gerenciamento inteligente de fluxos de mensagens.

---

## 🚀 O que o ZapVoice faz?

O **ZapVoice** é a solução definitiva para escalar seu atendimento e marketing usando a infraestrutura oficial da Meta:

*   **WhatsApp API Oficial:** Integração direta e estável, garantindo a entrega e conformidade com as políticas da Meta.
*   **Disparos em Massa (Bulk Send):** Envie templates aprovados para milhares de contatos com alta velocidade e relatórios detalhados.
*   **Funis de Mensagens Inteligentes:** Crie réguas de relacionamento complexas com vídeos, imagens e PDFs, intercalados por delays inteligentes para simular interações humanas.
*   **Integração com Chatwoot:** Sincronização opcional e nativa para quem utiliza o Chatwoot como plataforma de atendimento.
*   **Configuração Dinâmica:** Gerencie suas chaves da API do WhatsApp, RabbitMQ e S3 diretamente pela interface do sistema.

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

## 🔐 Primeiro Acesso e Sistema de Login

O ZapVoice utiliza um sistema de autenticação segura baseado em JWT (Tokens).

### **Como funciona o Primeiro Acesso:**
Ao subir o sistema pela primeira vez, o ZapVoice cria automaticamente um usuário **Super Admin** com os dados definidos nas variáveis de ambiente:

*   `SUPER_ADMIN_EMAIL`: Seu email de login principal.
*   `SUPER_ADMIN_PASSWORD`: Sua senha inicial segura.

Use estas credenciais para realizar seu primeiro login. Uma vez logado, você poderá configurar toda a conectividade com a Meta.

---

## ⚙️ Configuração na Interface (UI)

Toda a gestão da API Oficial é feita diretamente no menu **Configurações/Settings**, sem necessidade de mexer em código:

*   **WhatsApp (Meta API):** Configure seu `Phone Number ID`, `Business Account ID` e o `System User Access Token` de forma simples.
*   **Chatwoot (Opcional):** Conecte sua instância para centralizar o histórico de conversas.
*   **Infraestrutura (RabbitMQ / S3):** Configure a fila de envios e o armazenamento de mídias pela interface.

---

## 🛠️ Como Iniciar

### 1. Escolha seu ambiente

#### **Ambiente Local (Teste/Instalação Zero)**
Para subir a stack completa (App + Banco + Fila):
```bash
docker-compose -f docker/docker-compose.local.yml up -d --build
```
*Acesse em: `http://localhost:5173`*

#### **Ambiente de Produção**
Para rodar no seu servidor final:
```bash
docker-compose -f docker/docker-compose.yml up -d --build
```

---

## 🚑 Troubleshooting (Manutenção)

*   **Destravar Banco de Dados:** `python backend/scripts/utils/kill_locks.py`
*   **Atualização de Esquema:** `python backend/scripts/database/force_schema_update.py`
*   **Check de Infra:** `python backend/scripts/checks/check_infra.py`

---

## 🏆 Marco v1.0
Focado em:
1.  **Estabilidade Meta API**: Máximo aproveitamento da API oficial.
2.  **Mídias de Alto Impacto**: Suporte completo a Vídeo, Imagem e PDF em funis.
3.  **Segurança e Privacidade**: Base de dados local e criptografia de tokens.
4.  **Autonomia**: Configuração amigável via interface.

**Escalando seu negócio com a API Oficial do WhatsApp.** 🚀
