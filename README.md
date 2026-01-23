# ⚡ ZapVoice - Automação Chatwoot + WhatsApp (v1.0 Official)

Bem-vindo à versão **1.0 oficial** do **ZapVoice**! Este é um sistema robusto e profissional de automação de marketing e atendimento, projetado para transformar seu **Chatwoot** em uma máquina de vendas e engajamento.

---

## 🚀 O que o ZapVoice faz?

O **ZapVoice** foi configurado para ser a solução definitiva em automação para WhatsApp Business API (Meta):

*   **Disparos em Massa (Bulk Send):** Envie templates aprovados para milhares de contatos com alta performance.
*   **Funis de Mensagens Inteligentes:** Crie réguas de relacionamento complexas com vídeos, imagens e PDFs, intercalados por delays inteligentes.
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

## � Primeiro Acesso e Sistema de Login

O ZapVoice utiliza um sistema de autenticação segura baseado em JWT (Tokens).

### **Como funciona o Primeiro Acesso:**
Ao subir o sistema pela primeira vez (via Docker ou local), o ZapVoice cria automaticamente um usuário **Super Admin** utilizando as credenciais definidas no seu arquivo `.env` ou nas variáveis de ambiente do Docker:

*   `SUPER_ADMIN_EMAIL`: Seu email de login principal.
*   `SUPER_ADMIN_PASSWORD`: Sua senha inicial segura.

**Importante:** Use estas credenciais para realizar seu primeiro login no sistema. Uma vez logado, você terá acesso total para configurar o sistema e criar novos usuários.

### **Gerenciamento de Usuários:**
Existem duas formas de gerenciar usuários:

1.  **Via Painel:** Como Super Admin, você pode criar, editar ou excluir usuários e gerenciar permissões diretamente na interface.
2.  **Via Script Administrativo (CLI):** Caso perca o acesso ao painel, você pode usar o script localizado em `backend/scripts/admin/create_admin.py`.
    *   No terminal do container: `python scripts/admin/create_admin.py`
    *   Este script permite listar usuários, resetar senhas e criar novos administradores.

---

## ⚙️ Configuração na Interface (UI)

Diferente de sistemas antigos, no ZapVoice v1.0 você não precisa editar arquivos de texto para configurar suas ferramentas. Tudo é feito de forma dinâmica no menu **Configurações/Settings**:

*   **WhatsApp (Meta API):** Configure seu `Phone Number ID`, `Business Account ID` e o `Access Token`.
*   **Chatwoot:** Conecte sua instância informando a URL e o Token da API do Chatwoot.
*   **Infraestrutura (RabbitMQ / S3):** Informe os endereços de conexão para que o sistema possa processar filas e arquivos.
    *   *Nota: No modo local, use `http://zapvoice-rabbit:5672` e `http://zapvoice-minio:9000`.*

---

## 🛠️ Como Iniciar

### 1. Escolha seu ambiente

#### **Ambiente Local (Desenvolvimento/Teste)**
Para subir tudo (Banco de Dados, Fila, MinIO e a App) de uma só vez:
```bash
docker-compose -f docker/docker-compose.local.yml up -d --build
```
*Acesse em: `http://localhost:5173` (Frontend) ou `http://localhost:8000` (API)*

#### **Ambiente de Produção**
Para rodar de forma enxuta em seu servidor (onde você já tem Postgres/Rabbit instalados separadamente):
```bash
docker-compose -f docker/docker-compose.yml up -d --build
```

---

## 🚑 Troubleshooting (Manutenção)

Caso precise de manutenção técnica:

*   **Destravar Banco de Dados:** `python backend/scripts/utils/kill_locks.py`
*   **Forçar Atualização de Esquema:** `python backend/scripts/database/force_schema_update.py`
*   **Verificar Conexão:** `python backend/scripts/checks/check_infra.py`

---

## 🏆 Marco v1.0
Esta versão marca a maturidade do projeto:
1.  **Sem Audio**: Foco em eficiência de mídia (Vídeo, Imagem, PDF).
2.  **Segurança**: Autenticação reforçada e proteção de dados.
3.  **Simplicidade**: Configuração 100% via interface amigável.
4.  **Estabilidade**: Processamento assíncrono garantido.

**Desenvolvido para escala e confiabilidade.** 🚀
