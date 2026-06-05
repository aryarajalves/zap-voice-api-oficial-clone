# 🚀 Catálogo de Novos Nós Propostos para o VisualFlowBuilder (ZapVoice)

Este documento reúne **15 conceitos de novos nós** para enriquecer o editor de funis do ZapVoice (`VisualFlowBuilder`). Cada nó está detalhado com seu caso de uso, portas de entrada/saída, configurações visuais e lógica de funcionamento para ajudar na tomada de decisão de quais implementar no projeto.

---

## 📂 Índice de Nós Propostos

- **Integração e Ações de CRM:**
  1. [Nó de Ações de CRM (ManyChat & Chatwoot)](#1-nó-de-ações-de-crm-manychat--chatwoot)
  2. [Nó de Requisição HTTP (Webhook Out)](#2-nó-de-requisição-http-webhook-out)
  3. [Nó de Consulta Externa (API In / Enriquecimento)](#3-nó-de-consulta-externa-api-in--enriquecimento)
  4. [Nó de Notificação Interna (Alerta de Vendas)](#4-nó-de-notificação-interna-alerta-de-vendas)
  
- **Inteligência e Conversação:**
  5. [Nó de Inteligência Artificial (LLM - ChatGPT/Claude)](#5-nó-de-inteligência-artificial-llm---chatgptclaude)
  6. [Nó de Entrada de Dados (Aguardar Resposta)](#6-nó-de-entrada-de-dados-aguardar-resposta)
  
- **Controle de Fluxo Avançado:**
  7. [Nó de "Aguardar Ação" (Monitor de Conversão/Checkout)](#7-nó-de-aguardar-ação-monitor-de-conversãocheckout)
  8. [Nó de Loop / Repetição Controlada](#8-nó-de-loop--repetição-controlada)
  9. [Nó de Pausa Inteligente (Modo Não Perturbe)](#9-nó-de-pausa-inteligente-modo-não-perturbe)
  10. [Nó de Verificação de Horário Comercial](#10-nó-de-verificação-de-horário-comercial)
  
- **Roteamento e Distribuição:**
  11. [Nó de Roteamento Dinâmico (Divisão de Tráfego / Round Robin)](#11-nó-de-roteamento-dinâmico-divisão-de-tráfego--round-robin)
  12. [Nó de Tag/Blacklist Local (Segmentação Interna)](#12-nó-de-tagblacklist-local-segmentação-interna)
  
- **Segurança, Rastreamento e Engajamento:**
  13. [Nó Anti-Bloqueio (Spintax / Variação de Texto)](#13-nó-anti-bloqueio-spintax--variação-de-texto)
  14. [Nó de Roleta / Distribuição de Prêmios (Gamificação)](#14-nó-de-roleta--distribuição-de-prêmios-ganificação)
  15. [Nó de Pixel de Conversão (Facebook/Google Ads)](#15-nó-de-pixel-de-conversão-facebookgoogle-ads)
  16. [Nó de Disparo de Template (Mensagem Ativa da Meta)](#16-nó-de-disparo-de-template-mensagem-ativa-da-meta)
  17. [Nó Condicional de Compra (Filtro por Produto / Status)](#17-nó-condicional-de-compra-filtro-por-produto--status)

---

## 1. Nó de Ações de CRM (ManyChat & Chatwoot)
*Permite executar tarefas de organização e gerenciamento direto do fluxo, sem mensagens.*

* **Caso de Uso:** Ao passar por um determinado caminho da régua, marcar o lead com a etiqueta `lead-quente` ou criar uma Nota Privada na conversa do Chatwoot para o suporte ler.
* **Opções de Configuração:**
  - **Plataforma:** Dropdown (Chatwoot / ManyChat)
  - **Ação Chatwoot:** Dropdown (Adicionar Etiqueta, Remover Etiqueta, Adicionar Nota Privada, Alterar Responsável).
  - **Ação ManyChat:** Dropdown (Adicionar Tag, Remover Tag, Definir Custom Field).
  - **Valor/Nome:** Campo de texto dinâmico para preencher a tag ou o texto da nota (aceitando variáveis como `{{nome}}`).
* **Portas:**
  - Entrada: Única.
  - Saída: `default` (segue o fluxo após rodar a ação).

---

## 2. Nó de Requisição HTTP (Webhook Out)
*Integração livre para enviar dados do lead para qualquer sistema web externo.*

* **Caso de Uso:** Notificar um CRM externo (ex: Pipedrive, ActiveCampaign, HubSpot) ou uma planilha do Google Sheets (via Make/Zapier) que o lead atendeu a um passo importante.
* **Opções de Configuração:**
  - **Método:** Dropdown (POST, GET, PUT)
  - **URL de Destino:** Campo de texto para URL do webhook.
  - **Headers:** Chave/Valor para autenticação (Bearer Token, API-Key, etc.).
  - **Payload (JSON):** Editor simples para mapear o que enviar (ex: `{"telefone": "{{telefone}}", "etapa": "oferta-1"}`).
* **Portas:**
  - Entrada: Única.
  - Saída: 
    - `success` (se a API externa respondeu 2xx).
    - `fail` (se a API falhou ou deu timeout).

---

## 3. Nó de Consulta Externa (API In / Enriquecimento)
*Busca informações de um sistema externo para usar em tempo real nas próximas mensagens.*

* **Caso de Uso:** Perguntar o CEP ao cliente, consultar o frete na API dos Correios e enviar: *"O valor do frete para o seu CEP é de {{frete_valor}} e chega em {{frete_prazo}} dias."*
* **Opções de Configuração:**
  - **URL da API:** Ex: `https://viacep.com.br/ws/{{cep}}/json/`
  - **Mapeamento de Retorno:** Chave da resposta JSON da API e qual variável interna do ZapVoice irá salvar (ex: mapear `logradouro` para a variável `{{rua}}`).
* **Portas:**
  - Entrada: Única.
  - Saída:
    - `success` (dados obtidos com sucesso).
    - `fail` (erro de rede ou CEP não encontrado).

---

## 4. Nó de Notificação Interna (Alerta de Vendas)
*Envia uma mensagem de aviso para a equipe, não para o cliente.*

* **Caso de Uso:** Notificar o canal do Telegram do time comercial ou o WhatsApp do gerente de vendas quando um cliente de alto ticket clica no botão "Falar com Atendente".
* **Opções de Configuração:**
  - **Canal:** Dropdown (WhatsApp do Staff, Grupo de Telegram, E-mail).
  - **Destinatário:** Número de WhatsApp da equipe ou ID do canal do Telegram.
  - **Mensagem:** Texto dinâmico (ex: *"🔥 Lead Quente! {{nome}} ({{telefone}}) pediu atendimento no fluxo X."*).
* **Portas:**
  - Entrada: Única.
  - Saída: `default` (segue o fluxo imediatamente).

---

## 5. Nó de Inteligência Artificial (LLM - ChatGPT/Claude)
*Conversação aberta e respostas inteligentes guiadas por IA.*

* **Caso de Uso:** O cliente faz uma pergunta sobre o frete, a IA lê a base de conhecimento configurada e responde exatamente a resposta correta de forma humanizada.
* **Opções de Configuração:**
  - **Modelo:** GPT-4o, GPT-3.5-Turbo, Claude 3 Haiku.
  - **Prompt de Sistema:** Instruções de comportamento (ex: *"Você é o atendente de suporte da ZapVoice. Seja amigável e limite-se a 2 parágrafos."*).
  - **Histórico:** Quantidade de mensagens anteriores a serem incluídas no contexto (ex: últimas 5 mensagens).
  - **Temperatura:** Ajuste de criatividade da IA (0.0 a 1.0).
* **Portas:**
  - Entrada: Única.
  - Saída: `default` (envia o texto gerado e prossegue no funil).

---

## 6. Nó de Entrada de Dados (Aguardar Resposta)
*Pausa a automação e aguarda uma interação textual do contato.*

* **Caso de Uso:** Perguntar *"Qual é o seu melhor e-mail?"* e travar o funil até que o contato digite a resposta, validando se é um formato de e-mail válido antes de continuar.
* **Opções de Configuração:**
  - **Salvar Resposta Em:** Campo para selecionar ou criar uma variável personalizada (ex: `{{email_cliente}}`).
  - **Validação:** Dropdown (Nenhuma, E-mail, Telefone, CPF, Apenas Números).
  - **Timeout:** Tempo limite de espera (ex: 2 horas).
  - **Mensagem de Erro de Validação:** Texto enviado caso o cliente digite algo inválido (ex: *"Ops, digite um e-mail válido por favor!"*).
* **Portas:**
  - Entrada: Única.
  - Saída:
    - `success` (resposta recebida e validada).
    - `timeout` (tempo limite de espera estourado).

---

## 7. Nó de "Aguardar Ação" (Monitor de Conversão/Checkout)
*Pausa o fluxo e monitora eventos externos de conversão antes de enviar o próximo lembrete.*

* **Caso de Uso:** Lead gerou um Boleto. O funil envia o boleto e aguarda 1 hora. Se a compra for aprovada na plataforma de vendas (Hotmart/Kiwify) nesse intervalo, o fluxo encerra ou vai para parabéns. Se der 1 hora e o boleto continuar pendente, envia cobrança.
* **Opções de Configuração:**
  - **Evento de Parada:** Dropdown (Compra Aprovada, Carrinho Abandonado Recuperado, Clique no Link).
  - **Tempo de Espera:** Horas/Minutos para monitorar.
* **Portas:**
  - Entrada: Única.
  - Saída:
    - `realizado` (comprou/converteu dentro do prazo).
    - `nao_realizado` (esgotou o tempo e continuou pendente).

---

## 8. Nó de Loop / Repetição Controlada
*Cria fluxos de reengajamento cíclicos sem poluir a tela com dezenas de nós repetidos.*

* **Caso de Uso:** Enviar uma mensagem de lembrete de carrinho abandonado uma vez por dia durante 3 dias, a menos que ele compre.
* **Opções de Configuração:**
  - **Número Máximo de Loops:** Quantidade máxima de repetições (ex: 3 vezes).
  - **Variável de Controle:** Selecionar qual variável incrementará ou qual condição quebrará o loop.
* **Portas:**
  - Entrada: Única.
  - Saída:
    - `loop` (caminho que executa a mensagem e o delay, retornando à entrada deste nó).
    - `completed` (caminho tomado após finalizar todas as iterações do loop).

---

## 9. Nó de Pausa Inteligente (Modo Não Perturbe)
*Protege o sono do cliente e garante que mensagens automáticas cheguem em horários comerciais.*

* **Caso de Uso:** Se o lead gerou boleto às 02:30 da manhã, o funil deve pausar o envio do lembrete e aguardar até as 08:00 do dia seguinte para de fato enviar, evitando incomodar.
* **Opções de Configuração:**
  - **Janela Permitida:** Definir hora de início (ex: 08:00) e fim (ex: 22:00).
  - **Ação fora do horário:** Dropdown (Pausar e aguardar o início da janela / Desviar o fluxo imediatamente).
* **Portas:**
  - Entrada: Única.
  - Saída: `default` (segue o fluxo após a validação ou fim do repouso).

---

## 10. Nó de Verificação de Horário Comercial
*Desvia o fluxo do funil com base na hora e dia da semana do servidor.*

* **Caso de Uso:** Se o cliente mandar mensagem no fim de semana, avisa que o suporte comercial está fechado e agenda para segunda.
* **Opções de Configuração:**
  - **Grade de Horários:** Configurar para cada dia da semana (Seg-Sex: 08:00 às 18:00, Sáb: 08:00 às 12:00, Dom: Fechado).
* **Portas:**
  - Entrada: Única.
  - Saídas:
    - `aberto` (horário de atendimento).
    - `fechado` (fora do horário comercial).

---

## 11. Nó de Roteamento Dinâmico (Divisão de Tráfego / Round Robin)
*Distribui os leads para diferentes caminhos ou contatos em taxas percentuais controladas.*

* **Caso de Uso:** Fazer rodízio de vendas (Round Robin). 50% dos leads vão para o Link de WhatsApp do vendedor A, e 50% para o vendedor B.
* **Opções de Configuração:**
  - **Modo:** Dropdown (Aleatório por Porcentagem / Sequencial Alternado).
  - **Configuração de Saídas:** Adicionar quantas portas quiser e definir a porcentagem para cada uma (ex: Caminho A: 33%, Caminho B: 33%, Caminho C: 34%).
* **Portas:**
  - Entrada: Única.
  - Saídas: Múltiplas customizáveis (Caminho A, Caminho B, etc.).

---

## 12. Nó de Tag/Blacklist Local (Segmentação Interna)
*Adiciona ou remove o contato de listas de controle internas no banco do ZapVoice.*

* **Caso de Uso:** Colocar o contato em uma lista interna chamada "blackfriday-interessados" para disparos em massa futuros, ou inseri-lo em uma lista de "supressão temporária" de 15 dias.
* **Opções de Configuração:**
  - **Ação:** Dropdown (Adicionar à lista, Remover da lista).
  - **Lista Alvo:** Seleção de lista local cadastrada no ZapVoice.
* **Portas:**
  - Entrada: Única.
  - Saída: `default` (prossegue o fluxo).

---

## 13. Nó Anti-Bloqueio (Spintax / Variação de Texto)
*Muda o conteúdo da mensagem aleatoriamente para evitar que o algoritmo do WhatsApp detecte spam.*

* **Caso de Uso:** Em disparos em massa, em vez de enviar a frase exata "Olá, segue seu código", enviar variações como "Oi, aqui está seu código" ou "Tudo bem? Seu código chegou".
* **Opções de Configuração:**
  - **Texto Spintax:** Campo de texto com chaves de variação (ex: `{Oi|Olá|Bom dia}, tudo bem? {Veja|Confira} o seu boleto: {{link}}`).
* **Portas:**
  - Entrada: Única.
  - Saída: `default` (envia uma das combinações geradas aleatoriamente e segue).

---

## 14. Nó de Roleta / Distribuição de Prêmios (Gamificação)
*Cria mecânicas de engajamento baseadas em probabilidade.*

* **Caso de Uso:** Enviar uma mensagem dizendo *"Clique no botão abaixo para tentar ganhar um prêmio!"*. Conforme a probabilidade configurada, o contato cai em uma resposta de "Ganhou" ou "Não foi dessa vez".
* **Opções de Configuração:**
  - **Porcentagem de Ganho (Sucesso):** Slider de 0% a 100%.
  - **Limite de Prêmios:** Configurar estoque máximo diário para evitar prejuízos.
* **Portas:**
  - Entrada: Única.
  - Saídas:
    - `ganhou` (caminho do prêmio).
    - `perdeu` (caminho de consolo).

---

## 15. Nó de Pixel de Conversão (Facebook/Google Ads)
*Registra a atividade da conversa diretamente nas plataformas de anúncios.*

* **Caso de Uso:** O lead avançou até a oferta final no WhatsApp. O funil avisa o Pixel do Facebook que o contato atingiu a etapa de "Iniciou Compra" para otimizar os públicos de anúncio.
* **Opções de Configuração:**
  - **ID do Pixel:** Código do pixel do Facebook/Google Ads da conta do usuário.
  - **Evento:** Dropdown (Lead, InitiateCheckout, Purchase, Customizado).
  - **Valor / Moeda:** Opcional (ex: valor de conversão R$ 97,00).
* **Portas:**
  - Entrada: Única.
  - Saída: `default` (dispara o evento em background de forma assíncrona e continua o fluxo).

---

## 16. Nó de Disparo de Template (Mensagem Ativa da Meta)
*Permite disparar mensagens ativas aprovadas pela Meta de dentro da automação.*

* **Caso de Uso:** Iniciar ou reabrir a janela de 24h de forma oficial de dentro do fluxo. Ideal para réguas pós-venda que rodam dias depois da última interação do cliente.
* **Opções de Configuração:**
  - **Template:** Dropdown listando os templates de WhatsApp aprovados na conta da Meta do cliente.
  - **Mapeamento de Variáveis:** Campos dinâmicos dinamicamente gerados de acordo com os parâmetros do template selecionado (ex: Variável `{{1}}` mapeia para `{{nome}}`, `{{2}}` mapeia para `{{codigo_rastreio}}`).
  - **Idioma:** Dropdown (pt_BR, en_US, etc.).
* **Portas:**
  - Entrada: Única.
  - Saída:
    - `success` (template enviado e entregue com sucesso pela API da Meta).
    - `fail` (falha no envio do template por erro na API da Meta ou dados inválidos).

---

## 17. Nó Condicional de Compra (Filtro por Produto / Status)
*Direciona o fluxo dinamicamente dependendo de qual produto o cliente adquiriu ou de seu status atual.*

* **Caso de Uso:** Se o cliente comprou o produto "Curso VIP", direcionar para um fluxo de entrega com mensagens exclusivas e PDFs. Se ele comprou "Curso Básico" ou apenas gerou boleto de outro produto, segue por caminhos diferentes.
* **Opções de Configuração:**
  - **Tipo de Verificação:** Dropdown (Produto Específico, Status da Venda, Ambos).
  - **Produto:** Campo para digitar ou selecionar o ID do produto ou o nome (ex: `curso-vip`).
  - **Status da Compra:** Dropdown para validar o status correspondente (ex: `approved`, `pending`, `refunded`, `chargeback`).
* **Portas:**
  - Entrada: Única.
  - Saídas:
    - `true` (atende aos critérios de compra e produto selecionados).
    - `false` (não atende aos critérios configurados).


