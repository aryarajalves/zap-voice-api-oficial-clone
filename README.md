# ⚡ ZapVoice - Automação WhatsApp API Oficial (v2.8.5)

Bem-vindo à versão **2.8.5** do **ZapVoice**! Este é um sistema robusto e profissional para o gerenciamento de automação de alta performance utilizando a **API Oficial do WhatsApp (Meta)**.

---

## 🚀 O que o ZapVoice faz?

O **ZapVoice** é a solução definitiva para escalar seu marketing e atendimento com estabilidade e segurança:

*   **WhatsApp API Oficial:** Integração estável seguindo todas as políticas da Meta.
*   **Disparos em Massa (Bulk Send):** Envio de templates para milhares de contatos com alta velocidade.
*   **Funis de Mensagens:** Réguas de relacionamento automáticas com Vídeos, Imagens e PDFs.
*   **Gestão Multi-Cliente:** Controle múltiplos clientes e inboxes em uma única plataforma.
*   **Configuração Dinâmica:** Gerencie APIs e infraestrutura diretamente pelo painel.

---

## 📺 Conheça as Funcionalidades (Telas)

O sistema foi desenhado para ser intuitivo e poderoso:

### **1. Meus Funis**
A central de inteligência do sistema. Aqui você cria seus fluxos de mensagens, define gatilhos automáticos e pode disparar funis manualmente para listas de contatos. Cada funil pode ter múltiplas etapas com delays customizados.

### **2. Histórico de Disparos**
Transparência total sobre seus envios. Acompanhe em tempo real:
*   **Data/Hora** do disparo.
*   **Status detalhado** (Pendente, Enviado, Lido, Falhado).
*   **Relatórios de Massa**: Veja quantos contatos faltam e baixe relatórios de erro.

### **3. Contatos Bloqueados**
Segurança e compliance. Gerencie uma "Lista Negra" de números que nunca devem receber mensagens de automação. Você pode adicionar números manualmente por linha ou vírgula.

### **4. Gestão de Usuários**
Controle quem acessa o quê. Crie usuários com diferentes níveis de permissão (Admin, User) e defina a quais Clientes cada usuário tem acesso.

---

## 🔐 Primeiro Acesso e Login

O ZapVoice utiliza autenticação segura via JWT.

### **Como funciona o Primeiro Acesso:**
Ao instalar o sistema, ele cria automaticamente um **Super Admin** com os dados das variáveis de ambiente:
*   `SUPER_ADMIN_EMAIL`: Seu email de login.
*   `SUPER_ADMIN_PASSWORD`: Sua senha inicial.

### **Cadastro de Usuários:**
*   **Via Interface**: O Super Admin pode criar novos usuários no menu "Gestão de Usuários".
*   **Via CLI (Segurança)**: Se perder o acesso, use o script `python backend/scripts/admin/create_admin.py` dentro do container para listar ou resetar senhas.

---

## ⚙️ Configuração na Interface (UI)

Toda a conectividade é configurada no menu **Configurações**:
*   **WhatsApp API**: Phone ID, WABA ID e User Token da Meta.
*   **Infraestrutura**: Endereços do RabbitMQ e S3/MinIO.
*   **Chatwoot (Opcional)**: Conecte sua instância para centralizar o atendimento.

## 🗄️ Estrutura de Banco de Dados (PostgreSQL)

Quase todos os dados do sistema são armazenados em tabelas no PostgreSQL. Abaixo estão as principais tabelas e suas finalidades:

### **1. Estrutura de Negócio**
*   **`clients`**: Tabela mestre para multi-tenancy (isolamento de empresas/clientes).
*   **`users`**: Cadastro de usuários com níveis de acesso (Super Admin, Admin, User).
*   **`app_config`**: Guarda chaves de APIs, tokens e configurações alteradas via painel.

### **2. Funis e Campanhas**
*   **`funnels`**: Estrutura dos funis de mensagens e frases de gatilho.
*   **`global_variables`**: Variáveis para substituição dinâmica em mensagens (ex: `{{link}}`).
*   **`webhooks_configs`**: Configurações de URLs de entrada para integrações externas (Hotmart, etc).
*   **`webhooks_events`**: Log histórico de todos os eventos recebidos via webhook.

### **3. Histórico e Monitoramento**
*   **`scheduled_triggers`**: **Tabela principal de histórico.** Registra cada disparo (massa ou individual) e seu status.
*   **`message_status`**: Detalhamento em tempo real (Enviado, Lido, Clicado) de cada mensagem via API oficial.
*   **`product_status`**: Rastreia a jornada de compra do lead/cliente.

### **4. Controle e Compliance**
*   **`blocked_contacts`**: Lista negra de números que não devem receber automações.
*   **`contact_windows`**: Cache de interações de 24h para gerenciar o envio de mensagens diretas conforme as regras da Meta.
*   **`contatos_monitorados`**: Tabela que armazena automaticamente os dados de contatos que interagiram (Nome, Número, Inbox e Data).

clients,
users,
app_config,
funnels,
global_variables,
webhooks_configs,
webhooks_events,
scheduled_triggers,
message_status,
product_status,
blocked_contacts,
contact_windows,
contatos_monitorados

---

## 🏗️ Estrutura do Projeto

```text
/
├── docker/                  # Configurações de Deploy (Local e Produção)
├── backend/                 # API FastAPI (Python) e Scripts Utilitários
├── frontend/                # Painel Administrativo (React + Vite)
└── README.md                # Documentação Oficial
```

---

## 🛠️ Como Iniciar

**Local (Full Stack):**
```bash
docker-compose -f docker/docker-compose.local.yml up -d --build
```

docker restart zapvoice_app zapvoice_worker

docker compose -f docker/docker-compose.local.yml up --build -d zapvoice_app


**Produção (App Only):**
```bash
docker-compose -f docker/docker-compose.yml up -d --build
```

### **Docker Build & Push (Deploy)**
Para gerar a imagem de produção e enviar para o Docker Hub:

3. Build da Imagem:
```bash
docker build -t aryarajalves/zap-voice-funil-api-oficial-zap:3.1.2 -f docker/Dockerfile .
```

4. Push da Imagem:
```bash
docker push aryarajalves/zap-voice-funil-api-oficial-zap:3.1.2
```
*(Versão atual: 3.1.2 - Label Application & Stability)*

---

## 🏆 Marco v1.0
*   **Foco na API Oficial**: Estabilidade garantida pela Meta.
*   **Mídias Ricas**: Suporte a Vídeo, Imagem e PDF (Sem áudio).
*   **Simplicidade**: 100% configurável via interface gráfica.

**Escalando seu negócio com a API Oficial do WhatsApp.** 🚀
