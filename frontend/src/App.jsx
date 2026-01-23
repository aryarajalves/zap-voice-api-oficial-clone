import React, { useState, useEffect } from 'react';
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
import ConnectionStatus from './components/ConnectionStatus';
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

  // Trigger History Refresh State
  const [triggerHistoryRefreshKey, setTriggerHistoryRefreshKey] = useState(0);
  const [settingsRefreshKey, setSettingsRefreshKey] = useState(0);

  // Client Name State
  const [clientName, setClientName] = useState('');

  useEffect(() => {
    if (activeClient) {
      fetchFunnels();
      fetchSettings();
    }
  }, [activeClient, settingsRefreshKey]);

  const fetchSettings = async () => {
    if (!activeClient) return;

    try {
      const res = await fetchWithAuth(`${API_URL}/settings/`, {}, activeClient.id);
      if (res.ok) {
        const data = await res.json();
        if (data.CLIENT_NAME) {
          setClientName(data.CLIENT_NAME);
        }
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

  const handleSaveFunnel = async (funnelData) => {
    const loadingToast = toast.loading(editingFunnel ? "Atualizando funil..." : "Criando funil...");
    try {
      let url = `${API_URL}/funnels`;
      let method = 'POST';

      if (editingFunnel) {
        url = `${API_URL}/funnels/${editingFunnel.id}`;
        method = 'PUT';
      }

      const res = await fetchWithAuth(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(funnelData),
      }, activeClient?.id);

      if (res.ok) {
        setShowBuilder(false);
        setEditingFunnel(null);
        fetchFunnels();
        toast.dismiss(loadingToast);
        toast.success(editingFunnel ? "Funil atualizado com sucesso!" : "Funil criado com sucesso!");
      } else {
        throw new Error('Falha ao salvar');
      }
    } catch (err) {
      console.error("Erro ao salvar funil:", err);
      toast.dismiss(loadingToast);
      toast.error("Erro ao salvar o funil.");
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

  const handleTrigger = async () => {
    if (!selectedFunnel || selectedConversations.length === 0) return;
    if (scheduleMode && !scheduledTime) {
      toast.error("Selecione uma data e hora para agendar.");
      return;
    }

    const total = selectedConversations.length;
    const useBulkEndpoint = total > 1 || scheduleMode;

    if (useBulkEndpoint) {
      setTriggerStatus('Processando...');
      try {
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

        toast.success(scheduleMode ? "Agendamento realizado com sucesso!" : "Disparo em massa iniciado!");
        setTriggerStatus(scheduleMode ? 'Agendado!' : 'Concluído!');
        setTriggerHistoryRefreshKey(prev => prev + 1);

      } catch (error) {
        console.error(error);
        toast.error(error.message);
        setTriggerStatus('Erro');
      } finally {
        setTimeout(() => setTriggerStatus(null), 3000);
      }
      return;
    }

    // Disparo Único Imediato
    const conv = selectedConversations[0];
    setTriggerStatus('Inicializando...');

    try {
      const convId = conv.conversation_id || '0';
      let url = `${API_URL}/funnels/${selectedFunnel.id}/trigger?conversation_id=${convId}`;

      const name = conv.contact_name || conv.phone;
      const phone = conv.phone;

      if (selectedInbox) {
        url += `&inbox_id=${selectedInbox}`;
      }

      url += `&contact_name=${encodeURIComponent(name)}&contact_phone=${encodeURIComponent(phone)}`;

      console.log("🚀 Disparando funil - URL:", url);
      const response = await fetchWithAuth(url, { method: 'POST' }, activeClient?.id);
      if (!response.ok) throw new Error('Falha ao disparar funil');

      await response.json();

      toast.success(`Disparado para ${name}`);
      setTriggerStatus('Concluído!');
      setTriggerHistoryRefreshKey(prev => prev + 1);

    } catch (error) {
      console.error(error);
      toast.error(`Erro ao enviar para ${conv.meta?.sender?.name}`);
      setTriggerStatus('Erro');
    } finally {
      setTimeout(() => setTriggerStatus(null), 3000);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 dark:text-gray-100 overflow-hidden">
      <Toaster position="top-right" reverseOrder={false} />

      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onSaved={() => setSettingsRefreshKey(prev => prev + 1)}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Excluir Funil"
        message="Tem certeza que deseja excluir este funil? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        isDangerous={true}
      />

      {/* Sidebar */}
      <Sidebar
        activeView={currentView}
        onViewChange={setCurrentView}
        onLogout={logout}
        onSettings={() => setIsSettingsModalOpen(true)}
        user={user}
        clientName={clientName}
        onClientCreate={() => setIsClientModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {/* Header */}
          <header className="mb-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {currentView === 'bulk_sender' && 'Disparo em Massa'}
                  {currentView === 'funnels' && 'Meus Funis'}
                  {currentView === 'history' && 'Histórico de Disparos'}
                  {currentView === 'blocked' && 'Contatos Bloqueados'}
                  {currentView === 'users' && 'Gestão de Usuários'}
                </h1>
                {clientName && currentView === 'bulk_sender' && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Api Oficial do WhatsApp do cliente {clientName}
                  </p>
                )}
              </div>
              <ConnectionStatus refreshKey={settingsRefreshKey} />
            </div>
          </header>

          {/* View Content */}
          {currentView === 'blocked' && (
            <BlockedContacts />
          )}

          {currentView === 'users' && (
            <Users />
          )}

          {currentView === 'bulk_sender' && (
            <div className="space-y-8">
              <TemplateBulkSender
                onSuccess={() => setTriggerHistoryRefreshKey(prev => prev + 1)}
                refreshKey={settingsRefreshKey}
              />
            </div>
          )}

          {currentView === 'funnels' && (
            <>
              {showBuilder ? (
                <FunnelBuilder
                  onSave={handleSaveFunnel}
                  initialData={editingFunnel}
                  existingFunnels={funnels}
                  onCancel={() => {
                    setShowBuilder(false);
                    setEditingFunnel(null);
                  }}
                />
              ) : (
                <div className="space-y-8">
                  {/* Action Bar */}
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        setShowBuilder(true);
                        setEditingFunnel(null);
                      }}
                      className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all active:scale-95 flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      Novo Funil
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Lista de Funis */}
                    <div className="lg:col-span-7 space-y-4">
                      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors duration-200">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                            </svg>
                            Seus Funis
                          </h2>
                        </div>

                        <div className="p-4 space-y-3">
                          {funnels.length === 0 && (
                            <div className="text-center py-10 text-gray-400">
                              <p>Nenhum funil criado ainda.</p>
                              <button onClick={() => setShowBuilder(true)} className="text-blue-600 font-medium hover:underline mt-2">Criar o primeiro</button>
                            </div>
                          )}

                          {funnels.map(funnel => (
                            <div
                              key={funnel.id}
                              onClick={() => setSelectedFunnel(funnel)}
                              className={`group p-4 rounded-xl cursor-pointer transition-all duration-200 border-2 flex justify-between items-center bg-white dark:bg-gray-700/50 hover:shadow-lg ${selectedFunnel?.id === funnel.id
                                ? 'border-blue-500 shadow-md ring-1 ring-blue-500/20'
                                : 'border-transparent hover:border-blue-200 dark:hover:border-gray-500 border-gray-100 dark:border-gray-700 shadow-sm'
                                }`}
                            >
                              <div>
                                <h3 className={`font-bold text-lg ${selectedFunnel?.id === funnel.id ? 'text-blue-700 dark:text-blue-400' : 'text-gray-800 dark:text-gray-100'}`}>
                                  {funnel.name}
                                </h3>
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded font-medium">
                                    {funnel.steps?.length || 0} etapas
                                  </span>
                                  {funnel.trigger_phrase && (
                                    <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded font-medium flex items-center gap-1 border border-yellow-200">
                                      ⚡ Gatilho Automático
                                    </span>
                                  )}
                                  {funnel.description && <span className="text-sm text-gray-400 truncate max-w-[200px]">{funnel.description}</span>}
                                </div>
                              </div>

                              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                                <button
                                  onClick={(e) => handleEdit(funnel, e)}
                                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Editar Funil"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={(e) => confirmDelete(funnel.id, e)}
                                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Excluir Funil"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Painel de Disparo */}
                    <div className="lg:col-span-5">
                      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-blue-100 dark:border-gray-700 sticky top-8 transition-colors duration-200">
                        <div className="rounded-t-2xl p-6 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
                          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                            Disparar Funil
                          </h2>
                        </div>

                        <div className="p-6 space-y-6">
                          {!selectedFunnel ? (
                            <div className="flex flex-col items-center justify-center py-10 text-gray-400 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-600">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-3 text-gray-300 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                              </svg>
                              <p>Selecione um funil para configurar o disparo.</p>
                            </div>
                          ) : (
                            <>
                              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30">
                                <label className="block text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Funil Selecionado</label>
                                <div className="text-lg font-bold text-gray-900 dark:text-white">{selectedFunnel.name}</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{selectedFunnel.steps?.length || 0} etapas configuradas</div>
                                <button
                                  onClick={() => setSelectedFunnel(null)}
                                  className="text-xs text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 underline mt-1"
                                >
                                  Trocar funil
                                </button>
                              </div>

                              <div className="space-y-4">
                                <InboxSelector onSelect={setSelectedInbox} />
                                <RecipientSelector
                                  selectedInbox={selectedInbox}
                                  onSelect={setSelectedConversations}
                                  requireOpenWindow={true}
                                />

                                {/* Agendamento */}
                                <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                                  <label className="flex items-center gap-2 cursor-pointer mb-3">
                                    <input
                                      type="checkbox"
                                      checked={scheduleMode}
                                      onChange={(e) => setScheduleMode(e.target.checked)}
                                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Agendar disparo para depois?</span>
                                  </label>

                                  {scheduleMode && (
                                    <div className="animated-fade-in">
                                      <label className="block text-xs font-semibold text-gray-500 mb-1">DATA E HORA DO DISPARO</label>
                                      <input
                                        type="datetime-local"
                                        min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                                        value={scheduledTime}
                                        onChange={(e) => {
                                          const selected = e.target.value;
                                          if (selected) {
                                            const selectedDate = new Date(selected);
                                            const now = new Date();
                                            if (selectedDate < now) {
                                              toast.error("Não é possível agendar para o passado.");
                                              setScheduledTime('');
                                              return;
                                            }
                                          }
                                          setScheduledTime(selected);
                                        }}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                      />
                                      <p className="text-xs text-gray-400 mt-1">O funil será disparado automaticamente neste horário.</p>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {(selectedConversations.length > 1 || scheduleMode) && (
                                <div className="grid grid-cols-2 gap-4 animated-fade-in mt-4">
                                  <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">INTERVALO (SEG)</label>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="number"
                                        min="1"
                                        value={delay}
                                        onChange={(e) => setDelay(e.target.value)}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                      />
                                      <span className="text-gray-400 text-xs" title="Tempo de espera entre cada envio (evita bloqueios)">ℹ️</span>
                                    </div>
                                  </div>
                                  <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">CONCORRÊNCIA</label>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="number"
                                        min="1"
                                        max="50"
                                        value={concurrency}
                                        onChange={(e) => setConcurrency(e.target.value)}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                      />
                                      <span className="text-gray-400 text-xs" title="Quantos contatos recebem ao mesmo tempo">ℹ️</span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              <button
                                onClick={handleTrigger}
                                disabled={selectedConversations.length === 0 || (scheduleMode && !scheduledTime)}
                                className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all transform flex items-center justify-center gap-2 ${(selectedConversations.length === 0 || (scheduleMode && !scheduledTime))
                                  ? 'bg-gray-300 cursor-not-allowed shadow-none'
                                  : scheduleMode
                                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 hover:-translate-y-1 hover:shadow-xl active:translate-y-0'
                                    : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 hover:-translate-y-1 hover:shadow-xl active:translate-y-0'
                                  }`}
                              >
                                {(triggerStatus?.startsWith('Processando') || triggerStatus === 'Inicializando...') ? (
                                  <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    {scheduleMode ? 'Agendando...' : 'Enviando...'}
                                  </>
                                ) : (
                                  <span className="uppercase tracking-wide">
                                    {(!triggerStatus?.startsWith('Processando') && !triggerStatus?.startsWith('Inicializando') && triggerStatus) || (scheduleMode ? 'CONFIRMAR AGENDAMENTO 📅' : 'DISPARAR AGORA 🚀')}
                                  </span>
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {currentView === 'history' && (
            <div className="space-y-8">
              <TriggerHistory refreshKey={triggerHistoryRefreshKey} />
            </div>
          )}
        </div>
      </main >
    </div >
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
