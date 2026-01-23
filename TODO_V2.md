# 🚀 ZapVoice - Roadmap Versão 2.0

Lista de melhorias e novas funcionalidades planejadas para a próxima versão do sistema.

## 🔒 Infraestrutura e Segurança
- [ ] **Configurar Cloudflare Tunnel:**
    - Criar túnel para expor o **MinIO Console e API** de forma segura (HTTPS) para integração perfeita com Chatwoot.
    - Criar túnel para o **RabbitMQ Management Portal** (Painel de Gerenciamento).
    - Avaliar necessidade de túnel TCP para a porta 5672 (AMQP) do RabbitMQ.
    - Centralizar toda a gestão de certificados SSL via Cloudflare.

## ⚙️ Inteligência e Automação
- [ ] **Monitoramento avançado de filas:** Interface para ver mensagens pendentes, velocidade de disparo e botão de "retry" para falhas.
- [ ] **Dashboards de métricas (Real-time):** Gráficos de taxa de entrega, conversão de funil e cliques via WebSockets.
- [ ] **Gatilhos Externos (Webhooks Inbound):** Iniciar funis automaticamente a partir de eventos externos (Hotmart, Stripe, CRMs).
- [ ] **Agendamento Avançado:** Planejamento de disparos com visão de calendário.

## 🎨 UX e Produto
- [ ] **Visual Flow Builder:** Editor drag-and-drop para criação de funis de forma visual.
- [ ] **Teste A/B:** Disparar diferentes versões de templates para medir performance.
- [ ] **Integração com IA (LLMs):** Blocos de inteligência artificial dentro do funil para respostas dinâmicas.

## 🏦 Gestão Multi-tenant & Enterprise (SaaS)
- [ ] **Sistema de Cotas:** Limitar envios por cliente (ex: 5.000 mensagens/mês).
- [ ] **Painel Admin Master:** Visão geral de todos os clientes e saúde do sistema global.
- [ ] **White-Label:** Sistema de temas para permitir que agências usem suas próprias marcas e cores.
- [ ] **Exportação de Relatórios:** Gerar PDFs e Planilhas de performance de campanhas para clientes.

## 🛡️ Segurança e Robustez (Anti-Ban)
- [ ] **Smart Delays:** Intervalos aleatórios entre disparos para simular comportamento humano.
- [ ] **Suporte a Spintax:** Variações automáticas de texto (ex: `{Olá|Oi|Ei}`) para evitar padrões repetitivos.
- [ ] **Simulação de Digitação:** Enviar status de "typing..." via API antes do envio da mensagem.

## 🧠 Novas Fronteiras
- [ ] **Transcrição de Áudio (Whisper):** Transcrever automaticamente áudios recebidos dos clientes e usar o texto em condições de funil.
- [ ] **Smart Audiences:** Segmentação dinâmica (ex: "Clientes que não compram há 30 dias").
- [ ] **Multicanal Fallback:** Se o WhatsApp falhar, enviar automaticamente via SMS ou E-mail.
