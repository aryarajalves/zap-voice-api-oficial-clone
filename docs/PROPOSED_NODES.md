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

## 1. Nó de Ações de CRM (ManyChat & Chatwoot) (Implementando)
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

## 4. Nó de Leads Quentes e Roteamento Interno (Alerta de Vendas) (Implementado)
*Identifica leads quentes e os envia diretamente para uma aba dedicada dentro do painel do ZapVoice, com distribuição inteligente entre os vendedores.*

* **Caso de Uso:** Quando o lead executa uma ação chave no funil (ex: clicou no botão "Falar com Especialista" ou atingiu uma pontuação de engajamento), ele é marcado como "Lead Quente". Em vez de enviar notificações para canais externos (como Telegram ou E-mail), o lead é listado em tempo real em uma **Aba de Leads Quentes** exclusiva no próprio ZapVoice.
* **Mecânica de Rotação (Round Robin / Distribuição de Leads):**
  - O sistema distribui esses leads sequencialmente (ou de forma aleatória configurável) entre os vendedores cadastrados.
  - Cada lead quente que entra é associado a um vendedor na fila de atendimento.
* **Perfil e Interface de Vendedor:**
  - **Acesso Restrito:** Criação de um novo nível de usuário no sistema: `Vendedor` (ou `Agent`).
  - Ao fazer login, o usuário do tipo `Vendedor` é direcionado para uma interface simplificada e focada, contendo apenas a **Aba de Leads Quentes** com os contatos atribuídos a ele.
  - O vendedor não visualiza configurações do sistema, faturamento, conexões ou funis de outros clientes; ele apenas interage com os leads quentes atribuídos ao seu perfil.
* **Opções de Configuração no Nó:**
  - **Identificação do Lead:** Nome do alerta / Categoria do Lead Quente (ex: "Interesse Mentoria").
  - **Fila de Vendedores:** Seleção dos usuários do tipo vendedor que farão parte do rodízio para este fluxo (ex: Todos, Grupo Comercial, ou vendedores selecionados individualmente).
  - **Prioridade:** Dropdown (Alta, Média, Baixa) para destacar visualmente os leads na aba.
  - **Mensagem de Contexto:** Notas sobre o que o lead fez para ficar quente (ex: *"Avançou até a oferta de Black Friday e clicou no checkout"*), exibida no card do lead para o vendedor.
* **Portas:**
  - Entrada: Única.
  - Saída: `default` (segue o fluxo imediatamente).

---

## 6. Nó de Entrada de Dados / Coleta Inteligente (Aguardar Resposta)
*Pausa a automação e aguarda uma interação textual do contato, utilizando validações tradicionais ou inteligência artificial para extrair informações.*

* **Caso de Uso:** Perguntar *"Qual é o seu melhor e-mail?"* ou *"Me conta brevemente qual é a sua principal dificuldade hoje e qual seu faturamento"*. O funil trava até que o contato digite a resposta, utilizando IA ou regex para extrair e validar os dados de forma flexível e natural.
* **Validação e Extração Inteligente por IA (LLM):**
  - O usuário pode ativar o modo **"Extração por IA"** para coletas complexas que não seguem um padrão rígido (ex: extrair o nome de uma empresa, o cargo ou o nível de faturamento de dentro de um parágrafo digitado pelo lead).
  - A IA analisa a resposta do cliente, extrai as variáveis e as salva nos campos customizados correspondentes.
  - Se a informação solicitada estiver incompleta ou não for detectada na resposta, a IA pode tentar re-perguntar de forma humanizada ou desviar para a porta de falha.
* **Opções de Configuração:**
  - **Tipo de Coleta:** Dropdown (Tradicional por Expressão/Regex / Inteligente por IA).
  - **Salvar Resposta Em:** Variável personalizada (ex: `{{email_cliente}}` ou mapeamento de múltiplas chaves via IA).
  - **Regra de Validação (Modo Tradicional):** Dropdown (Nenhuma, E-mail, Telefone, CPF, Apenas Números).
  - **Instruções de Extração (Modo IA):** Campo de prompt para descrever o que a IA deve buscar (ex: *"Extraia o faturamento mensal do cliente e converta para número"*).
  - **Timeout:** Tempo limite de espera (ex: 2 horas).
  - **Mensagem de Erro / Re-pergunta:** Texto ou prompt de erro caso o dado seja inválido ou não detectado.
* **Portas:**
  - Entrada: Única.
  - Saída:
    - `success` (resposta recebida, validada e dados extraídos com sucesso).
    - `fail` (resposta inválida/incompatível após tentativas).
    - `timeout` (tempo limite de espera estourado).

---

## 7. Nó de "Aguardar Ação" (Monitor de Conversão/Checkout) (Implementado)
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

## 10. Nó de Verificação de Horário Comercial (Ta sendo implementado)
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

## 11. Nó de Roteamento Dinâmico Avançado (Evolução do Teste A/B / Round Robin) (Ta sendo construido)
*Evolução do atual nó "Teste A/B (Random)", permitindo distribuição sequencial/alternada e suporte a mais de 2 saídas.*

* **Caso de Uso:** Fazer rodízio de vendas (Round Robin) preciso e equilibrado. Em vez de apenas usar porcentagem aleatória entre 2 caminhos (como o Teste A/B atual faz), o fluxo pode distribuir leads de forma sequencial alternada (Lead 1 vai para Vendedor A, Lead 2 para Vendedor B, Lead 3 para Vendedor C), garantindo divisão exata do tráfego.
* **Melhorias em relação ao Randomizer atual:**
  - **Múltiplos Caminhos (N Saídas):** Permite adicionar mais de 2 portas de saída (Caminho A, B, C, D, etc.).
  - **Modo Sequencial Alternado:** Garante uma distribuição exata de 1 para 1 na fila (Round Robin), ideal para distribuição de leads comerciais, evitando que a aleatoriedade deixe um vendedor com mais leads que outro.
* **Opções de Configuração:**
  - **Modo de Distribuição:** Dropdown (Aleatório por Porcentagem / Sequencial Alternado).
  - **Configuração de Saídas:** Adicionar quantas portas desejar e definir pesos ou ordem de distribuição.
* **Portas:**
  - Entrada: Única.
  - Saídas: Múltiplas customizáveis (Caminho A, Caminho B, Caminho C, etc.).

---

## 12. Nó de Tag/Blacklist Local (Segmentação Interna) (Precisa só testar)
*Adiciona ou remove o contato de listas de controle internas no banco do ZapVoice.*

* **Caso de Uso:** Colocar o contato em uma lista interna chamada "blackfriday-interessados" para disparos em massa futuros, ou inseri-lo em uma lista de "supressão temporária" de 15 dias.
* **Opções de Configuração:**
  - **Ação:** Dropdown (Adicionar à lista, Remover da lista).
  - **Lista Alvo:** Seleção de lista local cadastrada no ZapVoice.
* **Portas:**
  - Entrada: Única.
  - Saída: `default` (prossegue o fluxo).

---

## 13. Suporte Nativo a Spintax (Melhoria nos Nós de Texto/Mensagem Existentes) (Implementando)
*Integração de variação de palavras diretamente nos campos de texto existentes, ampliando o recurso de Versão A/B.*

* **Caso de Uso:** Em vez de ser um nó isolado, o suporte a Spintax seria adicionado diretamente ao parser de mensagens do ZapVoice. O usuário poderá escrever variações rápidas diretamente dentro de qualquer balão de mensagem ou legenda de mídia usando chaves.
* **Como funciona:**
  - Ao digitar `{Oi|Olá|Bom dia}, tudo bem?` em uma mensagem, o sistema processa essa linha em tempo real durante o envio e escolhe uma das opções aleatoriamente.
  - Multiplica de forma exponencial as variações anti-bloqueio quando combinado com o recurso de "Versão A/B" já existente no nó de mensagem (ex: uma Versão 1 com Spintax gera dezenas de mensagens finais diferentes sem precisar clonar o nó).
* **Opções de Configuração:**
  - Funciona nativamente em qualquer campo de texto (Mensagem, Legenda de Mídia, etc.), bastando usar o padrão `{opção1|opção2|opção3}`.

---

## 14. Nó de Roleta / Distribuição de Prêmios (Gamificação) (Precisa só testar)
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

## 15. Nó de Pixel de Conversão (Facebook/Google Ads) (Implementado)
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

## 16. Nó de Disparo de Template (Mensagem Ativa da Meta) (Implementado)
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


