import React, { useState, useEffect } from 'react';
import { FiSettings, FiUsers } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useClient } from '../contexts/ClientContext';
import { getApiUrl } from '../config';

// Subcomponentes Modulares
import CheckoutPresellHeader from './CheckoutPresell/components/CheckoutPresellHeader';
import CheckoutPresellConfigTab from './CheckoutPresell/components/CheckoutPresellConfigTab';
import CheckoutPresellLeadsTab from './CheckoutPresell/components/CheckoutPresellLeadsTab';
import DeleteLeadModal from './CheckoutPresell/components/DeleteLeadModal';
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

  const [copiedLeadId, setCopiedLeadId] = useState(null);

  // State Delete Modal
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, leadId: null, leadName: '' });
  const [deleting, setDeleting] = useState(false);

  // State Template Modal
  const [templateModal, setTemplateModal] = useState({ isOpen: false, lead: null, convo: null });
  const [loadingTemplateConvo, setLoadingTemplateConvo] = useState(false);

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

  const getPublicUrl = (customSlug) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/c/${customSlug || config.slug}`;
  };

  const copyPrepopulatedLink = (lead) => {
    const baseUrl = getPublicUrl();
    const url = `${baseUrl}?name=${encodeURIComponent(lead.name)}&email=${encodeURIComponent(lead.email)}&phone=${encodeURIComponent(lead.phone)}`;
    navigator.clipboard.writeText(url);
    setCopiedLeadId(lead.id);
    toast.success(`Link pré-populado para ${lead.name} copiado!`);
    setTimeout(() => setCopiedLeadId(null), 2000);
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <CheckoutPresellHeader
        config={config}
        getPublicUrl={getPublicUrl}
      />

      {/* Navegação por Abas (Tabs) */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setActiveTab('config')}
          className={`px-5 py-3 font-bold text-sm border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
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
          className={`px-5 py-3 font-bold text-sm border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
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
        <CheckoutPresellConfigTab
          config={config}
          setConfig={setConfig}
          loadingConfig={loadingConfig}
          savingConfig={savingConfig}
          onSaveConfig={handleSaveConfig}
          getPublicUrl={getPublicUrl}
        />
      )}

      {/* ABA 2: Tabela de Leads Capturados */}
      {activeTab === 'leads' && (
        <CheckoutPresellLeadsTab
          leads={leads}
          totalLeads={totalLeads}
          loadingLeads={loadingLeads}
          search={search}
          setSearch={setSearch}
          onSearchSubmit={handleSearchSubmit}
          page={page}
          setPage={setPage}
          limit={limit}
          setLimit={setLimit}
          copiedLeadId={copiedLeadId}
          onCopyPrepopulatedLink={copyPrepopulatedLink}
          onNavigateToChat={onNavigateToChat}
          onOpenDeleteModal={(lead) => setDeleteModal({ isOpen: true, leadId: lead.id, leadName: lead.name })}
          onOpenTemplateModal={handleOpenTemplateModal}
          loadingTemplateConvo={loadingTemplateConvo}
        />
      )}

      {/* Modal de Confirmação de Exclusão */}
      <DeleteLeadModal
        isOpen={deleteModal.isOpen}
        leadName={deleteModal.leadName}
        deleting={deleting}
        onClose={() => setDeleteModal({ isOpen: false, leadId: null, leadName: '' })}
        onConfirm={handleDeleteLead}
      />

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
