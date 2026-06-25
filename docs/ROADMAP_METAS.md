# 📖 Detalhamento Completo da Configuração: WhatsApp API Oficial & Instagram

Este documento serve como a base textual e de roteiro para a nossa Central de Tutoriais Pública do ZapVoice. Cada seção abaixo contém instruções ultra-detalhadas e instruções claras "passo a passo" para os clientes finais executarem sem margem de erro.

---

## 🟢 PARTE 1: WhatsApp (API Oficial - Cloud API)

### 📌 Passo 1: Compartilhar o Portfólio Empresarial (Meta Business Manager - BM)
* **Objetivo:** Dar acesso administrativo temporário ou permanente para que a equipe de suporte do ZapVoice configure a parte de programação.
* **Instruções Detalhadas para o Cliente:**
  1. Acesse o painel do [Configurações do Negócio da Meta](https://business.facebook.com/settings).
  2. No topo superior esquerdo, clique no menu suspenso e escolha a empresa correta (BM).
  3. No menu lateral esquerdo, vá em **Usuários** e clique em **Pessoas**.
  4. Clique no botão azul **Convidar pessoas** no canto superior direito.
  5. Digite o e-mail oficial fornecido pela equipe do ZapVoice.
  6. Role até "Acesso total" e ative obrigatoriamente a opção **Gerenciar** (isso permite que nossa equipe configure o aplicativo do WhatsApp e crie chaves sem incomodar você).
  7. Clique em **Avançar**, depois em **Avançar** novamente (sem selecionar nenhum ativo) e por fim em **Convidar**.
  8. Avise o suporte do ZapVoice que o convite foi enviado.

---

### 📌 Passo 2: Configuração e Verificação da Empresa (Meta Business Suite)
* **Objetivo:** Validar a legitimidade da sua empresa perante a Meta para liberar limites maiores de disparos diários e habilitar o Cadastro Incorporado (Embedded Signup).
* **O que é o Cadastro Incorporado (Embedded Signup)?** É o fluxo utilizado para que outros usuários e clientes consigam criar e conectar suas próprias contas de WhatsApp (WABAs) utilizando o nosso próprio aplicativo de forma integrada e automática.
* **O que é a Coexistência?** É o recurso que permite que o mesmo número de telefone seja utilizado simultaneamente no aplicativo móvel do WhatsApp (ou WhatsApp Business de celular) e na API Oficial da Meta configurada no nosso sistema, permitindo que a transição ocorra de forma transparente.
* **Instruções Detalhadas para o Cliente:**
  1. Acesse a aba **Informações da Empresa** no menu lateral esquerdo das Configurações do Negócio.
  2. Procure pelo campo **Status de verificação da empresa** no painel central.
  3. Se estiver escrito "Não verificado", clique em **Ver detalhes** ou acesse diretamente a aba **Centro de Segurança**.
  4. Clique no botão **Iniciar verificação**.
  5. Insira os dados idênticos ao registro do seu CNPJ (Razão Social, Endereço comercial, Telefone e site oficial).
  6. **Envio de Documentos:** Envie fotos nítidas dos documentos comprovando o CNPJ (ex: Cartão CNPJ atualizado ou Contrato Social).
  7. **Comprovante de Endereço:** Envie uma conta de luz, telefone ou extrato bancário em nome da empresa contendo o mesmo endereço cadastrado.
  8. Selecione o método de verificação do código (Recomendado: e-mail comercial `@suaempresa.com.br` ou SMS/Ligação no número fixo da empresa).
  9. Insira o código recebido e conclua a solicitação. A análise da Meta leva de 1 a 5 dias úteis.

---

### 📌 Passo 3: Adicionar e Verificar o Número de Telefone (WhatsApp)
* **Objetivo:** Vincular o número que fará os envios de mensagens à API do WhatsApp.
* **Atenção (Importante):** O número **não pode** estar ativo no aplicativo comum do WhatsApp ou WhatsApp Business de celular. Se estiver, você precisará **deletar a conta** antes do processo (vá em *Configurações > Conta > Apagar minha conta* no celular).
* **Fluxo Recomendado para Evitar Erros:**
  * Se a Conta do WhatsApp comercial (WABA) do cliente ainda não foi criada, **crie a WABA antes de tentar adicionar o número de telefone**.
  * Crie a conta de negócios do WhatsApp sem nenhum número vinculado primeiro. Só depois de criada a WABA, entre no painel e associe o número de telefone correspondente a ela.
* **Instruções Detalhadas para o Cliente:**
  1. No menu lateral esquerdo das Configurações do Negócio, clique em **Contas** e depois em **Contas do WhatsApp**.
  2. Clique em **Adicionar** e depois em **Criar uma nova conta do WhatsApp** (deixe sem número se a opção estiver disponível, ou crie a WABA vazia primeiro).
  3. Insira o Nome de Exibição da Empresa (deve ser condizente com a sua marca para a Meta aprovar).
  4. Defina o fuso horário correto e a moeda de cobrança (Recomendado: **Real Brasileiro - BRL**).
  5. Vá em "WhatsApp Manager" (Gerenciador do WhatsApp), clique no número e associe-o a essa WABA recém-criada.
  6. Insira o número de telefone com o código de área (Exemplo: `+55 (11) 99999-9999`).
  7. Escolha como receber o código de confirmação: **SMS** ou **Ligação telefônica** (Recomendado: Ligação para números fixos ou 0800).
  8. Digite o código de 6 dígitos enviado pela Meta no painel para confirmar e finalizar a ativação.

* **O que fazer se o número ficar com Status "Pendente" (Pending)?**
  Se após a verificação o número continuar listado como pendente e não mudar para ativo no painel, o administrador deve fazer uma chamada de API manual (via Postman, Insomnia ou similar) usando o token de acesso da API do desenvolvedor para liberar e registrar o número.
  
  **Requisição de Registro de Telefone:**
  * **Método:** `POST`
  * **URL:** `https://graph.facebook.com/{{Version}}/{{Phone-Number-ID}}/register`
  * **Headers:**
    * `Authorization`: `Bearer {{Seu-System-User-Token}}`
    * `Content-Type`: `application/json`
  * **Body (JSON):**
    ```json
    {
        "messaging_product": "whatsapp",
        "pin": "123456"
      }
    ```
    *(Onde "pin" é o código de verificação em duas etapas de 6 dígitos que você definiu para o número).*

---

### 📌 Passo 4: Configurar Métodos de Pagamento na Meta
* **Objetivo:** Adicionar um cartão para pagar o consumo de mensagens diretamente para a Meta. A Meta cobra alguns centavos por conversa iniciada após a franquia gratuita de 1.000 conversas mensais de serviço.
* **Instruções Detalhadas para o Cliente:**
  1. Acesse o **Gerenciador do WhatsApp** (WhatsApp Manager) clicando no menu hambúrguer das ferramentas do Business Manager.
  2. No menu lateral esquerdo, clique em **Cobrança** ou **Formas de pagamento**.
  3. Clique no botão **Adicionar forma de pagamento**.
  4. Insira as informações do cartão de crédito da empresa (precisa ser um cartão habilitado para compras internacionais).
  5. Salve as alterações. Esse cartão será cobrado automaticamente pela Meta no fechamento mensal de faturas de uso de mensagens.

---

## 🔵 PARTE 2: Instagram (Automação de Mensagens e DMs)

### 📌 Passo 5: Vincular Instagram Profissional à Página do Facebook
* **Objetivo:** Conectar os canais de comunicação da Meta. A API de mensagens do Instagram exige obrigatoriamente que a conta esteja vinculada a uma página proprietária no Facebook.
* **Instruções Detalhadas para o Cliente:**
  1. Abra o aplicativo do Instagram no seu celular.
  2. Vá no seu Perfil e selecione **Editar perfil**.
  3. Em "Informações comerciais públicas", toque em **Página**.
  4. Selecione a Página do Facebook que você gerencia ou clique em "Criar nova página".
  5. *Alternativa pelo computador:* Acesse a sua Página do Facebook, vá em **Configurações**, selecione **Contas vinculadas > Instagram** e clique em **Conectar conta** informando o login e senha da conta do Instagram.

---

### 📌 Passo 6: Habilitar Permissão de Acesso a Mensagens (Direct)
* **Objetivo:** Permitir que o ZapVoice gerencie e responda às mensagens diretas (DMs) enviadas pelos seus leads no Instagram.
* **Instruções Detalhadas para o Cliente:**
  1. Abra o aplicativo do Instagram no celular e vá para o seu perfil.
  2. Toque no menu de três riscas no canto superior direito e acesse **Configurações e atividade**.
  3. Role a tela para baixo até encontrar a seção **Como os outros interagem com você** e clique em **Mensagens e respostas ao story**.
  4. Selecione **Controles de mensagens**.
  5. Vá até a seção **Ferramentas conectadas** na parte inferior e ative a chave **Permitir acesso a mensagens**.
  6. Sem essa chave ativada no celular, a automação não receberá as mensagens.

---

### 📌 Passo 7: Conectar as Credenciais no ZapVoice
* **Objetivo:** Configurar os parâmetros técnicos gerados para ativar o robô de webhook do ZapVoice.
* **Instruções Detalhadas para o Administrador:**
  1. No painel administrativo do ZapVoice, selecione o cliente ativo.
  2. Vá na aba lateral **Automação Instagram**.
  3. Clique no botão de configurações (engrenagem) no canto superior direito da listagem.
  4. Insira o **ID da Conta do Instagram Business** (obtido nas Configurações da Meta).
  5. Insira o **Token de Acesso da Página (Page Access Token)** permanente gerado.
  6. Copie a **URL do Webhook** gerada na tela.
  7. Vá ao painel Meta for Developers do seu aplicativo do Instagram, assine o produto Webhook, insira a URL e ative a inscrição nos campos `messages` e `comments`.
  8. Salve e a integração estará pronta.
