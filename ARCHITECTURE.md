# 🏗️ Arquitetura do Sistema - ZapVoice (v3.5.7)

Este documento descreve a infraestrutura técnica, os fluxos de dados e a organização do código do ZapVoice.

## 🚀 Stack Tecnológica

- **Backend**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.10+) - Framework moderno de alta performance para APIs.
- **Frontend**: [React](https://reactjs.org/) + [Vite](https://vitejs.dev/) - UI rápida com Design System Premium.
- **Banco de Dados**: [PostgreSQL](https://www.postgresql.org/) (Produção) / [SQLite](https://www.sqlite.org/index.html) (Desenvolvimento).
- **Mensageria (Filas)**: [RabbitMQ](https://www.rabbitmq.com/) - Gerenciamento de tarefas em segundo plano e disparos.
- **Cache/Estado**: [Redis](https://redis.io/) - Utilizado para sincronização e locks atômicos.
- **Containerização**: [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/).

---

## 📂 Estrutura de Pastas

### Backend (`/backend`)
- `core/`: Configurações globais, sistema de logs e componentes base do worker.
- `models/`: Definições de tabelas SQLAlchemy (Trigger, Funil, Cliente, Integração).
- `routers/`: Endpoints da API organizados por domínio (Webhooks, WhatsApp, Usuários).
- `services/`: Lógica de negócio pura (Processamento de webhooks, motor de funis, gestão de janelas).
- `worker.py`: Ponto de entrada do processo que consome as filas do RabbitMQ.
- `main.py`: Ponto de entrada da API FastAPI.

### Frontend (`/frontend`)
- `src/components/`: Componentes UI reutilizáveis (Botões, Modais, Cards).
- `src/pages/`: Páginas completas da aplicação.
- `src/hooks/`: Lógica de estado e chamadas de API encapsuladas em hooks.
- `src/contexts/`: Provedores de contexto global (Autenticação, Tema, Cliente Selecionado).

---

## 🔄 Fluxo de Dados de Disparo

O ZapVoice utiliza uma arquitetura baseada em eventos para garantir escalabilidade e não bloquear a interface do usuário.

1.  **Ingestão**: Um Webhook externo (Hotmart/Kiwify) ou uma ação na UI chega à API.
2.  **Validação**: A API valida os dados, o `client_id` e as permissões.
3.  **Enfileiramento**: A tarefa é publicada no **RabbitMQ** (ex: fila `zapvoice_funnel_executions`).
4.  **Processamento**: O **Worker** consome a mensagem, busca o funil no banco e inicia a execução.
5.  **Execução**: O Worker realiza as chamadas para a **API Oficial do WhatsApp (Meta)**.
6.  **Feedback**: O status da mensagem (Enviada, Entregue, Lida) é recebido via Webhook da Meta e atualizado no banco de dados em tempo real.

---

## 🔒 Multi-tenancy

O sistema é desenhado para suportar múltiplos clientes isolados.
- Cada registro no banco de dados possui uma coluna `client_id`.
- Todas as queries de leitura e escrita são filtradas obrigatoriamente pelo `client_id` do usuário autenticado.
- Isso permite que uma única instância do ZapVoice atenda diversas empresas com total segurança.

---

## 🛠️ Sistema de Filas (RabbitMQ)

- `whatsapp_events`: Ingestão bruta de eventos da Meta (status, mensagens recebidas).
- `zapvoice_funnel_executions`: Execução de etapas de funis.
- `bulk_dispatches`: Processamento de disparos em massa para evitar sobrecarga.
- `webhook_processing`: Processamento de webhooks de plataformas de vendas.

---

## 📈 Escalabilidade

Para aumentar a capacidade de disparo, basta subir múltiplas instâncias do container `worker`. O RabbitMQ distribuirá as mensagens entre os workers disponíveis automaticamente.
