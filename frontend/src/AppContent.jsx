import React from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { FiLayers, FiTrash2, FiEdit2, FiPlay, FiGlobe, FiArchive, FiTag, FiChevronLeft, FiChevronRight, FiBookmark, FiZap, FiCopy } from 'react-icons/fi';
import Sidebar from './components/Sidebar';
import ConnectionStatus from './components/ConnectionStatus';
import AppModals from './components/AppModals';
import { useAppLogic } from './hooks/useAppLogic';

import { FunnelList } from './components/FunnelList';

const SIMULATE_MESSAGING = import.meta.env.VITE_SIMULATE_MESSAGING === 'true' || 
                           window._env_?.VITE_SIMULATE_MESSAGING === 'true' || 
                           window._env_?.SIMULATE_MESSAGING === 'true' || 
                           window._env_?.SIMULATE_MESSAGING === true;

// View Components
import FunnelBuilder from './components/FunnelBuilder';
import TemplateBulkSender from './components/TemplateBulkSender';
import TriggerHistory from './components/TriggerHistory';
import BlockedContacts from './components/BlockedContacts';
import Users from './pages/Users';
import SchedulePage from './pages/SchedulePage';
import TemplateCreator from './components/TemplateCreator';
import Monitoring from './pages/Monitoring';
import Integrations from './pages/Integrations';
import WebhookLeads from './pages/WebhookLeads';
import ImportHistoryPage from './pages/WebhookLeads/ImportHistoryPage';
import AppointmentsPage from './pages/WebhookLeads/AppointmentsPage';
import Financial from './pages/Financial';
import RecurringSchedules from './components/RecurringSchedules';
import VisualFlowBuilder from './components/VisualFlowBuilder';
import StressTest from './pages/StressTest';
import BackupDatabase from './pages/BackupDatabase';
import HotLeads from './pages/HotLeads/HotLeads';
import InstagramAutomation from './pages/InstagramAutomation';
import TutorialPage from './pages/TutorialPage';
import PageUnderConstruction from './components/PageUnderConstruction';
import LogViewer from './pages/LogViewer';
import ChatConversations from './pages/ChatConversations';
import HumanAgents from './pages/HumanAgents';
import CheckoutPresellPage from './pages/CheckoutPresellPage';
import CapturePageAdmin from './pages/CapturePageAdmin';
import EmailMarketingMain from './components/EmailMarketing/EmailMarketingMain';

// Maps pages_status key → page display name (for under-construction screen)

const PAGE_NAMES = {
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

// Returns the under-construction screen if the page isn't built yet, otherwise renders children
const PageGuard = ({ pageKey, pagesStatus, children }) => {
  const status = (pagesStatus || {})[pageKey];
  if (status && status.built === false) {
    return <PageUnderConstruction pageName={PAGE_NAMES[pageKey] || pageKey} percentage={status.percentage ?? 0} />;
  }
  return children;
};

export default function AppContent() {
  const logic = useAppLogic();

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#0f172a] dark:text-gray-100 overflow-hidden">
      <Toaster position="top-right" reverseOrder={false} containerStyle={{ zIndex: 99999999 }} toastOptions={{ style: { zIndex: 99999999 } }} />

      <AppModals logic={logic} />

      <Sidebar
        activeView={logic.currentView}
        onViewChange={logic.handleViewChange}
        onLogout={logic.logout}
        onSettings={() => {
          window.dispatchEvent(new CustomEvent('close-all-dropdowns'));
          logic.setIsSettingsModalOpen(true);
        }}
        user={logic.user}
        clientName={logic.clientName}
        onClientCreate={() => {
          window.dispatchEvent(new CustomEvent('close-all-dropdowns'));
          logic.setIsClientModalOpen(true);
        }}
        appBranding={logic.appBranding}
      />

      <main className="flex-1 overflow-y-auto">
        {!logic.activeClient ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8 text-center animate-fade-in">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
              <FiLayers size={40} className="text-gray-300 dark:text-gray-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Inicie uma Sessão</h2>
            <p className="max-w-xs text-sm leading-relaxed">Selecione um cliente ativo no menu ao lado.</p>
          </div>
        ) : (          <>
            <header className="mb-8 flex justify-between items-start p-8 pb-0">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {logic.currentView === 'bulk_sender' && 'Disparo em Massa'}
                    {logic.currentView === 'recurring_schedules' && 'Disparo Recorrente Criado'}
                    {logic.currentView === 'funnels' && 'Meus Funis'}
                    {logic.currentView === 'history' && 'Histórico de Disparos'}
                    {logic.currentView === 'blocked' && 'Contatos Bloqueados'}
                    {logic.currentView === 'users' && 'Gestão de Usuários'}
                    {logic.currentView === 'templates' && 'Gerenciar Templates'}
                    {logic.currentView === 'schedules' && 'Agenda de Disparos'}
                    {logic.currentView === 'monitoring' && 'Status do Sistema'}
                    {logic.currentView === 'integrations' && 'Integrações Webhook'}
                    {logic.currentView === 'financial' && 'Financeiro'}
                    {logic.currentView === 'leads' && 'Webhook Leads'}
                    {logic.currentView === 'appointments' && 'Agendamentos'}
                    {logic.currentView === 'import_history' && 'Histórico de Importação de Contatos'}
                    {logic.currentView === 'stress_test' && 'Teste de Escala'}
                    {logic.currentView === 'backup_db' && 'Backup Banco'}
                    {logic.currentView === 'hot_leads' && 'Leads Quentes'}
                    {logic.currentView === 'instagram_automation' && 'Automação Instagram'}
                    {logic.currentView === 'tutorial' && 'Tutorial API Oficial'}
                    {logic.currentView === 'log_viewer' && 'Visualizador de Logs'}
                    {logic.currentView === 'chat_conversations' && 'Atendimento'}
                    {logic.currentView === 'human_agents' && 'Atendente humano'}
                    {logic.currentView === 'vendedor_home' && 'Painel de Atendimento'}
                  </h1>

                  
                  {/* Guide Buttons */}
                  {logic.currentView === 'funnels' && !logic.showBuilder && (
                    <GuideButton onClick={() => logic.setIsFunnelGuideOpen(true)} color="#818cf8" bg="rgba(99,102,241,0.1)" border="rgba(99,102,241,0.3)" />
                  )}
                  {logic.currentView === 'schedules' && (
                    <GuideButton onClick={() => logic.setIsScheduleGuideOpen(true)} color="#fbbf24" bg="rgba(251,191,36,0.1)" border="rgba(251,191,36,0.3)" />
                  )}
                  {logic.currentView === 'history' && (
                    <GuideButton onClick={() => logic.setIsHistoryGuideOpen(true)} color="#38bdf8" bg="rgba(14,165,233,0.1)" border="rgba(14,165,233,0.3)" />
                  )}
                  {logic.currentView === 'blocked' && (
                    <GuideButton onClick={() => logic.setIsBlockedGuideOpen(true)} color="#fb923c" bg="rgba(249,115,22,0.1)" border="rgba(249,115,22,0.3)" />
                  )}
                </div>
                {logic.clientName && logic.currentView === 'bulk_sender' && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Api Oficial do WhatsApp do cliente {logic.clientName}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {(SIMULATE_MESSAGING || logic.currentView === 'stress_test') && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 dark:bg-yellow-500/20 border border-yellow-500/30 dark:border-yellow-500/40 text-yellow-700 dark:text-yellow-400 text-xs font-bold rounded-xl animate-pulse" title="Modo Simulação / Teste de Estresse Ativo">
                    <FiZap size={14} className="animate-bounce" />
                    <span>Modo Teste de Escala</span>
                  </div>
                )}
                <ConnectionStatus refreshKey={logic.settingsRefreshKey} />
              </div>
            </header>

            <div className="p-8 pt-0">
              {/* View Rendering */}
              {logic.currentView === 'blocked' && (
                <PageGuard pageKey="blocked" pagesStatus={logic.user?.pages_status}>
                  <BlockedContacts />
                </PageGuard>
              )}
              {logic.currentView === 'email_marketing' && <EmailMarketingMain />}
              {logic.currentView === 'users' && <Users />}

              {logic.currentView === 'schedules' && (
                <PageGuard pageKey="schedules" pagesStatus={logic.user?.pages_status}>
                  <SchedulePage />
                </PageGuard>
              )}
              {logic.currentView === 'monitoring' && <Monitoring />}
              {logic.currentView === 'integrations' && (
                <PageGuard pageKey="integrations" pagesStatus={logic.user?.pages_status}>
                  <Integrations
                    onNavigateToLeads={() => logic.setCurrentView('leads')}
                    onNavigateToBulk={() => logic.setCurrentView('bulk_sender')}
                    onNavigateToDispatchHistory={() => logic.setCurrentView('history')}
                    onNavigateToFunnels={() => logic.setCurrentView('funnels')}
                    onNavigateToChat={() => logic.setCurrentView('chat_conversations')}
                  />
                </PageGuard>
              )}
              {logic.currentView === 'leads' && (
                <PageGuard pageKey="leads" pagesStatus={logic.user?.pages_status}>
                  <WebhookLeads
                    onNavigateToImportHistory={() => logic.setCurrentView('import_history')}
                    onNavigateToIntegrations={() => logic.setCurrentView('integrations')}
                    onNavigateToBulk={() => logic.setCurrentView('bulk_sender')}
                    onNavigateToDispatchHistory={() => logic.setCurrentView('history')}
                    onNavigateToChat={() => logic.setCurrentView('chat_conversations')}
                  />
                </PageGuard>
              )}
              {logic.currentView === 'appointments' && (
                <PageGuard pageKey="leads" pagesStatus={logic.user?.pages_status}>
                  <AppointmentsPage />
                </PageGuard>
              )}
              {logic.currentView === 'import_history' && (
                <PageGuard pageKey="import_history" pagesStatus={logic.user?.pages_status}>
                  <ImportHistoryPage onNavigateToLeads={() => logic.setCurrentView('leads')} />
                </PageGuard>
              )}
              {logic.currentView === 'financial' && (
                <PageGuard pageKey="financial" pagesStatus={logic.user?.pages_status}>
                  <Financial />
                </PageGuard>
              )}
              {logic.currentView === 'recurring_schedules' && (
                <PageGuard pageKey="schedules" pagesStatus={logic.user?.pages_status}>
                  <RecurringSchedules />
                </PageGuard>
              )}
              {logic.currentView === 'capture_page' && (
                <PageGuard pageKey="capture_page" pagesStatus={logic.user?.pages_status}>
                  <CapturePageAdmin />
                </PageGuard>
              )}
              {logic.currentView === 'pagina_captura' && (
                <PageGuard pageKey="pagina_captura" pagesStatus={logic.user?.pages_status}>
                  <CheckoutPresellPage onNavigateToChat={(contact) => {
                    logic.setCurrentView('chat_conversations');
                    setTimeout(() => {
                      window.dispatchEvent(new CustomEvent('select-chat-convo', { detail: contact }));
                    }, 100);
                  }} />
                </PageGuard>
              )}
              {logic.currentView === 'stress_test' && <StressTest onStartSuccess={() => logic.setCurrentView('history')} onNavigateToHistory={() => logic.setCurrentView('history')} onNavigateToIntegrations={() => logic.setCurrentView('integrations')} onNavigateToContacts={() => logic.setCurrentView('leads')} />}
              {logic.currentView === 'backup_db' && <BackupDatabase />}
              {logic.currentView === 'hot_leads' && (
                <PageGuard pageKey="hot_leads" pagesStatus={logic.user?.pages_status}>
                  <HotLeads />
                </PageGuard>
              )}
              {logic.currentView === 'instagram_automation' && (
                <PageGuard pageKey="instagram_automation" pagesStatus={logic.user?.pages_status}>
                  <InstagramAutomation />
                </PageGuard>
              )}
              {logic.currentView === 'tutorial' && <TutorialPage />}
              {logic.currentView === 'log_viewer' && <LogViewer />}
              {logic.currentView === 'human_agents' && (
                <HumanAgents
                  onNavigateToChat={(convo) => {
                    logic.setCurrentView('chat_conversations');
                    // Aguarda renderização para selecionar a conversa
                    setTimeout(() => {
                      const event = new CustomEvent('select-chat-convo', { detail: convo });
                      window.dispatchEvent(event);
                    }, 100);
                  }}
                />
              )}

              
              {logic.currentView === 'bulk_sender' && (
                <PageGuard pageKey="bulk_sender" pagesStatus={logic.user?.pages_status}>
                  <div className="space-y-8">
                    <TemplateBulkSender
                      onSuccess={() => logic.setTriggerHistoryRefreshKey(prev => prev + 1)}
                      refreshKey={logic.settingsRefreshKey}
                      onViewChange={logic.handleViewChange}
                    />
                  </div>
                </PageGuard>
              )}

              {logic.currentView === 'funnels' && (
                <PageGuard pageKey="funnels" pagesStatus={logic.user?.pages_status}>
                <>
                  {logic.showBuilder ? (
                    <div className="h-full">
                      <VisualFlowBuilder
                        funnelId={logic.editingFunnel?.id}
                        onBack={() => { logic.setShowBuilder(false); logic.setEditingFunnel(null); logic.fetchFunnels(); }}
                        onSave={logic.fetchFunnels}
                        onDelete={() => logic.confirmDelete(logic.editingFunnel?.id)}
                      />
                    </div>
                  ) : (
                    <div className="space-y-8">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          {logic.selectedFunnelIds.length > 0 && (
                            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-200 flex-wrap">
                              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{logic.selectedFunnelIds.length} selecionado(s)</span>
                              
                              {/* Arquivar / Restaurar em Lote */}
                              <button
                                onClick={() => logic.handleBulkArchive(!logic.isArchivedTab)}
                                className="px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-lg font-bold hover:bg-yellow-200 flex items-center"
                              >
                                <FiArchive size={16} className="mr-2" /> {logic.isArchivedTab ? 'Restaurar' : 'Arquivar'}
                              </button>

                              {/* Etiqueta em Lote */}
                              <button
                                onClick={() => {
                                  logic.setFunnelForTag('bulk');
                                  logic.setIsTagModalOpen(true);
                                }}
                                className="px-4 py-2 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 rounded-lg font-bold hover:bg-violet-200 flex items-center"
                              >
                                <FiTag size={16} className="mr-2" /> Etiqueta
                              </button>

                              {/* Excluir em Lote */}
                              <button
                                onClick={() => logic.setIsBulkDeleteModalOpen(true)}
                                className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg font-bold hover:bg-red-200"
                              >
                                <FiTrash2 size={16} className="inline mr-2" /> Excluir
                              </button>
                              
                              <button onClick={() => logic.setSelectedFunnelIds([])} className="text-sm text-gray-500 hover:underline">Limpar</button>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => logic.setIsGlobalsModalOpen(true)}
                            className="px-5 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-semibold border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center gap-2 shadow-sm text-sm"
                          >
                            <FiGlobe size={16} className="text-blue-500" />
                            Variáveis Globais
                          </button>
                          <button onClick={logic.handleCreateFunnel} className="px-6 py-5 bg-blue-600 text-white rounded-lg font-semibold shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all active:scale-95 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                            Novo Funil
                          </button>
                        </div>
                      </div>

                      <FunnelList logic={logic} />
                    </div>
                  )}
                </>
                </PageGuard>
              )}

              {logic.currentView === 'templates' && (
                <PageGuard pageKey="whatsapp" pagesStatus={logic.user?.pages_status}>
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <TemplateCreator
                      refreshKey={logic.settingsRefreshKey}
                      onSuccess={() => {
                        logic.setSettingsRefreshKey(prev => prev + 1);
                      }}
                    />
                  </div>
                </PageGuard>
              )}

              {logic.currentView === 'history' && (
                <PageGuard pageKey="history" pagesStatus={logic.user?.pages_status}>
                  <div className="space-y-8">
                    <TriggerHistory
                      refreshKey={logic.triggerHistoryRefreshKey}
                      onNavigateToBulk={() => logic.setCurrentView('bulk_sender')}
                      onNavigateToFunnels={() => logic.setCurrentView('funnels')}
                      onNavigateToChat={() => logic.setCurrentView('chat_conversations')}
                    />
                  </div>
                </PageGuard>
              )}
              {/* Tela de boas-vindas do Vendedor (exibida dentro do layout normal, com Sidebar visível) */}
              {logic.currentView === 'vendedor_home' && (
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-100">
                  <div className="text-center space-y-4 px-8 max-w-sm">
                    <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto">
                      <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-400 dark:text-gray-500">Clique no botão abaixo para abrir o chat e começar a atender seus contatos.</p>
                    <button
                      onClick={() => logic.handleViewChange('chat_conversations')}
                      className="mt-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition w-full"
                    >
                      💬 Abrir Atendimento
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Atendimento em Popup de Tela Cheia */}
      {logic.currentView === 'chat_conversations' && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-[#0f172a] animate-in fade-in duration-300">
          <ChatConversations
            onClose={() => {
              // vendedor vai para tela de boas-vindas; outros voltam ao bulk_sender
              logic.handleViewChange(logic.user?.role === 'vendedor' ? 'vendedor_home' : 'bulk_sender');
            }}
            onNavigate={(view) => {
              // webhook_integrations é mapeado para a view 'integrations' do sistema
              const viewMap = { webhook_integrations: 'integrations' };
              logic.handleViewChange(viewMap[view] || view);
            }}
          />
        </div>
      )}
    </div>
  );
}

// Helper Sub-components for cleaner render
const GuideButton = ({ onClick, color, bg, border }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all hover:scale-105"
    style={{ background: bg, border: `1px solid ${border}`, color: color }}
    title="Abrir guia"
  >
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
    Guia
  </button>
);
