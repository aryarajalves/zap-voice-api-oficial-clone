# ⚡ ZapVoice - Automação WhatsApp API Oficial (v3.5.3)

Bem-vindo à versão **3.5.3** do **ZapVoice**! Este é um ecossistema robusto e profissional para o gerenciamento de automação de alta performance utilizando a **API Oficial do WhatsApp (Meta)**.

---

## 🚀 O que o ZapVoice faz?

O **ZapVoice** é a solução definitiva para escalar seu marketing e atendimento com estabilidade, segurança e uma interface **Premium (Glassmorphism)**:

*   **WhatsApp API Oficial:** Integração estável e segura seguindo todas as diretrizes da Meta, garantindo maior entrega e menor risco de banimento.
*   **Disparos em Massa (Bulk Send):** Envio de templates aprovados para milhares de contatos com alta velocidade e monitoramento em tempo real.
*   **Funis de Mensagens Inteligentes:** Réguas de relacionamento automáticas com suporte a Vídeos, Imagens, PDFs e Áudios.
*   **Integrações Avançadas (Webhooks):** Conecte-se nativamente com Hotmart, Kiwify, Eduzz e Elementor.
*   **Slugs Personalizados:** Crie URLs de webhook amigáveis (ex: `https://api.dominio.com/api/webhooks/venda-vip`) para facilitar a organização.
*   **Gestão Multi-Cliente:** Arquitetura multi-tenant que permite isolar dados e configurações para diferentes empresas em uma única instância.

---

## 📺 Funcionalidades de Destaque

### **1. Webhook Integrations (Novo!)**
Conecte suas plataformas de vendas em segundos. O sistema processa eventos de checkout, boleto gerado e compra aprovada automaticamente.
- **Mapeamento Flexível**: Defina qual funil disparar para cada tipo de evento.
- **Filtro de Produtos**: Escolha processar webhooks apenas de produtos específicos.
- **URLs Amigáveis**: Use slugs customizados para suas integrações.

### **2. Funnel Builder Visual**
Crie automações complexas com uma interface visual intuitiva.
- **Delays Inteligentes**: Configure intervalos entre mensagens para simular comportamento humano.
- **Hierarquia de Funis**: Execute funis dentro de outros funis para criar árvores de decisão.

### **3. Monitoramento em Tempo Real**
Dashboard completo para acompanhar o status de cada disparo.
- **Logs Detalhados**: Saiba exatamente quando a mensagem foi entregue e lida.
- **Gestão de Custos**: Calculadora integrada para estimar gastos com a API da Meta.

### **4. Gestão de Contatos e Compliance**
- **Lista Negra (Blacklist)**: Bloqueio automático ou manual de números para evitar envios indesejados.
- **Monitoramento de Janelas**: Respeite a janela de 24h da Meta para envios de mensagens de sessão.

---

## ⚙️ Arquitetura Técnica

O ZapVoice utiliza uma stack moderna e escalável:
- **Backend**: FastAPI (Python 3.10+) com processamento assíncrono.
- **Frontend**: React + Vite com design system baseado em Glassmorphism e Tailwind.
- **Banco de Dados**: PostgreSQL para persistência de dados críticos.
- **Mensageria**: RabbitMQ para gestão de filas de disparos e eventos.
- **Cache/Session**: Redis para alta performance em tempo real.
- **Infra**: Docker e Docker Compose para deploy simplificado em qualquer VPS.

---

## 🏗️ Estrutura do Projeto

```text
/
├── docker/                  # Configurações de Deploy e entrypoints
├── backend/                 # API FastAPI, Services, Workers e Routers
│   ├── core/                # Configurações globais e logs
│   ├── models/              # Modelos de dados SQLAlchemy
│   ├── services/            # Lógica de negócio (WhatsApp, Webhooks, Funis)
│   └── routers/             # Endpoints da API organizados por módulo
├── frontend/                # Painel Administrativo React
│   ├── src/components/      # Componentes UI reutilizáveis
│   └── src/pages/           # Páginas e hooks de integração
└── README.md                # Documentação Oficial
```

---

## 🛠️ Como Iniciar (Quick Start)

**Local (Modo Desenvolvedor):**
```bash
docker-compose -f docker/docker-compose.local.yml up -d --build
```

Derrubar conexão fantasma com o banco:

psql -U postgres -d zapvoice -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'zapvoice' AND pid <> pg_backend_pid() AND state = 'idle';"




O sistema estará disponível em:
- **Frontend**: `http://localhost:5176`
- **API Docs**: `http://localhost:8000/docs`

---

## 🏆 Diferenciais Premium
*   **Design State-of-the-art**: Interface escura com efeitos neon e desfoque, pensada na melhor experiência do usuário.
*   **Alta Disponibilidade**: Sistema de filas que garante que nenhuma mensagem seja perdida, mesmo em picos de tráfego.
*   **Segurança**: Autenticação JWT e isolamento de banco de dados por cliente.

**ZapVoice - Escalando seu negócio com a inteligência da API Oficial.** 🚀



**Inicializar / Criar as tabelas faltantes manualmente no servidor caso precisse:**

docker exec zapvoice_zapvoice_app python fix_missing_webhook_columns.py