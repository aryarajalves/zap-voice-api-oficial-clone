# 🚀 Guia de Configuração: CI/CD GitHub Actions + Docker Hub + Portainer

Este guia explica como configurar o pipeline automatizado de atualização contínua do projeto.

---

## 📋 Como Funciona o Pipeline

```
Git Push na Branch Main (ou Execução Manual)
       │
       ▼
1. 🧪 Execução dos Testes Unitários (Backend + Frontend)
       │
       ▼
2. 🏗️ Build do Frontend (npm run build)
       │
       ▼
3. 🐳 Docker Build & Push para o Docker Hub:
       • aryalvesfernandes/zapvoice:backend-latest
       • aryalvesfernandes/zapvoice:backend-1.8.2
       • aryalvesfernandes/zapvoice:worker-latest
       • aryalvesfernandes/zapvoice:worker-1.8.2
       │
       ▼
4. 🔄 Redeploy Automático no Portainer:
       • Disparo de Webhook para TODOS os servidores ou apenas para o selecionado
```

---

## 🔑 1. Configuração dos Secrets no GitHub

Acesse o seu repositório no GitHub:
`Settings` ➔ `Secrets and variables` ➔ `Actions` ➔ `New repository secret`

Adicione os seguintes segredos:

| Nome do Secret | Descrição | Exemplo de Valor |
|---|---|---|
| `DOCKERHUB_USERNAME` | Seu usuário no Docker Hub | `aryalvesfernandes` |
| `DOCKERHUB_TOKEN` | Token de Acesso (Personal Access Token) do Docker Hub | `dckr_pat_xxxxxxx` |
| `DOCKERHUB_REPO` | *(Opcional)* Nome do repositório no Docker Hub | `aryalvesfernandes/zapvoice` |
| `PORTAINER_WEBHOOKS` | Webhooks do Portainer (JSON com múltiplos ou URL única) | *(Ver detalhes abaixo)* |

---

## 🌐 2. Como Obter o Webhook no Portainer

1. No painel do seu **Portainer**, vá em **Stacks** (ou **Services**).
2. Abra a Stack do seu projeto (ex: `zapvoice`).
3. Localize a opção **Webhook** e marque como **Enabled / Ativo**.
4. Copie a URL do Webhook gerada:
   `https://portainer.seudominio.com/api/stacks/webhooks/xxxx-xxxx-xxxx`

---

## 📦 3. Como Configurar o Secret `PORTAINER_WEBHOOKS`

Você pode configurar múltiplos webhooks para atualizar vários servidores de uma vez ou individualmente.

### Opção A: Múltiplos Servidores / Ambientes (Recomendado - JSON)
Defina o valor do secret `PORTAINER_WEBHOOKS` como:
```json
{
  "producao": "https://portainer.servidor1.com/api/stacks/webhooks/xxxx-xxxx-xxxx",
  "staging": "https://portainer.servidor2.com/api/stacks/webhooks/yyyy-yyyy-yyyy",
  "cliente_vip": "https://portainer.servidor3.com/api/stacks/webhooks/zzzz-zzzz-zzzz"
}
```

### Opção B: Múltiplos Servidores (Formato Linha a Linha)
```env
producao = https://portainer.servidor1.com/api/stacks/webhooks/xxxx-xxxx-xxxx
staging = https://portainer.servidor2.com/api/stacks/webhooks/yyyy-yyyy-yyyy
```

### Opção C: Apenas 1 Servidor (URL Direta)
```
https://portainer.seudominio.com/api/stacks/webhooks/xxxx-xxxx-xxxx
```

---

## 🎯 4. Como Disparar Atualizações

### Automática (Ao fazer Git Push):
- Qualquer `git push` enviado para a branch `main` executa os testes, compila o frontend, envia as imagens atualizadas para o Docker Hub e dispara o redeploy em **TODOS** os webhooks cadastrados automaticamente.

### Manual com Seleção de Servidor (Pelo Painel do GitHub):
1. No GitHub, acesse a aba **Actions**.
2. Selecione o workflow **`CI/CD - Build, Push Docker Hub & Redeploy Portainer`**.
3. Clique no botão **`Run workflow`**.
4. No campo **`Alvo do Webhook do Portainer`**:
   - Digite `all` para atualizar todos os servidores cadastrados.
   - Ou digite o nome específico cadastrado (ex: `producao`, `staging`, etc.) para atualizar **apenas aquele servidor**.
5. Clique em **`Run workflow`**.
