import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiPlus, FiTrash2, FiEdit2, FiCopy, FiZap, FiSettings, FiPlay, FiCheckCircle, FiXCircle, FiMaximize2, FiRefreshCw, FiChevronDown, FiX, FiCheck, FiShare2, FiMessageSquare, FiSearch, FiEye, FiInbox, FiSend, FiDownload, FiUpload, FiCpu, FiActivity, FiUsers, FiClock, FiUser, FiFileText, FiShield, FiNavigation, FiMousePointer } from 'react-icons/fi';
import { API_URL, WS_URL } from '../config';
import { fetchWithAuth } from '../AuthContext';
import { useClient } from '../contexts/ClientContext';
import { toast } from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';

// Helper para normalizar chatwoot_label para sempre ser um array limpo de strings simples.
// Lida com qualquer nivel de corrupção (JSON dentro de JSON, split por vírgula, etc.)
const normalizeChatwootLabel = (value, depth = 0) => {
  if (depth > 10) return []; // prevent infinite recursion
  if (!value) return [];

  // Se for um array, processa cada elemento
  if (Array.isArray(value)) {
    const result = [];
    for (const item of value) {
      const normalized = normalizeChatwootLabel(item, depth + 1);
      result.push(...normalized);
    }
    // Filtra apenas strings simples (sem JSON chars), deduplica
    return [...new Set(result.filter(v => v && typeof v === 'string' && !v.startsWith('[') && !v.startsWith('{') && !v.startsWith('"')))];
  }

  // Se for uma string, tenta desempacotar
  if (typeof value === 'string') {
    const trimmed = value.trim();

    // Tenta fazer JSON.parse se parecido com JSON
    if (trimmed.startsWith('[') || trimmed.startsWith('"')) {
      try {
        const parsed = JSON.parse(trimmed);
        return normalizeChatwootLabel(parsed, depth + 1);
      } catch {
        // Se falhou, tenta remover artefatos e usar como string simples
        const cleaned = trimmed.replace(/^\[|\]$/g, '').replace(/^"|"$/g, '').trim();
        if (cleaned && !cleaned.startsWith('[')) return [cleaned];
        return [];
      }
    }

    // String simples, retorna diretamente
    if (trimmed) return [trimmed];
  }

  return [];
};

// Componente de Countdown para o Pipeline (Versão Premium com Barra de Progresso)
const PipelineCountdown = ({ targetTime }) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const totalDuration = 10; // Definimos 10s como padrão para o progresso visual

  useEffect(() => {
    const calculate = () => {
      if (!targetTime) {
        setTimeLeft(0);
        return;
      }
      const diff = Math.ceil((new Date(targetTime).getTime() - Date.now()) / 1000);
      setTimeLeft(isNaN(diff) ? 0 : Math.max(0, diff));
    };
    calculate();
    const timer = setInterval(calculate, 1000);
    return () => clearInterval(timer);
  }, [targetTime]);

  const progress = Math.min(100, Math.max(0, (timeLeft / totalDuration) * 100));

  if (timeLeft <= 0) {
    return (
      <div className="flex items-center gap-2 animate-pulse">
        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
        <span className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">Finalizando...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 w-full max-w-[200px]">
      <div className="flex justify-between items-center px-1">
        <span className="text-[10px] font-bold text-amber-500/80 uppercase tracking-tighter">Aguardando Sincronia</span>
        <span className="font-mono text-amber-400 font-black text-xs">{timeLeft}s</span>
      </div>
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-[1px]">
        <div 
          className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(245,158,11,0.2)]"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

// Componente utilitário para seletores com busca (Templates e Etiquetas)
const SearchableSelect = ({ options, value, onChange, placeholder, icon: Icon, colorClass, isMulti }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const containerRef = React.useRef(null);
  const [coords, setCoords] = React.useState({ top: 0, bottom: 0, left: 0, width: 0 });
  const [direction, setDirection] = React.useState('down');

  React.useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // Se tiver menos de 250px livres embaixo, abrir para cima
      setDirection(spaceBelow < 250 ? 'up' : 'down');
      
      setCoords({
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        width: rect.width
      });
    }
  }, [isOpen]);

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isSelected = (optValue) => {
    if (isMulti) {
      return Array.isArray(value) && value.includes(optValue);
    }
    return String(value) === String(optValue);
  };

  const currentValues = isMulti
    ? (Array.isArray(value) ? value : (typeof value === 'string' && value.trim() ? value.split(',').map(v => v.trim()) : []))
    : [value];
  const selectedOptions = options.filter(opt => currentValues.some(v => String(v) === String(opt.value)));

  const handleToggle = (optValue) => {
    if (isMulti) {
      const newValue = currentValues.includes(optValue)
        ? currentValues.filter(v => v !== optValue)
        : [...currentValues, optValue];
      onChange(newValue);
    } else {
      onChange(optValue);
      setIsOpen(false);
      setSearchTerm("");
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div
        className={`flex items-center gap-2 w-full min-h-[38px] py-1.5 px-3 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus-within:ring-2 ${colorClass || 'focus-within:ring-blue-500/20'} cursor-pointer group/sel flex-wrap`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {Icon && <Icon className={colorClass?.includes('purple') ? 'text-purple-500' : 'text-blue-500'} size={14} />}

        <div className="flex flex-wrap gap-1 flex-1 overflow-hidden">
          {selectedOptions.length > 0 ? (
            isMulti ? (
              selectedOptions.map(opt => (
                <span key={opt.value} className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1">
                  {opt.label}
                  <FiX
                    className="hover:text-blue-900 dark:hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggle(opt.value);
                    }}
                  />
                </span>
              ))
            ) : (
              <span className="truncate font-medium">{selectedOptions[0].label}</span>
            )
          ) : (
            <span className="text-gray-400 font-normal">{placeholder}</span>
          )}
        </div>

        <FiChevronDown className={`ml-auto text-gray-400 group-hover/sel:text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && createPortal(
        <>
          <div className="fixed inset-0 z-[99999]" onClick={() => setIsOpen(false)}></div>
          <div
            className="fixed bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-2xl z-[100000] overflow-hidden"
            style={{
              left: coords.left,
              width: coords.width,
              maxHeight: '300px',
              ...(direction === 'up' 
                ? { bottom: window.innerHeight - coords.top + 4 } 
                : { top: coords.bottom + 4 })
            }}
          >
            <div className="p-2 border-b border-gray-50 dark:border-gray-800">
              <input
                autoFocus
                type="text"
                className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500/30 text-gray-900 dark:text-white"
                placeholder="Digite para buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="max-h-60 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800">
              {filteredOptions.length === 0 ? (
                <div className="p-3 text-center text-gray-500 text-[10px] italic">Nenhum resultado encontrado</div>
              ) : (
                filteredOptions.map(opt => {
                  const active = isSelected(opt.value);
                  return (
                    <div
                      key={opt.value}
                      className={`p-2.5 text-xs rounded-lg cursor-pointer transition-colors flex items-center justify-between mb-0.5 last:mb-0 ${active ? 'bg-blue-500 text-white font-bold' : 'hover:bg-blue-50 dark:hover:bg-blue-900/40 text-gray-800 dark:text-gray-200'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggle(opt.value);
                      }}
                    >
                      <span>{opt.label}</span>
                      {active && <FiCheck size={12} />}
                    </div>
                  );
                })
              )}
            </div>
            {isMulti && (
              <div className="p-2 border-t border-gray-50 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-end">
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-[10px] font-bold text-blue-600 bg-white dark:bg-gray-800 px-4 py-1.5 rounded-lg border border-blue-500/20 hover:bg-blue-50 transition-colors"
                >
                  Concluir
                </button>
              </div>
            )}
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export default function Integrations() {
  const { activeClient } = useClient();
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isMappingGuideOpen, setIsMappingGuideOpen] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [integrationToDelete, setIntegrationToDelete] = useState(null);
  const [chatwootLabels, setChatwootLabels] = useState([]);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    platform: 'hotmart',
    mappings: [],
    product_filtering: false,
    product_whitelist: [],
    discovered_products: []
  });
  const [templates, setTemplates] = useState([]);

  // Testing states
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [integrationToTest, setIntegrationToTest] = useState(null);
  const [testPayload, setTestPayload] = useState('{\n  "event": "purchase_approved",\n  "contact": {\n    "full_name": "João Silva",\n    "phone": "5511999999999"\n  },\n  "product": {\n    "name": "Curso de Teste"\n  }\n}');
  const [testResult, setTestResult] = useState(null);
  const [isTesting, setIsTesting] = useState(false);

  // History states
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyIntegration, setHistoryIntegration] = useState(null);
  const [webhookHistory, setWebhookHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isSyncing, setIsSyncing] = useState({});
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [historyPageSize, setHistoryPageSize] = useState(20);
  const [historyCurrentPage, setHistoryCurrentPage] = useState(1);
  const [maximizedJson, setMaximizedJson] = useState(null);
  const [selectedHistoryIds, setSelectedHistoryIds] = useState([]);
  const [confirmDeleteHistory, setConfirmDeleteHistory] = useState({ isOpen: false, type: 'clear', id: null, ids: [] });
  const [editJsonModal, setEditJsonModal] = useState({ isOpen: false, data: '', id: null });
  const [isSavingJson, setIsSavingJson] = useState(false);
  const [webhookHistoryStatusFilter, setWebhookHistoryStatusFilter] = useState('');
  const [webhookHistorySearch, setWebhookHistorySearch] = useState('');

  // Dispatch History States
  const [isDispatchHistoryModalOpen, setIsDispatchHistoryModalOpen] = useState(false);
  const [dispatchHistory, setDispatchHistory] = useState([]);
  const [loadingDispatchHistory, setLoadingDispatchHistory] = useState(false);
  const [dispatchIntegration, setDispatchIntegration] = useState(null);
  const [isPlaying, setIsPlaying] = useState({});
  const [isCancelling, setIsCancelling] = useState({});
  const [dispatchSearch, setDispatchSearch] = useState('');
  const [debouncedDispatchSearch, setDebouncedDispatchSearch] = useState('');
  const [dispatchEventFilter, setDispatchEventFilter] = useState('');
  const [dispatchTypeFilter, setDispatchTypeFilter] = useState('');
  const [dispatchStartDate, setDispatchStartDate] = useState('');
  const [dispatchEndDate, setDispatchEndDate] = useState('');
  const [selectedDispatchIds, setSelectedDispatchIds] = useState([]);
  const [isBulkPlayingDispatches, setIsBulkPlayingDispatches] = useState(false);
  const [isBulkDeletingDispatches, setIsBulkDeletingDispatches] = useState(false);
  const [isBackfillingCosts, setIsBackfillingCosts] = useState(false);
  const [confirmDeleteDispatch, setConfirmDeleteDispatch] = useState({ isOpen: false, type: 'single', id: null, ids: [] });
  const [expandedMappings, setExpandedMappings] = useState(new Set());
  const [isPipelineModalOpen, setIsPipelineModalOpen] = useState(false);
  const [selectedDispatch, setSelectedDispatch] = useState(null);
  const [isDiscoveringProducts, setIsDiscoveringProducts] = useState(false);

  // Pagination for Dispatch History
  const [dispatchPage, setDispatchPage] = useState(1);
  const [dispatchLimit, setDispatchLimit] = useState(20);
  const [dispatchTotal, setDispatchTotal] = useState(0);

  // Contact Viewing States (Modal inside Dispatch History)
  const [contactsModal, setContactsModal] = useState({
    isOpen: false,
    triggerId: null,
    contacts: [],
    counts: {},
    title: ''
  });
  const [contactsFilter, setContactsFilter] = useState('all');
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Global Real-time Synchronization via WebSocket
  useEffect(() => {
    let ws;
    let reconnectTimeout;

    const connect = () => {
      const wsBase = WS_URL.endsWith('/ws') ? WS_URL : `${WS_URL}/ws`;
      const wsToken = localStorage.getItem('token');
      const wsFinalUrl = wsToken ? `${wsBase}?token=${wsToken}` : wsBase;

      try {
        ws = new WebSocket(wsFinalUrl);

        ws.onopen = () => {
          console.log("⚡ [WS] Dashboard de Integrações conectado");
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            // Handle trigger progress (Bulk and Single)
            if (message.event === 'trigger_progress' || message.event === 'bulk_progress') {
              const data = message.data;
              const triggerId = data.id || data.trigger_id;

              // 1. Update individual monitor if open
              if (isPipelineModalOpen && selectedDispatch && (selectedDispatch.id === triggerId)) {
                setSelectedDispatch(prev => ({ ...prev, ...data }));
              }

              // 2. Update Dispatch History List (Flicker-free Reconciliation)
              if (isDispatchHistoryModalOpen) {
                setDispatchHistory(prev => {
                  const index = prev.findIndex(item => item.id === triggerId);
                  if (index !== -1) {
                    const newHistory = [...prev];
                    newHistory[index] = { ...newHistory[index], ...data };
                    return newHistory;
                  } else if (dispatchIntegration && (data.integration_id === dispatchIntegration.id)) {
                    // New trigger for current integration
                    return [data, ...prev].slice(0, dispatchLimit);
                  }
                  return prev;
                });
              }

              // 3. Silent refresh of main integrations list (counts)
              // Only if it's a completion or significant event to avoid over-fetching
              if (['completed', 'failed', 'cancelled'].includes(data.status)) {
                fetchIntegrations(true);
              }
            }
          } catch (e) {
            console.error("Erro ao processar mensagem WS:", e);
          }
        };

        ws.onclose = () => {
          console.log("🔌 [WS] Conexão encerrada. Tentando reconectar...");
          reconnectTimeout = setTimeout(connect, 3000);
        };

        ws.onerror = (err) => {
          console.error("❌ [WS] Erro na conexão:", err);
          ws.close();
        };

      } catch (err) {
        console.error("Falha ao criar WebSocket:", err);
      }
    };

    if (activeClient) {
      connect();
    }

    return () => {
      if (ws) {
        ws.onclose = null; // Prevent reconnect on cleanup
        ws.close();
      }
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [activeClient, isPipelineModalOpen, selectedDispatch?.id, isDispatchHistoryModalOpen, dispatchIntegration?.id, dispatchLimit]);


  useEffect(() => {
    if (activeClient) {
      fetchIntegrations();
      fetchTemplates();
      fetchChatwootLabels();
    }
  }, [activeClient]);

  // Polling para a lista principal de Histórico (Backup para desvios do WebSocket)
  useEffect(() => {
    let interval;
    if (activeClient && !isModalOpen) { 
      interval = setInterval(() => {
        // Atualiza os contadores na lista principal de forma silenciosa
        fetchIntegrations(true);
        
        // Se a tabela de histórico estiver aberta, atualiza ela também de forma silenciosa
        if (isDispatchHistoryModalOpen && dispatchIntegration) {
          fetchDispatches(dispatchIntegration.id, dispatchPage, dispatchLimit, debouncedDispatchSearch, dispatchEventFilter, dispatchStartDate, dispatchEndDate, dispatchTypeFilter, true);
        }
      }, 30000); // 30 segundos (Fez-se backup do WS)
    }

    return () => clearInterval(interval);
  }, [activeClient, isModalOpen, isDispatchHistoryModalOpen, dispatchIntegration?.id, dispatchPage, dispatchLimit, debouncedDispatchSearch, dispatchEventFilter, dispatchStartDate, dispatchEndDate, dispatchTypeFilter]);
  // Debounce para busca de disparos
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedDispatchSearch(dispatchSearch);
      setDispatchPage(prev => Math.max(1, prev - 1)); // Reseta a página ao buscar
    }, 500);
    return () => clearTimeout(timer);
  }, [dispatchSearch]);

  // Hook para re-buscar ao mudar página, limite ou filtros
  useEffect(() => {
    if (isDispatchHistoryModalOpen && dispatchIntegration) {
      fetchDispatches(dispatchIntegration.id, dispatchPage, dispatchLimit, debouncedDispatchSearch, dispatchEventFilter, dispatchStartDate, dispatchEndDate, dispatchTypeFilter);
    }
  }, [isDispatchHistoryModalOpen, dispatchIntegration?.id, dispatchPage, dispatchLimit, debouncedDispatchSearch, dispatchEventFilter, dispatchStartDate, dispatchEndDate, dispatchTypeFilter]);

  // Hook para buscar contatos quando o modal abre ou filtro muda
  useEffect(() => {
    if (contactsModal.isOpen && contactsModal.triggerId) {
      fetchDispatchContacts();
    }
  }, [contactsFilter, contactsModal.isOpen, contactsModal.triggerId]);

  const fetchIntegrations = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/webhook-integrations?t=${Date.now()}`, {}, activeClient.id);
      if (res.ok) {
        setIntegrations(await res.json());
      }
    } catch (err) {
      console.error(err);
      if (!isSilent) toast.error('Erro ao carregar integrações');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetchWithAuth(`${API_URL}/whatsapp/templates`, {}, activeClient.id);
      if (res.ok) {
        setTemplates(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchChatwootLabels = async () => {
    try {
      const res = await fetchWithAuth(`${API_URL}/whatsapp/labels`, {}, activeClient.id);
      if (res.ok) {
        const labels = await res.json();
        setChatwootLabels(labels || []);
      }
    } catch (err) {
      console.error("Erro ao buscar etiquetas do Chatwoot:", err);
    }
  };

  const openNewModal = () => {
    setEditingIntegration(null);
    setFormData({
      name: '',
      platform: 'hotmart',
      mappings: [],
      custom_fields_mapping: {},
      custom_slug: '',
      product_filtering: false,
      product_whitelist: [],
      discovered_products: []
    });
    setExpandedMappings(new Set());
    setIsModalOpen(true);
  };

  const openEditModal = (integration) => {
    setEditingIntegration(integration);
    const mappingsWithId = (integration.mappings || []).map(m => ({
      ...m,
      ui_id: m.ui_id || Math.random().toString(36).substr(2, 9),
      chatwoot_label: normalizeChatwootLabel(m.chatwoot_label)
    }));
    setFormData({
      id: integration.id,
      name: integration.name,
      platform: integration.platform,
      mappings: mappingsWithId,
      custom_fields_mapping: integration.custom_fields_mapping || {},
      custom_slug: integration.custom_slug || '',
      product_filtering: integration.product_filtering || false,
      product_whitelist: integration.product_whitelist || [],
      discovered_products: integration.discovered_products || []
    });
    // Expand the first one by default if it exists
    if (mappingsWithId.length > 0) {
      setExpandedMappings(new Set([mappingsWithId[0].ui_id]));
    } else {
      setExpandedMappings(new Set());
    }
    setIsModalOpen(true);
  };

  const confirmDelete = (integration) => {
    setIntegrationToDelete(integration);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!integrationToDelete) return;
    try {
      const res = await fetchWithAuth(`${API_URL}/webhook-integrations/${integrationToDelete.id}`, { method: 'DELETE' }, activeClient.id);
      if (res.ok) {
        toast.success("Integração excluída");
        fetchIntegrations();
        setIsDeleteModalOpen(false);
      }
    } catch (err) {
      toast.error("Erro ao excluir");
    }
  };

  const handleSave = async () => {
    if (!formData.name) return toast.error("Nome é obrigatório");

    setIsSaving(true);
    console.log("ðŸš€ [WEBHOOK_SAVE] Iniciando processo de salvamento...", { name: formData.name, platform: formData.platform });

    try {
      // Processamento das mappings com tratamento de erro isolado
      const processedMappings = formData.mappings.map(m => {
        const hasTemplate = m.template_id && String(m.template_id).trim() !== '' && String(m.template_id) !== 'null';
        const currentTemplateId = hasTemplate ? String(m.template_id) : null;

        let template = null;
        if (Array.isArray(templates)) {
          template = templates.find(t => String(t.id) === currentTemplateId);
        }

        return {
          ...m,
          template_id: currentTemplateId,
          template_name: template ? template.name : (m.template_name || null)
        };
      });

      const payload = {
        ...formData,
        mappings: processedMappings.map(({ ui_id, ...rest }) => ({
          ...rest,
          chatwoot_label: normalizeChatwootLabel(rest.chatwoot_label)
        }))
      };

      const method = editingIntegration ? 'PUT' : 'POST';
      const url = editingIntegration
        ? `${API_URL}/webhook-integrations/${editingIntegration.id}`
        : `${API_URL}/webhook-integrations`;

      console.info(`ðŸ“¦ [WEBHOOK_SAVE] Enviando payload (${method}):`, payload);

      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }, activeClient.id);

      if (res.ok) {
        toast.success("Integração salva com sucesso!");
        fetchIntegrations();
        setIsModalOpen(false);
      } else {
        const e = await res.json();
        console.error("âŒ [WEBHOOK_SAVE] Erro retornado pelo servidor:", e);

        // Trata erro de validação do Pydantic (array de erros)
        let errorMsg = "Erro ao salvar";
        if (e.detail) {
          if (Array.isArray(e.detail)) {
            errorMsg = e.detail.map(err => `${err.loc.join('.')}: ${err.msg}`).join(" | ");
          } else {
            errorMsg = String(e.detail);
          }
        }
        toast.error(errorMsg);
      }
    } catch (err) {
      console.error("ðŸ’¥ [WEBHOOK_SAVE] Exceção crítica:", err);
      toast.error(`Falha crítica: ${err.message || "Erro na comunicação"}`);
    } finally {
      setIsSaving(false);
    }
  };

  const openTestModal = (integration) => {
    setIntegrationToTest(integration);
    setTestPayload('{\n  "event": "PIX_GENERATED",\n  "data": {}\n}');
    setTestResult(null);
    setIsTestModalOpen(true);
  };

  const handleTestWebhook = async () => {
    if (!integrationToTest) return;
    try {
      let parsedJson = JSON.parse(testPayload);
      // Basic unwrapping if user pasted log format [ { body: ... } ]
      if (Array.isArray(parsedJson) && parsedJson.length > 0) {
        parsedJson = parsedJson[0];
      }
      if (parsedJson && typeof parsedJson === 'object' && parsedJson.body) {
        parsedJson = parsedJson.body;
      }

      setIsTesting(true);
      setTestResult(null);
      const baseUrl = API_URL.endsWith('/api') ? API_URL : (API_URL ? `${API_URL}/api` : '/api');
      const res = await fetch(`${baseUrl}/webhooks/external/${integrationToTest.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedJson)
      });
      const data = await res.json();
      setTestResult({ status: res.status, data });
    } catch (err) {
      console.error("Test Webhook Error:", err);
      let errorDetails = err.message;

      if (err.message.includes('Unexpected non-whitespace character after JSON')) {
        errorDetails = "Erro: Foram detectados múltiplos blocos de JSON. Por favor, cole apenas o conteúdo do webhook (apague mensagens de erro anteriores ou outros textos).";
      }

      setTestResult({
        error: "JSON Inválido ou Falha na Requisição",
        details: errorDetails
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDiscoverProducts = async () => {
    const integrationId = formData.id || editingIntegration?.id;
    if (!integrationId) {
      toast.error("Salve a integração antes de descobrir produtos.");
      return;
    }

    setIsDiscoveringProducts(true);
    try {
      const resp = await fetchWithAuth(`${API_URL}/webhook-integrations/${integrationId}/discover-products`, {
        method: 'POST'
      }, activeClient.id);
      const data = await resp.json();
      if (resp.ok) {
        setFormData({
          ...formData,
          discovered_products: data.discovered_products
        });
        toast.success(data.message);
      } else {
        toast.error(data.detail || "Erro ao descobrir produtos.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao descobrir produtos.");
    } finally {
      setIsDiscoveringProducts(false);
    }
  };

  const handleSaveJson = async () => {
    try {
      if (!editJsonModal.id) return;
      setIsSavingJson(true);
      const parsed = JSON.parse(editJsonModal.data); // validate JSON
      const res = await fetchWithAuth(`${API_URL}/webhook-integrations/history/${editJsonModal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed)
      }, activeClient.id);

      if (res.ok) {
        const data = await res.json();
        toast.success("JSON atualizado e reprocessado com sucesso!");

        // Sincronização robusta do estado local
        setWebhookHistory(prev => prev.map(item =>
          item.id === editJsonModal.id
            ? {
              ...item,
              payload: parsed,
              processed_data: data.processed_data,
              event_type: data.event_type || item.event_type,
              status: 'processed' // Assume processado após edição bem sucedida
            }
            : item
        ));

        // Se houver uma lista de leads separada ou tela principal aberta, 
        // idealmente dispararia um evento ou refresh silencioso. 
        // Por enquanto, o refresh local no modal jÃƒÂ¡ resolve a dor do usuÃƒÂ¡rio.

        setEditJsonModal({ isOpen: false, data: '', id: null });
      } else {
        const errData = await res.json();
        toast.error(errData.detail || "Erro ao salvar JSON");
      }
    } catch (error) {
      console.error("Save JSON Error:", error);
      toast.error(error.message || "Erro ao salvar JSON. Verifique se a sintaxe está correta.");
    } finally {
      setIsSavingJson(false);
    }
  };

  const handleResendWebhook = async (historyId) => {
    try {
      setIsResending(true);
      const res = await fetchWithAuth(`${API_URL}/webhook-integrations/history/${historyId}/resend`, { method: 'POST' }, activeClient.id);
      const data = await res.json();

      if (res.ok) {
        if (data.status === 'success') {
          toast.success(data.message || "Webhook reenviado com sucesso!");
          if (historyIntegration?.id) {
            fetchHistory(historyIntegration.id);
          }
        } else if (data.status === 'ignored') {
          toast.warning(data.message || "Evento ignorado por falta de mapeamento.");
        } else {
          toast.error(data.message || "Erro no processamento do reenvio.");
        }
      } else {
        toast.error(data.detail || "Erro ao reenviar webhook no servidor.");
      }
    } catch (err) {
      console.error("Resend Webhook Error:", err);
      toast.error("Erro na comunicação");
    } finally {
      setIsResending(false);
    }
  };

  const handleSyncHistory = async (historyId) => {
    try {
      setIsSyncing(prev => ({ ...prev, [historyId]: true }));
      const response = await fetchWithAuth(`${API_URL}/webhook-integrations/history/${historyId}/sync`, {
        method: 'POST'
      }, activeClient.id);

      if (response.ok) {
        toast.success("Dados re-sincronizados com sucesso!");
        fetchHistory(historyIntegration.id);
      }
    } catch (error) {
      console.error("Erro ao sincronizar histórico:", error);
      toast.error("Erro ao sincronizar dados");
    } finally {
      setIsSyncing(prev => ({ ...prev, [historyId]: false }));
    }
  };

  const handleSyncAllHistory = async (integrationId) => {
    try {
      setIsSyncingAll(true);
      const response = await fetchWithAuth(`${API_URL}/webhook-integrations/${integrationId}/sync-all`, {
        method: 'POST'
      }, activeClient.id);

      if (response.ok) {
        const data = await response.json();
        toast.success(`${data.synced_count} registros sincronizados com as novas regras!`);
        fetchHistory(integrationId, webhookHistoryStatusFilter, webhookHistorySearch);
      }
    } catch (error) {
      console.error("Erro ao sincronizar tudo:", error);
      toast.error("Erro na comunicação para sincronização em massa");
    } finally {
      setIsSyncingAll(false);
    }
  };

  const fetchHistory = async (id, status = '', search = '') => {
    try {
      let url = `${API_URL}/webhook-integrations/${id}/history?limit=100`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      // Status filter is handled locally for performance if list is small, 
      // but let's just use the list we get.
      const res = await fetchWithAuth(url, {}, activeClient.id);
      if (res.ok) {
        setWebhookHistory(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openHistoryModal = async (integration) => {
    setHistoryIntegration(integration);
    setIsHistoryModalOpen(true);
    setLoadingHistory(true);
    setWebhookHistory([]);
    setSelectedHistoryIds([]);
    setWebhookHistorySearch('');
    try {
      await fetchHistory(integration.id, '', '');
    } catch (err) {
      toast.error("Erro ao carregar histórico");
    } finally {
      setLoadingHistory(false);
    }
  };

  const deleteSingleHistory = async (id) => {
    try {
      const res = await fetchWithAuth(`${API_URL}/webhook-integrations/history/${id}`, { method: 'DELETE' }, activeClient.id);
      if (res.ok) {
        toast.success("Registro excluído");
        fetchHistory(historyIntegration.id);
        setSelectedHistoryIds(prev => prev.filter(item => item !== id));
      }
    } catch (err) {
      toast.error("Erro ao excluir");
    }
  };

  const deleteBulkHistory = async (ids) => {
    try {
      const res = await fetchWithAuth(`${API_URL}/webhook-integrations/history/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ids)
      }, activeClient.id);
      if (res.ok) {
        toast.success(`${ids.length} registros excluídos`);
        fetchHistory(historyIntegration.id);
        setSelectedHistoryIds([]);
      }
    } catch (err) {
      toast.error("Erro ao excluir em massa");
    }
  };

  const clearAllHistory = async (integrationId) => {
    try {
      const res = await fetchWithAuth(`${API_URL}/webhook-integrations/${integrationId}/history/clear`, { method: 'DELETE' }, activeClient.id);
      if (res.ok) {
        toast.success("Histórico limpo com sucesso");
        setWebhookHistory([]);
        setSelectedHistoryIds([]);
      }
    } catch (err) {
      toast.error("Erro ao limpar histórico");
    }
  };

  const handleExportHistory = async () => {
    try {
      const res = await fetchWithAuth(`${API_URL}/webhook-integrations/${historyIntegration.id}/history/export`, {}, activeClient.id);
      if (!res.ok) { toast.error("Erro ao exportar histórico"); return; }
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `historico_${historyIntegration.name.replace(/\s+/g, '_')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${data.records?.length || 0} registros exportados`);
    } catch (err) {
      toast.error("Erro ao exportar histórico");
    }
  };

  const handleImportHistory = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const res = await fetchWithAuth(
        `${API_URL}/webhook-integrations/${historyIntegration.id}/history/import`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) },
        activeClient.id
      );
      if (!res.ok) { toast.error("Erro ao importar histórico"); return; }
      const result = await res.json();
      toast.success(`${result.imported} registros importados com sucesso!`);
      fetchHistory(historyIntegration.id);
    } catch (err) {
      toast.error("Arquivo invÃƒÂ¡lido ou erro ao importar");
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedHistoryIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedHistoryIds(webhookHistory.map(item => item.id));
    } else {
      setSelectedHistoryIds([]);
    }
  };

  const fetchDispatches = async (id, page = 1, limit = 20, search = '', eventFilter = '', startDate = '', endDate = '', typeFilter = '', isSilent = false) => {
    try {
      if (!isSilent) setLoadingDispatchHistory(true);
      const skip = (page - 1) * limit;
      let url = `${API_URL}/webhook-integrations/${id}/dispatches?skip=${skip}&limit=${limit}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (eventFilter) url += `&event_type=${encodeURIComponent(eventFilter)}`;
      if (startDate) url += `&start_date=${encodeURIComponent(startDate)}`;
      if (endDate) url += `&end_date=${encodeURIComponent(endDate)}`;
      if (typeFilter) url += `&type_filter=${encodeURIComponent(typeFilter)}`;
      const res = await fetchWithAuth(url, {}, activeClient.id);
      if (res.ok) {
        const data = await res.json();
        setDispatchHistory(data.items || []);
        setDispatchTotal(data.total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!isSilent) setLoadingDispatchHistory(false);
    }
  };

  const fetchDispatchContacts = async () => {
    if (!contactsModal.triggerId) return;
    setLoadingContacts(true);
    try {
      let url = `${API_URL}/triggers/${contactsModal.triggerId}/messages`;
      const params = new URLSearchParams();

      if (contactsFilter !== 'all') {
        if (['free', 'template'].includes(contactsFilter)) {
          params.append('message_type', contactsFilter);
        } else {
          params.append('status_filter', contactsFilter);
        }
      }

      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }

      const res = await fetchWithAuth(url, {}, activeClient?.id);
      if (res.ok) {
        const data = await res.json();
        setContactsModal(prev => ({
          ...prev,
          contacts: data.items || [],
          counts: data.counts || {}
        }));
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar lista de contatos");
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleViewContacts = (triggerId, initialFilter = 'all', contactName = '') => {
    setContactsFilter(initialFilter);
    setContactsModal({
      isOpen: true,
      triggerId,
      contacts: [],
      counts: {},
      title: contactName
    });
  };

  const openDispatchHistoryModal = (integration) => {
    setDispatchIntegration(integration);
    setIsDispatchHistoryModalOpen(true);
    setDispatchHistory([]);
    setDispatchSearch('');
    setDispatchEventFilter('');
    setDispatchTypeFilter('');
    setDispatchStartDate('');
    setDispatchEndDate('');
    setSelectedDispatchIds([]);
    setDispatchPage(1);
  };

  const handleBulkDispatchPlay = async () => {
    if (selectedDispatchIds.length === 0) return;
    setIsBulkPlayingDispatches(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/webhook-integrations/dispatches/bulk-play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedDispatchIds)
      }, activeClient.id);
      if (res.ok) {
        toast.success(`${selectedDispatchIds.length} disparos enviados para processamento!`);
        fetchDispatches(dispatchIntegration.id);
        setSelectedDispatchIds([]);
      }
    } catch (err) {
      toast.error("Erro ao reprocessar em massa");
    } finally {
      setIsBulkPlayingDispatches(false);
    }
  };

  const handleBulkDispatchDelete = async (ids) => {
    const listToDelete = ids || selectedDispatchIds;
    if (listToDelete.length === 0) return;
    setIsBulkDeletingDispatches(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/webhook-integrations/dispatches/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(listToDelete)
      }, activeClient.id);
      if (res.ok) {
        toast.success(`${listToDelete.length} registros excluídos`);
        fetchDispatches(dispatchIntegration.id);
        setSelectedDispatchIds([]);
        setConfirmDeleteDispatch(prev => ({ ...prev, isOpen: false }));
      }
    } catch (err) {
      toast.error("Erro ao excluir em massa");
    } finally {
      setIsBulkDeletingDispatches(false);
    }
  };

  const handleBackfillCosts = async () => {
    if (!dispatchIntegration?.id) return;
    setIsBackfillingCosts(true);
    try {
      const res = await fetchWithAuth(
        `${API_URL}/webhook-integrations/${dispatchIntegration.id}/backfill-costs`,
        { method: 'POST' },
        activeClient.id
      );
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || `Custos calculados para ${data.updated ?? 0} disparos!`);
        fetchDispatches(dispatchIntegration.id, dispatchPage, dispatchLimit, dispatchSearch, dispatchEventFilter, dispatchStartDate, dispatchEndDate, dispatchTypeFilter);
      } else {
        toast.error(data.detail || 'Erro ao calcular custos históricos');
      }
    } catch (err) {
      toast.error('Erro ao calcular custos históricos');
    } finally {
      setIsBackfillingCosts(false);
    }
  };

  const handleToggleSelectDispatch = (id) => {
    setSelectedDispatchIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllDispatches = (e, items) => {
    if (e.target.checked) {
      setSelectedDispatchIds(items.map(item => item.id));
    } else {
      setSelectedDispatchIds([]);
    }
  };

  const handlePlayDispatch = async (id) => {
    setIsPlaying(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetchWithAuth(`${API_URL}/webhook-integrations/dispatches/${id}/play`, { method: 'POST' }, activeClient.id);
      const data = await res.json();
      if (res.ok) {
        if (data.status === 'success') {
          toast.success(data.message || "Disparo enviado para a fila!");
        } else if (data.status === 'ignored') {
          toast.warning(data.message || "Disparo ignorado pelo servidor.");
        } else {
          toast.success(data.message || "Comando enviado com sucesso.");
        }
        fetchDispatches(dispatchIntegration.id);
      } else {
        toast.error(data.detail || "Erro ao disparar agora");
      }
    } catch (err) {
      toast.error("Erro na comunicação");
    } finally {
      setIsPlaying(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleCancelDispatch = async (id) => {
    setIsCancelling(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetchWithAuth(`${API_URL}/webhook-integrations/dispatches/${id}`, { method: 'DELETE' }, activeClient.id);
      if (res.ok) {
        toast.success("Disparo removido!");
        fetchDispatches(dispatchIntegration.id);
        setConfirmDeleteDispatch(prev => ({ ...prev, isOpen: false }));
      } else {
        const err = await res.json();
        toast.error(err.detail || "Erro ao remover");
      }
    } catch (err) {
      toast.error("Erro na comunicação");
    } finally {
      setIsCancelling(prev => ({ ...prev, [id]: false }));
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      'pending': { color: 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/20', label: 'Pendente' },
      'queued': { color: 'bg-blue-500/20 text-blue-400 border border-blue-500/20', label: 'Na Fila' },
      'processing': { color: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20', label: 'Enviando...' },
      'completed': { color: 'bg-green-500/20 text-green-400 border border-green-500/20', label: 'Concluído' },
      'cancelled': { color: 'bg-gray-500/20 text-gray-400 border border-gray-500/20', label: 'Cancelado' },
      'failed': { color: 'bg-red-500/20 text-red-400 border border-red-500/20', label: 'Falhou' }
    };
    const s = map[status] || map['pending'];
    return <span className={`px-2.5 py-0.5 rounded-lg text-[10px] uppercase font-black tracking-wider ${s.color}`}>{s.label}</span>;
  };


  const EVENT_TYPES = [
    { value: 'pix_gerado', label: 'Pix Gerado / Boleto' },
    { value: 'pix_expirado', label: 'Pix Expirado' },
    { value: 'compra_aprovada', label: 'Compra Aprovada' },
    { value: 'carrinho_abandonado', label: 'Carrinho Abandonado' },
    { value: 'cartao_recusado', label: 'Cartão Recusado' },
    { value: 'form_submission', label: 'Formulário / Elementor' },
    { value: 'outros', label: 'Qualquer / Outro' }
  ];

  const toggleMapping = (ui_id) => {
    setExpandedMappings(prev => {
      const next = new Set(prev);
      if (next.has(ui_id)) next.delete(ui_id);
      else next.add(ui_id);
      return next;
    });
  };

  const addMapping = () => {
    const ui_id = Math.random().toString(36).substr(2, 9);
    setFormData({
      ...formData,
      mappings: [...formData.mappings, {
        ui_id,
        event_type: 'compra_aprovada',
        template_id: '',
        template_name: null,
        delay_minutes: 0,
        delay_seconds: 0,
        variables_mapping: {},
        private_note: '',
        cancel_events: [],
        chatwoot_label: [],
        internal_tags: '',
        publish_external_event: false,
        send_as_free_message: false,
        trigger_once: false,
        cost_per_message: 0,
        funnel_id: null,
        is_active: true, // Garante que novos mappings comecem ativos
        product_name: null, // Default to ALL products
        template_language: 'pt_BR',
        template_components: []
      }]
    });
    setExpandedMappings(prev => new Set([...prev, ui_id]));
  };

  const updateMapping = (index, field, value) => {
    setFormData(prev => {
      const newMappings = [...prev.mappings];
      newMappings[index] = { ...newMappings[index], [field]: value };
      return { ...prev, mappings: newMappings };
    });
  };

  const removeMapping = (index) => {
    setFormData(prev => {
      const newMappings = [...prev.mappings];
      newMappings.splice(index, 1);
      return { ...prev, mappings: newMappings };
    });
  };

  const updateVariableMapping = (mappingIndex, variableKey, value) => {
    setFormData(prev => {
      const newMappings = [...prev.mappings];
      const vars = { ...newMappings[mappingIndex].variables_mapping };
      vars[variableKey] = value;
      newMappings[mappingIndex].variables_mapping = vars;
      return { ...prev, mappings: newMappings };
    });
  };

  const addCustomField = () => {
    const customFields = formData.custom_fields_mapping || {};
    const newKey = `Campo_${Object.keys(customFields).length + 1}`;
    setFormData({
      ...formData,
      custom_fields_mapping: { ...customFields, [newKey]: "" }
    });
  };

  const updateCustomFieldKey = (oldKey, newKey) => {
    if (oldKey === newKey) return;
    const { [oldKey]: value, ...rest } = formData.custom_fields_mapping || {};
    const finalKey = rest.hasOwnProperty(newKey) ? `${newKey}_1` : newKey;
    setFormData({
      ...formData,
      custom_fields_mapping: { ...rest, [finalKey]: value }
    });
  };

  const updateCustomFieldValue = (key, value) => {
    setFormData({
      ...formData,
      custom_fields_mapping: {
        ...(formData.custom_fields_mapping || {}),
        [key]: value
      }
    });
  };

  const removeCustomField = (key) => {
    const { [key]: removed, ...rest } = formData.custom_fields_mapping || {};
    setFormData({ ...formData, custom_fields_mapping: rest });
  };

  const findPathInObject = (obj, targetKey, currentPath = "") => {
    if (!obj || typeof obj !== "object") return null;
    const target = targetKey.trim().toLowerCase();

    // 1. Prioridade: Busca exata ou padrões conhecidos (Elementor)
    const keys = Object.keys(obj);
    for (const key of keys) {
      const k = key.toLowerCase();
      const newPath = currentPath ? `${currentPath}.${key}` : key;

      if (k === target || k.includes(`[${target}]`) || k.includes(`fields[${target}]`)) {
        return newPath;
      }
    }

    // 2. Segunda Passagem: Busca parcial (substring)
    for (const key of keys) {
      if (key.toLowerCase().includes(target)) {
        return currentPath ? `${currentPath}.${key}` : key;
      }
    }

    // 3. Busca recursiva
    for (const key of keys) {
      const val = obj[key];
      if (val && typeof val === "object") {
        const newPath = currentPath ? `${currentPath}.${key}` : key;
        const found = findPathInObject(val, targetKey, newPath);
        if (found) return found;
      }
    }
    return null;
  };

  const handleSmartSync = (key) => {
    // Tenta pegar o payload do modal de teste primeiro, se não do último histórico
    let sourcePayload = null;
    try {
      sourcePayload = JSON.parse(testPayload);
    } catch (e) {
      if (webhookHistory.length > 0) {
        sourcePayload = webhookHistory[0].payload;
      }
    }

    if (!sourcePayload) {
      toast.error("Nenhum payload de exemplo encontrado para sincronizar.");
      return;
    }

    const path = findPathInObject(sourcePayload, key);
    if (path) {
      updateCustomFieldValue(key, path);
      toast.success(`Caminho encontrado: ${path}`);
    } else {
      toast.error(`Não foi possível encontrar o campo "${key}" no JSON.`);
    }
  };

  const renderVariablesConfig = (mapping, mIndex) => {
    if (!mapping.template_id) return null;
    const template = templates.find(t => String(t.id) === String(mapping.template_id));
    if (!template) return null;

    // 1. Detect Header Media
    const headerComp = (template.components || []).find(c => c.type === 'HEADER');
    const needsHeaderMedia = headerComp && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerComp.format);

    // 2. Detect variables like {{1}} in body
    const varsCount = (template.body_text?.match(/\{\{\d+\}\}/g) || []).length;

    if (!needsHeaderMedia && varsCount === 0) return null;

    return (
      <div className="mt-3 p-3 bg-gray-50/80 dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 shadow-inner">
        <p className="text-[10px] font-black uppercase tracking-wider mb-3 text-gray-500 dark:text-gray-400 px-1">Configuração de Variáveis</p>
        <div className="space-y-3">
          {/* Header Media Mapping */}
          {needsHeaderMedia && (
            <div className="space-y-2 pb-3 border-b border-gray-100 dark:border-gray-700/50">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 w-full md:w-[140px] shrink-0">
                  <span className="bg-indigo-100 dark:bg-indigo-900/40 px-2 py-0.5 rounded text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-tighter">
                    {headerComp.format}
                  </span>
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Mídia</span>
                </div>
                <div className="flex-1 flex items-center gap-2 min-w-[200px]">
                  <span className="text-gray-400 dark:text-gray-500 shrink-0">=</span>
                  <select
                    className="w-full p-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
                    value={['checkout_url', 'pix_qrcode', 'product_image', ''].includes(mapping.variables_mapping?.header_url) ? mapping.variables_mapping?.header_url : 'custom'}
                    onChange={(e) => {
                      const val = e.target.value === 'custom' ? '' : e.target.value;
                      updateVariableMapping(mIndex, 'header_url', val);
                    }}
                  >
                    <option value="">-- Selecione a Fonte --</option>
                    <option value="checkout_url">URL do Checkout (Dinâmico)</option>
                    <option value="pix_qrcode">QR Code Pix (Dinâmico)</option>
                    <option value="product_image">Imagem do Produto (Dinâmico)</option>
                    <option value="custom">URL Estática / Outro Campo</option>
                  </select>
                </div>
              </div>

              {/* Custom Input for Header URL */}
              {(!['checkout_url', 'pix_qrcode', 'product_image', ''].includes(mapping.variables_mapping?.header_url) ||
                (mapping.variables_mapping?.header_url && !['checkout_url', 'pix_qrcode', 'product_image'].includes(mapping.variables_mapping?.header_url))) && (
                  <div className="flex items-center gap-2 md:pl-[152px]">
                    <input
                      type="text"
                      placeholder="Ex: path.to.image ou https://..."
                      className="w-full p-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-lg text-[11px] outline-none italic focus:ring-2 focus:ring-indigo-500/20"
                      value={mapping.variables_mapping?.header_url || ''}
                      onChange={(e) => updateVariableMapping(mIndex, 'header_url', e.target.value)}
                    />
                  </div>
                )}
            </div>
          )}

          {/* Body Variables */}
          {Array.from({ length: varsCount }).map((_, i) => {
            const varKey = `${i + 1}`;
            const isCustom = !['name', 'phone', 'email', 'product_name', 'payment_method', 'checkout_url', 'pix_qrcode', 'buyer.name', 'Customer.full_name', ''].includes(mapping.variables_mapping[varKey]);

            return (
              <div key={varKey} className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="w-full md:w-[140px] shrink-0 flex items-center">
                    <span className="bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded text-[10px] font-mono text-gray-700 dark:text-gray-200 font-bold">{`{{${varKey}}}`}</span>
                  </div>
                  <div className="flex-1 flex items-center gap-2 min-w-[200px]">
                    <span className="text-gray-400 dark:text-gray-500 shrink-0">=</span>
                    <select
                      className="w-full p-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                      value={isCustom ? 'custom' : (mapping.variables_mapping[varKey] || '')}
                      onChange={(e) => {
                        const val = e.target.value === 'custom' ? '' : e.target.value;
                        updateVariableMapping(mIndex, varKey, val);
                      }}
                    >
                      <option value="">-- Selecione o dado --</option>
                      <option value="name">Nome do Contato</option>
                      <option value="phone">Telefone</option>
                      <option value="email">E-mail</option>
                      <option value="product_name">Nome do Produto</option>
                      <option value="payment_method">Método de Pag.</option>
                      <option value="checkout_url">URL do Checkout</option>
                      <option value="pix_qrcode">QR Code Pix</option>
                      <option value="custom">Campo Personalizado / Fixo</option>
                      <option value="buyer.name">[Hotmart] Nome</option>
                      <option value="Customer.full_name">[Kiwify] Nome</option>
                    </select>
                  </div>
                </div>
                {isCustom && (
                  <div className="flex items-center gap-2 md:pl-[152px]">
                    <input
                      type="text"
                      placeholder="Ex: buyer.address.city ou Valor Fixo"
                      className="w-full p-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-lg text-[11px] outline-none italic focus:ring-2 focus:ring-blue-500/20"
                      value={mapping.variables_mapping[varKey] || ''}
                      onChange={(e) => updateVariableMapping(mIndex, varKey, e.target.value)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="space-y-6 animate-fade-in relative z-10 w-full overflow-hidden">

      <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
            <FiZap className="text-yellow-500" /> Webhook Integrations
          </h2>
          <p className="text-sm text-gray-500 mt-1">Conecte a Hotmart, Kiwify, Eduzz para Automações de Eventos.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsGuideModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white border border-indigo-500/20 rounded-xl font-bold transition-all active:scale-95 group"
          >
            <FiShare2 className="text-sm group-hover:rotate-12 transition-transform" /> Guia
          </button>
          <button
            onClick={openNewModal}
            className="relative flex items-center gap-2.5 px-5 py-2.5 font-bold text-sm text-white rounded-xl overflow-hidden shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-95 transition-all duration-200 group"
            style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%)' }}
          >
            {/* Brilho no hover */}
            <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
            <FiZap className="text-yellow-300 drop-shadow-sm shrink-0 group-hover:rotate-12 transition-transform duration-300" size={15} />
            Nova Integração
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando...</div>
        ) : integrations.length === 0 ? (
          <div className="p-12 text-center">
            <FiZap size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Nenhuma integração criada ainda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">Nome</th>
                  <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">Plataforma</th>
                  <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">Webhook URL</th>
                  <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">Mapeamentos</th>
                  <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {integrations.map(int => (
                  <tr key={int.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4 font-medium">{int.name}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs capitalize">
                        {int.platform}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <input
                          readOnly
                          value={`${window.location.origin}/api/webhooks/external/${int.custom_slug || int.id}`}
                          className="text-xs bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded w-48 font-mono text-gray-500"
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/external/${int.custom_slug || int.id}`);
                            toast.success("Copiado!");
                          }}
                          className="text-gray-500 hover:text-blue-500"
                        >
                          <FiCopy />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {(int.mappings || []).length} eventos
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end items-center gap-2">
                      <button
                        onClick={() => openDispatchHistoryModal(int)}
                        className="text-indigo-500 hover:text-indigo-600 flex items-center gap-1.5 text-xs font-bold bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-xl transition-all"
                      >
                        <FiPlay className="text-[10px]" /> Disparos
                      </button>
                      <button
                        onClick={() => openHistoryModal(int)}
                        className="text-blue-500 hover:text-blue-600 flex items-center gap-1.5 text-xs font-bold bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-xl transition-all"
                      >
                        <FiSettings className="text-[10px]" /> Histórico
                      </button>
                      <button
                        onClick={() => openTestModal(int)}
                        className="text-green-500 hover:text-green-600 flex items-center gap-1.5 text-xs font-bold bg-green-50 dark:bg-green-900/30 px-3 py-1.5 rounded-xl transition-all"
                      >
                        <FiPlay className="text-[10px]" /> Testar
                      </button>
                      <button onClick={() => openEditModal(int)} className="text-gray-400 hover:text-blue-500">
                        <FiEdit2 size={16} />
                      </button>
                      <button onClick={() => confirmDelete(int)} className="text-gray-400 hover:text-red-500">
                        <FiTrash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl"></div>
          <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] w-full max-w-6xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 dark:border-gray-800/50 relative z-10">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center sticky top-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur pb-4 z-10 text-gray-900 dark:text-white">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <FiSettings /> {editingIntegration ? 'Editar Integração' : 'Nova Integração'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <FiX />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 px-1">Nome da Integração *</label>
                  <div className="relative group/name">
                    <input
                      type="text"
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all group-hover/name:border-gray-300 dark:group-hover/name:border-gray-600 shadow-sm"
                      placeholder="Ex: Checkout Produto Principal"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-black text-gray-400 dark:text-gray-300 uppercase tracking-widest mb-2 px-1">Plataforma</label>
                  <div className="relative group/platform">
                    <select
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all group-hover/platform:border-gray-300 dark:group-hover/platform:border-gray-600 shadow-sm appearance-none cursor-pointer"
                      value={formData.platform}
                      onChange={e => setFormData({ ...formData, platform: e.target.value })}
                    >
                      <option value="hotmart">Hotmart</option>
                      <option value="eduzz">Eduzz</option>
                      <option value="kiwify">Kiwify</option>
                      <option value="monetizze">Monetizze</option>
                      <option value="braip">Braip</option>
                      <option value="kirvano">Kirvano</option>
                      <option value="wordpress">WordPress</option>
                      <option value="elementor">Elementor (Forms)</option>
                      <option value="site">Site (Genérico)</option>
                      <option value="outros">Outros (Webhook Custom)</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                      <FiChevronDown />
                    </div>
                  </div>
                </div>
              </div>

              {/* Slug Personalizado */}
              <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-2xl p-5 shadow-inner">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1">
                    ðŸ”— Slug Personalizado
                  </label>
                  <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    Opcional
                  </span>
                </div>

                <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-3 px-1 leading-relaxed">
                  Crie uma URL amigável (Slug) para configurar na sua plataforma (Ex: Hotmart).
                  Se deixar vazio, usaremos o ID automático.
                </p>

                <div className="flex items-stretch bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:border-blue-500 transition-all shadow-sm">
                  <div className="px-3 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex items-center shrink-0">
                    <span className="text-[10px] text-gray-400 font-mono tracking-tighter">.../webhooks/external/</span>
                  </div>
                  <input
                    type="text"
                    className="flex-1 bg-transparent text-sm font-mono font-bold text-blue-600 dark:text-blue-400 outline-none px-3 py-2.5 placeholder:text-gray-300 dark:placeholder:text-gray-700 placeholder:font-normal"
                    placeholder="ex: minha-loja-zap"
                    value={formData.custom_slug || ''}
                    onChange={e => {
                      const clean = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                      setFormData({ ...formData, custom_slug: clean });
                    }}
                  />
                </div>

                {formData.custom_slug && (
                  <div className="mt-3 p-2 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100/50 dark:border-blue-900/20 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[10px] text-blue-500 dark:text-blue-400 font-medium truncate">
                      Nova URL: {window.location.origin}/api/webhooks/external/{formData.custom_slug}
                    </span>
                  </div>
                )}
              </div>

              {/* NEW: Product Filtering Section */}
              <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-2xl p-5 shadow-inner">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex flex-col">
                    <label className="block text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1">
                      ðŸ›¡ï¸ Filtragem por Produto / Curso
                    </label>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 px-1 mt-1">
                      Escolha quais cursos desta conta podem disparar eventos.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={formData.product_filtering === true}
                      onChange={(e) => setFormData({ ...formData, product_filtering: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {formData.product_filtering && (
                  <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase">
                          Cursos Descobertos ({formData.discovered_products?.length || 0})
                        </label>
                        <div className="flex items-center gap-2">
                          {(formData.discovered_products || []).length > 0 && (
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, discovered_products: [], product_whitelist: [] })}
                              className="flex items-center gap-1.5 text-[10px] font-black uppercase bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white px-2 py-1 rounded-lg border border-red-500/20 transition-all active:scale-95"
                            >
                              <FiTrash2 size={10} /> Limpar Todos
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={handleDiscoverProducts}
                            disabled={isDiscoveringProducts}
                            className="flex items-center gap-1.5 text-[10px] font-black uppercase bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white px-2 py-1 rounded-lg border border-blue-500/20 transition-all active:scale-95 disabled:opacity-50"
                          >
                            <FiRefreshCw className={isDiscoveringProducts ? 'animate-spin' : ''} size={10} />
                            {isDiscoveringProducts ? 'Atualizando...' : 'Atualizar / Buscar no Histórico'}
                          </button>
                        </div>
                      </div>
                      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                        {(formData.discovered_products || []).length === 0 ? (
                          <p className="p-4 text-xs text-gray-500 italic text-center">Nenhum produto detectado nos webhooks recebidos ainda.</p>
                        ) : (
                          <div className="max-h-48 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800">
                            {formData.discovered_products.map((prod) => {
                              const isWhitelisted = (formData.product_whitelist || []).includes(prod);
                              return (
                                <div
                                  key={prod}
                                  className={`flex items-center justify-between p-3 transition-colors ${isWhitelisted ? 'bg-blue-50/30 dark:bg-blue-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                  onClick={() => {
                                    const next = isWhitelisted
                                      ? formData.product_whitelist.filter(p => p !== prod)
                                      : [...(formData.product_whitelist || []), prod];
                                    setFormData({ ...formData, product_whitelist: next });
                                  }}
                                >
                                  <div className="flex items-center gap-3 cursor-pointer">
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isWhitelisted ? 'bg-blue-500 border-blue-500 text-white shadow-sm' : 'border-gray-300 dark:border-gray-600'}`}>
                                      {isWhitelisted && <FiCheck size={10} />}
                                    </div>
                                    <span className={`text-xs font-medium ${isWhitelisted ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>{prod}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {isWhitelisted ? (
                                      <span className="text-[9px] font-black uppercase text-blue-500 tracking-tighter bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">Ativo</span>
                                    ) : (
                                      <span className="text-[9px] font-black uppercase text-gray-400 tracking-tighter px-1.5 py-0.5 rounded border border-gray-100 dark:border-gray-800">Bloqueado</span>
                                    )}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setFormData({
                                          ...formData,
                                          discovered_products: formData.discovered_products.filter(p => p !== prod),
                                          product_whitelist: (formData.product_whitelist || []).filter(p => p !== prod),
                                        });
                                      }}
                                      className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors p-0.5 rounded"
                                      title="Remover produto"
                                    >
                                      <FiTrash2 size={11} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                    {formData.product_whitelist?.length === 0 && (
                      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30 rounded-xl flex items-start gap-3">
                        <FiXCircle className="text-amber-500 mt-0.5" size={16} />
                        <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed font-medium">
                          Atenção: A filtragem está ativa mas nenhum produto foi selecionado. **Nenhum evento será disparado.**
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <h4 className="font-semibold text-lg flex items-center gap-2 text-gray-800 dark:text-white"><FiZap className="text-yellow-500" /> Mapeamento de Eventos</h4>
                    <button
                      onClick={() => setIsMappingGuideOpen(true)}
                      className="text-[10px] font-bold bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white px-3 py-1 rounded-full border border-indigo-500/20 transition-all flex items-center gap-1.5 active:scale-95 group"
                    >
                      <FiShare2 size={10} className="group-hover:rotate-12 transition-transform" /> Guia Rápido
                    </button>
                  </div>
                  <button onClick={addMapping} type="button" className="text-sm bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-3 py-1.5 rounded-lg flex items-center gap-1 font-medium hover:bg-blue-100 transition">
                    <FiPlus /> Adicionar Evento
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.mappings.length === 0 ? (
                    <p className="text-sm text-gray-500 italic px-2">
                      Nenhum evento mapeado. Adicione um para disparar mensagens.
                    </p>
                  ) : (
                    formData.mappings.map((m, i) => {
                      const isExpanded = expandedMappings.has(m.ui_id);
                      return (
                        <div
                          key={m.ui_id || i}
                          className={`border border-gray-200 dark:border-gray-700 rounded-2xl overflow-visible transition-all duration-300 shadow-sm hover:shadow-md ${isExpanded ? 'bg-white dark:bg-gray-800/80 ring-1 ring-blue-500/10' : 'bg-gray-50/50 dark:bg-gray-800/30'
                            }`}
                        >
                          {/* Header Accordion - Closes/Opens on click */}
                          <div
                            data-testid={`mapping-header-${m.ui_id}`}
                            className={`p-4 flex items-center justify-between group/header cursor-pointer select-none transition-colors ${isExpanded ? 'border-b border-gray-100 dark:border-gray-700/50' : ''
                              } hover:bg-blue-50/30 dark:hover:bg-blue-900/10`}
                            onClick={() => toggleMapping(m.ui_id)}
                          >
                            <div className="flex items-center gap-4">
                              <div
                                className={`p-2 rounded-xl transition-all duration-500 ${isExpanded ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 rotate-0' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 rotate-[-15deg]'
                                  }`}
                              >
                                <FiZap size={16} className={isExpanded ? 'animate-pulse' : ''} />
                              </div>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`text-sm font-black uppercase tracking-tight transition-colors ${isExpanded ? 'text-gray-900 dark:text-white' : 'text-gray-500'
                                      }`}
                                  >
                                    {EVENT_TYPES.find((et) => et.value === m.event_type)?.label || 'Novo Evento'}
                                  </span>
                                  <div
                                    className="flex items-center cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const currentValue = m.is_active === false ? false : true;
                                      updateMapping(i, 'is_active', !currentValue);
                                    }}
                                  >
                                    <div className={`w-8 h-4 rounded-full transition-colors relative ${m.is_active === false ? 'bg-gray-300 dark:bg-gray-600' : 'bg-green-500'}`}>
                                      <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${m.is_active === false ? 'left-[2px]' : 'left-[18px]'} shadow-sm`}></div>
                                    </div>
                                    <span className={`ml-2 text-[10px] font-black uppercase tracking-tighter ${m.is_active === false ? 'text-gray-400' : 'text-green-500'}`}>
                                      {m.is_active === false ? 'Inativo' : 'Ativo'}
                                    </span>
                                  </div>
                                  <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                    <FiChevronDown className="text-gray-400" size={16} />
                                  </div>
                                </div>
                                {!isExpanded && (
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gray-200/50 dark:bg-gray-700/50 border border-gray-100/10">
                                      <FiShare2 size={10} /> {m.delay_minutes}m {m.delay_seconds}s
                                    </span>
                                    {m.product_name && (
                                      <span className="text-[10px] font-bold text-amber-500/80 truncate max-w-[150px] px-2 py-0.5 rounded-lg bg-amber-500/5 border border-amber-500/10 flex items-center gap-1">
                                        <FiMaximize2 size={8} /> {m.product_name}
                                      </span>
                                    )}
                                    {m.template_id && (
                                      <span className="text-[10px] font-bold text-blue-500/70 truncate max-w-[200px] px-2 py-0.5 rounded-lg bg-blue-500/5 border border-blue-500/10">
                                        â€¢ {templates.find((t) => String(t.id) === String(m.template_id))?.name || 'Template'}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeMapping(i);
                                }}
                                className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover/header:opacity-100 active:scale-90"
                                title="Remover Gatilho"
                              >
                                <FiTrash2 size={16} />
                              </button>
                            </div>
                          </div>

                          {/* Details Content */}
                          {isExpanded && (
                            <div className="p-5 animate-in fade-in slide-in-from-top-2 duration-300 space-y-6">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                  <label
                                    data-testid="trigger-label"
                                    className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest mb-2 text-gray-500 dark:text-gray-400 cursor-pointer hover:text-blue-500 transition-colors group/label"
                                    onClick={() => toggleMapping(m.ui_id)}
                                    title="Clique para recolher"
                                  >
                                    <FiMaximize2 size={10} className="rotate-45 group-hover/label:scale-125 transition-transform" />
                                    Gatilho (Evento)
                                  </label>
                                  <select
                                    className="w-full py-2.5 px-4 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm mb-3"
                                    value={m.event_type}
                                    onChange={(e) => updateMapping(i, 'event_type', e.target.value)}
                                  >
                                    {EVENT_TYPES.map(et => (
                                      <option key={et.value} value={et.value}>{et.label}</option>
                                    ))}
                                  </select>

                                  <label className="block text-xs font-black uppercase tracking-widest mb-2 text-gray-400 dark:text-gray-500 px-1">
                                    ðŸ›’ Produto Específico?
                                  </label>
                                  <select
                                    className="w-full py-2.5 px-4 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                    value={m.product_name || ""}
                                    onChange={(e) => updateMapping(i, 'product_name', e.target.value || null)}
                                  >
                                    <option value="">Qualquer Produto (Padrão)</option>
                                    {templates.filter(t => t.product_name).map(t => t.product_name).filter((v, i, a) => a.indexOf(v) === i).map(prod => (
                                      <option key={prod} value={prod}>{prod}</option>
                                    ))}
                                  </select>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                  <div>
                                    <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-300 text-[10px] uppercase">Minutos</label>
                                    <input
                                      type="number"
                                      min="0"
                                      className="w-full py-1.5 px-2 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 text-center"
                                      value={m.delay_minutes || 0}
                                      onChange={(e) => updateMapping(i, "delay_minutes", parseInt(e.target.value) || 0)}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-300 text-[10px] uppercase">Segundos</label>
                                    <input
                                      type="number"
                                      min="0"
                                      max="59"
                                      className="w-full py-1.5 px-2 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 text-center"
                                      value={m.delay_seconds || 0}
                                      onChange={(e) => updateMapping(i, "delay_seconds", parseInt(e.target.value) || 0)}
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-300">Template Meta (Action)</label>
                                  <SearchableSelect
                                    options={[
                                      { value: null, label: "Nenhum (Ação Interna)" },
                                      ...templates.filter((t) => t.status === "APPROVED").map((t) => ({ value: t.id, label: t.name })),
                                    ]}
                                    value={m.template_id || ""}
                                    onChange={(val) => updateMapping(i, "template_id", val ? val : null)}
                                    placeholder="-- Selecione o Template --"
                                    icon={FiZap}
                                  />
                                </div>
                              </div>
                              {renderVariablesConfig(m, i)}

                            {/* --- GRUPO: ETIQUETAS E TAGS --- */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                              <div className="border border-gray-100 dark:border-gray-800 p-4 rounded-2xl bg-white dark:bg-gray-800/50 flex flex-col gap-3">
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-gray-800 dark:text-white flex items-center gap-1.5 uppercase tracking-wider">
                                    <FiSettings className="text-purple-500" /> Etiqueta no Chatwoot
                                  </span>
                                  <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                    Adiciona etiquetas na conversa após o disparo
                                  </span>
                                </div>
                                <SearchableSelect
                                  isMulti={true}
                                  options={chatwootLabels.map((lbl) => ({ value: lbl.title, label: lbl.title }))}
                                  value={m.chatwoot_label || []}
                                  onChange={(val) => updateMapping(i, "chatwoot_label", Array.isArray(val) ? val : [])}
                                  placeholder="-- Selecione --"
                                  icon={FiSettings}
                                  colorClass="focus-within:ring-purple-500/20"
                                />
                              </div>

                              <div className="border border-gray-100 dark:border-gray-800 p-4 rounded-2xl bg-white dark:bg-gray-800/50 flex flex-col gap-3">
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-gray-800 dark:text-white flex items-center gap-1.5 uppercase tracking-wider">
                                    <FiMessageSquare className="text-blue-500" /> Etiquetas do Contato
                                  </span>
                                  <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                    Tags no lead (separe por vírgula)
                                  </span>
                                </div>
                                <input
                                  type="text"
                                  placeholder="Ex: vip, lead_quente"
                                  className="w-full py-2.5 px-3 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20"
                                  value={m.internal_tags || ""}
                                  onChange={(e) => updateMapping(i, "internal_tags", e.target.value)}
                                />
                              </div>
                            </div>

                            {/* --- GRUPO: OPÃ‡Ã•ES BINÁRIAS (TOGGLES) --- */}
                            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
                              <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-4 px-1">Opções Adicionais</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Nota Privada */}
                                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50/50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-800">
                                  <div className="flex flex-col">
                                    <span className="text-[11px] font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                                      <FiZap className="text-blue-400" size={12} /> Nota Privada Chatwoot
                                    </span>
                                  </div>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      className="sr-only peer"
                                      checked={m.private_note === "true" || m.private_note === true}
                                      onChange={(e) => updateMapping(i, "private_note", e.target.checked ? "true" : "")}
                                    />
                                    <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                  </label>
                                </div>

                                {/* Webhook Memória IA (RabbitMQ) */}
                                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50/50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-800">
                                  <div className="flex flex-col">
                                    <span className="text-[11px] font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                                      <FiShare2 className="text-orange-400" size={12} /> Webhook Memória IA
                                    </span>
                                  </div>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      className="sr-only peer"
                                      checked={m.publish_external_event === true}
                                      onChange={(e) => updateMapping(i, "publish_external_event", e.target.checked)}
                                    />
                                    <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-gray-600 peer-checked:bg-orange-500"></div>
                                  </label>
                                </div>

                                {/* Trigger Once */}
                                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50/50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-800">
                                  <div className="flex flex-col">
                                    <span className="text-[11px] font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                                      <FiZap className="text-red-400" size={12} /> Acionar apenas 1 vez
                                    </span>
                                  </div>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      className="sr-only peer"
                                      checked={m.trigger_once === true}
                                      onChange={(e) => updateMapping(i, "trigger_once", e.target.checked)}
                                    />
                                    <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-gray-600 peer-checked:bg-red-500"></div>
                                  </label>
                                </div>

                                {/* ManyChat Wrapper (Special because of internal grid) */}
                                <div className="col-span-full border border-blue-100/30 dark:border-blue-900/20 p-3 rounded-xl bg-blue-50/20 dark:bg-blue-900/5">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
                                      <FiShare2 size={12} /> Sincronizar ManyChat
                                    </span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                      <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={m.manychat_active === true}
                                        onChange={(e) => updateMapping(i, "manychat_active", e.target.checked)}
                                      />
                                      <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                    </label>
                                  </div>
                                  
                                  {m.manychat_active && (() => {
                                    const MANYCHAT_VAR_OPTIONS = [
                                      { value: '', label: '-- Selecione o dado --' },
                                      { value: 'name', label: 'Nome do Contato' },
                                      { value: 'phone', label: 'Telefone' },
                                      { value: 'email', label: 'E-mail' },
                                      { value: 'product_name', label: 'Nome do Produto' },
                                      { value: 'payment_method', label: 'Método de Pag.' },
                                      { value: 'checkout_url', label: 'URL do Checkout' },
                                      { value: 'pix_qrcode', label: 'QR Code Pix' },
                                      { value: 'buyer.name', label: '[Hotmart] Nome' },
                                      { value: 'Customer.full_name', label: '[Kiwify] Nome' },
                                      { value: 'custom', label: 'Campo Personalizado / Fixo' },
                                    ];
                                    const KNOWN_VALS = MANYCHAT_VAR_OPTIONS.map(o => o.value).filter(v => v && v !== 'custom');
                                    const nameIsCustom = m.manychat_name && !KNOWN_VALS.includes(m.manychat_name);
                                    const phoneIsCustom = m.manychat_phone && !KNOWN_VALS.includes(m.manychat_phone);

                                    return (
                                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-blue-500/10">
                                        <div className="space-y-1">
                                          <label className="text-[9px] font-black text-gray-400 uppercase">Nome</label>
                                          <select className="w-full text-[10px] p-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md outline-none" value={nameIsCustom ? 'custom' : (m.manychat_name || '')} onChange={(e) => updateMapping(i, 'manychat_name', e.target.value === 'custom' ? '' : e.target.value)}>
                                            {MANYCHAT_VAR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                          </select>
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[9px] font-black text-gray-400 uppercase">Número</label>
                                          <select className="w-full text-[10px] p-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md outline-none" value={phoneIsCustom ? 'custom' : (m.manychat_phone || '')} onChange={(e) => updateMapping(i, 'manychat_phone', e.target.value === 'custom' ? '' : e.target.value)}>
                                            {MANYCHAT_VAR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                          </select>
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>

                                {/* Cancelar Disparos */}
                                <div className="col-span-full border border-gray-100 dark:border-gray-800/50 p-4 rounded-2xl bg-gray-50/30 dark:bg-gray-900/40 backdrop-blur-sm">
                                  <div className="flex items-center justify-between mb-3 px-1">
                                    <span className="text-[11px] font-black text-red-500 dark:text-red-400 flex items-center gap-2 uppercase tracking-widest">
                                      <FiXCircle size={14} className="text-red-500" /> Cancelar Disparos Pendentes
                                    </span>
                                    <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tighter">Automático</span>
                                  </div>
                                  
                                  <SearchableSelect
                                    isMulti={true}
                                    options={EVENT_TYPES.filter(et => et.value !== m.event_type)}
                                    value={m.cancel_events || []}
                                    onChange={(val) => updateMapping(i, 'cancel_events', val)}
                                    placeholder="Selecione os eventos para cancelar..."
                                    icon={FiXCircle}
                                    colorClass="focus-within:ring-red-500/20 border-gray-200 dark:border-gray-700"
                                  />
                                  <p className="mt-2 px-1 text-[9px] text-gray-400 dark:text-gray-500 italic">
                                    * Os eventos selecionados serão cancelados para este contato assim que este mapeamento for disparado.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3 sticky bottom-0 z-10">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2.5 rounded-xl font-bold bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700 transition shadow-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className={`px-8 py-2.5 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 active:scale-95 flex items-center gap-2 ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isSaving ? (
                  <>
                    <FiPlay className="animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <FiCheckCircle /> Salvar Integração
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Excluir Integração"
        message="Deseja realmente excluir esta integração?"
        confirmText="Excluir"
        isDangerous={true}
      />

      {/* Test Modal */}
      {isTestModalOpen && integrationToTest && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white/90 dark:bg-gray-900/90 backdrop-blur sticky top-0 z-10">
              <h3 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <FiPlay className="text-green-500" />
                </div>
                Testar Webhook: {integrationToTest.name}
              </h3>
              <button onClick={() => setIsTestModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all">
                <FiX size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest mb-2 text-gray-500 dark:text-gray-400">Cole o Payload JSON</label>
                <textarea
                  className="w-full h-64 p-4 text-sm font-mono bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-900 dark:text-blue-300"
                  value={testPayload}
                  onChange={(e) => setTestPayload(e.target.value)}
                  placeholder={'{\n  "event": "..."\n}'}
                  spellCheck={false}
                />
              </div>

              {testResult && (
                <div className={`p-4 rounded-xl border animate-in slide-in-from-bottom-2 ${testResult.status >= 200 && testResult.status < 300 ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'}`}>
                  <h4 className={`font-bold flex items-center gap-2 mb-2 text-sm ${testResult.status >= 200 && testResult.status < 300 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                    {testResult.status >= 200 && testResult.status < 300 ? <FiCheckCircle /> : <FiXCircle />}
                    Resultado do Teste (Status: {testResult.status || 'Erro'})
                  </h4>
                  <pre className="bg-black/40 p-6 rounded-2xl font-mono text-sm text-white overflow-auto max-h-[400px] border border-white/5 scrollbar-thin scrollbar-thumb-white/10 dark:text-white">
                    {JSON.stringify(testResult.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3 sticky bottom-0 z-10">
              <button onClick={() => setIsTestModalOpen(false)} className="px-6 py-2.5 rounded-xl font-bold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 transition-all active:scale-95">
                Fechar
              </button>
              <button
                onClick={handleTestWebhook}
                disabled={isTesting}
                className="px-8 py-2.5 rounded-xl font-bold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-green-600/20"
              >
                {isTesting ? 'Disparando...' : <><FiPlay /> Disparar Teste</>}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {isHistoryModalOpen && historyIntegration && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 md:p-10 animate-in fade-in duration-500">
          <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] w-full max-w-6xl max-h-[90vh] flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden border border-gray-100 dark:border-gray-800/50 animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white/90 dark:bg-gray-900/90 backdrop-blur shadow-sm sticky top-0 z-20">
              <div className="flex items-center gap-4">
                <h3 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                  <FiSettings className="text-blue-500 animate-spin-slow" /> Histórico: {historyIntegration.name}
                </h3>
                {webhookHistory.length > 0 && (
                  <div className="flex items-center gap-3 border-l border-gray-200 dark:border-gray-700 pl-4">
                    <button
                      onClick={() => setConfirmDeleteHistory({ isOpen: true, type: 'clear' })}
                      className="text-[11px] font-bold text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-all flex items-center gap-1.5 uppercase tracking-wider bg-red-50 dark:bg-red-900/10 px-3 py-1.5 rounded-lg active:scale-95"
                    >
                      <FiTrash2 size={13} /> Limpar Tudo
                    </button>
                    {selectedHistoryIds.length > 0 && (
                      <button
                        onClick={() => setConfirmDeleteHistory({ isOpen: true, type: 'bulk', ids: selectedHistoryIds })}
                        className="text-[11px] font-bold bg-red-600 text-white px-4 py-1.5 rounded-lg hover:bg-red-700 transition-all flex items-center gap-1.5 uppercase tracking-wider animate-in slide-in-from-left-2 shadow-lg shadow-red-600/20 active:scale-95"
                      >
                        <FiTrash2 size={13} /> Apagar Selecionados ({selectedHistoryIds.length})
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportHistory}
                  title="Exportar histórico como JSON"
                  className="text-[11px] font-bold text-emerald-500 hover:text-white dark:text-emerald-400 transition-all flex items-center gap-1.5 uppercase tracking-wider bg-emerald-50 dark:bg-emerald-900/10 hover:bg-emerald-500 px-3 py-1.5 rounded-lg active:scale-95"
                >
                  <FiDownload size={13} /> Exportar
                </button>
                <label
                  title="Importar histórico de um arquivo JSON"
                  className="cursor-pointer text-[11px] font-bold text-violet-500 hover:text-white dark:text-violet-400 transition-all flex items-center gap-1.5 uppercase tracking-wider bg-violet-50 dark:bg-violet-900/10 hover:bg-violet-500 px-3 py-1.5 rounded-lg active:scale-95"
                >
                  <FiUpload size={13} /> Importar
                  <input type="file" accept=".json" className="hidden" onChange={(e) => { handleImportHistory(e.target.files[0]); e.target.value = ''; }} />
                </label>
                <button
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-all active:scale-90"
                >
                  <FiXCircle size={24} />
                </button>
              </div>
            </div>

            {webhookHistory.length > 0 && (
              <div className="px-8 py-3 bg-gray-50/80 dark:bg-gray-900/80 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between backdrop-blur-sm">
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded-md border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition-all active:scale-90"
                    checked={selectedHistoryIds.length === webhookHistory.length && webhookHistory.length > 0}
                    onChange={handleSelectAll}
                  />
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest whitespace-nowrap">Selecionar Todos</span>
                </div>

                <div className="flex-1 max-w-md relative group ml-4">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={14} />
                  <input
                    type="text"
                    placeholder="Buscar por nome ou telefone..."
                    value={webhookHistorySearch}
                    onChange={(e) => {
                      setWebhookHistorySearch(e.target.value);
                      setHistoryCurrentPage(1);
                      fetchHistory(historyIntegration.id, webhookHistoryStatusFilter, e.target.value);
                    }}
                    className="w-full bg-gray-900 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-gray-200 focus:ring-2 focus:ring-blue-500/30 transition-all outline-none hover:border-white/10"
                  />
                </div>

                <div className="flex items-center gap-6">
                  <button
                    onClick={() => handleSyncAllHistory(historyIntegration.id)}
                    disabled={isSyncingAll}
                    className="flex items-center gap-2 text-[11px] font-bold bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-white px-4 py-2 rounded-xl border border-blue-500/20 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-blue-500/10 group"
                  >
                    <FiRefreshCw size={14} className={`${isSyncingAll ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-500`} />
                    {isSyncingAll ? 'SINCRONIZANDO TUDO...' : 'SINCRONIZAR TUDO'}
                  </button>

                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-gray-500 tracking-widest uppercase">Filtrar por Status:</span>
                    <select
                      value={webhookHistoryStatusFilter}
                      onChange={(e) => { setWebhookHistoryStatusFilter(e.target.value); setHistoryCurrentPage(1); }}
                      className="bg-gray-900 border border-white/5 rounded-xl px-4 py-2 text-xs font-bold text-gray-200 focus:ring-2 focus:ring-blue-500/30 transition-all cursor-pointer outline-none hover:border-white/10"
                    >
                      <option value="">TODOS OS STATUS</option>
                      {[...new Set((webhookHistory || []).map(item => item?.processed_data?.raw_status).filter(Boolean))].sort().map(status => (
                        <option key={status} value={status}>{String(status).toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-8 bg-gray-50/30 dark:bg-black/20">
              {loadingHistory ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-gray-500 animate-pulse font-medium">Carregando histórico...</span>
                </div>
              ) : webhookHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4 opacity-60">
                  <FiSearch size={48} className="text-gray-300 dark:text-gray-700 mb-2" />
                  <div className="text-center">
                    <p className="text-lg text-gray-400 font-bold">Nenhum registro encontrado</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {webhookHistorySearch ? `Não encontramos webhooks para "${webhookHistorySearch}"` : "Esta integração ainda não recebeu webhooks."}
                    </p>
                  </div>
                  {webhookHistorySearch && (
                    <button
                      onClick={() => { setWebhookHistorySearch(''); fetchHistory(historyIntegration.id, '', ''); }}
                      className="mt-4 text-xs font-bold bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-200"
                    >
                      Limpar Busca
                    </button>
                  )}
                  {!webhookHistorySearch && (
                    <label className="mt-4 cursor-pointer text-xs font-bold bg-violet-500/10 hover:bg-violet-500 text-violet-500 hover:text-white px-4 py-2 rounded-xl transition-all flex items-center gap-2">
                      <FiUpload size={13} /> Importar Histórico
                      <input type="file" accept=".json" className="hidden" onChange={(e) => { handleImportHistory(e.target.files[0]); e.target.value = ''; }} />
                    </label>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {(() => {
                    const filtered = (webhookHistory || []).filter(item => {
                      if (!webhookHistoryStatusFilter) return true;
                      return item?.processed_data?.raw_status === webhookHistoryStatusFilter;
                    });
                    const totalPages = Math.ceil(filtered.length / historyPageSize);
                    const paginated = filtered.slice((historyCurrentPage - 1) * historyPageSize, historyCurrentPage * historyPageSize);
                    return (<>
                      <div className="flex items-center justify-between mb-2 px-1">
                        <span className="text-xs text-gray-500 font-medium">{filtered.length} registro(s)</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500">Exibir:</span>
                          <select
                            value={historyPageSize}
                            onChange={(e) => { setHistoryPageSize(Number(e.target.value)); setHistoryCurrentPage(1); }}
                            className="bg-gray-900 border border-white/10 rounded-lg px-3 py-1 text-xs font-bold text-gray-200 outline-none cursor-pointer"
                          >
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                          </select>
                        </div>
                      </div>
                      {paginated.map((item) => (
                        <div key={item?.id} className="group relative border border-gray-200 dark:border-gray-700/50 rounded-2xl overflow-hidden bg-white dark:bg-gray-800/20 hover:scale-[1.015] transition-all duration-300 hover:border-blue-500/50 dark:hover:border-blue-600/50 hover:shadow-2xl dark:hover:shadow-blue-900/10">
                          <div className="p-5 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/40 border-b border-gray-200 dark:border-gray-700/50">
                            <div className="flex items-center gap-5">
                              <input
                                type="checkbox"
                                className="w-5 h-5 rounded-md border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition-all active:scale-90"
                                checked={selectedHistoryIds.includes(item?.id)}
                                onChange={() => handleToggleSelect(item?.id)}
                              />
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${item.status === 'processed' ? 'bg-green-100 text-green-700 dark:bg-green-400/10 dark:text-green-400' :
                                  item.status === 'error' ? 'bg-red-100 text-red-700 dark:bg-red-400/10 dark:text-red-400' :
                                    'bg-gray-100 text-gray-700 dark:bg-gray-400/10 dark:text-gray-400'
                                }`}>
                                {item.status}
                              </span>
                              <span className="text-xs text-gray-500 font-mono font-medium">
                                {new Date(item.created_at).toLocaleString()}
                              </span>
                              <span className="px-3 py-1 bg-blue-50 dark:bg-blue-400/5 rounded-full text-xs font-bold text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-400/10">
                                {item.event_type || 'Evento não detectado'}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleResendWebhook(item.id)}
                                disabled={isResending}
                                className="text-[11px] font-black bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-500/20 uppercase tracking-wider"
                              >
                                <FiPlay size={11} fill="currentColor" /> Reenviar
                              </button>
                              <button
                                onClick={() => setConfirmDeleteHistory({ isOpen: true, type: 'single', id: item.id })}
                                className="p-2.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all active:scale-90"
                                title="Excluir Registro"
                              >
                                <FiTrash2 size={16} />
                              </button>
                            </div>
                          </div>

                          <div className="p-6 overflow-hidden">
                            <div className="flex justify-between items-center mb-3">
                              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600"></div>
                                Payload Recebido
                              </div>
                              <div className="flex gap-3">
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(JSON.stringify(item.payload, null, 2));
                                    toast.success("JSON copiado!");
                                  }}
                                  className="text-[10px] font-bold bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded-lg transition-all border border-gray-200 dark:border-gray-700 flex items-center gap-1.5 active:scale-95"
                                >
                                  <FiCopy size={11} /> Copiar
                                </button>
                                <button
                                  onClick={() => setEditJsonModal({ isOpen: true, data: JSON.stringify(item.payload, null, 2), id: item.id })}
                                  className="text-[10px] font-bold bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-lg transition-all border border-blue-200 dark:border-blue-800/50 flex items-center gap-1.5 active:scale-95 shadow-sm shadow-blue-500/5"
                                >
                                  <FiEdit2 size={11} /> Editar JSON
                                </button>
                                <button
                                  onClick={() => setMaximizedJson(item.payload)}
                                  className="text-[10px] font-bold bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded-lg transition-all border border-gray-200 dark:border-gray-700 flex items-center gap-1.5 active:scale-95"
                                >
                                  <FiMaximize2 size={11} /> Maximizar
                                </button>
                              </div>
                            </div>

                            <pre className="text-[11px] font-mono p-4 bg-black/40 text-white rounded-xl overflow-auto max-h-60 border border-white/5 scrollbar-thin scrollbar-thumb-white/10 dark:text-white">
                              {JSON.stringify(item.payload, null, 2)}
                            </pre>

                            {item.processed_data && (
                              <div className="mt-5 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-2xl border border-blue-100/50 dark:border-blue-800/20 shadow-sm relative overflow-hidden group/data">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.03] dark:opacity-[0.05] pointer-events-none group-hover/data:scale-110 transition-transform duration-700">
                                  <FiZap size={120} className="text-blue-600" />
                                </div>
                                <div className="text-[10px] text-blue-600 dark:text-blue-400 font-black uppercase mb-4 flex items-center justify-between tracking-widest relative z-10">
                                  <div className="flex items-center gap-2">
                                    <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
                                    Dados extraídos pelo Sistema
                                  </div>
                                  <button
                                    onClick={() => handleSyncHistory(item.id)}
                                    disabled={isSyncing[item.id]}
                                    className="text-[10px] bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                                    title="Re-processar extração com as regras atuais"
                                  >
                                    <FiRefreshCw size={10} className={isSyncing[item.id] ? 'animate-spin' : ''} />
                                    {isSyncing[item.id] ? 'Sincronizando...' : 'Sincronizar Dados'}
                                  </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-[12px] relative z-10">
                                  <div className="flex justify-between border-b border-blue-200/30 dark:border-blue-700/20 pb-1.5">
                                    <span className="text-gray-400 dark:text-gray-400 font-medium">Plataforma:</span>
                                    <span className="font-bold text-blue-400 dark:text-blue-400 capitalize">{item.processed_data.platform || '-'}</span>
                                  </div>
                                  <div className="flex justify-between border-b border-blue-200/30 dark:border-blue-700/20 pb-1.5">
                                    <span className="text-gray-400 dark:text-gray-400 font-medium">Nome:</span>
                                    <span className="font-bold text-white dark:text-white">{item.processed_data.name || '-'}</span>
                                  </div>
                                  <div className="flex justify-between border-b border-blue-200/30 dark:border-blue-700/20 pb-1.5">
                                    <span className="text-gray-500 dark:text-gray-500 font-medium">Telefone:</span>
                                    <span className="font-bold text-gray-800 dark:text-gray-200 tracking-tight">{item.processed_data.phone || '-'}</span>
                                  </div>
                                  <div className="flex justify-between border-b border-blue-200/30 dark:border-blue-700/20 pb-1.5">
                                    <span className="text-gray-500 dark:text-gray-500 font-medium">E-mail:</span>
                                    <span className="font-bold text-gray-800 dark:text-gray-200 lowercase">{item.processed_data.email || '-'}</span>
                                  </div>
                                  <div className="flex justify-between border-b border-blue-200/30 dark:border-blue-700/20 pb-1.5 md:col-span-2">
                                    <span className="text-gray-400 dark:text-gray-400 font-medium whitespace-nowrap">Produtos:</span>
                                    <div className="flex flex-col items-end gap-1.5 w-full pl-8">
                                      {item.processed_data.items && item.processed_data.items.length > 0 ? (
                                        item.processed_data.items.map((prod, idx) => (
                                          <div key={idx} className="flex justify-between w-full text-[11px] bg-blue-500/5 px-2 py-1 rounded border border-blue-500/10">
                                            <span className="text-gray-300 truncate mr-2">{prod.name}</span>
                                            <span className="text-blue-400 font-bold whitespace-nowrap">R$ {prod.price || '0'}</span>
                                          </div>
                                        ))
                                      ) : (
                                        <span className="font-bold text-blue-400 text-right">{item.processed_data.product_name || '-'}</span>
                                      )}
                                    </div>
                                  </div>
                                  {item.processed_data.e_order_bump && (
                                    <div className="flex justify-between border-b border-orange-200/30 dark:border-orange-700/20 pb-1.5 md:col-span-2 bg-orange-500/5 px-2 rounded-sm">
                                      <span className="text-orange-600 dark:text-orange-400 font-bold flex items-center gap-1.5">
                                        <FiZap size={12} /> Order Bump Detectado!
                                      </span>
                                      <span className="font-medium text-orange-500 text-[10px] uppercase tracking-tighter self-center">Venda Casada</span>
                                    </div>
                                  )}
                                  {item.processed_data.items_detailed && (
                                    <div className="flex flex-col gap-1.5 md:col-span-2 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700/50 mt-1">
                                      <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-widest mb-1">Itens do Pedido</span>
                                      {item.processed_data.items_detailed.map((prod, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-[11px] pb-1 border-b border-gray-100 dark:border-gray-800 last:border-0 last:pb-0">
                                          <span className="text-gray-700 dark:text-gray-300 font-medium">
                                            {typeof prod === 'object' ? prod.name : prod.split(' - ')[0]}
                                          </span>
                                          <span className="text-blue-500 dark:text-blue-400 font-bold ml-4">
                                            {typeof prod === 'object' ? prod.price : prod.split(' - ')[1]}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  <div className="flex justify-between border-b border-blue-200/30 dark:border-blue-700/20 pb-1.5">
                                    <span className="text-gray-400 dark:text-gray-400 font-medium">Método:</span>
                                    <span className="font-bold text-white dark:text-white capitalize">{item.processed_data.payment_method || '-'}</span>
                                  </div>
                                  <div className="flex justify-between border-b border-blue-200/30 dark:border-blue-700/20 pb-1.5">
                                    <span className="text-gray-400 dark:text-gray-400 font-medium">Valor:</span>
                                    <span className="font-bold text-green-400 dark:text-green-400">
                                      {item.processed_data.price ? `R$ ${item.processed_data.price}` : 'R$ -'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between border-b border-blue-200/30 dark:border-blue-700/20 pb-1.5 md:col-span-2">
                                    <span className="text-gray-400 dark:text-gray-400 font-medium whitespace-nowrap">Status Principal:</span>
                                    <span className={`font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${item.processed_data.raw_status?.includes('Aprovada') ? 'text-green-500 bg-green-500/10' :
                                        item.processed_data.raw_status?.includes('Expirado') ? 'text-orange-500 bg-orange-500/10' :
                                          'text-blue-500 bg-blue-500/10'
                                      }`}>
                                      {item.processed_data.raw_status || '-'}
                                    </span>
                                  </div>

                                  {/* --- Campos Extras Extraídos --- */}
                                  {item.processed_data.custom_fields && Object.keys(item.processed_data.custom_fields).length > 0 && (
                                    <div className="mt-2 md:col-span-2 bg-purple-500/5 border border-purple-500/10 p-3 rounded-xl relative overflow-hidden">
                                      <div className="text-[10px] text-purple-600 dark:text-purple-400 font-black uppercase mb-3 flex items-center gap-1.5 tracking-widest relative z-10">
                                        <FiSettings size={12} />
                                        Campos Personalizados (Extras)
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 relative z-10 text-[11px]">
                                        {Object.entries(item.processed_data.custom_fields).map(([k, v]) => (
                                          <div key={k} className="flex justify-between border-b border-purple-200/20 dark:border-purple-700/20 pb-1 break-all">
                                            <span className="text-gray-500 dark:text-gray-400 font-medium pr-2 max-w-[50%] truncate shrink-0" title={k}>{k}:</span>
                                            <span className="font-bold text-gray-800 dark:text-gray-200 text-right shrink min-w-0" title={v}>{v || '-'}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {item.processed_data.utm_source && (
                                    <div className="flex justify-between border-b border-blue-200/30 dark:border-blue-700/20 pb-1.5 md:col-span-2">
                                      <span className="text-gray-500 dark:text-gray-500 font-medium">Origem (UTM):</span>
                                      <span className="font-bold text-indigo-500 dark:text-indigo-400">
                                        {item.processed_data.utm_source} {item.processed_data.utm_medium ? `(${item.processed_data.utm_medium})` : ''}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            {item.error_message && (
                              <div className="mt-4 p-3 bg-red-50 dark:bg-red-400/5 rounded-xl border border-red-100 dark:border-red-400/20 text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-2">
                                <FiXCircle size={14} /> <strong>Erro:</strong> {item.error_message}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {(() => {
                        const filtered2 = (webhookHistory || []).filter(item => {
                          if (!webhookHistoryStatusFilter) return true;
                          return item?.processed_data?.raw_status === webhookHistoryStatusFilter;
                        });
                        const totalPages2 = Math.ceil(filtered2.length / historyPageSize);
                        if (totalPages2 <= 1) return null;
                        return (
                          <div className="flex items-center justify-center gap-2 mt-4">
                            <button
                              onClick={() => setHistoryCurrentPage(p => Math.max(1, p - 1))}
                              disabled={historyCurrentPage === 1}
                              className="px-3 py-1.5 text-xs font-bold bg-gray-800 hover:bg-gray-700 disabled:opacity-30 text-gray-300 rounded-lg transition-all"
                            >â† Anterior</button>
                            <span className="text-xs text-gray-500 font-medium px-2">
                              Página {historyCurrentPage} de {totalPages2}
                            </span>
                            <button
                              onClick={() => setHistoryCurrentPage(p => Math.min(totalPages2, p + 1))}
                              disabled={historyCurrentPage === totalPages2}
                              className="px-3 py-1.5 text-xs font-bold bg-gray-800 hover:bg-gray-700 disabled:opacity-30 text-gray-300 rounded-lg transition-all"
                            >Próxima â†’</button>
                          </div>
                        );
                      })()}
                    </>);
                  })()}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex justify-end">
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-10 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-gray-200 dark:shadow-none"
              >
                Fechar Painel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal para JSON Maximizado - Full Screen Premium */}
      {maximizedJson && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-gray-950 border border-gray-800 rounded-[2rem] w-full max-w-6xl h-full max-h-[90vh] flex flex-col shadow-[0_0_100px_rgba(30,58,138,0.2)] overflow-hidden">
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-gray-950/80 backdrop-blur">
              <h3 className="text-2xl font-black text-white flex items-center gap-3 tracking-tight">
                <div className="p-2 bg-blue-500/10 rounded-xl">
                  <FiMaximize2 className="text-blue-400" />
                </div>
                Payload Completo
              </h3>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(maximizedJson, null, 2));
                    toast.success("JSON copiado!");
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-2xl font-black transition-all active:scale-95 flex items-center gap-3 shadow-xl shadow-blue-600/30 tracking-wide text-sm"
                >
                  <FiCopy size={18} /> COPIAR JSON
                </button>
                <button
                  onClick={() => setMaximizedJson(null)}
                  className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-500 rounded-2xl transition-all active:scale-90 border border-white/10"
                >
                  <FiX size={24} />
                </button>
              </div>
            </div>
            <div className="p-0 flex-1 overflow-hidden relative">
              <pre className="absolute inset-0 p-10 text-base font-mono text-white bg-black/50 overflow-auto scrollbar-thin scrollbar-thumb-gray-800 selection:bg-blue-500/30 leading-relaxed dark:text-gray-100">
                {JSON.stringify(maximizedJson, null, 2)}
              </pre>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal para Editar JSON */}
      {editJsonModal.isOpen && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-gray-950 border border-gray-800 rounded-[2rem] w-full max-w-6xl h-full max-h-[90vh] flex flex-col shadow-[0_0_100px_rgba(30,58,138,0.2)] overflow-hidden">
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-gray-950/80 backdrop-blur">
              <h3 className="text-2xl font-black text-white flex items-center gap-3 tracking-tight">
                <div className="p-2 bg-blue-500/10 rounded-xl">
                  <FiEdit2 className="text-blue-400" />
                </div>
                Editar Payload do Webhook
              </h3>
              <div className="flex gap-4">
                <button
                  onClick={handleSaveJson}
                  disabled={isSavingJson}
                  className="bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-2xl font-black transition-all active:scale-95 flex items-center gap-3 shadow-xl shadow-green-600/30 tracking-wide text-sm disabled:opacity-50"
                >
                  <FiCheckCircle size={18} /> {isSavingJson ? "SALVANDO..." : "SALVAR E ATUALIZAR"}
                </button>
                <button
                  onClick={() => setEditJsonModal({ isOpen: false, data: '', id: null })}
                  className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-500 rounded-2xl transition-all active:scale-90 border border-white/10"
                >
                  <FiX size={24} />
                </button>
              </div>
            </div>
            <div className="p-6 flex-1 overflow-hidden relative">
              <div className="bg-blue-900/20 border border-blue-500/30 text-blue-200 p-4 rounded-xl mb-4 text-sm flex gap-3 items-start">
                <FiZap size={18} className="mt-0.5 text-blue-400 shrink-0" />
                <p>Você pode editar os dados brutos recebidos neste webhook. Ao salvar, o sistema irá <strong>reprocessar e extrair</strong> as informações novamente baseado no novo JSON. Após salvar, você pode reenviar o webhook para disparar as automações com os novos dados.</p>
              </div>
              <textarea
                value={editJsonModal.data}
                onChange={(e) => setEditJsonModal({ ...editJsonModal, data: e.target.value })}
                className="w-full h-[calc(100%-80px)] p-6 text-base font-mono text-white bg-black/50 border border-gray-800 rounded-xl overflow-auto scrollbar-thin scrollbar-thumb-gray-800 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 leading-relaxed resize-none"
                spellCheck={false}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de Guia Informativo */}
      {isGuideModalOpen && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-gray-950 border border-gray-800 rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-[0_0_100px_rgba(79,70,229,0.15)] overflow-hidden">
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-gray-950/80 backdrop-blur">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-500/20 rounded-2xl">
                  <FiShare2 size={24} className="text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tight">Guia de Configuração</h3>
                  <p className="text-gray-500 text-xs mt-1 font-medium italic">Aprenda a conectar suas vendas ao ZapVoice</p>
                </div>
              </div>
              <button
                onClick={() => setIsGuideModalOpen(false)}
                className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-2xl transition-all active:scale-90 border border-white/10"
              >
                <FiX size={24} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto flex-1 space-y-8 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Passo 1 */}
                <div className="space-y-3 p-6 bg-white/5 rounded-[2rem] border border-white/5 hover:border-indigo-500/30 transition-all group">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500 text-white font-black text-sm">1</span>
                    <h4 className="font-bold text-gray-100 group-hover:text-indigo-400 transition-colors">Copiar URL do Webhook</h4>
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Cada integração no ZapVoice gera uma <strong>URL exclusiva</strong>. Copie esta URL e cole na área de "Webhooks" ou "Postback" da sua plataforma (Hotmart, Kiwify, Eduzz, etc.).
                  </p>
                </div>

                {/* Passo 2 */}
                <div className="space-y-3 p-6 bg-white/5 rounded-[2rem] border border-white/5 hover:border-green-500/30 transition-all group">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500 text-white font-black text-sm">2</span>
                    <h4 className="font-bold text-gray-100 group-hover:text-green-400 transition-colors">Configurar Mapeamento</h4>
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Clique em <strong>Editar</strong> e adicione gatilhos. Escolha o evento (ex: Compra Aprovada) e selecione qual <strong>Template</strong> do ZapVoice será disparado automaticamente.
                  </p>
                </div>

                {/* Passo 3 */}
                <div className="space-y-3 p-6 bg-white/5 rounded-[2rem] border border-white/5 hover:border-yellow-500/30 transition-all group">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-500 text-white font-black text-sm">3</span>
                    <h4 className="font-bold text-gray-100 group-hover:text-yellow-400 transition-colors">Atrasos e Variáveis</h4>
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Defina o tempo de espera para o envio. Se seu template tiver variáveis como <code>{"{{1}}"}</code>, mapeie para campos como "Nome do Cliente" ou "Produto".
                  </p>
                </div>

                {/* Passo 4 */}
                <div className="space-y-3 p-6 bg-white/5 rounded-[2rem] border border-white/5 hover:border-blue-500/30 transition-all group">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 text-white font-black text-sm">4</span>
                    <h4 className="font-bold text-gray-100 group-hover:text-blue-400 transition-colors">Testar e Monitorar</h4>
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Use o botão <strong>Testar</strong> para simular uma venda. Acompanhe o <strong>Histórico</strong> para ver se os dados estão sendo extraídos corretamente (Nome, Valor, Order Bump).
                  </p>
                </div>
              </div>

              <div className="bg-indigo-500/10 border border-indigo-500/20 p-6 rounded-[2rem] flex items-start gap-4">
                <FiZap className="text-indigo-400 mt-1 shrink-0" size={20} />
                <div className="space-y-2">
                  <h5 className="font-bold text-indigo-400 text-sm">Dica de Especialista: Sincronização em Massa</h5>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Se você alterar as regras de um template ou mudar a forma de extração, pode usar o botão <strong>Sincronizar Tudo</strong> dentro do Histórico para atualizar registros antigos retroativamente.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-white/5 bg-gray-950/50 flex justify-center">
              <button
                onClick={() => setIsGuideModalOpen(false)}
                className="px-12 py-3 bg-white text-black hover:bg-gray-200 rounded-2xl font-black transition-all active:scale-95 shadow-xl shadow-white/10"
              >
                ENTENDI, VAMOS COMEÃ‡AR!
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de Guia de Mapeamento */}
      {isMappingGuideOpen && createPortal(
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-gray-950 border border-gray-800 rounded-[2.5rem] w-full max-w-3xl max-h-[85vh] flex flex-col shadow-[0_0_100px_rgba(79,70,229,0.2)] overflow-hidden">
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-gray-950/80 backdrop-blur">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-500/20 rounded-2xl">
                  <FiZap size={24} className="text-yellow-500" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight">Entendendo os Mapeamentos</h3>
                  <p className="text-gray-500 text-[10px] mt-1 font-medium uppercase tracking-widest">Domine a automação de seus webhooks</p>
                </div>
              </div>
              <button
                onClick={() => setIsMappingGuideOpen(false)}
                className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-all active:scale-90"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
              <div className="space-y-4">
                <div className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                  <div className="mt-1"><FiSettings className="text-blue-400" /></div>
                  <div>
                    <h5 className="font-bold text-gray-100 text-sm mb-1">Gatilho e Delay</h5>
                    <p className="text-xs text-gray-400 leading-relaxed">O <strong>Gatilho</strong> define qual evento na Hotmart/Kiwify dispara a mensagem. O <strong>Delay</strong> permite aguardar (ex: 5 min) antes do envio para não parecer mecânico.</p>
                  </div>
                </div>

                <div className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                  <div className="mt-1"><FiZap className="text-purple-400" /></div>
                  <div>
                    <h5 className="font-bold text-gray-100 text-sm mb-1">Nota Privada e Etiquetas</h5>
                    <p className="text-xs text-gray-400 leading-relaxed">A <strong>Nota Privada</strong> cria um log interno no Chatwoot. As <strong>Etiquetas</strong> marcam o contato automaticamente, permitindo que você saiba quem é "VIP" ou "Boleto Gerado".</p>
                  </div>
                </div>

                <div className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                  <div className="mt-1"><FiXCircle className="text-red-400" /></div>
                  <div>
                    <h5 className="font-bold text-gray-100 text-sm mb-1">Cancelar Disparos Pendentes</h5>
                    <p className="text-xs text-gray-400 leading-relaxed">Esta é uma função poderosa. Se você configurar para cancelar disparos de "Pix Gerado" quando ocorrer uma "Compra Aprovada", o sistema removerá da fila os lembretes de pagamento anteriores.</p>
                  </div>
                </div>

                <div className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                  <div className="mt-1"><FiCopy className="text-indigo-400" /></div>
                  <div>
                    <h5 className="font-bold text-gray-100 text-sm mb-1">Mensagem Livre (Sessão)</h5>
                    <p className="text-xs text-gray-400 leading-relaxed">Tenta enviar via janela de 24h aberta (custo zero). Se a janela estiver fechada, o sistema faz o fallback automático para o Template selecionado.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-white/5 bg-gray-950/50 flex justify-center">
              <button
                onClick={() => setIsMappingGuideOpen(false)}
                className="w-full py-4 bg-indigo-600 text-white hover:bg-indigo-500 rounded-2xl font-black transition-all active:scale-95 shadow-xl shadow-indigo-600/20"
              >
                TUDO CLARO!
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de Histórico de Disparos */}
      {isDispatchHistoryModalOpen && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-gray-950 border border-gray-800 rounded-[2rem] w-full max-w-6xl h-full max-h-[90vh] flex flex-col shadow-[0_0_100px_rgba(30,58,138,0.2)] overflow-hidden">
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-gray-950/80 backdrop-blur">
              <div>
                <h3 className="text-2xl font-black text-white flex items-center gap-3 tracking-tight">
                  <div className="p-2 bg-indigo-500/10 rounded-xl">
                    <FiPlay className="text-indigo-400" />
                  </div>
                  Histórico de Disparos: {dispatchIntegration?.name}
                </h3>
                <p className="text-gray-500 text-xs mt-1 font-medium bg-white/5 px-2 py-0.5 rounded-lg inline-block">Acompanhe a fila de execução de templates e funis</p>
              </div>
              <button
                onClick={() => setIsDispatchHistoryModalOpen(false)}
                className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-2xl transition-all active:scale-90 border border-white/10"
              >
                <FiX size={24} />
              </button>
            </div>

            <div className="p-0 flex-1 overflow-hidden relative flex flex-col">
              {/* Barra de Filtros Persistente */}
              <div className="px-8 pt-8 pb-0 shrink-0">
                <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-4 items-end bg-white/[0.02] border border-white/5 p-6 rounded-3xl">
                  <div className="md:col-span-1">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block px-1">Buscar</label>
                    <div className="relative group">
                      <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-indigo-500 transition-colors" size={14} />
                      <input
                        type="text"
                        placeholder="Telefone ou nome..."
                        value={dispatchSearch}
                        onChange={(e) => setDispatchSearch(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs font-bold text-white focus:ring-2 focus:ring-indigo-500/30 transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block px-1">Evento</label>
                    <div className="relative">
                      <select
                        value={dispatchEventFilter}
                        onChange={(e) => {
                          setDispatchEventFilter(e.target.value);
                          setDispatchPage(1);
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-indigo-500/50 transition-all appearance-none cursor-pointer"
                      >
                        <option value="" className="bg-gray-900 text-white font-bold">Todos os Eventos</option>
                        {[...new Set((dispatchHistory || []).map(item => item?.event_type))].filter(Boolean).sort().map(evt => (
                          <option key={evt} value={evt} className="bg-gray-900 text-white font-bold">
                            {evt.toUpperCase().replace(/_/g, ' ')}
                          </option>
                        ))}
                      </select>
                      <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" size={14} />
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block px-1">Tipo</label>
                    <div className="relative">
                      <select
                        value={dispatchTypeFilter}
                        onChange={(e) => {
                          setDispatchTypeFilter(e.target.value);
                          setDispatchPage(1);
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-indigo-500/50 transition-all appearance-none cursor-pointer"
                      >
                        <option value="" className="bg-gray-900 text-white font-bold">Todos</option>
                        <option value="free" className="bg-gray-900 text-emerald-400 font-bold">ðŸ†“ Grátis</option>
                        <option value="paid" className="bg-gray-900 text-amber-400 font-bold">ðŸ’³ Pagos</option>
                        <option value="cancelled" className="bg-gray-900 text-gray-400 font-bold">Cancelados</option>
                      </select>
                      <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" size={14} />
                    </div>
                  </div>

                  <div className="md:col-span-2 flex gap-3">
                    <div className="flex-1">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block px-1">Desde</label>
                      <input
                        type="date"
                        value={dispatchStartDate}
                        onChange={(e) => setDispatchStartDate(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:ring-2 focus:ring-indigo-500/30 transition-all outline-none [color-scheme:dark]"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block px-1">Até</label>
                      <input
                        type="date"
                        value={dispatchEndDate}
                        onChange={(e) => setDispatchEndDate(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:ring-2 focus:ring-indigo-500/30 transition-all outline-none [color-scheme:dark]"
                      />
                    </div>
                    <div className="flex items-end mb-0.5">
                      <button
                        onClick={() => {
                          setDispatchSearch('');
                          setDispatchEventFilter('');
                          setDispatchTypeFilter('');
                          setDispatchStartDate('');
                          setDispatchEndDate('');
                          setDispatchPage(1);
                          fetchDispatches(dispatchIntegration.id, 1, dispatchLimit, '', '', '', '', '');
                        }}
                        className="p-2.5 bg-white/5 hover:bg-orange-500/20 text-gray-400 hover:text-orange-500 rounded-xl transition-all border border-transparent hover:border-orange-500/20"
                        title="Limpar Filtros e Resetar"
                      >
                        <FiRefreshCw size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="md:col-span-5 flex justify-end">
                    <button
                      onClick={handleBackfillCosts}
                      disabled={isBackfillingCosts}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 rounded-xl transition-all border border-amber-500/20 hover:border-amber-500/40 text-[10px] font-black tracking-widest uppercase disabled:opacity-50"
                      title="Calcular custos históricos para disparos que mostram 'R$ â€”'"
                    >
                      {isBackfillingCosts ? <FiRefreshCw size={12} className="animate-spin" /> : <FiRefreshCw size={12} />}
                      {isBackfillingCosts ? 'Calculando...' : 'Calcular Custos'}
                    </button>
                  </div>
                </div>
              </div>

              {loadingDispatchHistory ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                  <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                  <p className="text-gray-500 font-bold tracking-widest text-xs">CARREGANDO FILA...</p>
                </div>
              ) : dispatchHistory.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                  <div className="p-6 bg-white/5 rounded-full mb-6">
                    <FiZap size={48} className="text-gray-700" />
                  </div>
                  <h4 className="text-xl font-bold text-white mb-2">Nenhum disparo encontrado</h4>
                  <p className="text-gray-500 max-w-md">Não há disparos para os filtros aplicados. Tente limpar os filtros ou selecionar outro período.</p>
                </div>
              ) : (
                <div className="flex-1 overflow-auto px-8 pb-8 custom-scrollbar">
                  <div className="pt-2">
                    {/* Bulk Actions Bar */}
                    {selectedDispatchIds.length > 0 && (
                      <div className="mb-4 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center gap-3">
                          <div className="bg-indigo-500 text-white text-[10px] font-black px-2 py-1 rounded-lg">
                            {selectedDispatchIds.length} SELECIONADOS
                          </div>
                          <p className="text-xs text-indigo-300 font-medium">O que deseja fazer com estes disparos?</p>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={handleBulkDispatchPlay}
                            disabled={isBulkPlayingDispatches}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all active:scale-95 disabled:opacity-50"
                          >
                            {isBulkPlayingDispatches ? <FiRefreshCw className="animate-spin" /> : <FiRefreshCw />}
                            Reprocessar Selecionados
                          </button>
                          <button
                            onClick={() => setConfirmDeleteDispatch({ isOpen: true, type: 'bulk', ids: selectedDispatchIds })}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all font-bold text-[10px] uppercase tracking-tighter"
                          >
                            <FiTrash2 size={12} /> Excluir ({selectedDispatchIds.length})
                          </button>
                          <button
                            onClick={() => setSelectedDispatchIds([])}
                            className="text-gray-500 hover:text-white text-[10px] font-black tracking-widest uppercase px-2"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                    <table className="w-full text-left border-separate border-spacing-y-3">
                      <thead>
                        <tr className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-4">
                          <th className="px-6 pb-2 w-10">
                            <input
                              type="checkbox"
                              onChange={(e) => handleSelectAllDispatches(e, dispatchHistory)}
                              checked={selectedDispatchIds.length > 0 && selectedDispatchIds.length === dispatchHistory.length}
                              className="w-4 h-4 rounded border-white/20 bg-white/5 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                            />
                          </th>
                          <th className="px-6 pb-2">Destinatário</th>
                          <th className="px-6 pb-2">Status / Ações</th>
                          <th className="px-6 pb-2">Evento / Template</th>
                          <th className="px-6 pb-2 text-right">Execução / Timestamps</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.02]">
                        {(dispatchHistory || []).map((item) => (
                          <tr key={item.id} className={`group transition-all duration-300 ${selectedDispatchIds.includes(item.id) ? 'bg-indigo-500/10' : 'bg-white/5 hover:bg-white/[0.08]'}`}>
                            <td className="px-6 py-5 rounded-l-[1.5rem] first:border-l border-y border-white/5">
                              <input
                                type="checkbox"
                                checked={selectedDispatchIds.includes(item.id)}
                                onChange={() => handleToggleSelectDispatch(item.id)}
                                className="w-4 h-4 rounded border-white/20 bg-white/5 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                              />
                            </td>


                            {/* 1. Destinatário */}
                            <td className="px-6 py-5 border-y border-white/5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 text-xs font-bold font-mono">
                                  {item.contact_phone?.slice(-2) || '??'}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-gray-300 text-sm font-bold">{item.contact_name || 'Desconhecido'}</span>
                                  <span className="text-gray-500 font-mono text-xs">{item.contact_phone}</span>
                                </div>
                              </div>
                            </td>

                            {/* 2. Status / Ações (Layout 3 em cima, 1 em baixo) */}
                            <td className="px-6 py-5 border-y border-white/5">
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                  {getStatusBadge(item.status)}
                                  <button
                                    onClick={() => { setSelectedDispatch(item); setIsPipelineModalOpen(true); }}
                                    className="p-2 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white rounded-lg transition-all active:scale-95 flex items-center gap-1.5 font-black text-[9px] uppercase tracking-wider"
                                    title="Ver Pipeline"
                                  >
                                    <FiActivity size={14} /> <span>Pipeline</span>
                                  </button>
                                  <button
                                    onClick={() => handlePlayDispatch(item.id)}
                                    disabled={isPlaying[item.id]}
                                    className="p-2 bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-white rounded-lg transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 font-black text-[9px] uppercase tracking-wider"
                                    title="Disparar Agora"
                                  >
                                    {isPlaying[item.id] ? <FiRefreshCw className="animate-spin" size={14} /> : <FiPlay size={14} fill="currentColor" />}
                                    <span>Disparar</span>
                                  </button>
                                </div>
                                <div className="flex justify-start">
                                  <button
                                    onClick={() => setConfirmDeleteDispatch({ isOpen: true, type: 'single', id: item.id })}
                                    disabled={isCancelling[item.id]}
                                    className="px-3 py-1 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 text-[9px] font-black uppercase"
                                    title="Excluir Registro"
                                  >
                                    {isCancelling[item.id] ? <FiRefreshCw className="animate-spin" size={12} /> : <FiTrash2 size={12} />}
                                    <span>Excluir</span>
                                  </button>
                                </div>
                                {(item.status === 'cancelled' || item.status === 'failed') && item.failure_reason && (
                                  <div className="text-[9px] text-red-500 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-lg mt-1 leading-tight max-w-[220px] break-words italic font-bold">
                                    ⚠️ {item.failure_reason}
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* 3. Evento / Template */}
                            <td className="px-6 py-5 border-y border-white/5">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <span className="text-white font-bold text-sm tracking-tight">{(item.event_type || 'disparo')?.toUpperCase().replace('_', ' ')}</span>
                                  {item.status === 'cancelled' ? (
                                    <span className="text-[10px] bg-gray-600 text-gray-300 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">Cancelado</span>
                                  ) : item.sent_as === 'FREE_MESSAGE' ? (
                                    <span className="text-[10px] bg-emerald-500 text-black px-2 py-0.5 rounded-full font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20">ðŸ†“ GRÁTIS</span>
                                  ) : item.sent_as === 'TEMPLATE' ? (
                                    <span className="text-[10px] bg-amber-500 text-black px-2 py-0.5 rounded-full font-black uppercase tracking-widest shadow-lg shadow-amber-500/20">PAGO</span>
                                  ) : (
                                    <span className="text-[10px] bg-indigo-500 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20">TEMPLATE</span>
                                  )}
                                </div>
                                <div className="text-[10px] text-gray-500 mt-0.5">
                                  {item.template_name ? `Template: ${item.template_name}` : (item.funnel_id ? `Funil: ${item.funnel_id}` : 'Ação Interna')}
                                </div>
                                <div className="flex items-center gap-1.5 mt-1 border-white/10">
                                  <span className="flex items-center gap-0.5 text-[9px] font-bold text-emerald-500 px-1 rounded" title="Enviados">
                                    <FiCheck size={10} /> {item.total_sent || (item.status === 'completed' ? 1 : 0)}
                                  </span>
                                  <span className="flex items-center gap-0.5 text-[9px] font-bold text-blue-400 px-1 rounded" title="Entregues">
                                    <FiInbox size={10} /> {item.total_delivered || 0}
                                  </span>
                                  <span className="flex items-center gap-0.5 text-[9px] font-bold text-purple-400 px-1 rounded" title="Lidos">
                                    <FiEye size={10} /> {item.total_read || 0}
                                  </span>
                                  <button 
                                    onClick={() => { setSelectedDispatch(item); setIsPipelineModalOpen(true); }}
                                    className="flex items-center gap-0.5 text-[9px] font-bold text-indigo-400 hover:text-white hover:bg-indigo-500/20 px-1 rounded transition-all group/rocket" 
                                    title="Ver Pipeline do Funil"
                                  >
                                    <FiNavigation size={10} className="rotate-45 text-indigo-400 group-hover/rocket:text-white" /> {item.funnel_id ? 'Funil' : 'Log'}
                                  </button>
                                  <span className="flex items-center gap-0.5 text-[9px] font-bold text-orange-400 px-1 rounded" title="Interações (Cliques)">
                                    <FiMousePointer size={10} /> {item.total_clicks || (item.is_interaction ? 1 : 0)}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* 4. Execução / Timestamps */}
                            <td className="px-6 py-5 rounded-r-[1.5rem] last:border-r border-y border-white/5 text-right">
                              <div className="flex flex-col gap-1.5 items-end text-right">
                                <div className="flex items-center gap-1.5 opacity-60">
                                  <span className="text-[9px] font-black uppercase text-gray-400 tracking-tighter">Chegou:</span>
                                  <span className="text-gray-400 text-[11px] font-mono">{new Date(item.created_at).toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-1.5 pt-1 border-t border-white/5">
                                  <span className="text-[9px] font-black uppercase text-blue-500 tracking-tighter">Disparo:</span>
                                  <span className="text-blue-300 text-[12px] font-bold font-mono">{new Date(item.scheduled_time).toLocaleString()}</span>
                                </div>
                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1 flex items-center gap-1.5">
                                  <div className={`w-1.5 h-1.5 rounded-full ${new Date(item.scheduled_time) > new Date() ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`}></div>
                                  {new Date(item.scheduled_time) > new Date() ? 'Aguardando Delay' : 'Processando'}
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Pagination Controls */}
                    <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-6 pb-4">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Mostrar:</span>
                          <select
                            value={dispatchLimit}
                            onChange={(e) => {
                              setDispatchLimit(Number(e.target.value));
                              setDispatchPage(1);
                            }}
                            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-indigo-500/50 cursor-pointer"
                          >
                            <option value="20" className="bg-gray-900">20</option>
                            <option value="50" className="bg-gray-900">50</option>
                            <option value="100" className="bg-gray-900">100</option>
                          </select>
                        </div>
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                          Total: <span className="text-white">{dispatchTotal}</span> registros
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setDispatchPage(prev => Math.max(1, prev - 1))}
                          disabled={dispatchPage === 1}
                          className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                        >
                          <FiChevronDown className="rotate-90" />
                        </button>

                        <div className="flex items-center gap-1">
                          {[...Array(Math.ceil(dispatchTotal / (dispatchLimit || 20)) || 0)].map((_, i) => {
                            const p = i + 1;
                            const totalPages = Math.ceil(dispatchTotal / (dispatchLimit || 20)) || 1;
                            if (
                              p === 1 ||
                              p === totalPages ||
                              (p >= dispatchPage - 2 && p <= dispatchPage + 2)
                            ) {
                              return (
                                <button
                                  key={p}
                                  onClick={() => setDispatchPage(p)}
                                  className={`w-10 h-10 rounded-xl text-[11px] font-black transition-all active:scale-90 ${dispatchPage === p ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'}`}
                                >
                                  {p}
                                </button>
                              );
                            }
                            if (p === dispatchPage - 3 || p === dispatchPage + 3) {
                              return <span key={p} className="text-gray-600">...</span>;
                            }
                            return null;
                          })}
                        </div>

                        <button
                          onClick={() => {
                            const totalPages = Math.ceil(dispatchTotal / (dispatchLimit || 20)) || 1;
                            setDispatchPage(prev => Math.max(1, Math.min(totalPages, prev + 1)));
                          }}
                          disabled={dispatchPage >= (Math.ceil(dispatchTotal / (dispatchLimit || 20)) || 1)}
                          className="p-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all disabled:opacity-20 disabled:cursor-not-allowed group/btn"
                        >
                          <FiChevronDown className="-rotate-90" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-white/5 bg-gray-900/50 flex justify-between items-center px-12 shrink-0">
              <div className="text-xs text-gray-500 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                Monitoramento em tempo real ativo
              </div>
              <button
                onClick={() => fetchDispatches(dispatchIntegration.id, dispatchPage, dispatchLimit, dispatchSearch, dispatchEventFilter, dispatchStartDate, dispatchEndDate)}
                className="flex items-center gap-2 text-[10px] font-black text-white/40 hover:text-white tracking-widest uppercase transition-colors"
              >
                <FiRefreshCw size={12} /> Atualizar Fila
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de Confirmação para Histórico */}
      <ConfirmModal
        isOpen={confirmDeleteHistory.isOpen}
        onClose={() => setConfirmDeleteHistory({ ...confirmDeleteHistory, isOpen: false })}
        onConfirm={() => {
          if (confirmDeleteHistory.type === 'single') deleteSingleHistory(confirmDeleteHistory.id);
          else if (confirmDeleteHistory.type === 'bulk') deleteBulkHistory(confirmDeleteHistory.ids);
          else if (confirmDeleteHistory.type === 'clear') clearAllHistory(historyIntegration.id);
        }}
        title="Confirmar Exclusão"
        message={
          confirmDeleteHistory.type === 'clear' ? "Deseja realmente apagar TODO o histórico desta integração? Esta ação é irreversível." :
            confirmDeleteHistory.type === 'bulk' ? `Deseja realmente apagar os ${confirmDeleteHistory.ids.length} registros selecionados?` :
              "Deseja realmente excluir este registro de histórico permanentemente?"
        }
        confirmText="Sim, Apagar Agora"
        isDangerous={true}
      />
      {/* Modal de Confirmação para Disparos */}
      <ConfirmModal
        isOpen={confirmDeleteDispatch.isOpen}
        onClose={() => setConfirmDeleteDispatch({ ...confirmDeleteDispatch, isOpen: false })}
        onConfirm={() => {
          if (confirmDeleteDispatch.type === 'single') handleCancelDispatch(confirmDeleteDispatch.id);
          else if (confirmDeleteDispatch.type === 'bulk') handleBulkDispatchDelete(confirmDeleteDispatch.ids);
        }}
        title="Confirmar Exclusão de Disparo"
        message={
          confirmDeleteDispatch.type === 'bulk' ? `Deseja realmente excluir os ${confirmDeleteDispatch.ids.length} disparos selecionados? Esta ação não pode ser desfeita.` :
            "Deseja realmente excluir este registro de disparo? Se ele ainda não foi enviado, ele será removido da fila permanentemente."
        }
        confirmText="Sim, Excluir Agora"
        isDangerous={true}
      />

      {/* Pipeline Modal */}
      {isPipelineModalOpen && selectedDispatch && createPortal(
        <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 animate-in fade-in duration-500">
          <div className="bg-gray-950 border border-white/5 rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-[0_0_80px_rgba(79,70,229,0.1)]">
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-gray-900/20">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-500/20 rounded-2xl">
                  <FiActivity size={24} className="text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight leading-none">Status da Execução</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em]">Dispatcher Log Tracking</span>
                    {selectedDispatch.status === 'processing' && (
                      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[9px] font-black uppercase animate-pulse border border-indigo-500/20">
                        Processando Agora
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsPipelineModalOpen(false)}
                className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-2xl transition-all border border-white/10"
              >
                <FiX size={24} />
              </button>
            </div>

            <div className="p-8 space-y-8 relative max-h-[60vh] overflow-y-auto custom-scrollbar">
              {/* Vertical Line */}
              <div className="absolute left-[59px] top-12 bottom-12 w-0.5 bg-gradient-to-b from-indigo-500/50 via-blue-500/50 to-emerald-500/50 opacity-20"></div>

              {/* Step 1: Recebimento & Gatilho */}
              {(() => {
                const isScheduled = new Date(selectedDispatch.scheduled_time) > new Date();
                const isPending = selectedDispatch.status === 'pending' && isScheduled;
                
                return (
                  <div className="flex items-start gap-6 group relative animate-in slide-in-from-left duration-500">
                    <div className={`relative z-10 w-14 h-14 rounded-2xl border flex items-center justify-center transition-all duration-500 ${isPending ? 'bg-gray-900 border-white/10 text-gray-600' : 'bg-indigo-500 text-white border-indigo-400 shadow-[0_0_20px_rgba(79,70,229,0.3)]'}`}>
                      {isPending ? <FiClock size={24} /> : <FiCheck size={24} />}
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex justify-between items-start">
                        <h4 className={`font-bold text-sm mb-1 ${isPending ? 'text-gray-500' : 'text-white'}`}>1. Recebimento e Gatilho</h4>
                        <span className="text-[10px] font-mono text-gray-500">{new Date(selectedDispatch.created_at).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-gray-500 text-xs leading-relaxed">
                        {isPending ? `Evento processado. Aguardando delay de execução.` : 
                         `Evento ${selectedDispatch.event_type?.toUpperCase() || 'MANUAL'} reconhecido e validado.`}
                      </p>
                      {isPending && (
                        <div className="mt-2">
                          <PipelineCountdown targetTime={selectedDispatch.scheduled_time} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Step 2: Envio e Entrega (WA) */}
              {(() => {
                const history = selectedDispatch.execution_history || [];
                const delivery = history.find(h => h.node_id === 'DELIVERY');
                
                // Failsafe: Se o banco já contou entrega, consideramos o passo feito mesmo que o log tenha falhado
                const hasDeliveredStat = (selectedDispatch.total_delivered || 0) > 0 || (selectedDispatch.total_read || 0) > 0;
                const isDone = delivery?.status === 'completed' || hasDeliveredStat;
                
                const isProcessing = delivery?.status === 'processing' && !isDone;
                const isFailed = selectedDispatch.status === 'failed' && !isDone;
                const isStep2Done = isDone; // Export variable for next steps

                // Sequential Visibility: Show if Step 1 is not pending
                const isStep1Pending = selectedDispatch.status === 'pending' && new Date(selectedDispatch.scheduled_time) > new Date();
                if (isStep1Pending) return null;

                return (
                  <div className="flex items-start gap-6 group relative animate-in slide-in-from-left duration-700">
                    <div className={`relative z-10 w-14 h-14 rounded-2xl border flex items-center justify-center transition-all duration-500 ${
                      isDone ? 'bg-purple-500 text-white border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.3)]' : 
                      isFailed ? 'bg-red-500/20 text-red-500 border-red-500/50' : 
                      isProcessing ? 'bg-purple-500/10 text-purple-400 border-purple-500/30 animate-pulse' :
                      'bg-gray-900 border-white/10 text-gray-600'
                    }`}>
                      {isProcessing ? <FiRefreshCw size={24} className="animate-spin" /> : isFailed ? <FiXCircle size={24} /> : <FiMessageSquare size={24} />}
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex justify-between items-start">
                        <h4 className={`font-bold text-sm mb-1 ${isDone ? 'text-white' : 'text-gray-500'}`}>2. Envio e Entrega (WA)</h4>
                        {isDone && delivery?.timestamp && <span className="text-[10px] font-mono text-gray-500">{new Date(delivery.timestamp).toLocaleTimeString()}</span>}
                      </div>
                      <p className="text-gray-500 text-xs leading-relaxed">
                        {isDone ? 'Mensagem recebida com sucesso pelo contato.' : 
                         isProcessing ? 'Aguardando confirmação de entrega do WhatsApp...' : 
                         isFailed ? `Falha no envio: ${selectedDispatch.failure_reason}` :
                         'Gatilho processado. Iniciando envio...'}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Step 3: Estabilização (10s) */}
              {(() => {
                const delivery = selectedDispatch.execution_history?.find(h => h.node_id === 'DELIVERY');
                const stabilization = selectedDispatch.execution_history?.find(h => h.node_id === 'STABILIZATION');
                const discovery = selectedDispatch.execution_history?.find(h => h.node_id === 'DISCOVERY');
                
                const isStep2Done = (delivery?.status === 'completed') || ((selectedDispatch.total_delivered || 0) > 0) || ((selectedDispatch.total_read || 0) > 0);
                const isDone = stabilization?.status === 'completed' || !!discovery;
                
                // Perception improvement: If Step 2 is done, Stage 3 is at least processing
                const isProcessing = stabilization?.status === 'processing' || (isStep2Done && !isDone);
                
                const targetTime = stabilization?.extra?.target_time;

                // Sequential Visibility: Only show if Step 2 is done (log or stat)
                if (!isStep2Done) return null;

                return (
                  <div className="flex items-start gap-6 group relative animate-in slide-in-from-left duration-700">
                    <div className={`relative z-10 w-14 h-14 rounded-2xl border flex items-center justify-center transition-all duration-500 ${
                      isDone ? 'bg-amber-500 text-white border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]' : 
                      isProcessing ? 'bg-amber-500/10 text-amber-500 border-amber-500/30 animate-pulse' :
                      'bg-gray-900 border-white/10 text-gray-600'
                    }`}>
                      {isProcessing ? <FiClock size={24} className="animate-pulse" /> : <FiClock size={24} />}
                    </div>
                    <div className="flex-1 pt-1">
                      <h4 className={`font-bold text-sm mb-1 ${isDone ? 'text-white' : 'text-gray-500'}`}>3. Delay de Segurança (WhatsApp)</h4>
                      <p className="text-gray-500 text-xs leading-relaxed">
                        {isDone ? 'Aguardando sincronia final...' : 
                         isProcessing ? (stabilization ? 'Estabilizando conexão para sincronização (10s)...' : 'Entrega detectada. Iniciando delay de segurança...') : 
                         'Preparando delay de segurança...'}
                      </p>
                      {(isProcessing || (isDone && !selectedDispatch.execution_history?.find(h => h.node_id === 'DISCOVERY'))) && targetTime && (
                        <div className="mt-2">
                          <PipelineCountdown targetTime={targetTime} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Step 4: Sincronização Chatwoot */}
              {(() => {
                const history = selectedDispatch.execution_history || [];
                const discovery = history.find(h => h.node_id === 'DISCOVERY');
                const stabilization = history.find(h => h.node_id === 'STABILIZATION');
                
                const isDone = discovery?.status === 'completed';
                const isProcessing = discovery?.status === 'processing' || (stabilization?.status === 'completed' && !discovery);

                // Sequential Visibility: Show if Step 3 is done OR if Step 4 already started
                const isStep3Done = stabilization?.status === 'completed';
                if (!isStep3Done && !isDone) return null;

                return (
                  <div className="flex items-start gap-6 group relative animate-in slide-in-from-left duration-700">
                    <div className={`relative z-10 w-14 h-14 rounded-2xl border flex items-center justify-center transition-all duration-500 ${
                      isDone ? 'bg-blue-500 text-white border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 
                      isProcessing ? 'bg-blue-500/10 text-blue-400 border-blue-500/30 animate-pulse' :
                      'bg-gray-900 border-white/10 text-gray-600'
                    }`}>
                      {isProcessing ? <FiRefreshCw size={24} className="animate-spin" /> : <FiUser size={24} />}
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex justify-between items-start">
                        <h4 className={`font-bold text-sm mb-1 ${isDone ? 'text-white' : 'text-gray-500'}`}>4. Sincronização Chatwoot</h4>
                        {isDone && discovery?.timestamp && <span className="text-[10px] font-mono text-gray-500">{new Date(discovery.timestamp).toLocaleTimeString()}</span>}
                      </div>
                      <p className="text-gray-500 text-xs leading-relaxed">
                        {isDone ? 'Vínculo com Chatwoot estabelecido com sucesso.' : 
                         isProcessing ? 'Buscando/Criando conversa no Chatwoot...' : 
                         'Aguardando conclusão do delay...'}
                      </p>
                      {isDone && discovery.extra && (
                         <div className="mt-2 flex gap-2">
                           <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-[9px] font-bold border border-blue-500/20">ID: {discovery.extra.conversation_id}</span>
                           <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-[9px] font-bold border border-blue-500/20">ACC: {discovery.extra.account_id}</span>
                         </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Step 5: Finalização e Memória */}
              {(() => {
                const history = selectedDispatch.execution_history || [];
                const discovery = history.find(h => h.node_id === 'DISCOVERY');
                const isDone = selectedDispatch.status === 'completed';
                const isProcessing = discovery?.status === 'completed' && !isDone;

                // Sequential Visibility: Show if Step 4 is done OR if absolute final status is reached
                const isStep4Done = discovery?.status === 'completed';
                if (!isStep4Done && !isDone) return null;

                const nodeStatus = history.find(h => h.node_id === 'DELIVERY' || h.node_id === 'DISPATCH') || {};
                const memoryStatus = nodeStatus.extra?.memory_status;
                const noteStatus = nodeStatus.extra?.private_note_status;

                return (
                  <div className="flex items-start gap-6 group relative animate-in slide-in-from-left duration-1000">
                    <div className={`relative z-10 w-14 h-14 rounded-2xl border flex items-center justify-center transition-all duration-500 ${
                      isDone ? 'bg-emerald-500 text-white border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 
                      'bg-gray-900 border-white/10 text-gray-600'
                    }`}>
                      <FiCpu size={24} className={isProcessing ? 'animate-pulse' : ''} />
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex justify-between items-start">
                        <h4 className={`font-bold text-sm mb-1 ${isDone ? 'text-white' : 'text-gray-500'}`}>5. Webhook Memória IA</h4>
                        {isDone && <span className="text-[10px] font-mono text-gray-500">Concluído</span>}
                      </div>
                      <p className="text-gray-500 text-xs leading-relaxed">
                        {isDone ? 'Automação concluída com sucesso.' : 'Aguardando tarefas secundárias...'}
                      </p>
                      
                      {/* Granular Status for Note and Memory */}
                      {(isDone || memoryStatus || noteStatus) && (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                           <div className={`p-2 rounded-lg border flex items-center gap-2 transition-all duration-300 ${
                             noteStatus === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                             noteStatus === 'failed' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                             'bg-white/5 border-white/5 text-gray-500'
                           }`}>
                             <FiFileText size={12} />
                             <span className="text-[10px] font-medium">Nota Privada</span>
                             {noteStatus === 'success' ? <FiCheck size={10} className="ml-auto" /> : noteStatus === 'failed' ? <FiX size={10} className="ml-auto" /> : <FiClock size={10} className="ml-auto animate-pulse" />}
                           </div>

                           <div className={`p-2 rounded-lg border flex items-center gap-2 transition-all duration-300 ${
                             memoryStatus === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                             memoryStatus === 'failed' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                             'bg-white/5 border-white/5 text-gray-500'
                           }`}>
                             <FiCpu size={12} />
                             <span className="text-[10px] font-medium">Memória IA</span>
                             {memoryStatus === 'success' ? <FiCheck size={10} className="ml-auto" /> : memoryStatus === 'failed' ? <FiX size={10} className="ml-auto" /> : <FiClock size={10} className="ml-auto animate-pulse" />}
                           </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="p-8 border-t border-white/5 bg-gray-950/50 flex justify-center">
              <button 
                onClick={() => setIsPipelineModalOpen(false)}
                className="w-full py-4 bg-white text-black hover:bg-gray-200 rounded-2xl font-black transition-all active:scale-95 shadow-xl shadow-white/5 uppercase tracking-widest text-xs"
              >
                Fechar Monitor
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      </div>
    </>
  );
}

// Contacts Viewer Modal Component (Reusable within Integrations.jsx scope)
const ContactsViewerModal = ({ isOpen, onClose, triggerId, contacts, counts, filter, setFilter, loading, title }) => {
  if (!isOpen) return null;
  const safeContacts = contacts || [];
  const safeCounts = counts || {};

  return createPortal(
    <div className="fixed inset-0 z-[20000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-gray-950 border border-gray-800 rounded-[2rem] w-full max-w-4xl h-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gray-900/50">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <FiMessageSquare className="text-blue-400" />
              Visualização de Contatos: {title || 'Disparo Individual'}
            </h3>
            <p className="text-xs text-gray-400 mt-1">ID do Disparo: {triggerId}</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-all"
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="px-6 py-4 flex gap-2 border-b border-white/5 bg-gray-900/30">
          {[
            { id: 'all', label: 'Todos', icon: FiInbox },
            { id: 'sent', label: 'Enviados', icon: FiCheck, count: safeCounts.sent },
            { id: 'delivered', label: 'Entregues', icon: FiInbox, count: safeCounts.delivered },
            { id: 'read', label: 'Lidos', icon: FiEye, count: safeCounts.read },
            { id: 'failed', label: 'Falhas', icon: FiXCircle, count: safeCounts.failed },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${filter === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
            >
              <tab.icon size={14} />
              {tab.label}
              {tab.count !== undefined && <span className="opacity-60 text-[10px]">({tab.count})</span>}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-6 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="w-10 h-10 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
              <p className="text-xs font-bold text-gray-500 tracking-widest uppercase">Buscando contatos...</p>
            </div>
          ) : safeContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 italic text-sm">
              Nenhum registro encontrado para este filtro.
            </div>
          ) : (
            <div className="space-y-3">
              {safeContacts.map((contact, idx) => {
                return (
                  <div key={idx} className="bg-white/5 border border-white/5 p-4 rounded-2xl flex items-center justify-between hover:border-white/10 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-xs uppercase">
                        {contact.contact_name ? contact.contact_name.slice(0, 2) : (contact.phone_number?.slice(-2) || 'WA')}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{contact.contact_name || contact.phone_number}</h4>
                          {contact.message_type && (
                            ['FREE_MESSAGE', 'DIRECT_MESSAGE'].includes(contact.message_type) ? (
                              <span className="text-[9px] font-black uppercase bg-cyan-500/10 text-cyan-500 px-1.5 py-0.5 rounded border border-cyan-500/20">
                                Template Grátis
                              </span>
                            ) : (
                              <span className="text-[9px] font-black uppercase bg-orange-500/10 text-orange-500 px-1.5 py-0.5 rounded border border-orange-500/20">
                                Template Pago
                              </span>
                            )
                          )}
                          {contact.is_interaction && (
                            <span className="text-[9px] font-black uppercase bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/10">
                              Interagiu
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className={`text-[10px] font-black uppercase tracking-widest py-0.5 px-2 rounded-lg ${contact.status === 'read' ? 'bg-purple-500/10 text-purple-400' :
                              contact.status === 'delivered' ? 'bg-blue-500/10 text-blue-400' :
                                contact.status === 'sent' ? 'bg-emerald-500/10 text-emerald-400' :
                                  'bg-red-500/10 text-red-500'
                            }`}>
                            {contact.status}
                          </span>

                          {/* AI Memory Status Component */}
                          {contact.memory_webhook_status && (
                            <div
                              className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 group/mem relative cursor-help"
                              title={contact.memory_webhook_error || (contact.memory_webhook_status === 'sent' ? 'Conteúdo salvo na Memória IA' : 'Aguardando processamento')}
                            >
                              <FiCpu size={12} className={
                                contact.memory_webhook_status === 'sent' || contact.memory_webhook_status === 'success' ? 'text-emerald-400 animate-pulse' :
                                  contact.memory_webhook_status === 'failed' ? 'text-red-400' :
                                    'text-gray-500'
                              } />
                              <span className={`text-[9px] font-bold uppercase tracking-tighter ${contact.memory_webhook_status === 'sent' || contact.memory_webhook_status === 'success' ? 'text-emerald-400/80' :
                                  contact.memory_webhook_status === 'failed' ? 'text-red-400/80' :
                                    'text-gray-500/80'
                                }`}>
                                Memória IA
                              </span>
                            </div>
                          )}

                          <span className="text-[10px] text-gray-500 font-mono">
                            {contact.updated_at ? new Date(contact.updated_at).toLocaleString() : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      {contact.chatwoot_url && (
                        <a 
                          href={contact.chatwoot_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white border border-indigo-700 transition-all text-[10px] font-black uppercase tracking-tight shadow-md shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95"
                          title="Abrir Chat no Chatwoot"
                        >
                          <FiMessageSquare size={12} />
                          Chat
                        </a>
                      )}

                      {contact.message_type && (
                        <span className={`text-[10px] font-black uppercase tracking-tight px-2 py-0.5 rounded border transition-all ${contact.message_type === 'TEMPLATE'
                            ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                            : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                          }`}>
                          {contact.message_type === 'TEMPLATE' ? 'Template Pago' : 'Template Grátis'}
                        </span>
                      )}

                      {contact.failure_reason && (
                        <div className="text-[9px] text-red-400 font-bold italic max-w-[150px] text-right leading-tight">
                          {contact.failure_reason}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        }
        </div>
      </div>
    </div>,
    document.body
  );
};
