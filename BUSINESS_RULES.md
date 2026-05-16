# 📋 Regras de Negócio e UX - ZapVoice

Este documento centraliza as definições de comportamento do sistema e os requisitos de interface para garantir uma experiência "Premium".

## 🛠️ Regras de Negócio Centrais

### 1. Gestão de Janela de 24h (Meta)
- Mensagens de sessão (texto livre) só podem ser enviadas se o usuário interagiu nas últimas 24h.
- Fora dessa janela, apenas **Templates aprovados pela Meta** podem ser iniciados.
- O sistema deve validar automaticamente se o envio é permitido ou se deve usar um template.

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
    - **Nota Privada**: Postar o conteúdo do disparo como Nota Privada se configurado na UI.

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

## 📋 Histórico de Decisões
As perguntas iniciais sobre regras de negócio foram todas respondidas e integradas às seções acima. O sistema segue o modelo de isolamento total entre clientes e automação robusta com retentativas configuradas.

---
> 📋 **Documentação Atualizada:** Todas as pendências do BUSINESS_RULES.md foram sanadas.

> 📋 **Perguntas novas adicionadas ao BUSINESS_RULES.md:** Regras de cancelamento cruzado, prioridade de filas, blacklist global, limite de retentativas e profundidade da integração ManyChat.
