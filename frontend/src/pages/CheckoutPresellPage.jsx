import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiGlobe, FiCopy, FiExternalLink, FiSave, FiUsers, FiSearch, FiMessageSquare, FiTrash2, FiCheck, FiRefreshCw, FiZap, FiTag, FiLink, FiSettings, FiChevronLeft, FiChevronRight, FiSend } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useClient } from '../contexts/ClientContext';
import { getApiUrl } from '../config';
import SendTemplateModal from './ChatConversations/SendTemplateModal';

export default function CheckoutPresellPage({ onNavigateToChat }) {
  const { activeClient } = useClient();
  const [activeTab, setActiveTab] = useState('config'); // 'config' | 'leads'

  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [loadingLeads, setLoadingLeads] = useState(true);

  // State Configuração
  const [config, setConfig] = useState({
    slug: '',
    title: 'Aplicação Mentoria',
    description: 'Preencha seus dados para continuar com sua aplicação',
    badge_text: '⚡ Vagas Limitadas',
    destination_url: 'https://whatsapp.com',
    tag_name: 'Checkout Presell',
    page_tab_title: 'Aplicação Mentoria',
    button_text: 'Continuar com Aplicação →'
  });

  // State Leads & Paginação
  const [leads, setLeads] = useState([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedLeadId, setCopiedLeadId] = useState(null);

  // State Delete Modal
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, leadId: null, leadName: '' });
  const [deleting, setDeleting] = useState(false);

  // State Template Modal
  const [templateModal, setTemplateModal] = useState({ isOpen: false, lead: null, convo: null });
  const [loadingTemplateConvo, setLoadingTemplateConvo] = useState(false);

  const handleOpenTemplateModal = async (lead) => {
    try {
      setLoadingTemplateConvo(true);
      const res = await fetch(getApiUrl('/api/chat/conversations/get-or-create'), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          phone: lead.phone,
          name: lead.name
        })
      });

      if (res.ok) {
        const convoData = await res.json();
        setTemplateModal({
          isOpen: true,
          lead: lead,
          convo: {
            id: convoData.id,
            phone: convoData.phone,
            contact_name: convoData.contact_name,
            last_contact_message_at: convoData.last_contact_message_at
          }
        });
      } else {
        toast.error('Erro ao preparar conversa para disparo do template.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao preparar disparo.');
    } finally {
      setLoadingTemplateConvo(false);
    }
  };

  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Client-ID': String(activeClient?.id || 1)
    };
  };

  const fetchConfig = async () => {
    try {
      setLoadingConfig(true);
      const res = await fetch(getApiUrl('/api/checkout-presell/config'), {
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      } else {
        toast.error('Erro ao carregar configurações do checkout.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao carregar configurações.');
    } finally {
      setLoadingConfig(false);
    }
  };

  const fetchLeads = async () => {
    try {
      setLoadingLeads(true);
      const skip = (page - 1) * limit;
      let query = `?skip=${skip}&limit=${limit}`;
      if (search) query += `&search=${encodeURIComponent(search)}`;

      const res = await fetch(getApiUrl(`/api/checkout-presell/leads${query}`), {
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setLeads(data.items || []);
        setTotalLeads(data.total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLeads(false);
    }
  };

  useEffect(() => {
    if (activeClient?.id) {
      fetchConfig();
      fetchLeads();
    }
  }, [activeClient?.id]);

  useEffect(() => {
    if (activeClient?.id) {
      fetchLeads();
    }
  }, [activeClient?.id, page, limit]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLeads();
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    if (!config.slug.trim()) {
      toast.error('O slug da URL é obrigatório.');
      return;
    }
    if (!config.destination_url.trim()) {
      toast.error('A URL de Destino Final é obrigatória.');
      return;
    }

    try {
      setSavingConfig(true);
      const res = await fetch(getApiUrl('/api/checkout-presell/config'), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(config)
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        toast.success('Configurações salvas com sucesso!');
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.detail || 'Erro ao salvar configurações.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao conectar com o servidor.');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleDeleteLead = async () => {
    if (!deleteModal.leadId) return;
    try {
      setDeleting(true);
      const res = await fetch(getApiUrl(`/api/checkout-presell/leads/${deleteModal.leadId}`), {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        toast.success('Lead removido com sucesso!');
        fetchLeads();
      } else {
        toast.error('Erro ao remover lead.');
      }
    } catch (err) {
      toast.error('Erro ao conectar com o servidor.');
    } finally {
      setDeleting(false);
      setDeleteModal({ isOpen: false, leadId: null, leadName: '' });
    }
  };

  const getPublicUrl = (customSlug) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/c/${customSlug || config.slug}`;
  };

  const copyPublicLink = () => {
    const url = getPublicUrl();
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success('Link copiado para a área de transferência!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyPrepopulatedLink = (lead) => {
    const baseUrl = getPublicUrl();
    const url = `${baseUrl}?name=${encodeURIComponent(lead.name)}&email=${encodeURIComponent(lead.email)}&phone=${encodeURIComponent(lead.phone)}`;
    navigator.clipboard.writeText(url);
    setCopiedLeadId(lead.id);
    toast.success(`Link pré-populado para ${lead.name} copiado!`);
    setTimeout(() => setCopiedLeadId(null), 2000);
  };

  const totalPages = Math.ceil(totalLeads / limit) || 1;
  const startItem = totalLeads === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, totalLeads);

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <FiGlobe size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Checkout Prepopulado</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Configure sua landing page de aplicação pré-populada e monitore os leads capturados</p>
            </div>
          </div>
        </div>

        {/* Link Rápido */}
        {config.slug && (
          <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 p-2.5 rounded-xl">
            <span className="text-xs font-mono text-blue-700 dark:text-blue-300 truncate max-w-xs">{getPublicUrl()}</span>
            <button
              onClick={copyPublicLink}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center gap-1.5 text-xs font-semibold"
              title="Copiar Link"
            >
              {copiedLink ? <FiCheck size={14} /> : <FiCopy size={14} />}
              {copiedLink ? 'Copiado!' : 'Copiar'}
            </button>
            <a
              href={getPublicUrl()}
              target="_blank"
              rel="noreferrer"
              className="p-2 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-all text-xs"
              title="Testar em nova aba"
            >
              <FiExternalLink size={14} />
            </a>
          </div>
        )}
      </div>

      {/* Navegação por Abas (Tabs) */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setActiveTab('config')}
          className={`px-5 py-3 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'config'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <FiSettings size={16} /> Configurações da Página
        </button>
        <button
          onClick={() => {
            setActiveTab('leads');
            fetchLeads();
          }}
          className={`px-5 py-3 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'leads'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <FiUsers size={16} /> Leads Capturados
          <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 font-extrabold">
            {totalLeads}
          </span>
        </button>
      </div>

      {/* ABA 1: Form de Configurações */}
      {activeTab === 'config' && (
        <div className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-white/5 rounded-2xl p-6 shadow-sm space-y-6 animate-fade-in">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FiZap className="text-yellow-500" /> Configurações do Checkout
            </h2>
            {loadingConfig && <span className="text-xs text-gray-400 animate-pulse">Carregando...</span>}
          </div>

          <form onSubmit={handleSaveConfig} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Slug */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                URL Personalizada (Slug) *
              </label>
              <div className="flex items-center rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                <span className="px-3 text-xs text-gray-400 font-mono border-r border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800 py-3">/c/</span>
                <input
                  type="text"
                  value={config.slug}
                  onChange={(e) => setConfig({ ...config, slug: e.target.value })}
                  placeholder="mentoria-vip"
                  className="w-full px-3 py-2 bg-transparent text-gray-900 dark:text-white focus:outline-none text-sm font-mono"
                  required
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Sua página estará disponível em: <span className="font-mono text-blue-500">{getPublicUrl(config.slug)}</span></p>
            </div>

            {/* URL de Destino Final */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                URL de Destino Final (Checkout ou WhatsApp) *
              </label>
              <input
                type="url"
                value={config.destination_url}
                onChange={(e) => setConfig({ ...config, destination_url: e.target.value })}
                placeholder="https://pay.kiwify.com.br/seu-checkout"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                required
              />
              <p className="text-xs text-gray-400 mt-1">Ao submeter, o lead será redirecionado para esta URL com dados pré-populados.</p>
            </div>

            {/* Título Principal */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Título da Página
              </label>
              <input
                type="text"
                value={config.title}
                onChange={(e) => setConfig({ ...config, title: e.target.value })}
                placeholder="Aplicação Mentoria"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
              />
            </div>

            {/* Subtítulo / Descrição */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Subtítulo / Descrição
              </label>
              <input
                type="text"
                value={config.description}
                onChange={(e) => setConfig({ ...config, description: e.target.value })}
                placeholder="Preencha seus dados para continuar com sua aplicação"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
              />
            </div>

            {/* Texto da Badge */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Texto da Badge Superior
              </label>
              <input
                type="text"
                value={config.badge_text}
                onChange={(e) => setConfig({ ...config, badge_text: e.target.value })}
                placeholder="⚡ Vagas Limitadas"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
              />
            </div>

            {/* Tag Automática do Lead */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Etiqueta Automática do Lead (Tag)
              </label>
              <input
                type="text"
                value={config.tag_name}
                onChange={(e) => setConfig({ ...config, tag_name: e.target.value })}
                placeholder="Checkout Presell"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
              />
            </div>

            {/* Título da Aba do Navegador (Document Title) */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Título da Aba do Navegador (Nome que aparece na aba do browser)
              </label>
              <input
                type="text"
                value={config.page_tab_title || ''}
                onChange={(e) => setConfig({ ...config, page_tab_title: e.target.value })}
                placeholder="Aplicação Mentoria - Vagas Limitadas"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-medium"
              />
            </div>

            {/* Texto do Botão */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Texto do Botão Principal
              </label>
              <input
                type="text"
                value={config.button_text}
                onChange={(e) => setConfig({ ...config, button_text: e.target.value })}
                placeholder="Continuar com Aplicação →"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
              />
            </div>

            {/* Submit Button */}
            <div className="md:col-span-2 flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingConfig}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {savingConfig ? <FiRefreshCw className="animate-spin" /> : <FiSave />}
                {savingConfig ? 'Salvando...' : 'Salvar Configurações'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ABA 2: Tabela de Leads Capturados */}
      {activeTab === 'leads' && (
        <div className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-white/5 rounded-2xl p-6 shadow-sm space-y-6 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-500/10 text-green-500 rounded-xl">
                <FiUsers size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Leads Capturados ({totalLeads})</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Contatos que preencheram o checkout de aplicação nesta página</p>
              </div>
            </div>

            {/* Search Box */}
            <form onSubmit={handleSearchSubmit} className="relative w-full md:w-72">
              <FiSearch className="absolute left-3.5 top-3 text-gray-400" size={16} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, email ou zap..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
              />
            </form>
          </div>

          {/* Table Content */}
          {loadingLeads ? (
            <div className="py-12 text-center text-gray-400 animate-pulse">Carregando leads capturados...</div>
          ) : leads.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <FiUsers className="mx-auto text-gray-300 dark:text-gray-600" size={40} />
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Nenhum lead capturado ainda nesta página.</p>
              <p className="text-xs text-gray-400">Divulgue seu link público para começar a receber inscrições.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Nome</th>
                      <th className="py-3 px-4">E-mail</th>
                      <th className="py-3 px-4">WhatsApp</th>
                      <th className="py-3 px-4">Etiqueta</th>
                      <th className="py-3 px-4">Data/Hora</th>
                      <th className="py-3 px-4 text-right">Ações Rápidas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50 text-sm">
                    {leads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-gray-900 dark:text-white">{lead.name}</td>
                        <td className="py-3.5 px-4 text-gray-600 dark:text-gray-300">{lead.email}</td>
                        <td className="py-3.5 px-4 font-mono text-gray-600 dark:text-gray-300">+{lead.phone}</td>
                        <td className="py-3.5 px-4">
                          {lead.tag_name ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                              <FiTag size={10} /> {lead.tag_name}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-gray-400">
                          {lead.created_at ? new Date(lead.created_at).toLocaleString('pt-BR') : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Copiar Link Pré-populado */}
                            <button
                              onClick={() => copyPrepopulatedLink(lead)}
                              className="px-2.5 py-1.5 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-semibold transition-all flex items-center gap-1"
                              title="Copiar link pré-populado para este lead"
                            >
                              {copiedLeadId === lead.id ? <FiCheck size={14} /> : <FiLink size={14} />}
                              {copiedLeadId === lead.id ? 'Copiado!' : 'Copiar Link Lead'}
                            </button>

                            {/* Ir para o Chat (Apenas se o chat já existir no ZapVoice para este contato) */}
                            {lead.has_chat && onNavigateToChat && (
                              <button
                                onClick={() => onNavigateToChat({ id: lead.conversation_id, name: lead.name, phone: lead.phone })}
                                className="p-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 rounded-lg text-xs transition-all"
                                title="Abrir conversa no Chat"
                              >
                                <FiMessageSquare size={16} />
                              </button>
                            )}

                            {/* Excluir Lead */}
                            <button
                              onClick={() => setDeleteModal({ isOpen: true, leadId: lead.id, leadName: lead.name })}
                              className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg text-xs transition-all"
                              title="Excluir Lead"
                            >
                              <FiTrash2 size={16} />
                            </button>

                            {/* Escolher Template / Disparo Rápido (DO LADO DIREITO DO BOTÃO DE DELETAR) */}
                            <button
                              onClick={() => handleOpenTemplateModal(lead)}
                              disabled={loadingTemplateConvo}
                              className="p-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-lg text-xs transition-all disabled:opacity-50"
                              title="Escolher Template para Disparo"
                            >
                              <FiSend size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Rodapé da Tabela com Paginação & Dropdown (20, 50, 100, 200) */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100 dark:border-gray-800 text-sm text-gray-500 dark:text-gray-400">
                {/* Seletor de limite por página */}
                <div className="flex items-center gap-2">
                  <span>Exibir</span>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    className="px-2.5 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                  </select>
                  <span>contatos por página</span>
                </div>

                {/* Range de contatos exibidos */}
                <div className="text-xs">
                  Mostrando <strong className="text-gray-900 dark:text-white">{startItem}</strong> a <strong className="text-gray-900 dark:text-white">{endItem}</strong> de <strong className="text-gray-900 dark:text-white">{totalLeads}</strong> contatos
                </div>

                {/* Botões de Navegação de Página */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage(prev => Math.max(1, prev - 1))}
                    disabled={page === 1}
                    className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                    title="Página Anterior"
                  >
                    <FiChevronLeft size={16} />
                  </button>

                  <span className="px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold rounded-lg text-xs">
                    Página {page} de {totalPages}
                  </span>

                  <button
                    onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={page >= totalPages}
                    className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                    title="Próxima Página"
                  >
                    <FiChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Modal de Confirmação de Exclusão usando React Portal para COBRIR A TELA TODA */}
      {deleteModal.isOpen && createPortal(
        <div
          className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-[#0f172a] border border-gray-800 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl text-white animate-in zoom-in-95 duration-150">
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-red-500 flex items-center gap-2">
                <FiTrash2 /> Confirmar Deleção
              </h3>
              <p className="text-sm text-gray-300 leading-relaxed">
                Tem certeza que deseja remover o lead <strong className="text-white">{deleteModal.leadName}</strong>? Essa ação não poderá ser desfeita.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-800">
              <button
                type="button"
                onClick={() => setDeleteModal({ isOpen: false, leadId: null, leadName: '' })}
                disabled={deleting}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-semibold text-sm transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteLead}
                disabled={deleting}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-red-600/30 transition-all flex items-center gap-2"
              >
                {deleting ? <FiRefreshCw className="animate-spin" /> : <FiTrash2 />}
                {deleting ? 'Removendo...' : 'Excluir Lead'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal para Seleção e Envio de Template do WhatsApp */}
      {templateModal.isOpen && (
        <SendTemplateModal
          isOpen={templateModal.isOpen}
          onClose={() => setTemplateModal({ isOpen: false, lead: null, convo: null })}
          activeClient={activeClient}
          selectedConvo={templateModal.convo}
          onSendSuccess={() => {
            toast.success('Template enviado com sucesso!');
            fetchLeads();
          }}
        />
      )}
    </div>
  );
}
