# ⚡ ZapVoice - Automação WhatsApp API Oficial (v3.7.15)

Bem-vindo à versão **3.7.15** do **ZapVoice**! Este é um ecossistema robusto e profissional para o gerenciamento de automação de alta performance utilizando a **API Oficial do WhatsApp (Meta)**.

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

---

## 📝 Changelog

### v3.7.15
- **Ajuste de Sobreposição no Monitor de Pipeline**: Elevação do `z-index` do `PipelineModal` para `z-[16000]` para que ele abra por cima do popup de "Funis Iniciados" (`z-[15000]`), permitindo interagir diretamente com o monitoramento sem a necessidade de fechar o popup anterior.
- **Controle de Zoom Premium**: Adicionados botões flutuantes de "Aumentar Zoom (+)", "Diminuir Zoom (-)" e "Centralizar Visualização" com design limpo, além de estender o zoom máximo para `3.0` e habilitar o controle suave e preciso via scroll do mouse (roda do mouse) através do ajuste de `preventScrolling={true}`.
- **Foco de Câmera Inteligente**: Modificada a centralização da câmera (auto-pan) para ocorrer de forma suave apenas no carregamento inicial do modal, evitando redirecionamentos indesejados nas transições de nós durante a execução em tempo real.
- **Layout Compacto e Responsivo**: Redução da altura do canvas de fluxo de `450px` para `350px` e otimização de paddings verticais para garantir que o rodapé e o botão "Fechar Pipeline" fiquem 100% visíveis em qualquer tela de notebook ou dispositivo móvel.
- **Correção de Leitura de Delays no Frontend**: Correção de bug de mapeamento de propriedades no `PipelineNode` do frontend, fazendo com que ele exiba o tempo exato configurado no funil (Fixo ou Aleatório) ao ler chaves como `data.time`, `data.unit`, `data.minTime` e `data.maxTime`, em vez de cair no fallback de 5 segundos.
- **Remoção do Botão "Ver Pipeline" no Histórico**: Ocultação do ícone azul de barras que abria o pipeline a partir da coluna de Ações na tabela do histórico geral de disparos (`TriggerTable.jsx`).
- **Remoção de Contact ID no Monitor de Pipeline**: Ocultação da chave de metadados `contact_id` (case-insensitive) na visualização dos passos do pipeline, limpando a interface.
- **Suíte de Testes Unitários de Interface**: Criação de testes unitários dedicados (`PipelineNode.test.jsx` e `PipelineModal.test.jsx`) e atualização do `PipelineFlowViewer.test.jsx` com cobertura total para renderização, sobreposição, novos botões de zoom e filtros de chaves de metadados.

### v3.7.14
- **Ocultação Condicional de Variáveis Adicionais / Cabeçalho (Novo!)**:
  - A seção "Variáveis Adicionais / Cabeçalho" agora é exibida condicionalmente com base na estrutura do template selecionado. Ela permanece totalmente oculta se o template não exigir variáveis dinâmicas, mídias de cabeçalho (Imagem/Vídeo/Documento) ou links dinâmicos de botões.
  - Correção na propriedade `header_type` no follow-up (`FollowUpSection.jsx`) para extrair corretamente mídias e links dinâmicos dos componentes internos da Meta, resolvendo um bug que impedia o mapeamento de mídias no follow-up.
  - Validação no frontend (`useIntegrations.js`) que impede salvar a integração com o follow-up ativo se nenhum template correspondente estiver selecionado.
  - **Suíte de Testes Aprovada**: Criação de testes unitários para a visibilidade de variáveis (`VariablesSection.test.jsx`) e cobertura de validação no salvamento do follow-up (`useIntegrations.test.jsx`).

### v3.7.13
- **Adição de Múltiplas Etiquetas e Atualização Imediata (Novo!)**:
  - Implementação de seleção e inserção múltipla de etiquetas em lote nos modais de contatos do histórico (`ContactsModal.jsx`) e integrações (`ContactsViewerModal.jsx`).
  - Envio de múltiplas tags de uma vez como string delimitada por vírgulas para a API do backend `/leads/bulk` (processadas e associadas adequadamente a cada contato no banco de dados).
  - Atualização local instantânea das etiquetas dos contatos nos modais após a gravação bem-sucedida, sem necessidade de recarregar a página.
  - Atualização da suíte de testes unitários do frontend (`ContactsModal.test.jsx`) contemplando cobertura para salvamento múltiplo e modificação de placeholder.

### v3.7.12
- **Criação de Etiquetas Customizadas e Exibição de Tags nos Contatos (Novo!)**:
  - Implementação de um input interativo `<input type="text">` com dropdown e overlay de fechamento nos modais de contatos do histórico de disparos (`ContactsModal.jsx`) e integrações (`ContactsViewerModal.jsx`), permitindo a digitação livre e cadastro de novas tags para o lead.
  - Exibição dinâmica das etiquetas ativas do lead (badges verdes do lado do número) em ambos os modais nos históricos.
  - **Rota do Backend Dedicada**: Criação do endpoint `/webhook-integrations/dispatches/{trigger_id}/contacts` no backend FastAPI para suprir o consumo de rede do frontend, associando tags a contatos.
  - **Correção de Sombreamento no Backend**: Correção de bug no parâmetro `filter` da rota de contatos que causava conflito com a função built-in `filter` do Python, eliminando erro de `TypeError` nos testes.
  - **Suítes de Testes Aprovadas**: Criação e execução bem-sucedida de testes unitários do backend (`test_webhooks_dispatches.py`) e frontend (`ContactsModal.test.jsx`).

### v3.7.11
- **Aprimoramento do Enquadramento e Foco do React Flow (Fluxo Visual)**:
  - Adicionadas as propriedades nativas `fitView` e `fitViewOptions={{ padding: 0.3 }}` no componente `<ReactFlow>` em `PipelineFlowViewer.jsx`, garantindo que os nós sejam centralizados e enquadrados automaticamente na tela assim que o canvas é montado, mesmo que eles estejam bastante deslocados (ex: a partir de `x = 668`).
  - Execução bem-sucedida da suíte de testes unitários do frontend (`PipelineFlowViewer.test.jsx`).

### v3.7.10
- **Resolução de Bugs no Modal de Automação (Visualizador de Pipeline)**:
  - **Correção de Concorrência de Memória**: Adicionado `db.expire(trigger)` no executor visual (`graph_executor.py`) e legado (`legacy_executor.py`) antes de commits e alterações de propriedades, impedindo que o motor do funil sobrescreva as gravações assíncronas de status de memória do webhook (`success`/`failed`) feitas pelo worker.
  - **Resolução do ID da Conta do Chatwoot**: Ajustado o fallback padrão do ID da conta do Chatwoot para `"1"` no executor de funil e no endpoint de triggers caso a chave não esteja configurada no banco de dados, evitando exibir `ID CONTA: N/A`.
  - **Ajustes de Renderização e Câmera no React Flow**: 
    - Implementação de múltiplos disparos de `window.dispatchEvent(new Event('resize'))` e `fitView` agendados (100ms, 350ms e 700ms) após o modal ser montado. Isso resolve o problema de tela em branco/azul no carregamento inicial causado pela montagem do React Flow com dimensões zeradas (0x0) em modais animados do Tailwind.
    - Definição de altura rígida (`h-[450px] relative w-full`) no contêiner da aba do React Flow no frontend, garantindo o correto cálculo de dimensões.
    - Fallback no frontend para utilizar `trigger.chatwoot_url` resolvida pela API caso a URL global do Chatwoot do cliente ativo não esteja carregada no estado global.
  - **Suíte de Testes Aprovada**: Adicionado teste unitário de backend validando a resolução de fallback do ID de conta do Chatwoot para `1`.

### v3.7.9
- **Análise Inteligente de Resposta com IA (Novo!)**:
  - Integração do modelo de análise por Inteligência Artificial (`gpt-5-mini` com fallback automático de contingência para `gpt-4o-mini`) sob a opção de validação "Análise de Resposta (IA)" do nó de Condição Inteligente.
  - Implementação de rastreabilidade completa gravando o modelo de IA de fato utilizado para a validação do fluxo do contato nos logs de execução do nó.
  - Adição de aba dedicada de **"Critérios de Sucesso"** no frontend (`ConditionNode.jsx`), permitindo ao usuário descrever em linguagem natural quais critérios e regras de negócio definem uma resposta positiva/válida (ex. aceitar agendamento, propor horário alternativo).
  - Implementação de tratamento resiliente de erros na API da OpenAI, direcionando a execução do fluxo para a nova saída dedicada **"Erro / Falha" (laranja)**.
- **Suíte de Testes e Conectividade**:
  - Criação de testes unitários robustos de backend (`test_condition_ai.py`) cobrindo fallbacks, sucesso da IA, erro de chamada e validação de prompt.
  - Criação de testes unitários no frontend (`ConditionNode.test.jsx`) garantindo a estabilidade e funcionamento de alternância de abas, renderização de campos e chamadas ao callback `onChange`.

### v3.7.8
- **Visualizador de Logs do Funil Visual (Estilo ManyChat) [NOVO]**:
  - Implementação gráfica interativa do fluxo de execução do funil no modal de pipeline utilizando o React Flow, com enquadramento de câmera inteligente automático centrado no nó ativo (`current_node_id`).
  - Criação de nós customizados neon e responsivos (`PipelineNode.jsx`) e caminhos animados dinâmicos (`PipelineFlowViewer.jsx`) mapeando status em tempo real.
  - Adição de aba de alternância fluida entre "Fluxo Visual" e "Linha do Tempo" cronológica e botão "Ver Pipeline" de monitoramento rápido no Histórico de Disparos.
- **Controle de Tolerância e Filtro de Disparos Recorrentes**:
  - Implementado limitador de tolerância de 30 minutos no Scheduler para evitar disparos fora do horário programado.
  - Adicionado filtro de "Disparos Recorrentes" e respectivo status "Abortado" por limite de tolerância excedido.
- **Suíte de Testes Aprovada**: Criação e validação de 5 testes unitários complexos específicos para o visualizador de fluxos do pipeline.

### v3.7.7
- **Correções Críticas e Otimizações de Fluxo (Novo!)**:
  - **Webhook de Memória IA**: O backend agora resolve o conteúdo real dos templates do WhatsApp (substituindo variáveis dinâmicas) antes de enviá-los ao webhook de memória do agente de IA, ao invés de apenas transmitir o nome do template.
  - **Notificação Automática de Entrega**: Disparo automático do webhook de memória para todos os templates do WhatsApp que forem entregues com sucesso, não se limitando apenas a disparos em massa.
  - **Correção da Nota Privada de Follow-up**: Correção do fluxo onde notas privadas automáticas dos follow-ups agendados não eram publicadas na conversa correspondente no Chatwoot.
  - **Prevenção de Notas Duplicadas**: Ajustado o fluxo de envio em massa (Bulk Send) para evitar o registro duplicado de notas privadas para o mesmo contato no histórico do Chatwoot.
  - **Validação de Tempo de Espera do Follow-up**:
    - **Frontend**: Validação no hook `useIntegrations.js` que impede o salvamento de integrações se o follow-up estiver ativo com valor de atraso inválido (vazio, nulo ou menor que 1).
    - **Backend**: Validação robusta nos roteadores `POST` e `PUT` da API (`integrations.py`) retornando HTTP 400 em caso de valores inválidos.
    - **Suíte de Testes**: Testes automatizados dedicados de backend (`test_webhook_followup_saving.py`) e frontend (`useIntegrations.test.jsx`) validando o tratamento de atraso do follow-up.
  - **Filtro por Etiquetas (Tags) em Dropdowns**:
    - **Mapeamento de Integrações & Funil**: Adicionado suporte à filtragem rápida e inteligente por etiquetas nos dropdowns de templates do WhatsApp na interface.
    - **SearchableSelect**: Substituição de seletores padrão no Flow Builder por um dropdown pesquisável dinâmico com filtragem de tags de templates.
  - **Classificação de Templates por Etiquetas (Tags)**:
    - Implementação de etiquetas locais para categorização de templates diretamente nos cards em "Meus Templates".
    - Persistência e sincronização de banco de dados local mantendo tags intactas mesmo após atualizações vindas da Meta WhatsApp API.
  - **Controle de Acesso Baseado em Funções (RBAC)**:
    - Implementação de restrições finas de acesso de acordo com os papéis do usuário (`admin`, `premium` e `user`) tanto no frontend (ocultação de abas e botões confidenciais na Sidebar e Configurações) quanto no backend FastAPI (validadores de rota `require_admin` e `require_premium`).
- **Suíte de Testes e Provas Visuais**: Criação de testes automatizados dedicados à segurança do RBAC (`test_17_rbac_permissions.py`) com 100% de sucesso e geração de capturas de tela automatizadas via Playwright para cada um dos papéis de usuário.

### v3.7.6
- **Gestão de Links de Convite (Novo!)**: Aba dedicada incorporada ao painel de "Gestão de Usuários" permitindo listar todos os convites criados, ver status (PENDENTE, UTILIZADO ou EXPIRADO), cargos atribuídos e acessos a clientes permitidos.
- **Ações de Cópia e Revogação**: Copiar link direto de convite com feedback visual instantâneo e revogar convite usando modal de confirmação persistente com fundo escurecido (backdrop blur).
- **Proteção Autofill de Formulários**: Adicionados inputs vazios camuflados para impedir que navegadores pré-preencham credenciais indevidamente nos campos da tela de registro de convites (`InviteRegister`).
- **Suíte de Testes Unitários de Convites**: Cobertura de backend com 11 testes integrados aprovados validando o fluxo completo de criação, consulta, ativação e deleção dos links.

### v3.7.5
- **Suporte ao Primeiro Nome do Contato**: Implementação da resolução e extração dinâmica da variável `primeiro_nome` / `first_name` a partir do nome completo do contato no backend e adaptação de substituição nos templates de webhooks, funis de mensagens e disparos em massa.
- **Mapeamento na Interface (UI)**: Inclusão de opções dedicadas à variável "Primeiro Nome" em seletores visuais em três locais estratégicos: mapeamento de campos dinâmicos em Webhooks, menu de variáveis rápidas no editor do Visual Flow Builder e mapeamento de parâmetros nos Agendamentos Recorrentes.
- **Suíte de Testes Unitários**: Criação e aprovação do arquivo `test_first_name_rendering.py` para garantir o funcionamento ideal de parsing, fallback e sanidade na renderização do primeiro nome.

### v3.7.4
- **Correção no Teste de Webhook (Actions)**: Validação robusta de UUID para `integration_id` e classificação automática de status para `skipped` com erro amigável em português se nenhum mapeamento ativo para o evento detectado for encontrado.
- **Resiliência e Auto-Fix no Sincronizar Tudo**: Introdução de limpeza automática no processamento em lote ("Sincronizar Tudo") que detecta registros `'pending'` anteriores órfãos de mapeamento ativo e os reclassifica retroativamente para `'skipped'`.
- **Ajuste Estético no TemplateGuide**: Alinhamento do guia de templates do frontend ao padrão estético premium do design system (fechamento forçado apenas pelo botão do rodapé e remoção de clique fora/botão close do topo).
- **Adequação da Suíte de Testes**: Atualização de referências de imports obsoletos nos testes unitários legados e criação de novos testes dedicados (`test_sync_all_pending_fix.py` e `test_webhook_test_action.py`) com cobertura total.

### v3.7.3
- **Mapeamento Completo de Webhooks Hotmart**: Implementação de suporte para 12 tipos de payloads e eventos da Hotmart (incluindo `PURCHASE_COMPLETE`, `PURCHASE_BILLET_PRINTED` via PIX/Boleto, `PURCHASE_CHARGEBACK`, `PURCHASE_PROTEST`, `PURCHASE_DELAYED`, `PURCHASE_EXPIRED`, `PURCHASE_OUT_OF_SHOPPING_CART`, `SUBSCRIPTION_CANCELLATION`, `SWITCH_PLAN`, `UPDATE_SUBSCRIPTION_CHARGE_DATE` e eventos do Club/Área de Membros), convertendo-os para os respectivos status e tipos de eventos apropriados (`compra_aprovada`, `reembolso`, `boleto_impresso`, `pix_gerado`, `cartao_recusado`, `carrinho_abandonado`, `pix_expirado`, `outros`, e `evento_aluno`).
- **Resiliência no parsing da Hotmart**: Adição de extração alternativa a partir de `subscription.user` (para recuperar e-mail e nome) em webhooks como `SWITCH_PLAN` que não contêm o objeto `buyer` ou `subscriber`.
- **Tradução Global de Métodos de Pagamento**: Normalização e tradução no final do parser para padronizar todos os métodos de pagamento recebidos das plataformas em português do Brasil (ex: "Cartão de Crédito", "Boleto", "Pix").
- **Correção de Parser de Itens Eduzz**: Resolução de bug na extração de múltiplos itens no checkout da Eduzz para popular corretamente a chave `items` com os preços numéricos associados.
- **Suíte de Testes Unitários de Integração**: Adição de 12 novos testes unitários que garantem a cobertura e funcionamento ideal de todos os fluxos de webhooks da Hotmart e Eduzz.

### v3.7.2
- **Tradução e Ajuste de Status de Webhook (Eduzz)**: Correção e tradução dos novos status da Eduzz (`open` para `"Aguardando o Pagamento"` e `waiting_refund` para `"Aguardando Reembolso"`), garantindo consistência na normalização do payload pelo backend.
- **Alertas Amigáveis de Erro no Frontend**: Atualização do componente de logs do histórico de webhook para tratar falhas e alertas de processamento como avisos visuais amigáveis (em português) em vez de logs de erro em inglês, mantendo a experiência do usuário clara e premium.
- **Testes Unitários de Tradução**: Suíte de testes unitários do backend atualizada com cobertura completa para os novos estados traduzidos do checkout Eduzz/Órbita.

### v3.7.1
- **Correção de Duplicação de Mensagens no WhatsApp**: Refatoração e tratamento robusto do parâmetro `ensure_conversation` no processamento de mensagens e execuções de funis (nos arquivos `whatsapp.py` e `executor.py`), aceitando inputs tanto em string JSON serializada quanto em dicionários de dados nativos.
- **Melhorias de Testes Unitários**: Ajuste do mock síncrono para assíncrono em `test_conversation_selection.py` e implementação de testes unitários dedicados à validação do parsing em `test_ensure_conversation_parsing.py`.

### v3.7.0
- **Horário Comercial Configurável no Follow-up**: Implementação de restrição de envio de follow-up a horários e dias da semana comerciais configuráveis por mapeamento de webhook.
- **Validação e Reagendamento de Disparos**: Algoritmo que calcula se o horário previsto para o follow-up está dentro da janela definida. Se fora, posterga o agendamento automaticamente para o início do horário comercial do próximo dia útil permitido.
- **Persistência Completa e Testes Unitários**: Atualizados os roteadores (POST/PUT) do FastAPI para persistir os campos, criados esquemas de banco e elaborada suíte de testes unitários integrada com sucesso.

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