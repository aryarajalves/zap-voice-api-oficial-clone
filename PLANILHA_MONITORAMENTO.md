# 🏥 Plano de Implementação: Painel de Monitoramento ZapVoice

Este documento detalha as etapas necessárias para implementar o monitoramento em tempo real de CPU, RAM e integridade do sistema no ZapVoice, com foco em escalabilidade para o modelo SaaS.

---

## 📋 Lista de Tarefas (Checklist)

### Fase 1: Coleta de Dados (Backend)
- [ ] Instalar dependência `psutil` no container do Backend.
- [ ] Criar serviço `SystemMonitor` em `backend/services/monitor.py`.
- [ ] Implementar leitura de CPU/RAM adaptada para Containers (Cgroups).
- [ ] Implementar leitura de tamanho de fila no RabbitMQ.
- [ ] Criar endpoint de "Health Check" para validar status do Banco e do Worker.

### Fase 2: Comunicação Real-time (WebSocket)
- [ ] Criar tarefa em segundo plano (Background Task) no `main.py` para coletar dados a cada 3-5 segundos.
- [ ] Integrar dados de monitoramento no `websocket_manager.py`.
- [ ] Definir o evento `system_stats` para disparar os dados via socket para usuários logados como admin.

### Fase 3: Interface do Dashboard (Frontend)
- [ ] Adicionar biblioteca de gráficos `recharts` ao projeto frontend.
- [ ] Criar o componente `MonitoringPage.jsx`.
- [ ] Desenvolver cartões de status superior (CPU, RAM, Fila, Status dos Serviços).
- [ ] Implementar gráfico de linha dinâmico com histórico de 20 pontos de dados.
- [ ] Criar widget de "Logs Críticos Recentes".

### Fase 4: Proteção e Deploy
- [ ] Adicionar novo item "Monitoramento" no menu lateral (`Sidebar.jsx`).
- [ ] Implementar trava de segurança: Apenas usuários com `role: 'super_admin'` podem acessar a página.
- [ ] Atualizar `docker-compose.yml` para garantir que o container tenha permissão de ler estatísticas do host.
- [ ] Realizar build e deploy da versão 1.7.0.

---

## 🛠️ Detalhamento Técnico

### 1. Backend (O Coração da Coleta)
Usaremos o `psutil` para ler os recursos. Como estamos em Docker, leremos `/sys/fs/cgroup/memory/memory.usage_in_bytes` para obter a memória exata do container, garantindo que o gráfico reflita o limite imposto pelo Docker e não o total de RAM do servidor físico.

### 2. WebSocket (O Fluxo de Dados)
O backend não esperará o frontend pedir. Assim que o admin abrir a página de monitoramento, o WebSocket começará a "cuspir" um JSON estruturado como este:
```json
{
  "event": "system_stats",
  "data": {
    "cpu": 24.5,
    "ram": 512, 
    "ram_percent": 45.0,
    "queue_size": 1250,
    "services": {
      "database": "online",
      "worker": "online",
      "rabbitmq": "online"
    }
  }
}
```

### 3. Frontend (O Visual Profissional)
O uso de **Recharts** permitirá que as linhas do gráfico deslizem suavemente conforme novos dados chegam, criando aquele efeito de "sala de controle" que impressiona os clientes SaaS.

---

## 🏁 Critérios de Sucesso
- [ ] Atraso máximo entre a coleta e a visualização inferior a 1 segundo.
- [ ] Impacto de CPU do monitoramento no servidor inferior a 1%.
- [ ] Gráfico deve mostrar claramente o pico de recursos durante um disparo de 100+ mensagens.

---
*Plano gerado por Antigravity em 12/02/2026.*
