# ⚡ ZapVoice - Automação WhatsApp API Oficial (v3.6.2)

Bem-vindo à versão **3.6.2** do **ZapVoice**! Este é um ecossistema robusto e profissional para o gerenciamento de automação de alta performance utilizando a **API Oficial do WhatsApp (Meta)**.

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
Conecte suas plataformas de vendas em segundos. O sistema processa eventos de checkout, abandono de carrinho, boleto gerado, comissões financeiras e compras aprovadas automaticamente.
- **Mapeamento Flexível**: Defina qual funil disparar para cada tipo de evento (incluindo o novo tipo de **Evento de Aluno**).
- **Eduzz / Nutror / Sun / MyEduzz**: Suporte completo a múltiplos formatos de webhook da Eduzz:
  - **Nutror**: Eventos de alunos (visualização de aulas, conclusão de cursos, etc.) exibidos de forma simplificada como `"Evento do Aluno"`.
  - **Sun Checkout**: Captura automática de dados de leads de carrinhos abandonados (`sun.cart_abandonment`) a partir do objeto `customer`.
  - **MyEduzz**: Processamento resiliente de comissões de coprodução (`myeduzz.commission_processed`) sem conflito com disparos de venda.
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

---

## 📝 Changelog

### v3.6.3
- **Restrição de Conexão Única por Handle/Nó**: Limitação robusta no ReactFlow e na persistência para garantir que cada alça de saída (source) e cada nó de destino (target) possuam no máximo 1 ligação correspondente, evitando fluxos sobrepostos.
- **Validação de Horário Comercial na Retomada de Funis**: Webhook do WhatsApp valida o horário comercial ao retomar execuções suspensas. Caso o nó de destino tenha `onlyBusinessHours` habilitado e a interação aconteça fora do horário, a execução é automaticamente agendada para o próximo período comercial disponível.

### v3.6.2
- **Mensagens com Botões Interativos e Ramificação (Branching)**: Suporte completo à configuração de até 3 botões interativos nas mensagens do funil.
- **Conectores de Botões no Flow Builder**: Visualização premium com alças (handles) específicas para cada botão na lateral do nó, permitindo ligar cada resposta a nós diferentes, além de rótulo claro indicando a rota padrão.
- **Suspensão e Retomada de Funis**: Pausa automática na execução do funil quando botões são enviados, aguardando clique de botão ou mensagem do contato para prosseguir pela ramificação selecionada.
- **Notas Privadas de Fallback**: Sincronização automática em formato de nota privada no Chatwoot contendo cópia da mensagem e botões enviados.
- **Suporte a Follow-up e Normalização de Status Cancelado**: Implementada a automação de follow-up pós-disparo. O sistema agora reconhece e renderiza adequadamente os status de cancelamento `cancelled` (dois Ls) e `canceled` (um L) na tabela do histórico principal e no histórico de webhook com a legenda **"🚫 FOLLOW-UP CANCELADO"**.
- **Tradução e Ajuste de Modais**: Tradução amigável dos status de follow-up no modal para português brasileiro ("DISPARADO", "AGENDADO", "CANCELADO") e remoção do botão de monitoramento ao vivo para disparos do tipo follow-up.

### v3.6.1
- **Sincronização de Histórico no Chatwoot**: Envio assíncrono de notas privadas com o conteúdo renderizado do template e etiquetas pós-disparo em massa nos disparos em massa.

### v3.6.0
- **Suporte a Eventos de Aluno**: Integração simplificada e exibição de eventos do tipo "Evento do Aluno" (Nutror, etc.) na interface e logs.
- **Melhorias de Resiliência na Eduzz**: Parsing inteligente com suporte a DDI automático, captura de campos de telefone aninhados no checkout Órbita/MyEduzz.
- **Correção de UnboundLocalError**: Correção de escopo de variáveis no processamento de webhooks inbound do Chatwoot.
- **Histórico de Webhook Aprimorado**: Busca textual dinâmica por Nome e Telefone no painel de logs do histórico de webhook.
- **Estabilidade nos Testes Unitários**: Adaptação da infraestrutura de testes SQLite in-memory para rodar com 100% de sucesso.