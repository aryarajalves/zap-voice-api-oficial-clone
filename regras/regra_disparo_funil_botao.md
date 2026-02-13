# Regra de Disparo de Funil (Interação de Botão)

Este documento descreve o fluxo técnico de como uma interação de botão no WhatsApp dispara um Funil de vendas no sistema ZapVoice.

## 1. Origem da Interação (WhatsApp)
O usuário final clica em um botão (ex: "Pode falar sim!") em uma mensagem enviada anteriormente por um Template Marketing.

## 2. Ingestão do Webhook (Backend API)
O arquivo responsável é `backend/routers/webhooks.py`.

1.  O endpoint `POST /webhooks/meta` recebe o JSON da Meta.
2.  A função `meta_event_ingestion` loga o evento no banco de dados e arquivo.
3.  **Publicação na Fila:** O evento é publicado Imediatamente na fila `whatsapp_events` do RabbitMQ.
    *   **Isolamento:** A API não processa o funil, apenas "avisa" que algo aconteceu. Isso garante que a API nunca fica lenta.

## 3. Processamento do Evento (Worker)
O `Worker` (processo Python em segundo plano) consome a fila `whatsapp_events`.

1.  Identifica que é um evento de **Botão**.
2.  Extrai o `Payload` do botão (o texto ou ID escondido no botão).
3.  **Busca de Funil:** O sistema pesquisa no Banco de Dados (`models.Funnel`) por um funil cuja **Frase de Gatilho (Trigger Phrase)** seja IGUAL ao `Payload` do botão.
    *   *Nota:* A comparação ignora maiúsculas/minúsculas e espaços extras.

## 4. Agendamento da Execução (Fila de Execução)
Se um funil correspondente for encontrado:

1.  O sistema cria um registro na tabela `scheduled_triggers` com status `queued`.
2.  Este Trigger é enviado para uma **Segunda Fila RabbitMQ** chamada `zapvoice_funnel_executions`.

## 5. Execução do Funil (Grouping e Paralelismo)
Esta é a resposta sobre o "agrupamento":

*   **Fila Única:** Todos os contatos que clicam no botão (sejam 1 ou 10.000) entram na **MESMA fila** de execução (`zapvoice_funnel_executions`).
*   **Processamento Individual:** O Worker pega um por um dessa fila e executa.
*   **Escala:** Embora sejam processados um a um, isso acontece muito rápido (milissegundos). Se a carga for muito alta, podemos subir mais Workers consumindo da mesma fila, processando vários em paralelo.

### Resumo do Fluxo de Dados:
`Usuário (Clique)` -> `API (Webhook)` -> `Fila (Events)` -> `Worker (Match)` -> `Fila (Executions)` -> `Worker (Envio Msg)`

---
**Para pesquisar no código:**
- **Webhook Endpoint:** `backend/routers/webhooks.py` -> `meta_event_ingestion`
- **Lógica de Match:** `backend/routers/webhooks.py` (ou `services/engine.py` dependendo da versão) -> Procure por `models.Funnel.trigger_phrase`
- **Consumo da Fila:** `backend/worker.py`
