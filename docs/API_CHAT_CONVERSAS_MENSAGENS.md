# Guia de Integração: API de Conversas e Mensagens do Chat (ZapJords)

Este documento descreve como sistemas e projetos externos podem consultar **todas as conversas** e as **mensagens de cada conversa** armazenadas no ZapJords.

---

## 1. Visão Geral da Arquitetura

O sistema adota o padrão REST de alto desempenho para mensageria:
1. **Passo 1:** Consultar a lista de conversas ativas via `GET /api/chat/conversations`.
2. **Passo 2:** Para cada conversa desejada, consultar o histórico completo de mensagens via `GET /api/chat/conversations/{conversation_id}/messages?limit=0`.

> **Base URL padrão em produção:** `https://seu-dominio-zapjords.com`  
> **Base URL em desenvolvimento local:** `http://localhost:8000`

---

## 2. Autenticação e Headers

Todas as requisições exigem autenticação prévia e a identificação do cliente/empresa (multi-tenant).

### Headers Obrigatórios:

| Header | Descrição | Exemplo |
| :--- | :--- | :--- |
| `Authorization` | Token JWT Bearer ou Chave de API | `Bearer eyJhbGciOi...` ou `Bearer zv_live_abc123...` |
| `X-API-Key` *(Alternativo)* | Chave de API caso não envie no Authorization | `zv_live_abc123...` |
| `X-Client-ID` | ID numérico da empresa/cliente que você deseja consultar | `11` |

> ⚠️ **Atenção:** Se o usuário ou API Key possuir permissão em múltiplas empresas/clientes, o header `X-Client-ID` é **obrigatório** para definir o contexto correto e evitar erro `400` ou `403`.

---

## 3. Endpoints

### 3.1. Listar Conversas

Recupera as conversas registradas no chat, com suporte a filtros e paginação.

- **Método:** `GET`
- **Path:** `/api/chat/conversations`
- **Body:** *Nenhum (não enviar corpo)*

#### Parâmetros de URL (Query Parameters):

| Parâmetro | Tipo | Padrão | Descrição |
| :--- | :--- | :--- | :--- |
| `page` | `int` | `1` | Número da página desejada. |
| `limit` | `int` | `20` | Quantidade de conversas por página (ex: `50`, `100`). |
| `status` | `string` | `"open"` | Status da conversa: `"open"`, `"resolved"`, ou `"all"`. |
| `tab` | `string` | `"todos"` | Filtro de atendimento: `"todos"`, `"mine"`, `"unassigned"`. |
| `label` | `string` | `null` | Filtrar conversas que possuam uma etiqueta específica. |
| `search` | `string` | `null` | Termo para buscar no nome do contato, telefone ou conteúdo. |
| `order_by` | `string` | `"recent"` | Ordenação: `"recent"` (mais recentes primeiro). |

#### Exemplo de Chamada (cURL):

```bash
curl -X GET "https://seu-dominio-zapjords.com/api/chat/conversations?limit=50&page=1" \
  -H "Authorization: Bearer SEU_TOKEN_OU_API_KEY" \
  -H "X-Client-ID: 11"
```

#### Exemplo de Resposta de Sucesso (`200 OK`):

```json
{
  "conversations": [
    {
      "id": 101,
      "client_id": 11,
      "phone": "5511999999999",
      "contact_name": "João da Silva",
      "last_message_content": "Olá! Gostaria de saber mais sobre o plano.",
      "last_message_at": "2026-09-17T10:15:30",
      "status": "open",
      "unread_count": 0,
      "assigned_user_id": 5,
      "assigned_user_name": "Atendente Maria",
      "labels": ["compra-aprovada", "cliente-vip"],
      "pinned": false,
      "urgent": false
    }
  ],
  "total_count": 45,
  "page": 1,
  "limit": 50
}
```

---

### 3.2. Listar Mensagens de uma Conversa

Recupera o histórico ordenado de mensagens de uma conversa específica.

- **Método:** `GET`
- **Path:** `/api/chat/conversations/{conversation_id}/messages`
- **Body:** *Nenhum (não enviar corpo)*

#### Parâmetros de Rota (Path Parameters):

| Parâmetro | Tipo | Obrigatório | Descrição |
| :--- | :--- | :--- | :--- |
| `conversation_id` | `int` | Sim | ID da conversa retornado no endpoint anterior. |

#### Parâmetros de URL (Query Parameters):

| Parâmetro | Tipo | Padrão | Descrição |
| :--- | :--- | :--- | :--- |
| `limit` | `int` | `50` | Limite de mensagens. **Dica:** Use `limit=0` para retornar **TODAS** as mensagens da conversa sem limite de paginação. |
| `before_id` | `int` | `null` | ID de mensagem de corte para carregar histórico anterior (paginação retroativa). |

#### Exemplo de Chamada (cURL):

```bash
curl -X GET "https://seu-dominio-zapjords.com/api/chat/conversations/101/messages?limit=0" \
  -H "Authorization: Bearer SEU_TOKEN_OU_API_KEY" \
  -H "X-Client-ID: 11"
```

#### Exemplo de Resposta de Sucesso (`200 OK`):

```json
[
  {
    "id": 1001,
    "conversation_id": 101,
    "sender_type": "contact",
    "user_id": null,
    "message_type": "text",
    "content": "Olá, quanto custa o serviço?",
    "media_url": null,
    "timestamp": "2026-09-17T10:00:15",
    "wa_message_id": "wamid.HBgLM...",
    "is_starred": false
  },
  {
    "id": 1002,
    "conversation_id": 101,
    "sender_type": "user",
    "user_id": 5,
    "message_type": "text",
    "content": "Bom dia João! Nosso plano inicial é R$ 97/mês.",
    "media_url": null,
    "timestamp": "2026-09-17T10:01:20",
    "wa_message_id": "wamid.HBgLM...",
    "is_starred": false
  }
]
```

#### Detalhes dos Campos das Mensagens:

- `sender_type`:
  - `"contact"`: Mensagem enviada pelo cliente/lead (inbound).
  - `"user"`: Mensagem enviada manualmente por um operador/atendente no painel.
  - `"agent"`: Mensagem enviada por automação de IA, chatbot ou funil.
- `message_type`: Tipo do conteúdo (`"text"`, `"image"`, `"audio"`, `"video"`, `"document"`, `"template"`, etc.).
- `media_url`: Link direto para o arquivo de mídia, quando aplicável.
- `wa_message_id`: ID oficial único da mensagem no WhatsApp Cloud API.

---

## 4. Exemplos Práticos de Código

### Exemplo em Python (Extrair todas as conversas e suas mensagens):

```python
import requests

BASE_URL = "https://seu-dominio-zapjords.com/api"
API_KEY = "zv_live_xxxxxxxxxxxxxxxxxxxxxxxx"
CLIENT_ID = 11

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "X-Client-ID": str(CLIENT_ID)
}

# 1. Obter conversas
conversations_response = requests.get(
    f"{BASE_URL}/chat/conversations",
    headers=headers,
    params={"limit": 100, "page": 1, "status": "all"}
)
conversations_response.raise_for_status()
conversations_data = conversations_response.json()
conversas = conversations_data.get("conversations", [])

print(f"Total de conversas encontradas: {len(conversas)}")

# 2. Para cada conversa, buscar todas as mensagens
todas_as_conversas_com_mensagens = []

for convo in conversas:
    convo_id = convo["id"]
    phone = convo["phone"]
    contact_name = convo.get("contact_name")
    
    # limit=0 garante o carregamento de todo o histórico da conversa
    messages_response = requests.get(
        f"{BASE_URL}/chat/conversations/{convo_id}/messages",
        headers=headers,
        params={"limit": 0}
    )
    messages = messages_response.json() if messages_response.status_code == 200 else []
    
    todas_as_conversas_com_mensagens.append({
        "conversation": convo,
        "total_messages": len(messages),
        "messages": messages
    })
    
    print(f"Conversa {convo_id} ({contact_name or phone}): {len(messages)} mensagens extraídas.")
```

---

### Exemplo em Node.js (JavaScript / TypeScript):

```javascript
const axios = require('axios');

const BASE_URL = 'https://seu-dominio-zapjords.com/api';
const API_KEY = 'zv_live_xxxxxxxxxxxxxxxxxxxxxxxx';
const CLIENT_ID = '11';

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'X-Client-ID': CLIENT_ID,
  }
});

async function exportChatData() {
  try {
    // 1. Listar conversas
    const { data: convData } = await client.get('/chat/conversations', {
      params: { limit: 100, page: 1, status: 'all' }
    });
    
    const conversations = convData.conversations || [];
    console.log(`Conversas encontradas: ${conversations.length}`);

    // 2. Buscar mensagens de cada conversa
    const resultadoCompleto = [];

    for (const convo of conversations) {
      const { data: messages } = await client.get(`/chat/conversations/${convo.id}/messages`, {
        params: { limit: 0 } // limit=0 traz todas as mensagens
      });

      resultadoCompleto.push({
        ...convo,
        messages: messages
      });

      console.log(`Conversa ${convo.id} carregada com ${messages.length} mensagens.`);
    }

    return resultadoCompleto;
  } catch (error) {
    console.error('Erro na requisição:', error.response?.data || error.message);
  }
}

exportChatData();
```

---

## 5. Códigos de Erro e Diagnóstico

| Status Code | Causa Provável | Solução |
| :--- | :--- | :--- |
| `401 Unauthorized` | Token JWT ou API Key ausente, expirado ou inválido. | Verifique se o header `Authorization: Bearer ...` ou `X-API-Key` foi informado corretamente. |
| `400 Bad Request` | `X-Client-ID` ausente ou inválido. | Adicione o header `X-Client-ID` com o número do cliente correspondente. |
| `403 Forbidden` | O usuário ou token não tem permissão para acessar o `client_id` informado. | Garanta que o usuário/chave gerada tem vínculo com a empresa solicitada. |
| `404 Not Found` | A conversa com o ID especificado não pertence a essa empresa ou não existe. | Valide se o `conversation_id` fornecido pertence ao mesmo `client_id`. |
