import React, { useState, useEffect } from 'react';
import { FiInfo, FiLayers, FiTrash2, FiEdit2, FiPlay, FiCheck, FiActivity } from 'react-icons/fi';
import { API_URL } from './config';
import { Toaster, toast } from 'react-hot-toast';
import FunnelBuilder from './components/FunnelBuilder';
import RecipientSelector from './components/RecipientSelector';
import InboxSelector from './components/InboxSelector';
import ConfirmModal from './components/ConfirmModal';
import TriggerHistory from './components/TriggerHistory';
import TemplateBulkSender from './components/TemplateBulkSender';
import SettingsModal from './components/SettingsModal';
import Sidebar from './components/Sidebar';
import ClientModal from './components/ClientModal';
import BlockedContacts from './components/BlockedContacts';
import Users from './pages/Users';
import VisualFlowBuilder from './components/VisualFlowBuilder';
import ConnectionStatus from './components/ConnectionStatus';
import SchedulePage from './pages/SchedulePage';
import TemplateCreator from './components/TemplateCreator';
import IncomingWebhooks from './components/IncomingWebhooks';
import Monitoring from './pages/Monitoring';
import { AuthProvider, useAuth, fetchWithAuth } from './AuthContext';
import { ClientProvider, useClient } from './contexts/ClientContext';
import ProtectedRoute from './ProtectedRoute';
import { ThemeProvider } from './contexts/ThemeContext';

function AppContent() {
  const { user, logout } = useAuth();
  const { activeClient } = useClient();

  // View State
  const [currentView, setCurrentView] = useState('bulk_sender');

  // Funnel States
  const [funnels, setFunnels] = useState([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [selectedFunnel, setSelectedFunnel] = useState(null);
  const [editingFunnel, setEditingFunnel] = useState(null);
  const [selectedConversations, setSelectedConversations] = useState([]);
  const [selectedInbox, setSelectedInbox] = useState(null);
  const [triggerStatus, setTriggerStatus] = useState(null);

  // Progress Modal State
  const [progressModal, setProgressModal] = useState({
    isOpen: false,
    contacts: [],
    status: 'idle',
    isScheduled: false
  });

  // Scheduling States
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('');

  // Advanced Params
  const [delay, setDelay] = useState(5);
  const [concurrency, setConcurrency] = useState(1);

  // Modal States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [funnelToDelete, setFunnelToDelete] = useState(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [selectedFunnelIds, setSelectedFunnelIds] = useState([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Trigger History Refresh State
  const [triggerHistoryRefreshKey, setTriggerHistoryRefreshKey] = useState(0);
  const [settingsRefreshKey, setSettingsRefreshKey] = useState(0);

  // Client Name State
  const [clientName, setClientName] = useState('');
  const [appBranding, setAppBranding] = useState({ name: 'ZapVoice', logo: null, logoSize: 'medium' });

  useEffect(() => {
    if (activeClient) {
      fetchFunnels();
      fetchSettings();
    }
  }, [activeClient, settingsRefreshKey]);

  useEffect(() => {
    if (appBranding.name) {
      document.title = `${appBranding.name} - Chatwoot Automation`;
    }
  }, [appBranding]);

  useEffect(() => {
    if (user && user.role === 'user' && currentView !== 'history') {
      setCurrentView('history');
    }
  }, [user]);

  const fetchSettings = async () => {
    if (!activeClient) return;
    try {
      const res = await fetchWithAuth(`${API_URL}/settings/`, {}, activeClient.id);
      if (res.ok) {
        const data = await res.json();
        if (data.CLIENT_NAME) {
          setClientName(data.CLIENT_NAME);
        }
        setAppBranding({
          name: data.APP_NAME || 'ZapVoice',
          logo: data.APP_LOGO || null,
          logoSize: data.APP_LOGO_SIZE || 'medium'
        });
      }
    } catch (err) {
      console.error("Erro ao buscar configurações:", err);
    }
  };

  const fetchFunnels = async () => {
    if (!activeClient) return;
    try {
      const res = await fetchWithAuth(`${API_URL}/funnels`, {}, activeClient.id);
      const data = await res.json();
      if (Array.isArray(data)) {
        setFunnels(data);
      } else {
        console.error("Formato inesperado de funis:", data);
        setFunnels([]);
      }
    } catch (err) {
      console.error("Erro ao buscar funis:", err);
      toast.error("Erro ao carregar funis.");
    }
  };

  const handleCreateFunnel = async () => {
    const loadingToast = toast.loading("Criando novo funil...");
    try {
      const res = await fetchWithAuth(`${API_URL}/funnels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Novo Funil ${new Date().toLocaleString()}`,
          description: "Criado via Visual Builder",
          steps: []
        })
      }, activeClient?.id);

      if (res.ok) {
        const newFunnel = await res.json();
        setEditingFunnel(newFunnel);
        setShowBuilder(true);
        toast.dismiss(loadingToast);
        toast.success("Funil criado! Pode editar.");
      } else {
        throw new Error("Erro ao criar funil inicial");
      }
    } catch (e) {
      console.error(e);
      toast.dismiss(loadingToast);
      toast.error("Erro ao iniciar novo funil");
    }
  };

  const handleEdit = (funnel, e) => {
    e.stopPropagation();
    setEditingFunnel(funnel);
    setShowBuilder(true);
    setSelectedFunnel(null);
  };

  const confirmDelete = (funnelId, e) => {
    e.stopPropagation();
    setFunnelToDelete(funnelId);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!funnelToDelete) return;
    const loadingToast = toast.loading("Excluindo funil...");
    try {
      const res = await fetchWithAuth(`${API_URL}/funnels/${funnelToDelete}`, {
        method: 'DELETE'
      }, activeClient?.id);
      if (res.ok) {
        fetchFunnels();
        if (selectedFunnel?.id === funnelToDelete) setSelectedFunnel(null);
        if (editingFunnel?.id === funnelToDelete) {
          setEditingFunnel(null);
          setShowBuilder(false);
        }
        toast.dismiss(loadingToast);
        toast.success("Funil excluído.");
      } else {
        throw new Error("Erro ao excluir");
      }
    } catch (err) {
      console.error("Erro ao excluir funil:", err);
      toast.dismiss(loadingToast);
      toast.error("Erro ao excluir funil.");
    }
  };

  const toggleFunnelSelection = (funnelId, e) => {
    e.stopPropagation();
    setSelectedFunnelIds(prev =>
      prev.includes(funnelId)
        ? prev.filter(id => id !== funnelId)
        : [...prev, funnelId]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedFunnelIds.length === 0) return;
    const loadingToast = toast.loading(`Excluindo ${selectedFunnelIds.length} funis...`);
    try {
      const res = await fetchWithAuth(`${API_URL}/funnels/bulk`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ funnel_ids: selectedFunnelIds }),
      }, activeClient?.id);

      if (res.ok) {
        fetchFunnels();
        const deletedIds = new Set(selectedFunnelIds);
        if (selectedFunnel && deletedIds.has(selectedFunnel.id)) setSelectedFunnel(null);
        if (editingFunnel && deletedIds.has(editingFunnel.id)) {
          setEditingFunnel(null);
          setShowBuilder(false);
        }
        setSelectedFunnelIds([]);
        toast.dismiss(loadingToast);
        toast.success("Funis excluídos com sucesso.");
      } else {
        throw new Error("Erro ao excluir funis");
      }
    } catch (err) {
      console.error("Erro ao excluir funis:", err);
      toast.dismiss(loadingToast);
      toast.error("Erro ao excluir funis.");
    }
  };

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedFunnelIds(funnels.map(f => f.id));
    } else {
      setSelectedFunnelIds([]);
    }
  };

  const handleTrigger = async () => {
    if (!selectedFunnel || selectedConversations.length === 0) return;
    if (scheduleMode && !scheduledTime) {
      toast.error("Selecione uma data e hora para agendar.");
      return;
    }

    // ABRIR MODAL
    setProgressModal({
      isOpen: true,
      contacts: selectedConversations,
      status: 'sending',
      isScheduled: !!scheduleMode
    });

    const total = selectedConversations.length;
    const useBulkEndpoint = total > 1 || scheduleMode;

    try {
      if (useBulkEndpoint) {
        const contactName = total === 1
          ? (selectedConversations[0].contact_name || selectedConversations[0].phone || 'Contato')
          : `Disparo em Massa (${total} contatos)`;

        const res = await fetchWithAuth(`${API_URL}/funnels/${selectedFunnel.id}/trigger-bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversations: selectedConversations.map(c => ({
              id: c.conversation_id,
              inbox_id: selectedInbox,
              meta: {
                sender: {
                  name: c.contact_name || c.phone,
                  phone_number: c.phone
                }
              }
            })),
            schedule_at: scheduleMode ? new Date(scheduledTime).toISOString() : null,
            contact_name: contactName,
            delay_seconds: parseInt(delay),
            concurrency_limit: parseInt(concurrency)
          })
        }, activeClient?.id);

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || 'Erro ao processar disparo');
        }

        // SUCESSO BULK
        if (scheduleMode) toast.success("Agendamento realizado!");
        setTriggerHistoryRefreshKey(prev => prev + 1);

        // Atualiza Modal para Done
        setProgressModal(prev => ({ ...prev, status: 'done' }));

      } else {
        // Disparo Único Imediato
        const conv = selectedConversations[0];
        const convId = conv.conversation_id || '0';
        let url = `${API_URL}/funnels/${selectedFunnel.id}/trigger?conversation_id=${convId}`;
        const name = conv.contact_name || conv.phone;
        const phone = conv.phone;
        if (selectedInbox) url += `&inbox_id=${selectedInbox}`;
        url += `&contact_name=${encodeURIComponent(name)}&contact_phone=${encodeURIComponent(phone)}`;

        const response = await fetchWithAuth(url, { method: 'POST' }, activeClient?.id);
        if (!response.ok) throw new Error('Falha ao disparar funil');
        await response.json();

        // SUCESSO SINGLE
        setTriggerHistoryRefreshKey(prev => prev + 1);
        setProgressModal(prev => ({ ...prev, status: 'done' }));
      }

    } catch (error) {
      console.error(error);
      toast.error(error.message);
      // Fecha modal em caso de erro para não travar
      setProgressModal({ isOpen: false, contacts: [], status: 'idle' });
    }
  };

  const handleViewChange = (view) => {
    setCurrentView(view);
    setShowBuilder(false);
    setEditingFunnel(null);
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 dark:text-gray-100 overflow-hidden">
      <Toaster position="top-right" reverseOrder={false} />

      <ClientModal isOpen={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} />
      <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} onSaved={() => setSettingsRefreshKey(prev => prev + 1)} />
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Excluir Funil"
        message="Tem certeza que deseja excluir este funil? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        isDangerous={true}
      />
      <ConfirmModal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={handleBulkDelete}
        title="Excluir Selecionados"
        message={`Tem certeza que deseja excluir ${selectedFunnelIds.length} funis selecionados? Esta ação não pode ser desfeita.`}
        confirmText="Excluir Todos"
        isDangerous={true}
      />

      <Sidebar
        activeView={currentView}
        onViewChange={handleViewChange}
        onLogout={logout}
        onSettings={() => setIsSettingsModalOpen(true)}
        user={user}
        clientName={clientName}
        onClientCreate={() => setIsClientModalOpen(true)}
        appBranding={appBranding}
      />

      <main className="flex-1 overflow-y-auto">
        {!activeClient ? (
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
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {currentView === 'bulk_sender' && 'Disparo em Massa'}
                  {currentView === 'funnels' && 'Meus Funis'}
                  {currentView === 'history' && 'Histórico de Disparos'}
                  {currentView === 'blocked' && 'Contatos Bloqueados'}
                  {currentView === 'users' && 'Gestão de Usuários'}
                  {currentView === 'templates' && 'Gerenciar Templates'}
                  {currentView === 'schedules' && 'Agenda de Disparos'}
                  {currentView === 'monitoring' && 'Status do Sistema'}
                </h1>
                {clientName && currentView === 'bulk_sender' && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Api Oficial do WhatsApp do cliente {clientName}</p>
                )}
              </div>
              <ConnectionStatus refreshKey={settingsRefreshKey} />
            </header>

            {currentView === 'blocked' && <BlockedContacts />}
            {currentView === 'users' && <Users />}
            {currentView === 'schedules' && <SchedulePage />}
            {currentView === 'monitoring' && <Monitoring />}
            {currentView === 'bulk_sender' && (
              <div className="space-y-8">
                <TemplateBulkSender onSuccess={() => setTriggerHistoryRefreshKey(prev => prev + 1)} refreshKey={settingsRefreshKey} onViewChange={handleViewChange} />
              </div>
            )}

            {currentView === 'funnels' && (
              <>
                {showBuilder ? (
                  <div className="h-full">
                    <VisualFlowBuilder
                      funnelId={editingFunnel?.id}
                      onBack={() => { setShowBuilder(false); setEditingFunnel(null); fetchFunnels(); }}
                      onSave={fetchFunnels}
                    />
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        {selectedFunnelIds.length > 0 && (
                          <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-200">
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{selectedFunnelIds.length} selecionado(s)</span>
                            <button
                              onClick={() => setIsBulkDeleteModalOpen(true)}
                              className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg font-bold hover:bg-red-200"
                            >
                              <FiTrash2 size={16} className="inline mr-2" /> Excluir
                            </button>
                            <button onClick={() => setSelectedFunnelIds([])} className="text-sm text-gray-500 hover:underline">Limpar</button>
                          </div>
                        )}
                      </div>
                      <button onClick={handleCreateFunnel} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all active:scale-95 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                        Novo Funil
                      </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                      <div className="lg:col-span-7 space-y-4">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                          <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              {funnels.length > 0 && (
                                <input
                                  type="checkbox"
                                  checked={selectedFunnelIds.length === funnels.length && funnels.length > 0}
                                  onChange={toggleSelectAll}
                                  className="w-5 h-5 text-blue-600 rounded border-gray-300"
                                  title="Selecionar Todos"
                                />
                              )}
                              <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">Seus Funis</h2>
                            </div>
                            {selectedFunnelIds.length > 0 && (
                              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                {selectedFunnelIds.length} de {funnels.length} selecionados
                              </span>
                            )}
                          </div>
                          <div className="p-4 space-y-3">
                            {funnels.length === 0 && (
                              <div className="text-center py-10 text-gray-400">
                                <p>Nenhum funil criado ainda.</p>
                                <button onClick={handleCreateFunnel} className="text-blue-600 font-medium hover:underline mt-2">Criar o primeiro</button>
                              </div>
                            )}
                            {funnels.map(funnel => (
                              <div
                                key={funnel.id}
                                className={`group p-4 rounded-xl transition-all border-2 flex justify-between items-center ${selectedFunnel?.id === funnel.id ? 'border-blue-500 bg-blue-50/10' : 'border-gray-100 dark:border-gray-700'}`}
                              >
                                <div className="flex items-center gap-4">
                                  <input
                                    type="checkbox"
                                    checked={selectedFunnelIds.includes(funnel.id)}
                                    onChange={(e) => toggleFunnelSelection(funnel.id, e)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-5 h-5 text-blue-600 rounded border-gray-300"
                                  />
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h3 className={`font-bold text-lg ${selectedFunnel?.id === funnel.id ? 'text-blue-700 dark:text-blue-400' : 'text-gray-800 dark:text-gray-100'}`}>{funnel.name}</h3>
                                      {funnel.steps?.nodes?.some(n => n.type === 'templateNode') && (
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
                                      if (funnel.steps?.nodes?.some(n => n.type === 'templateNode')) {
                                        toast.error("Funis de Template devem ser disparados pela aba 'Disparo em Massa'.", {
                                          duration: 5000,
                                          icon: '⚠️'
                                        });
                                        return;
                                      }
                                      setSelectedFunnel(funnel);
                                    }}
                                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${funnel.steps?.nodes?.some(n => n.type === 'templateNode')
                                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600'
                                      : selectedFunnel?.id === funnel.id
                                        ? 'bg-green-100 text-green-700 shadow-sm'
                                        : 'hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600'
                                      }`}
                                    title={funnel.steps?.nodes?.some(n => n.type === 'templateNode') ? "Use o Disparo em Massa" : "Disparar Funil"}
                                  >
                                    <FiPlay size={16} />
                                    <span className="text-xs font-bold uppercase tracking-wider">Disparar</span>
                                  </button>
                                  <button
                                    onClick={(e) => handleEdit(funnel, e)}
                                    className="px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-blue-600 flex items-center gap-1.5 transition-all"
                                    title="Editar Funil"
                                  >
                                    <FiEdit2 size={16} />
                                    <span className="text-xs font-bold uppercase tracking-wider">Editar</span>
                                  </button>
                                  <button
                                    onClick={(e) => confirmDelete(funnel.id, e)}
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

                      <div className="lg:col-span-5">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-blue-100 dark:border-gray-700 sticky top-8 p-6">
                          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">Disparar Funil</h2>
                          {!selectedFunnel ? (
                            <p className="text-gray-400 text-center py-10 border border-dashed rounded-xl">Selecione um funil para configurar o disparo.</p>
                          ) : (
                            <div className="space-y-6">
                              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                                <div className="font-bold text-lg">{selectedFunnel.name}</div>
                                <button onClick={() => setSelectedFunnel(null)} className="text-xs text-blue-500 underline">Trocar funil</button>
                              </div>
                              <div className="hidden">
                                <InboxSelector onSelect={setSelectedInbox} />
                              </div>
                              <RecipientSelector selectedInbox={selectedInbox} onSelect={setSelectedConversations} requireOpenWindow={true} />

                              <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border">
                                <label className="flex items-center gap-2 cursor-pointer mb-3">
                                  <input type="checkbox" checked={scheduleMode} onChange={(e) => setScheduleMode(e.target.checked)} className="w-4 h-4" />
                                  <span className="text-sm">Agendar disparo?</span>
                                </label>
                                {scheduleMode && (
                                  <div className="space-y-3">
                                    <input
                                      type="datetime-local"
                                      value={scheduledTime}
                                      onChange={(e) => setScheduledTime(e.target.value)}
                                      className="w-full p-2 border rounded text-sm bg-white dark:bg-gray-800 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                    {(() => {
                                      if (!scheduledTime || !selectedFunnel) return null;
                                      const now = new Date();
                                      const sched = new Date(scheduledTime);
                                      const diffHours = (sched - now) / (1000 * 60 * 60);

                                      // Verificamos se o funil começa com template
                                      // A estrutura do funnel.steps.nodes tem nodes[i].data.isStart e nodes[i].type
                                      const steps = selectedFunnel.steps;
                                      const nodes = steps?.nodes || [];
                                      const startNode = nodes.find(n => n.data?.isStart);
                                      const startsWithTemplate = startNode?.type === 'templateNode'; // No seu builder atual o templateNode é usado no BulkSender, mas no Funil os tipos são outros.

                                      // No VisualFlowBuilder, os tipos são messageNode, mediaNode, delayNode, conditionNode, randomizerNode, linkFunnelNode
                                      // Atualmente não há um "TemplateNode" direto no VisualFlowBuilder, então qualquer agendamento > 24h é arriscado.

                                      if (diffHours >= 24) {
                                        return (
                                          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg animate-in fade-in slide-in-from-top-2">
                                            <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium leading-relaxed">
                                              ⚠️ <b>Atenção:</b> Disparo agendado para mais de 24h. Se a janela de contato fechar até lá, o envio falhará, a menos que o funil inicie com um Template Oficial.
                                            </p>
                                          </div>
                                        );
                                      }
                                      return null;
                                    })()}
                                  </div>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">INTERVALO (SEG)</label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={delay}
                                    onChange={(e) => setDelay(e.target.value)}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">CONCORRÊNCIA</label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={concurrency}
                                    onChange={(e) => setConcurrency(e.target.value)}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                  />
                                </div>
                              </div>

                              <button
                                onClick={handleTrigger}
                                disabled={selectedConversations.length === 0 || (scheduleMode && !scheduledTime)}
                                className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all ${selectedConversations.length === 0
                                  ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed'
                                  : 'bg-blue-600 hover:bg-blue-700 active:scale-95'}`}
                              >
                                {triggerStatus || (scheduleMode ? 'AGENDAR' : 'DISPARAR AGORA')}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {currentView === 'templates' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <TemplateCreator onSuccess={() => {
                  setCurrentView('bulk_sender');
                  // Trigger a refresh of templates in other components if needed
                }} />
              </div>
            )}

            {currentView === 'history' && (
              <div className="space-y-8">
                <TriggerHistory refreshKey={triggerHistoryRefreshKey} />
              </div>
            )}

            {currentView === 'incoming_webhooks' && (
              <IncomingWebhooks />
            )}
          </div>
        )}
      </main>

      {/* MODAL DE PROGRESSO DE DISPARO */}
      {progressModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl border border-gray-100 dark:border-gray-700 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 text-center">
              <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${progressModal.status === 'done' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600 animate-pulse'
                }`}>
                {progressModal.status === 'done' ? <FiCheck size={32} /> : <FiActivity size={32} />}
              </div>
              <h3 className="text-xl font-bold dark:text-white">
                {progressModal.status === 'sending' ? 'Processando...' : (progressModal.isScheduled ? 'Agendamento Realizado!' : 'Disparo Concluído!')}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {progressModal.status === 'sending'
                  ? 'Processando sua solicitação...'
                  : (progressModal.isScheduled
                    ? `${progressModal.contacts.length} contatos foram agendados para a data definida.`
                    : `${progressModal.contacts.length} contatos foram adicionados à fila.`)}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900/50">
              <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 px-2">Destinatários</h4>
              <div className="space-y-2">
                {progressModal.contacts.map((c, i) => (
                  <div key={i} className="flex justify-between items-center bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${progressModal.status === 'done' ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <div>
                        <div className="font-medium text-sm text-gray-800 dark:text-gray-200">{c.contact_name || 'Sem Nome'}</div>
                        <div className="text-xs text-gray-500 font-mono">{c.phone}</div>
                      </div>
                    </div>
                    {progressModal.status === 'done' && (
                      <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
                        {progressModal.isScheduled ? 'AGENDADO' : 'NA FILA'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-gray-700">
              <button
                disabled={progressModal.status === 'sending'}
                onClick={() => {
                  setProgressModal({ isOpen: false, contacts: [], status: 'idle', isScheduled: false });
                  setSelectedFunnel(null); // RESET OBRIGATÓRIO AQUI
                  setSelectedConversations([]);
                }}
                className={`w-full py-3 rounded-xl font-bold text-white transition-all ${progressModal.status === 'sending'
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-gray-900 hover:bg-black dark:bg-gray-700 dark:hover:bg-gray-600'
                  }`}
              >
                {progressModal.status === 'sending' ? 'Aguarde...' : 'Sair e Voltar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ClientProvider>
          <ProtectedRoute>
            <AppContent />
          </ProtectedRoute>
        </ClientProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
