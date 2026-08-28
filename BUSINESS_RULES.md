# 📋 Regras de Negócio e UX - ZapVoice

Este documento centraliza as definições de comportamento do sistema e os requisitos de interface para garantir uma experiência "Premium".

## 🛠️ Regras de Negócio Centrais

### 1. Gestão de Janela de 24h (Meta) e Deduplicação de Templates
- Mensagens de sessão (texto livre) só podem ser enviadas se o usuário interagiu nas últimas 24h.
- Fora dessa janela, apenas **Templates aprovados pela Meta** podem ser iniciados.
- O sistema deve validar automaticamente se o envio é permitido ou se deve usar um template.
- **Trava de Deduplicação de 24h para Templates (Bloqueio Total)**: Se um template foi enviado para o número sem erro nas últimas 24 horas (seja via Template Pago da Meta ou via Mensagem Livre/Smart Send com status `sent`, `delivered` ou `read`), o sistema bloqueia qualquer reenvio duplicado do mesmo template para aquele número pelo período de 24 horas (comparando DDD + número com 10 dígitos). Apenas erros de envio (`failed`) não bloqueiam o reenvio. Para forçar o reenvio antes das 24h, o usuário pode remover a trava na aba Contatos.

### 2. Fluxo de Webhooks e Automação
- **Slugs Customizados**: Cada integração possui uma URL única (ex: `/api/webhooks/venda-vip`).
- **Mapeamento de Eventos**: O usuário define qual Funil ou Template dispara para cada status (Boleto, Aprovado, Reembolso).
- **Filtro de Produtos**: Possibilidade de ignorar eventos de produtos que não estão na "White List".
- **Webhook de Memória em Disparos em Massa**: Quando o Webhook de Memória do Agente está configurado, o sistema envia automaticamente para essa URL todas as mensagens de disparos em massa (Bulk) que são de fato entregues (status delivered/read) no WhatsApp do contato.

### 3. Regras de Cancelamento
- Se um novo evento chega para o mesmo contato (ex: "Compra Aprovada"), o sistema deve ser capaz de cancelar execuções pendentes de eventos anteriores (ex: "Boleto Gerado").

### 4. Integração com Chatwoot (CRM)
- [x] **Fluxo de Sincronização de Notas/Etiquetas**:
    - **Delay Inteligente**: Aguardar 5 segundos apenas após a confirmação de que o template chegou ao WhatsApp do contato (uma única vez).
    - **Busca/Criação**: Localizar a última conversa ou criar uma nova se não existir.
    - **Gestão de Etiquetas**: Sempre adicionar novas etiquetas às existentes (modo Append), preservando o histórico do contato.
    - **Nota Privada**: Postar o conteúdo do disparo como Nota Privada se configurado na UI. *Nota: Para disparos em massa, nenhuma nota privada deve ser enviada (desativado completamente).*

### 5. Gestão de Blacklist e Retentativas
- **Isolamento de Blacklist**: A lista de contatos bloqueados é 100% isolada por cliente (`client_id`), sem compartilhamento global.
- **Política de Retentativa**: Em caso de falha temporária da Meta, o sistema deve tentar o reenvio **5 vezes**, com um intervalo de **5 segundos** entre cada tentativa.

### 6. Integração com ManyChat
- **Sincronização de Etiquetas**: 
    - O ZapVoice atua enviando etiquetas para o ManyChat.
    - **Fluxo**: Verificar se o contato existe (pelo número); se não, criar o contato com Nome e Número; verificar se a etiqueta existe; se não, criar a etiqueta antes de aplicá-la.

### 7. Performance e Filas
- **Prioridade**: O sistema utiliza uma fila única por tipo de processo (Bulk, Funnel, Webhook) sem priorização entre eventos de venda e marketing.

### 8. Hierarquia e Interação de Funis
- **Gatilho por Botão**: Todo clique em botão de template (independente se o envio foi via Disparo em Massa ou Integração Webhook) que corresponda a uma palavra-chave de um funil deve iniciar a automação correspondente.
- **Rastreamento de Interação**: O clique é detectado pelo handler de WhatsApp (Meta), que marca a mensagem como "Interagida" e incrementa o contador de **Interações (👆)** no disparo pai.
- **Processamento via Chatwoot**: Para garantir a estabilidade da conversa e a disponibilidade dos IDs (`conversation_id`, `account_id`), o disparo efetivo do funil filho é realizado pelo webhook de entrada do Chatwoot (`message_created`).
- **Delay de Segurança**: O sistema aplica um delay obrigatório de **7 segundos** (via Background Task) após o recebimento do webhook do Chatwoot antes de iniciar a execução do funil.
- **Vínculo Hierárquico (`parent_id`)**: O funil filho é criado vinculando o `trigger_id` do disparo original. 
- **UX no Histórico**: 
    - Funis filhos são ocultados da listagem principal para evitar poluição visual.
    - Eles são acessíveis exclusivamente através do botão **"Funis Ativados (🔄)"** presente na linha do disparo pai no histórico de disparos.

### 9. Calendário e Aba de Agendamentos (`schedules`)
- **Filtro de Visibilidade**: A aba/calendário de Agendamentos exibe **exclusivamente** os disparos em massa agendados e os agendamentos diretos de funis principais criados pelo usuário.
- **Ocultação de Nós de Delay de Funil**: Execuções individuais de contatos navegando em nós de delay dentro de um funil (`current_node_id`, `contact_phone`, `parent_id` ou `HIDDEN_CHILD`) **não são exibidas no calendário de agendamentos** para evitar poluição visual e manter a clareza da agenda.

---

## 🖥️ Detalhamento das Telas e UX

Abaixo, detalho cada tela identificada no sistema e as dúvidas que precisamos sanar para levar a interface ao próximo nível.

### 1. Dashboard / Disparo em Massa (`bulk_sender`)
- **Propósito**: Realizar envios rápidos de templates para listas de contatos.
- **Funcionalidades**: Upload de CSV/Excel, seleção de template, mapeamento de variáveis.
- **Dúvidas UI/UX**:
    - [x] Como deve ser o feedback visual durante um disparo de 10.000 contatos?
        - **Resposta**: O usuário é redirecionado para a tela de Histórico, onde acompanha o progresso em tempo real.
    - [x] Devemos permitir o agendamento direto nesta tela ou apenas disparo imediato?
        - **Resposta**: O agendamento já existe ao final da tela de disparo em massa, além da tela específica para disparos recorrentes.

### 2. Editor de Funis (`VisualFlowBuilder`)
- **Propósito**: Construir réguas de automação visualmente.
- **Funcionalidades**: Drag-and-drop de blocos de Mensagem, Áudio, Imagem, Vídeo e Delays.
- **Dúvidas UI/UX**:
    - [x] O editor deve ter um modo "Auto-Layout" para organizar os blocos sozinhos ou o usuário deve ter controle total da posição?
        - **Resposta**: Controle manual. O formato atual está funcionando bem.
    - [x] Existe a necessidade de blocos condicionais (ex: SE tem a etiqueta X, ENTÃO vá para o passo Y)?
        - **Resposta**: Por enquanto não. A estrutura atual já é suficiente para as necessidades do projeto.

### 3. Integrações Webhook (`integrations`)
- **Propósito**: Configurar o recebimento de dados de plataformas externas.
- **Dúvidas UI/UX**:
    - [x] Devemos ter um "Testador de Webhook" integrado que simula um payload para validar se o funil dispara corretamente?
        - **Resposta**: Já existe um botão "Testar" que cumpre essa função.
- **Integração ZapGroup (Extração de Leads e Votos em Enquetes)**:
    - O payload enviado pelo ZapGroup possui suporte a dois eventos principais: `lead_extraido` (quando um participante é extraído) e `voto_enquete` (quando um participante vota em uma enquete do grupo).
    - O campo `grupo` (objeto ou string) é mapeado como `product_name` (nome do grupo no WhatsApp).
    - No evento `voto_enquete`, o sistema extrai e disponibiliza as variáveis personalizadas `titulo_enquete`, `opcao_marcada` e `opcoes_marcadas` para serem usadas nos templates e funis de disparo.

### 4. Gestão de Leads (`leads`)
- **Propósito**: Visualizar os contatos que entraram via webhook e seu status.
- **Dúvidas UI/UX**:
    - [x] O usuário deve poder disparar um funil manualmente para um lead específico diretamente desta lista?
        - **Resposta**: Não é necessário nesta tela, pois o disparo manual já pode ser feito através do Histórico na tela de Integrações.

### 5. Financeiro (`financial`)
- **Propósito**: Controle de custos da API da Meta e faturamento.
- **Dúvidas UI/UX**:
    - [x] Os custos devem ser exibidos apenas em Reais (BRL) ou também na moeda original da Meta (USD)?
        - **Resposta**: 100% em Reais (BRL).

### 6. Histórico de Disparos (`history`)
- **Propósito**: Auditoria de tudo que foi enviado.
- **Dúvidas UI/UX**:
    - [x] Devemos ter um botão de "Re-disparar apenas falhas" de forma global para um lote específico?
        - **Resposta**: Não. O comportamento atual do Histórico já é suficiente.
- **Legenda de Monitoramento (Ícones)**:
    - 🚀 **Total**: Contatos totais da lista.
    - ✅ **Enviados**: Entregues à API da Meta.
    - 📬 **Entregues**: Confirmados no aparelho do contato.
    - 👀 **Lidos**: Visualizados pelo usuário.
    - 👆 **Interações**: Cliques em botões ou respostas.
    - 🚫 **Bloqueios**: Números inválidos ou bloqueados.
    - ⏭️ **Pulados**: Contatos ignorados pelo check de 24h (template já enviado recentemente).
    - ❌ **Falhas**: Erros de processamento ou API.
    - 🔄 **Funis Ativados**: Automações disparadas via botão.
    - 🆓 **Grátis**: Mensagens de sessão (janela 24h).
    - 💰 **Custo**: Valor total em BRL.

---

## 📋 Perguntas de Negócio em Aberto

Abaixo estão as perguntas sobre mecânicas de fundo que ainda não estão documentadas:

- [x] **Regras de Cancelamento Cruzado:** Se um cliente compra o "Produto A", devemos cancelar funis pendentes do "Produto B" ou apenas os funis relacionados ao "Produto A"?
    - **Resposta**: Apenas os funis do mesmo produto. Além disso, o sistema deve respeitar a configuração do dropdown que indica quais eventos específicos devem disparar o cancelamento.
- [x] [NOVO] Como o sistema deve se comportar se o Worker cair durante um disparo em massa? Deve haver um botão de "Retomar" automático?
    - **Resposta**: Sim, deve haver um botão "Retomar" que continue o envio exatamente de onde parou (utilizando a lista de contatos pendentes).
- [x] [NOVO] No histórico, disparos que ficam "travados" por mais de X horas devem ser marcados como falha automaticamente?
    - **Resposta**: Sim. Disparos travados em `processing` ou `queued` por mais de 2 horas serão marcados como falha pelo Scheduler, com a mensagem: "Disparo travado: O tempo limite de processamento (2h) foi excedido".
- [x] [NOVO] O trigger filho gerado para a execução do funil pós-template deve herdar as mesmas etiquetas do Chatwoot (`chatwoot_label`) do disparo pai de template?
    - **Resposta**: Sim, o trigger filho herdará as mesmas etiquetas para garantir a consistência das tags.
- [x] [NOVO] Caso o template falhe em ser enviado pela API da Meta, o funil filho associado não deve ser criado nem executado, marcando apenas o template como falha. Concorda com este comportamento?
    - **Resposta**: Sim, se o envio do template pai falhar, o funil filho correspondente não será criado nem executado.
- [x] [NOVO] No nó de agendamento de data (DateNode), a tolerância de atraso deve ser configurada em minutos, horas ou ambos?
    - **Resposta**: Ambos. O sistema permitirá selecionar a unidade (minutos ou horas) na interface.
- [x] [NOVO] Caso a execução seja considerada "atrasada" e siga para o caminho `late`, mas o usuário não tenha conectado nenhum nó a esta porta, o fluxo deve ser encerrado ou seguir pelo caminho `default` como fallback?
    - **Resposta**: Deve ser encerrado (o fluxo de automação é finalizado se a porta `late` não possuir nenhuma conexão).
- [x] [NOVO] Ao agendar um disparo em massa utilizando Etiquetas, o sistema deve permitir uma opção para buscar dinamicamente os contatos atualizados da etiqueta no momento exato do disparo (capturando novos leads que entraram na etiqueta após a criação do agendamento)?
    - **Resposta**: Sim. Ao marcar essa opção, no momento da execução o worker re-consulta o Chatwoot e inclui os novos contatos. No Histórico, o número total (🚀 Total) refletirá a contagem final atualizada no momento do envio. Na aba de Agendamentos, será exibido o indicador `🔄 Dinâmico (Etiqueta)` e a quantidade estimada/atualizada.

- [ ] [NOVO] Ao enviar uma mensagem manual ou por template a partir do Chat Local (ZapVoice), o sistema deve aplicar alguma etiqueta automaticamente ao contato? Se sim, qual etiqueta e sob quais condições?
- [x] [NOVO] **E-mail Marketing (Provedor):** O envio de e-mails deve suportar SMTP próprio configurado por cliente ou suporte a APIs nativas (Resend, SendGrid, Amazon SES)?
    - **Resposta**: Suportar **Amazon SES** (Access Key + Secret Key), **Resend** (API Key) e **SMTP Customizado**.
- [x] [NOVO] **E-mail Marketing (Editor):** O editor inicial de templates de e-mail deve ser Rich Text / HTML ou Drag-and-Drop visual?
    - **Resposta**: Editor de Texto Versão 01 (Rich Text + HTML + Variáveis dinâmicas).
- [x] [NOVO] **E-mail Marketing (Rastreamento):** Devemos incluir rastreamento de aberturas (Pixel transparent 1px) e cliques em links nos e-mails disparados?
    - **Resposta**: Não precisa nesta fase inicial. Focar na entrega rápida e histórico simples.
- [ ] [NOVO] **E-mail Marketing (Recebimento de Respostas / Inbound):** Devemos criar a aba **💬 Respostas Recebidas** no painel de E-mail Marketing para capturar via Webhook (Resend / Amazon SES / Cloudflare) e visualizar as respostas dos leads com opção de responder diretamente pelo ZapVoice?


## 📋 Histórico de Decisões
As perguntas iniciais sobre regras de negócio foram todas respondidas e integradas às seções acima. O sistema segue o modelo de isolamento total entre clientes e automação robusta com retentativas configuradas.

---
> 📋 **Documentação Atualizada:** Todas as pendências do BUSINESS_RULES.md foram sanadas.

> 📋 **Perguntas novas adicionadas ao BUSINESS_RULES.md:** Suporte a E-mail Marketing (Provedor, Editor de E-mail e Rastreamento de Aberturas/Cliques).
