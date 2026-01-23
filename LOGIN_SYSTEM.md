
# 🔐 Sistema de Login & Gerenciamento de Usuários

Este documento explica como gerenciar o acesso ao **ZapVoice**. O sistema possui um script administrativo completo para criar, atualizar e listar usuários diretamente no banco de dados.

---

## 🛠️ Ferramenta de Gerenciamento (`create_admin.py`)

O backend possui uma ferramenta interativa poderosa localizada em `backend/create_admin.py`.

### Acessando a Ferramenta

Você pode executar esta ferramenta de duas formas:

#### 1. Via Docker (Recomendado para Produção)
Se o sistema já estiver rodando, acesse o container do backend (`zapvoice_app`) e rode o script lá dentro.

1.  Acesse o **Portainer** > **Containers**.
2.  Encontre o container `zapvoice_app` (ou `services_zapvoice_app`).
3.  Clique em **Console** > **Connect** (`/bin/bash` ou `/bin/sh`).
4.  Execute o comando:
    ```bash
    python create_admin.py
    ```

#### 2. Via Terminal Local
Se você estiver desenvolvendo localmente com o Python instalado:
1.  Navegue até a pasta `backend`.
2.  Certifique-se de que o ambiente virtual está ativo.
3.  Execute:
    ```bash
    python create_admin.py
    ```

---

## 📋 Como Usar

Ao rodar o script, você verá um menu interativo:

```text
============================================================
🔧 ZapVoice - Gerenciador de Usuários
============================================================
1. Criar novo usuário
2. Testar login
3. Listar usuários
4. Sair
============================================================
➤ Escolha uma opção:
```

### 1️⃣ Criar Novo Usuário (ou Atualizar Senha)
1.  Escolha a opção **1**.
2.  Digite o **Email**, **Senha** e **Nome Completo**.
3.  O script criará o usuário e exibirá o ID.
    *   *Dica:* Se o usuário já existir, o script perguntará se você deseja **atualizar a senha**. Digite `s` para confirmar.

### 2️⃣ Listar Usuários
1.  Escolha a opção **3**.
2.  O sistema mostrará todos os usuários cadastrados com seus IDs e Emails.

### 3️⃣ Testar Login
1.  Escolha a opção **2**.
2.  Digite email e senha para verificar se as credenciais estão corretas e se o hash no banco confere.

---

## 🗑️ Como Deletar um Usuário

Você tem duas opções para deletar usuários:

### Opção 1: Via API (Recomendado)

O sistema possui um endpoint seguro para exclusão de usuários.

1.  Acesse o Swagger UI em `/docs` (ex: `http://localhost:8000/docs` ou `https://seu-dominio.com/docs`).
2.  **Autentique-se**: Clique no cadeado verde 🔓 e faça login com seu usuário admin.
3.  Vá até a seção **Authentication**.
4.  Encontre o endpoint `DELETE /auth/users/{user_id}`.
5.  Clique em **Try it out**.
6.  Digite o **ID** do usuário que deseja remover.
7.  Clique em **Execute**.

*Nota: Você não pode deletar a si mesmo (medida de segurança).*

### Opção 2: Via Banco de Dados (SQL)

Se preferir acesso direto ao banco:

1.  Acesse o container do banco de dados (`postgres`) no Portainer.
2.  Entre no console (`psql`).
3.  Conecte-se ao banco:
    ```bash
    psql -U postgres -d zapvoice
    ```
4.  Liste os usuários para confirmar o ID (opcional):
    ```sql
    SELECT id, email FROM users;
    ```
5.  Delete o usuário pelo email:
    ```sql
    DELETE FROM users WHERE email = 'email@exemplo.com';
    ```
    *Ou pelo ID:*
    ```sql
    DELETE FROM users WHERE id = 1;
    ```
6.  Saia do banco: `\q`

---

## ⚠️ Segurança

*   **Hashing:** As senhas nunca são salvas em texto puro. O sistema utiliza **Bcrypt** (produção) ou SHA256 (fallback) para proteger as credenciais.
*   **Tokens:** O login gera um **JWT (JSON Web Token)** que expira automaticamente (padrão: 24 horas).

---

## 🔑 Como Autenticar na Documentação (API)

Para testar a API diretamente pelo navegador (Swagger UI), você precisa obter um token de acessso.

### 1. Botão "Authorize" (Token de Sessão)

Este é o método padrão para usar 99% dos endpoints (criar funis, deletar usuários, ver triggers).

1.  No topo da página `/docs`, clique no botão verde/cadeado **Authorize**.
2.  Uma janela se abrirá. Preencha apenas os campos:
    *   **Username:** Seu email de login (ex: `admin@zapvoice.com`).
    *   **Password:** Sua senha de login.
    *   *(Pode ignorar client_id e client_secret)*.
3.  Clique em **Authorize** e depois em **Close**.
4.  **Pronto!** Agora o cadeado ficará fechado 🔒 e suas requisições enviarão automaticamente o token de acesso.

### 2. X-Register-API-Key (Apenas Registro)

Se você encontrar um campo chamado `X-Register-API-Key` (normalmente nos endpoints `/register` ou `/reset-password`), **ele não é o seu login**.

*   Criar usuários via API pública é perigoso, por isso esse endpoint é protegido por uma **Chave Mestra**.
*   Essa chave fica no seu arquivo `.env` (no servidor), na variável:
    ```env
    REGISTER_API_KEY=sua_chave_super_secreta_aqui
    ```
*   Você só precisa preencher esse campo se estiver tentando criar um novo usuário ou resetar senha via API sem estar logado. Para uso normal do sistema, use o botão **Authorize**.
