import React from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { FiLayers, FiTrash2, FiEdit2, FiPlay, FiGlobe } from 'react-icons/fi';
import Sidebar from './components/Sidebar';
import ConnectionStatus from './components/ConnectionStatus';
import AppModals from './components/AppModals';
import { useAppLogic } from './hooks/useAppLogic';

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
import Financial from './pages/Financial';
import RecurringSchedules from './components/RecurringSchedules';
import VisualFlowBuilder from './components/VisualFlowBuilder';

export default function AppContent() {
  const logic = useAppLogic();

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#0f172a] dark:text-gray-100 overflow-hidden">
      <Toaster position="top-right" reverseOrder={false} containerStyle={{ zIndex: 999999 }} />

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
        ) : (
          <div className="p-8">
            <header className="mb-8 flex justify-between items-start">
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
              <ConnectionStatus refreshKey={logic.settingsRefreshKey} />
            </header>

            {/* View Rendering */}
            {logic.currentView === 'blocked' && <BlockedContacts />}
            {logic.currentView === 'users' && <Users />}
            {logic.currentView === 'schedules' && <SchedulePage />}
            {logic.currentView === 'monitoring' && <Monitoring />}
            {logic.currentView === 'integrations' && <Integrations />}
            {logic.currentView === 'leads' && <WebhookLeads />}
            {logic.currentView === 'financial' && <Financial />}
            {logic.currentView === 'recurring_schedules' && <RecurringSchedules />}
            
            {logic.currentView === 'bulk_sender' && (
              <div className="space-y-8">
                <TemplateBulkSender 
                  onSuccess={() => logic.setTriggerHistoryRefreshKey(prev => prev + 1)} 
                  refreshKey={logic.settingsRefreshKey} 
                  onViewChange={logic.handleViewChange} 
                />
              </div>
            )}

            {logic.currentView === 'funnels' && (
              <>
                {logic.showBuilder ? (
                  <div className="h-full">
                    <VisualFlowBuilder
                      funnelId={logic.editingFunnel?.id}
                      onBack={() => { logic.setShowBuilder(false); logic.setEditingFunnel(null); logic.fetchFunnels(); }}
                      onSave={logic.fetchFunnels}
                    />
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        {logic.selectedFunnelIds.length > 0 && (
                          <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-200">
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{logic.selectedFunnelIds.length} selecionado(s)</span>
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
            )}

            {logic.currentView === 'templates' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <TemplateCreator 
                  refreshKey={logic.settingsRefreshKey} 
                  onSuccess={() => {
                    logic.setSettingsRefreshKey(prev => prev + 1);
                    // logic.setCurrentView('bulk_sender'); // Removido para permitir ver o status PENDING do novo template
                  }} 
                />
              </div>
            )}

            {logic.currentView === 'history' && (
              <div className="space-y-8">
                <TriggerHistory 
                  refreshKey={logic.triggerHistoryRefreshKey} 
                  onNavigateToBulk={() => logic.setCurrentView('bulk_sender')} 
                />
              </div>
            )}
          </div>
        )}
      </main>
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

const FunnelList = ({ logic }) => {
  const hasTemplateNode = (funnel) => funnel.steps?.nodes?.some(n => n.type === 'templateNode');

  return (
    <div className="lg:col-span-12 space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {logic.funnels.length > 0 && (
              <input
                type="checkbox"
                checked={logic.selectedFunnelIds.length === logic.funnels.length && logic.funnels.length > 0}
                onChange={logic.toggleSelectAll}
                className="w-5 h-5 text-blue-600 rounded border-gray-300"
                title="Selecionar Todos"
              />
            )}
            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">Seus Funis</h2>
          </div>
          {logic.selectedFunnelIds.length > 0 && (
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
              {logic.selectedFunnelIds.length} de {logic.funnels.length} selecionados
            </span>
          )}
        </div>
        <div className="p-4 space-y-3">
          {logic.funnels.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <p>Nenhum funil criado ainda.</p>
              <button onClick={logic.handleCreateFunnel} className="text-blue-600 font-medium hover:underline mt-2">Criar o primeiro</button>
            </div>
          )}
          {logic.funnels.map(funnel => (
            <div
              key={funnel.id}
              className={`group p-4 rounded-xl transition-all border-2 flex justify-between items-center ${logic.selectedFunnel?.id === funnel.id ? 'border-blue-500 bg-blue-50/10' : 'border-gray-100 dark:border-gray-700'}`}
            >
              <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  checked={logic.selectedFunnelIds.includes(funnel.id)}
                  onChange={(e) => logic.toggleFunnelSelection(funnel.id, e)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-5 h-5 text-blue-600 rounded border-gray-300"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className={`font-bold text-lg ${logic.selectedFunnel?.id === funnel.id ? 'text-blue-700 dark:text-blue-400' : 'text-gray-800 dark:text-gray-100'}`}>{funnel.name}</h3>
                    {hasTemplateNode(funnel) && (
                      <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-[10px] font-bold uppercase border border-purple-200 dark:border-purple-800/50">
                        Template
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span>{Array.isArray(funnel.steps) ? funnel.steps.length : (funnel.steps?.nodes?.length || 0)} etapas</span>
                    {funnel.trigger_phrase && <span className="text-yellow-600">⚡ Gatilho</span>}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (hasTemplateNode(funnel)) {
                      toast.error("Funis de Template devem ser disparados pela aba 'Disparo em Massa'.", {
                        duration: 5000,
                        icon: '⚠️'
                      });
                      return;
                    }
                    logic.setSelectedFunnel(funnel);
                    logic.setIsTriggerModalOpen(true);
                  }}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${hasTemplateNode(funnel)
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600'
                    : 'hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600'
                    }`}
                  title={hasTemplateNode(funnel) ? "Use o Disparo em Massa" : "Disparar Funil"}
                >
                  <FiPlay size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">Disparar</span>
                </button>
                <button
                  onClick={(e) => logic.handleEdit(funnel, e)}
                  className="px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-blue-600 flex items-center gap-1.5 transition-all"
                  title="Editar Funil"
                >
                  <FiEdit2 size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">Editar</span>
                </button>
                <button
                  onClick={(e) => logic.confirmDelete(funnel.id, e)}
                  className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-600 transition-all"
                  title="Excluir"
                >
                  <FiTrash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
