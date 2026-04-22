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
import RecurringSchedules from './components/RecurringSchedules';
import SettingsModal from './components/SettingsModal';
import Sidebar from './components/Sidebar';
import ClientModal from './components/ClientModal';
import BlockedContacts from './components/BlockedContacts';
import Users from './pages/Users';
import VisualFlowBuilder from './components/VisualFlowBuilder';
import ConnectionStatus from './components/ConnectionStatus';
import SchedulePage from './pages/SchedulePage';
import TemplateCreator from './components/TemplateCreator';
import Monitoring from './pages/Monitoring';
import Integrations from './pages/Integrations';
import WebhookLeads from './pages/WebhookLeads';
import Financial from './pages/Financial';
import { AuthProvider, useAuth, fetchWithAuth } from './AuthContext';
import { ClientProvider, useClient } from './contexts/ClientContext';
import ProtectedRoute from './ProtectedRoute';
import { ThemeProvider } from './contexts/ThemeContext';
import GlobalsModal from './components/GlobalsModal';
import ChatwootLabelsModal from './components/ChatwootLabelsModal';
import { FiGlobe, FiTag } from 'react-icons/fi';

function AppContent() {
  const { user, logout } = useAuth();
  const { activeClient } = useClient();

  // View State
  const [currentView, setCurrentView] = useState(localStorage.getItem('currentView') || 'bulk_sender');

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
  const [isGlobalsModalOpen, setIsGlobalsModalOpen] = useState(false);
  const [isLabelsModalOpen, setIsLabelsModalOpen] = useState(false);
  const [isFunnelGuideOpen, setIsFunnelGuideOpen] = useState(false);
  const [isScheduleGuideOpen, setIsScheduleGuideOpen] = useState(false);
  const [isHistoryGuideOpen, setIsHistoryGuideOpen] = useState(false);
  const [isBlockedGuideOpen, setIsBlockedGuideOpen] = useState(false);

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
    localStorage.setItem('currentView', currentView);
  }, [currentView]);

  useEffect(() => {
    if (user && user.role === 'user') {
      const allowedViews = ['history', 'schedules'];
      if (!allowedViews.includes(currentView)) {
        setCurrentView('history');
      }
    }
  }, [user, currentView]);

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
      <Toaster position="top-right" reverseOrder={false} containerStyle={{ zIndex: 100000 }} />

      <ClientModal isOpen={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} />
      <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} onSaved={() => setSettingsRefreshKey(prev => prev + 1)} />
      <GlobalsModal isOpen={isGlobalsModalOpen} onClose={() => setIsGlobalsModalOpen(false)} />
      <ChatwootLabelsModal isOpen={isLabelsModalOpen} onClose={() => setIsLabelsModalOpen(false)} />

      {/* ========= MODAL GUIA DE FUNIS ========= */}
      {isFunnelGuideOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setIsFunnelGuideOpen(false); }}
        >
          <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden"
            style={{ background: 'linear-gradient(160deg, #0f1729 0%, #111827 100%)', border: '1px solid rgba(99,102,241,0.25)' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-white/5"
              style={{ background: 'linear-gradient(90deg, rgba(99,102,241,0.15) 0%, transparent 100%)' }}>
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl"
                  style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)' }}>
                  🔀
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Guia de Funis de Automação</h2>
                  <p className="text-sm text-gray-400">Entenda como criar e disparar funis inteligentes no WhatsApp.</p>
                </div>
              </div>
              <button
                onClick={() => setIsFunnelGuideOpen(false)}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-white transition-all hover:scale-110"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Conteúdo */}
            <div className="overflow-y-auto flex-1 px-8 py-6 space-y-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#312e81 transparent' }}>

              {/* Card 1 — O que é um Funil */}
              <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #6366f1' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🔀</span>
                  <h3 className="font-bold text-white text-sm">O que é um Funil?</h3>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">Um funil é uma <b className="text-white">sequência automática de mensagens</b> enviadas com intervalos definidos. Após disparar para um contato, cada etapa é executada uma a uma, sem intervenção manual.</p>
                <p className="text-indigo-400 text-xs mt-2 italic">💡 Ideal para nutrição de leads, boas-vindas, follow-ups e jornadas de onboarding.</p>
              </div>

              {/* Card 2 — Tipos de etapa */}
              <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #f59e0b' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🧩</span>
                  <h3 className="font-bold text-white text-sm">Tipos de Etapa</h3>
                </div>
                <div className="space-y-2">
                  {[
                    { label: 'Mensagem', color: 'text-blue-300 bg-blue-900/20', desc: 'Envia um texto livre. Pode incluir até 3 botões de resposta rápida para o contato interagir.' },
                    { label: 'Template', color: 'text-indigo-300 bg-indigo-900/20', desc: 'Envia um template aprovado pela Meta. Use para iniciar contatos fora da janela de 24h.' },
                    { label: 'Delay', color: 'text-amber-300 bg-amber-900/20', desc: 'Pausa a sequência por um tempo configurável (minutos, horas, dias) antes da próxima etapa.' },
                    { label: 'Enquete', color: 'text-emerald-300 bg-emerald-900/20', desc: 'Envia uma poll interativa do WhatsApp com opções para o contato votar.' },
                  ].map(item => (
                    <div key={item.label} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${item.color}`}>{item.label}</span>
                      <p className="text-gray-400 text-xs leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 3 — Editor visual */}
              <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #3b82f6' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🎨</span>
                  <h3 className="font-bold text-white text-sm">Editor Visual de Fluxo</h3>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-2">Ao clicar em um funil para editar, você entra no <b className="text-white">editor visual drag-and-drop</b>. Arraste nós, conecte etapas e visualize o fluxo completo da jornada do cliente.</p>
                <div className="space-y-1.5">
                  <p className="text-gray-400 text-xs">• <span className="text-white">Arrastar nós:</span> reorganize a ordem das etapas livremente.</p>
                  <p className="text-gray-400 text-xs">• <span className="text-white">Conectar setas:</span> defina qual etapa vem depois de qual.</p>
                  <p className="text-gray-400 text-xs">• <span className="text-white">Clique duplo no nó:</span> edita o conteúdo da etapa.</p>
                </div>
              </div>

              {/* Card 4 — Disparar Funil */}
              <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #10b981' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🚀</span>
                  <h3 className="font-bold text-white text-sm">Disparar um Funil</h3>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-3">Selecione um funil na lista para abrir o painel <b className="text-white">"Disparar Funil"</b> à direita. Lá você configura:</p>
                <div className="space-y-2">
                  {[
                    { label: 'Lista de contatos', desc: 'Cole números manualmente ou importe um CSV/Excel.' },
                    { label: 'Delay entre envios', desc: 'Intervalo entre cada disparo para evitar bloqueios.' },
                    { label: 'Agendamento', desc: 'Programe o início do funil para uma data e hora futura.' },
                  ].map(item => (
                    <div key={item.label} className="flex items-start gap-3 p-2.5 rounded-xl" style={{ background: 'rgba(16,185,129,0.07)' }}>
                      <span className="text-emerald-400 font-bold text-xs shrink-0 mt-0.5">•</span>
                      <p className="text-gray-400 text-xs leading-relaxed"><span className="text-white font-semibold">{item.label}:</span> {item.desc}</p>
                    </div>
                  ))}
                </div>
                <p className="text-emerald-400 text-xs mt-2 italic">💡 Funis com etapa de Template devem ser disparados pelo "Disparo em Massa" (ícone indica isso automaticamente).</p>
              </div>

              {/* Card 5 — Variáveis Globais */}
              <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #a78bfa' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🌐</span>
                  <h3 className="font-bold text-white text-sm">Variáveis Globais</h3>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-3">Valores reutilizáveis em qualquer mensagem do funil. Use a sintaxe <span className="font-mono text-purple-300 text-xs">{'{{nome_da_variavel}}'}</span> no texto das etapas.</p>
                <div className="rounded-xl p-3 font-mono text-xs text-emerald-400 space-y-1" style={{ background: 'rgba(0,0,0,0.3)' }}>
                  <div>{'{{link_grupo}}'} → https://chat.whatsapp.com/...</div>
                  <div>{'{{nome_empresa}}'} → Luana Ribeiro Imóveis</div>
                </div>
                <p className="text-purple-400 text-xs mt-2 italic">💡 Ideal para links, nomes, telefones e outras informações que mudam por cliente.</p>
              </div>

              {/* Card 6 — Etiquetas Chatwoot */}
              <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #ec4899' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🏷️</span>
                  <h3 className="font-bold text-white text-sm">Criar Etiqueta Chatwoot</h3>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">Cria etiquetas diretamente no Chatwoot para organizar contatos. As etapas do funil podem aplicar etiquetas automaticamente aos contatos que passam por elas, facilitando a segmentação da equipe de atendimento.</p>
              </div>

            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t border-white/5 flex justify-end" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <button
                onClick={() => setIsFunnelGuideOpen(false)}
                className="px-8 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 20px rgba(99,102,241,0.4)' }}
              >
                Entendido!
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ========= MODAL GUIA CONTATOS BLOQUEADOS ========= */}
      {isBlockedGuideOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setIsBlockedGuideOpen(false); }}
        >
          <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden"
            style={{ background: 'linear-gradient(160deg, #1a0a00 0%, #1c1008 100%)', border: '1px solid rgba(249,115,22,0.2)' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-white/5"
              style={{ background: 'linear-gradient(90deg, rgba(249,115,22,0.12) 0%, transparent 100%)' }}>
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl"
                  style={{ background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.35)' }}>
                  🚫
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Guia de Contatos Bloqueados</h2>
                  <p className="text-sm text-gray-400">Entenda como funciona o bloqueio automático e manual de contatos.</p>
                </div>
              </div>
              <button
                onClick={() => setIsBlockedGuideOpen(false)}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-white transition-all hover:scale-110"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Conteúdo */}
            <div className="overflow-y-auto flex-1 px-8 py-6 space-y-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#431407 transparent' }}>

              {/* Card 1 — O que é */}
              <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #fb923c' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🚫</span>
                  <h3 className="font-bold text-white text-sm">O que são Contatos Bloqueados?</h3>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">Contatos bloqueados são números que <b className="text-white">nunca receberão mensagens</b> dos seus disparos ou funis — independente da campanha. O sistema automaticamente os pula durante qualquer envio.</p>
                <p className="text-orange-400 text-xs mt-2 italic">💡 Respeitar pedidos de opt-out evita bloqueios pela Meta e mantém a reputação do número saudável.</p>
              </div>

              {/* Card 2 — Gatilhos de Auto-Bloqueio */}
              <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #ef4444' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">⚡</span>
                  <h3 className="font-bold text-white text-sm">Gatilhos de Auto-Bloqueio</h3>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-3">Se um contato clicar em um botão ou enviar uma mensagem contendo alguma das palavras cadastradas, ele é <b className="text-white">bloqueado automaticamente</b> em tempo real.</p>
                <div className="rounded-xl p-3 font-mono text-xs leading-relaxed" style={{ background: 'rgba(0,0,0,0.3)' }}>
                  <div className="flex flex-wrap gap-2">
                    {['sair', 'parar', 'cancelar', 'não quero', 'stop', 'unsubscribe', 'opt-out', 'descadastrar'].map(w => (
                      <span key={w} className="px-2 py-0.5 rounded-full text-red-300" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)' }}>{w}</span>
                    ))}
                  </div>
                </div>
                <p className="text-red-400 text-xs mt-2 italic">💡 Adicione variações da mesma palavra (ex: "nao quero" e "não quero") para cobrir todas as formas de escrita.</p>
              </div>

              {/* Card 3 — Como adicionar gatilhos */}
              <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #f59e0b' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">➕</span>
                  <h3 className="font-bold text-white text-sm">Gerenciando Gatilhos</h3>
                </div>
                <div className="space-y-2">
                  {[
                    { label: 'Adicionar', desc: 'Digite a palavra no campo e clique em "Adicionar". Os gatilhos são salvos automaticamente.' },
                    { label: 'Remover', desc: 'Clique no × ao lado da palavra para removê-la da lista.' },
                    { label: 'Case Insensitive', desc: 'A comparação ignora maiúsculas/minúsculas. "SAIR" e "sair" funcionam igualmente.' },
                  ].map(item => (
                    <div key={item.label} className="flex items-start gap-3 p-2.5 rounded-xl" style={{ background: 'rgba(245,158,11,0.07)' }}>
                      <span className="text-amber-300 font-bold text-xs shrink-0 mt-0.5 w-24">{item.label}</span>
                      <p className="text-gray-400 text-xs leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 4 — Bloqueio Manual */}
              <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #6366f1' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">📵</span>
                  <h3 className="font-bold text-white text-sm">Bloqueio Manual de Números</h3>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-3">Adicione números específicos que <b className="text-white">nunca devem receber mensagens</b>, independente de terem enviado alguma palavra de gatilho.</p>
                <div className="space-y-2">
                  {[
                    { label: 'Manual', desc: 'Cole os números diretamente no campo de texto, um por linha ou separados por vírgula.' },
                    { label: 'Upload CSV/Excel', desc: 'Importe um arquivo com uma coluna de telefones para bloquear em lote.' },
                  ].map(item => (
                    <div key={item.label} className="flex items-start gap-3 p-2.5 rounded-xl" style={{ background: 'rgba(99,102,241,0.08)' }}>
                      <span className="text-indigo-300 font-bold text-xs shrink-0 mt-0.5 w-24">{item.label}</span>
                      <p className="text-gray-400 text-xs leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
                <p className="text-indigo-400 text-xs mt-2 italic">💡 Use com DDI 55 (ex: 5585999999999) para garantir que o número seja reconhecido corretamente.</p>
              </div>

              {/* Card 5 — Como funciona na prática */}
              <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #10b981' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">⚙️</span>
                  <h3 className="font-bold text-white text-sm">Como funciona na prática</h3>
                </div>
                <div className="space-y-1.5">
                  <p className="text-gray-400 text-xs">1. Contato recebe seu template e responde <span className="text-white font-mono">"Não quero"</span>.</p>
                  <p className="text-gray-400 text-xs">2. O sistema detecta a palavra gatilho e <b className="text-orange-300">bloqueia automaticamente</b> o número.</p>
                  <p className="text-gray-400 text-xs">3. Nos próximos disparos, esse número é <b className="text-white">pulado silenciosamente</b>.</p>
                  <p className="text-gray-400 text-xs">4. O contato nunca mais recebe mensagens dessa conta até ser <b className="text-white">desbloqueado manualmente</b>.</p>
                </div>
                <p className="text-emerald-400 text-xs mt-3 italic">💡 Também é possível adicionar a lista de exclusão diretamente no Disparo em Massa para bloquear apenas naquela campanha específica.</p>
              </div>

            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t border-white/5 flex justify-end" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <button
                onClick={() => setIsBlockedGuideOpen(false)}
                className="px-8 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #ea580c, #fb923c)', boxShadow: '0 4px 20px rgba(249,115,22,0.35)' }}
              >
                Entendido!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========= MODAL GUIA HISTÓRICO DE DISPAROS ========= */}
      {isHistoryGuideOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setIsHistoryGuideOpen(false); }}
        >
          <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden"
            style={{ background: 'linear-gradient(160deg, #0a1628 0%, #0c1a2e 100%)', border: '1px solid rgba(14,165,233,0.2)' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-white/5"
              style={{ background: 'linear-gradient(90deg, rgba(14,165,233,0.12) 0%, transparent 100%)' }}>
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl"
                  style={{ background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.35)' }}>
                  🕐
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Guia do Histórico de Disparos</h2>
                  <p className="text-sm text-gray-400">Entenda como ler, filtrar e auditar seus disparos realizados.</p>
                </div>
              </div>
              <button
                onClick={() => setIsHistoryGuideOpen(false)}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-white transition-all hover:scale-110"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Conteúdo */}
            <div className="overflow-y-auto flex-1 px-8 py-6 space-y-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#0c4a6e transparent' }}>

              {/* Card 1 — O que é o Histórico */}
              <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #38bdf8' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🕐</span>
                  <h3 className="font-bold text-white text-sm">O que é o Histórico?</h3>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">O Histórico registra <b className="text-white">todos os disparos já executados</b> — tanto de Funis quanto de Disparo em Massa. Cada linha representa uma mensagem enviada a um contato específico, com data, status e detalhes da campanha.</p>
                <p className="text-sky-400 text-xs mt-2 italic">💡 Use o Histórico para auditar entregas, identificar falhas e entender o desempenho das suas campanhas.</p>
              </div>

              {/* Card 2 — Colunas da tabela */}
              <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #6366f1' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">📋</span>
                  <h3 className="font-bold text-white text-sm">Colunas da Tabela</h3>
                </div>
                <div className="space-y-2">
                  {[
                    { col: 'Data/Hora', desc: 'Quando o disparo foi executado ou agendado.' },
                    { col: 'Funil / Template', desc: 'Nome da campanha ou template usado. Badge "Bulk" indica Disparo em Massa.' },
                    { col: 'Contato', desc: 'Número de telefone do destinatário. Pode aparecer como "-" em disparos em lote.' },
                    { col: 'Status', desc: 'Resultado do envio: Enviado, Falha, Cancelado ou Pendente.' },
                    { col: 'Ações', desc: 'Botão de lixeira para excluir o registro do histórico.' },
                  ].map(item => (
                    <div key={item.col} className="flex items-start gap-3 p-2.5 rounded-xl" style={{ background: 'rgba(99,102,241,0.07)' }}>
                      <span className="text-indigo-300 font-bold text-xs shrink-0 mt-0.5 w-28">{item.col}</span>
                      <p className="text-gray-400 text-xs leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 3 — Status */}
              <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #10b981' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🚦</span>
                  <h3 className="font-bold text-white text-sm">Status de Envio</h3>
                </div>
                <div className="space-y-2">
                  {[
                    { status: 'Enviado', color: 'text-emerald-400 bg-emerald-900/30', desc: 'Mensagem entregue com sucesso ao WhatsApp do contato.' },
                    { status: 'Falha', color: 'text-red-400 bg-red-900/30', desc: 'Erro no envio. Veja o "Relatório de Falhas" para entender o motivo.' },
                    { status: 'Cancelado', color: 'text-gray-400 bg-gray-800/50', desc: 'Disparo foi cancelado manualmente antes de ser executado.' },
                    { status: 'Pendente', color: 'text-yellow-400 bg-yellow-900/30', desc: 'Agendado mas ainda não executado. Aparece aqui antes do horário programado.' },
                  ].map(item => (
                    <div key={item.status} className="flex items-start gap-3 p-2.5 rounded-xl" style={{ background: 'rgba(0,0,0,0.2)' }}>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${item.color}`}>{item.status}</span>
                      <p className="text-gray-400 text-xs leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 4 — Filtros */}
              <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #f59e0b' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🔍</span>
                  <h3 className="font-bold text-white text-sm">Filtros Disponíveis</h3>
                </div>
                <div className="space-y-2">
                  {[
                    { label: 'Busca por funil', desc: 'Digite parte do nome do funil ou template para filtrar os registros.' },
                    { label: 'Todos os tipos', desc: 'Filtra por Bulk (Disparo em Massa) ou Funil.' },
                    { label: 'Todo o período', desc: 'Restringe os resultados por intervalo de datas.' },
                    { label: 'Todos os status', desc: 'Mostra apenas Enviados, Falhas, Cancelados ou Pendentes.' },
                    { label: '10 itens ▾', desc: 'Controla quantos registros são exibidos por página.' },
                  ].map(item => (
                    <div key={item.label} className="flex items-start gap-3 p-2.5 rounded-xl" style={{ background: 'rgba(251,191,36,0.07)' }}>
                      <span className="text-amber-300 font-bold text-xs shrink-0 mt-0.5 w-32">{item.label}</span>
                      <p className="text-gray-400 text-xs leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 5 — Relatório de Falhas */}
              <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #f97316' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">⚠️</span>
                  <h3 className="font-bold text-white text-sm">Relatório de Falhas</h3>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">Quando um disparo tem mensagens com falha, aparece o link <b className="text-orange-300">"Ver Relatório de Falhas (N)"</b> abaixo do nome do template. Clique para ver quais contatos não receberam e o motivo detalhado.</p>
                <div className="mt-3 space-y-1.5">
                  <p className="text-gray-400 text-xs">• Número inválido ou não existe no WhatsApp.</p>
                  <p className="text-gray-400 text-xs">• Contato bloqueou o número da empresa.</p>
                  <p className="text-gray-400 text-xs">• Template não aprovado ou pausado pela Meta.</p>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t border-white/5 flex justify-end" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <button
                onClick={() => setIsHistoryGuideOpen(false)}
                className="px-8 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)', boxShadow: '0 4px 20px rgba(14,165,233,0.35)' }}
              >
                Entendido!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========= MODAL GUIA AGENDA DE DISPAROS ========= */}
      {isScheduleGuideOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setIsScheduleGuideOpen(false); }}
        >
          <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden"
            style={{ background: 'linear-gradient(160deg, #0f1a0a 0%, #111827 100%)', border: '1px solid rgba(251,191,36,0.2)' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-white/5"
              style={{ background: 'linear-gradient(90deg, rgba(251,191,36,0.12) 0%, transparent 100%)' }}>
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl"
                  style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.35)' }}>
                  📅
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Guia da Agenda de Disparos</h2>
                  <p className="text-sm text-gray-400">Entenda como visualizar, gerenciar e reagendar seus disparos.</p>
                </div>
              </div>
              <button
                onClick={() => setIsScheduleGuideOpen(false)}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-white transition-all hover:scale-110"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Conteúdo */}
            <div className="overflow-y-auto flex-1 px-8 py-6 space-y-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#422006 transparent' }}>

              {/* Card 1 — O que é a Agenda */}
              <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #fbbf24' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">📅</span>
                  <h3 className="font-bold text-white text-sm">O que é a Agenda de Disparos?</h3>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">A Agenda exibe todos os disparos <b className="text-white">agendados para o futuro</b> em formato de calendário. Cada bolinha colorida no dia representa um disparo programado — seja de Funil, Disparo em Massa ou um Agendamento avulso.</p>
                <p className="text-amber-400 text-xs mt-2 italic">💡 O disparo acontece automaticamente na data e hora configuradas, mesmo com o navegador fechado.</p>
              </div>

              {/* Card 2 — Como agendar */}
              <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #f97316' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">⏰</span>
                  <h3 className="font-bold text-white text-sm">Como criar um agendamento?</h3>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-3">Agendamentos são criados ao configurar um disparo nas seções:</p>
                <div className="space-y-2">
                  {[
                    { label: 'Disparo em Massa', color: 'text-emerald-300', desc: 'Na etapa de Envio, defina uma data/hora futura antes de confirmar.' },
                    { label: 'Disparar Funil', color: 'text-indigo-300', desc: 'Ao selecionar um funil e configurar a lista, ative o campo de agendamento.' },
                  ].map(item => (
                    <div key={item.label} className="flex items-start gap-3 p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <span className={`font-bold text-xs shrink-0 mt-0.5 ${item.color}`}>{item.label}</span>
                      <p className="text-gray-400 text-xs leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 3 — Clicando num evento */}
              <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #3b82f6' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🖱️</span>
                  <h3 className="font-bold text-white text-sm">Clicando em um Evento</h3>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-3">Ao clicar em uma bolinha de evento no calendário, um painel lateral abre com detalhes e ações:</p>
                <div className="space-y-2">
                  {[
                    { icon: '📋', label: 'Detalhes completos', desc: 'Nome do disparo, template utilizado, quantidade de contatos, horário programado.' },
                    { icon: '✏️', label: 'Reagendar', desc: 'Altere a data e hora do disparo antes que ele execute. Útil para ajustes de última hora.' },
                    { icon: '🗑️', label: 'Cancelar / Excluir', desc: 'Remove o agendamento. O disparo não será mais executado.' },
                  ].map(item => (
                    <div key={item.label} className="flex items-start gap-3 p-2.5 rounded-xl" style={{ background: 'rgba(59,130,246,0.08)' }}>
                      <span className="text-base shrink-0">{item.icon}</span>
                      <div>
                        <p className="text-blue-200 font-bold text-xs">{item.label}</p>
                        <p className="text-gray-400 text-xs mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 4 — Navegação */}
              <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #10b981' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🗓️</span>
                  <h3 className="font-bold text-white text-sm">Navegando no Calendário</h3>
                </div>
                <div className="space-y-2">
                  {[
                    { label: '‹ ›  Setas', desc: 'Navega entre os meses para ver disparos passados ou futuros.' },
                    { label: 'Hoje', desc: 'Volta imediatamente para o mês atual e destaca o dia de hoje.' },
                    { label: 'Bolinhas coloridas', desc: 'Cada cor representa um tipo diferente de disparo. Clique para ver o detalhe.' },
                    { label: 'Contador (0)', desc: 'Número ao lado do mês indica quantos eventos estão agendados naquele mês.' },
                  ].map(item => (
                    <div key={item.label} className="flex items-start gap-3 p-2.5 rounded-xl" style={{ background: 'rgba(16,185,129,0.07)' }}>
                      <span className="text-emerald-300 font-bold text-xs shrink-0 mt-0.5 w-28">{item.label}</span>
                      <p className="text-gray-400 text-xs leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 5 — Status dos disparos */}
              <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #a78bfa' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">📊</span>
                  <h3 className="font-bold text-white text-sm">Acompanhando Resultados</h3>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">Após o disparo executar, ele sai da Agenda e vai para o <b className="text-white">Histórico de Disparos</b>. Lá você encontra o status de cada mensagem (enviada, falha, pendente) e métricas detalhadas da campanha.</p>
                <p className="text-purple-400 text-xs mt-2 italic">💡 Use o "Histórico" no menu lateral para auditar disparos concluídos.</p>
              </div>

            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t border-white/5 flex justify-end" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <button
                onClick={() => setIsScheduleGuideOpen(false)}
                className="px-8 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #d97706, #fbbf24)', boxShadow: '0 4px 20px rgba(251,191,36,0.3)' }}
              >
                Entendido!
              </button>
            </div>
          </div>
        </div>
      )}

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
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {currentView === 'bulk_sender' && 'Disparo em Massa'}
                    {currentView === 'recurring_schedules' && 'Disparo Recorrente Criado'}
                    {currentView === 'funnels' && 'Meus Funis'}
                    {currentView === 'history' && 'Histórico de Disparos'}
                    {currentView === 'blocked' && 'Contatos Bloqueados'}
                    {currentView === 'users' && 'Gestão de Usuários'}
                    {currentView === 'templates' && 'Gerenciar Templates'}
                    {currentView === 'schedules' && 'Agenda de Disparos'}
                    {currentView === 'monitoring' && 'Status do Sistema'}
                    {currentView === 'integrations' && 'Integrações Webhook'}
                    {currentView === 'financial' && 'Financeiro'}
                  </h1>
                  {currentView === 'funnels' && !showBuilder && (
                    <button
                      type="button"
                      onClick={() => setIsFunnelGuideOpen(true)}
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all hover:scale-105"
                      style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8' }}
                      title="Abrir guia de funis"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                      Guia
                    </button>
                  )}
                  {currentView === 'schedules' && (
                    <button
                      type="button"
                      onClick={() => setIsScheduleGuideOpen(true)}
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all hover:scale-105"
                      style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24' }}
                      title="Abrir guia da agenda"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                      Guia
                    </button>
                  )}
                  {currentView === 'history' && (
                    <button
                      type="button"
                      onClick={() => setIsHistoryGuideOpen(true)}
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all hover:scale-105"
                      style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.3)', color: '#38bdf8' }}
                      title="Abrir guia do histórico"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                      Guia
                    </button>
                  )}
                  {currentView === 'blocked' && (
                    <button
                      type="button"
                      onClick={() => setIsBlockedGuideOpen(true)}
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all hover:scale-105"
                      style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', color: '#fb923c' }}
                      title="Abrir guia de contatos bloqueados"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                      Guia
                    </button>
                  )}
                </div>
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
            {currentView === 'integrations' && <Integrations />}
            {currentView === 'leads' && <WebhookLeads />}
            {currentView === 'financial' && <Financial />}
            {currentView === 'recurring_schedules' && <RecurringSchedules />}
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
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => setIsGlobalsModalOpen(true)}
                            className="px-5 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-semibold border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center gap-2 shadow-sm text-sm"
                          >
                            <FiGlobe size={16} className="text-blue-500" />
                            Variáveis Globais
                          </button>
                          <button
                            onClick={() => setIsLabelsModalOpen(true)}
                            className="px-5 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-semibold border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center gap-2 shadow-sm text-sm"
                          >
                            <FiTag size={16} className="text-pink-500" />
                            Criar Etiqueta Chatwoot
                          </button>
                        </div>
                        <button onClick={handleCreateFunnel} className="px-6 py-5 bg-blue-600 text-white rounded-lg font-semibold shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all active:scale-95 flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                          Novo Funil
                        </button>
                      </div>
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
                <TemplateCreator refreshKey={settingsRefreshKey} onSuccess={() => {
                  setSettingsRefreshKey(prev => prev + 1);
                  setCurrentView('bulk_sender');
                }} />
              </div>
            )}

            {currentView === 'history' && (
              <div className="space-y-8">
                <TriggerHistory refreshKey={triggerHistoryRefreshKey} onNavigateToBulk={() => setCurrentView('bulk_sender')} />
              </div>
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
