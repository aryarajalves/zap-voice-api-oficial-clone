# ⚡ ZapVoice - Automação WhatsApp API Oficial (v1.0 Official)

Bem-vindo à versão **1.0 oficial** do **ZapVoice**! Este é um sistema robusto e profissional para o gerenciamento de automação de alta performance utilizando a **API Oficial do WhatsApp (Meta)**.

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

**Produção (App Only):**
```bash
docker-compose -f docker/docker-compose.yml up -d --build
```

---

## 🏆 Marco v1.0
*   **Foco na API Oficial**: Estabilidade garantida pela Meta.
*   **Mídias Ricas**: Suporte a Vídeo, Imagem e PDF (Sem áudio).
*   **Simplicidade**: 100% configurável via interface gráfica.

**Escalando seu negócio com a API Oficial do WhatsApp.** 🚀
