export const SIMULATE_MESSAGING =
  import.meta.env.VITE_SIMULATE_MESSAGING === 'true' || 
  window._env_?.VITE_SIMULATE_MESSAGING === 'true' || 
  window._env_?.SIMULATE_MESSAGING === 'true' || 
  window._env_?.SIMULATE_MESSAGING === true;

export const PAGE_NAMES = {
  bulk_sender:          'Disparo em Massa',
  recurring_schedules:  'Disparo Recorrente',
  pagina_captura:       'Checkout Prepopulado',
  schedules:            'Agenda de Disparos',
  history:              'Histórico de Disparos',
  hot_leads:            'Leads Quentes',
  whatsapp:             'Templates do WhatsApp',
  funnels:              'Funis de Vendas',
  integrations:         'Integrações Webhook',
  instagram_automation: 'Automação Instagram',
  leads:                'Contatos',
  import_history:       'Histórico de Importação',
  blocked:              'Contatos Bloqueados',
  financial:            'Financeiro',
};

export const VIEW_TITLES = {
  bulk_sender: 'Disparo em Massa',
  recurring_schedules: 'Disparo Recorrente Criado',
  funnels: 'Meus Funis',
  history: 'Histórico de Disparos',
  blocked: 'Contatos Bloqueados',
  users: 'Gestão de Usuários',
  templates: 'Gerenciar Templates',
  schedules: 'Agenda de Disparos',
  monitoring: 'Status do Sistema',
  integrations: 'Integrações Webhook',
  financial: 'Financeiro',
  leads: 'Webhook Leads',
  appointments: 'Agendamentos',
  import_history: 'Histórico de Importação de Contatos',
  stress_test: 'Teste de Escala',
  backup_db: 'Backup Banco',
  hot_leads: 'Leads Quentes',
  instagram_automation: 'Automação Instagram',
  tutorial: 'Tutorial API Oficial',
  log_viewer: 'Visualizador de Logs',
  chat_conversations: 'Atendimento',
  human_agents: 'Atendente humano',
  vendedor_home: 'Painel de Atendimento',
};
