# 🛡️ Relatório e Blindagem de Segurança — ZapVoice (Security Overview)

Este documento apresenta todas as **medidas de segurança, blindagens de arquitetura, proteções criptográficas e controles de acesso** que foram ativamente implementados e validados no ecossistema do **ZapVoice**.

---

## 📌 Sumário Executivo de Segurança

| Área / Pilar | Status | Mecanismo Implementado |
| :--- | :---: | :--- |
| **Autenticação & Hash** | ✅ Ativo & Validado | Argon2id com Password Pepper (HMAC-SHA256) |
| **Multi-tenancy & IDOR** | ✅ Ativo & Validado | Injeção de dependência `get_validated_client_id` em todos os endpoints |
| **Proteção de Dados & PII** | ✅ Ativo & Validado | Sanitização dinâmica de senhas e tokens em logs de erro |
| **Criptografia em Repouso** | ✅ Ativo & Validado | Criptografia simétrica com chave secreta para tokens sensíveis no banco |
| **Uploads Seguros (Magic Bytes)** | ✅ Ativo & Validado | Verificação de assinatura real de bytes (PureMagic / Header Sniffing) |
| **Isolamento WebSocket** | ✅ Ativo & Validado | Roteamento e broadcast de mensagens em tempo real isolado por cliente |
| **Segurança de Webhooks** | ✅ Ativo & Validado | Validação criptográfica de assinaturas (Meta, Hotmart, Kiwify, Stripe) |
| **Políticas de Senha & Brute Force**| ✅ Ativo & Validado | Validação mínima de complexidade + Rate Limiting com SlowAPI |
| **Infraestrutura & Containers** | ✅ Ativo & Validado | Docker Compose com isolamento de rede, Traefik SSL e sem portas expostas |
| **Auditoria de Dependências** | ✅ 0 Vulnerabilidades | Script integrado `audit_security.py` (pip-audit + npm audit) |

---

## 🛡️ Medidas e Blindagens Implementadas no Projeto

### 1. Autenticação Robusta e Proteção de Senhas (Argon2id + Pepper)
- **Implementação:** As senhas dos usuários utilizam o padrão mais alto recomendado pela OWASP (algoritmo **Argon2id**), complementado por um segredo de servidor (**Password Pepper** via HMAC-SHA256).
- **Proteção:** Mesmo em um cenário hipotético de vazamento de banco de dados (dump SQL), os hashes são matematicamente imunes a ataques de dicionário e *Rainbow Tables* offline sem a chave secreta do servidor.
- **Validação:** Testes unitários dedicados em `backend/tests_unit/test_argon2_pepper_security.py`.

### 2. Blindagem Multi-tenant e Prevenção contra IDOR (Insecure Direct Object Reference)
- **Implementação:** Todas as rotas administrativas, de API Keys, contatos, mídias e disparos utilizam a dependência centralizada `get_validated_client_id`.
- **Proteção:** Um usuário autenticado da Empresa A jamais consegue consultar, alterar, deletar ou criar recursos pertencentes à Empresa B forjando o cabeçalho `X-Client-ID`. O sistema valida se o usuário tem permissão explícita para aquele cliente antes de processar qualquer query.
- **Validação:** Testes unitários completos em `backend/tests_unit/test_idor_multitenant_security.py`.

### 3. Mascaramento e Sanitização de Credenciais em Logs (Proteção PII)
- **Implementação:** Manipulador global de exceções de validação (`RequestValidationError`) com a função `_sanitize_validation_errors`.
- **Proteção:** Quando um usuário digita uma senha errada ou submete um formulário com erro, o corpo bruto da requisição é interceptado e campos sensíveis (`password`, `current_password`, `new_password`, `api_key`) são substituídos por `******` antes de qualquer gravação de log.
- **Validação:** Testes unitários em `backend/tests_unit/test_validation_pii_security.py`.

### 4. Criptografia em Repouso para Tokens e Credenciais de Terceiros
- **Implementação:** Módulo `core/encryption.py` com criptografia simétrica com prefixo rastreável `enc:v1:`.
- **Proteção:** Chaves de API de terceiros (Tokens da Meta WhatsApp Cloud API, credenciais SMTP de e-mail e chaves do ManyChat) são criptografadas antes de serem gravadas no banco de dados e descriptografadas sob demanda apenas na memória durante o uso.
- **Validação:** Testes unitários em `backend/tests_unit/test_field_encryption_security.py`.

### 5. Validação Rígida de Uploads por Assinatura de Bytes (Magic Bytes)
- **Implementação:** Validador em `core/file_validator.py` que inspeciona os primeiros bytes do arquivo (Magic Bytes) antes de armazená-lo.
- **Proteção:** Impede que invasores façam upload de executáveis maliciosos (Windows `.exe`, Linux ELF, scripts PHP ou JavaScript) disfarçados com extensão `.png`, `.jpg` ou `.pdf`.
- **Validação:** Testes unitários em `backend/tests_unit/test_upload_magic_bytes_security.py`.

### 6. Isolamento e Segurança de Eventos em Tempo Real (WebSocket)
- **Implementação:** O `ConnectionManager` no `websocket_manager.py` vincula cada conexão WebSocket ao `client_id` autenticado via JWT.
- **Proteção:** Eventos de progresso de disparos, status de mensagens e notificações em tempo real são enviados única e exclusivamente para as conexões do mesmo cliente. Nenhum evento vaza entre empresas diferentes conectadas na mesma instância.
- **Validação:** Testes unitários em `backend/tests_unit/test_websocket_security.py`.

### 7. Validação Criptográfica de Webhooks de Vendas e Mensagens
- **Implementação:** Módulo `core/webhook_security.py` com comparações de tempo constante (`hmac.compare_digest`).
- **Proteção:**
  - **Meta Cloud API:** Validação do cabeçalho `X-Hub-Signature-256` contra o `META_APP_SECRET`.
  - **Stripe:** Verificação de assinatura com tolerância máxima de drift de 300 segundos para impedir Replay Attacks.
  - **Hotmart / Kiwify / Plataformas de Vendas:** Validação estrita por Slug Secreto e tokens de integridade (`hottok` / `webhook_secret`).
- **Validação:** Testes unitários em `backend/tests_unit/test_webhook_security.py`.

### 8. Proteção contra Ataques de Força Bruta e Sobrecarga (Rate Limiting)
- **Implementação:** Decoradores com **SlowAPI** configurados para limitar o número de requisições por IP e por usuário em endpoints críticos (login, rotas públicas e convites).
- **Proteção:** Impede tentativas automatizadas de adivinhação de senhas, varreduras de tokens de convite e ataques de negação de serviço (DDoS / DoS).

### 9. Blindagem de Rede e Containers Docker de Produção
- **Implementação:** `docker-compose-producao.yml` configurado sem exposição direta de portas da API para a internet (`ports:` removido).
- **Proteção:** Todo o tráfego externo passa obrigatoriamente pelo proxy reverso seguro (Traefik) com terminação SSL/HTTPS e headers modernos de segurança (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection: 1; mode=block`).

### 10. Auditoria Contínua de Dependências (Zero Vulnerabilidades)
- **Implementação:** Pipeline com `scripts/audit_security.py` executando auditoria tanto no ecossistema Python (`pip-audit` no `requirements.txt`) quanto no ecossistema Node/React (`npm audit` no `package.json`).
- **Garantia:** O código em produção é mantido rigorosamente com **0 vulnerabilidades conhecidas**.

---

## 🧪 Suíte de Testes Automatizados de Segurança

Todos os recursos de segurança acima possuem suíte de testes unitários automatizados para garantir que nenhuma alteração futura cause regressões:

```bash
# Executar todos os testes de segurança
pytest backend/tests_unit/test_*security*.py -v
```

**Resultado:** 100% dos testes de segurança aprovados.
