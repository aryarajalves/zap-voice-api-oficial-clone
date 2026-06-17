# Passo a Passo: Configuração do Aplicativo Instagram na Meta

Este guia orienta o processo completo de criação e configuração de um aplicativo na plataforma **Meta for Developers** para habilitar a automação de comentários e mensagens privadas (DMs) do Instagram Business.

---

## 📋 Pré-requisitos Obrigatórios
Antes de iniciar no painel da Meta, garanta que:
1. A conta do Instagram seja do tipo **Profissional** (Business ou Creator).
2. Você tenha uma **Página do Facebook** criada.
3. A conta do Instagram esteja **vinculada** à Página do Facebook (pode ser feito pelo aplicativo do celular em *Editar Perfil > Página* ou pelas *Configurações da Página do Facebook > Contas vinculadas > Instagram*).
4. Ambas (Página e Instagram) estejam inseridas no seu gerenciador **Meta Business Suite** empresarial.

---

## 🛠️ Passo 1: Criar o Aplicativo na Meta Developers
1. Acesse o [Meta for Developers](https://developers.facebook.com/) e faça login.
2. Clique em **Meus aplicativos** > **Criar aplicativo**.
3. Selecione o tipo de aplicativo **Outro** ou **Empresa** (Business) e avance.
4. Dê um nome ao aplicativo (ex: *ZapVoice Automação*) e clique em **Criar aplicativo**.

---

## 👥 Passo 2: Autorizar a Conta de Testes (Modo de Desenvolvimento)
Enquanto o aplicativo não passa por análise da Meta, apenas contas declaradas como testadoras podem interagir com ele.
1. No menu esquerdo, vá em **Funções do app** > **Funções**.
2. Role até a seção **Testadores do Instagram** (Instagram Testers) e clique em **Adicionar testadores**.
3. Insira o `@username` exato da conta do Instagram que você usará nos testes.
4. **Aceitar o convite (Obrigatório):**
   - Faça login na conta do Instagram de testes pelo navegador.
   - Acesse o link direto: [Configurações de Aplicativos e Sites](https://www.instagram.com/accounts/manage_access/).
   - Vá na aba **Testadores** (Tester Invites) e clique em **Aceitar**.

---

## 🔑 Passo 3: Adicionar Ativos e Gerar Token do Usuário do Sistema
Para conexões estáveis, usamos um Token de Usuário do Sistema permanente no Meta Business Manager.
1. No menu do Gerenciador de Negócios da Meta, acesse **Usuários do sistema**.
2. Selecione ou crie um usuário com nível de acesso **Admin**.
3. Clique em **Atribuir ativos** e conceda acesso total do Usuário do Sistema à:
   - **Página do Facebook** vinculada.
   - **Conta do Instagram** correspondente.
   - **Aplicativo** recém-criado na Meta.
4. Clique em **Gerar token**, selecione o aplicativo criado e marque os seguintes escopos obrigatórios:
   - `instagram_basic`
   - `instagram_manage_comments`
   - `instagram_manage_messages`
   - `pages_show_list`
   - `pages_read_engagement`
5. Salve o Token gerado e o ID da Conta do Instagram Business nas configurações de automação do ZapVoice.

---

## 🔗 Passo 4: Configurar o Webhook do Aplicativo
1. No painel do aplicativo na Meta, adicione o produto **Webhooks**.
2. Na aba de Webhooks, escolha **Instagram** no menu suspenso e clique em **Assinar este objeto**.
3. Insira as credenciais do seu servidor ZapVoice:
   - **URL de Callback:** A URL fornecida pelo ZapVoice (ex: `https://api.seudominio.com/api/instagram/webhook/slug_do_cliente`).
   - **Token de Verificação:** O token configurado na variável `INSTAGRAM_VERIFY_TOKEN` do seu arquivo `.env`.
4. Após salvar e validar a conectividade, na lista de campos do Webhook, ative a assinatura (marcando **Assinado** ou *Subscribed*) nos campos:
   - `comments`
   - `messages`

---

## ⚡ Passo 5: Inscrever a Página do Facebook no Webhook (Ativação Final)
Para que a Meta passe a encaminhar os comentários ao webhook do ZapVoice, a Página vinculada precisa ser inscrita explicitamente no aplicativo.

1. Acesse o [Graph API Explorer](https://developers.facebook.com/tools/explorer/).
2. No painel direito:
   - Em **Meta App**, selecione seu aplicativo.
   - Em **User or Page**, selecione a **Página do Facebook** associada.
   - O campo *Access Token* será atualizado para o **Page Access Token**. Copie este token.
3. Abra uma ferramenta como o **Postman** e faça uma requisição **POST**:
   - **URL:** `https://graph.facebook.com/v25.0/{ID_DA_SUA_PAGINA_DO_FACEBOOK}/subscribed_apps`
   - **Headers / Body** (como `x-www-form-urlencoded`):
     - `subscribed_fields` = `feed,messages`
     - `access_token` = *(Page Access Token copiado no passo 2)*
4. Clique em **Send**. O retorno deve ser `{"success": true}`.

Pronto! A integração do Instagram está concluída e ativa para receber novos gatilhos de automação.
