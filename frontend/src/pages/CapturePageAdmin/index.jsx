import React, { useState, useEffect } from 'react';
import { FiUsers, FiSettings } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getApiUrl } from '../../config';
import { useClient } from '../../contexts/ClientContext';

// Subcomponentes Modulares
import CapturePageHeader from './components/CapturePageHeader';
import CapturePageConfigTab from './components/CapturePageConfigTab';
import CapturePageLeadsTab from './components/CapturePageLeadsTab';
import DeleteCaptureLeadModal from './components/DeleteCaptureLeadModal';

export default function CapturePageAdmin() {
  const { activeClient } = useClient();
  const [activeTab, setActiveTab] = useState('config'); // 'config' | 'leads'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);

  const getHeaders = (isJson = true) => {
    const token = localStorage.getItem('token');
    const headers = {
      'Authorization': `Bearer ${token}`,
      'X-Client-ID': String(activeClient?.id || 1)
    };
    if (isJson) {
      headers['Content-Type'] = 'application/json';
    }
    return headers;
  };

  // Config State
  const [formData, setFormData] = useState({
    slug: 'masterclass',
    headline: 'INTENSIVO',
    badge_text: 'Aulas do Miguel',
    badge_status: 'AO VIVO',
    event_date: 'Hoje, 21 de Dezembro, às 20h',
    main_title: 'VOCÊ ESTÁ QUASE LÁ!',
    main_description: 'Cadastre seu melhor email para receber o link de acesso e garantir sua vaga no intensivo.',
    email_placeholder: 'Seu melhor email',
    button_text: 'QUERO PARTICIPAR DO INTENSIVO!',
    bg_image_url: '',
    footer_note: 'Seus dados estão seguros. Não enviamos spam.',
    thank_you_title: 'Inscrição Confirmada!',
    thank_you_description: 'Entre no grupo VIP do WhatsApp para receber o link de acesso e os materiais exclusivos.',
    whatsapp_group_url: 'https://chat.whatsapp.com/',
    whatsapp_button_text: 'ENTRAR NO GRUPO DO WHATSAPP',
    tag_name: 'Página de Captura'
  });

  // Leads State
  const [leads, setLeads] = useState([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loadingLeads, setLoadingLeads] = useState(false);

  // Modal Delete State
  const [leadToDelete, setLeadToDelete] = useState(null);

  useEffect(() => {
    fetchConfig();
    fetchLeads();
  }, [activeClient?.id]);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch(getApiUrl('/api/chat/capture-page/config'), {
        headers: getHeaders(false)
      });
      if (res.ok) {
        const data = await res.json();
        setFormData({
          slug: data.slug || 'masterclass',
          headline: data.headline || 'INTENSIVO',
          badge_text: data.badge_text || 'Aulas do Miguel',
          badge_status: data.badge_status || 'AO VIVO',
          event_date: data.event_date || 'Hoje, 21 de Dezembro, às 20h',
          main_title: data.main_title || 'VOCÊ ESTÁ QUASE LÁ!',
          main_description: data.main_description || '',
          email_placeholder: data.email_placeholder || 'Seu melhor email',
          button_text: data.button_text || 'QUERO PARTICIPAR DO INTENSIVO!',
          bg_image_url: data.bg_image_url || '',
          footer_note: data.footer_note || 'Seus dados estão seguros.',
          thank_you_title: data.thank_you_title || 'Inscrição Confirmada!',
          thank_you_description: data.thank_you_description || '',
          whatsapp_group_url: data.whatsapp_group_url || 'https://chat.whatsapp.com/',
          whatsapp_button_text: data.whatsapp_button_text || 'ENTRAR NO GRUPO DO WHATSAPP',
          tag_name: data.tag_name || 'Página de Captura'
        });
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar configuração.');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeads = async (pageArg = 1, searchArg = search) => {
    try {
      setLoadingLeads(true);
      const query = new URLSearchParams({ page: pageArg, limit: 15, search: searchArg });
      const res = await fetch(getApiUrl(`/api/chat/capture-page/leads?${query.toString()}`), {
        headers: getHeaders(false)
      });
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
        setTotalLeads(data.total_count || 0);
        setPage(data.page || 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLeads(false);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch(getApiUrl('/api/chat/capture-page/config'), {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Erro ao salvar alterações.');
      }
      toast.success('Configuração da Página de Captura salva com sucesso!');
      setFormData(prev => ({ ...prev, slug: data.slug }));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLead = async () => {
    if (!leadToDelete) return;
    try {
      const res = await fetch(getApiUrl(`/api/chat/capture-page/leads/${leadToDelete.id}`), {
        method: 'DELETE',
        headers: getHeaders(false)
      });
      if (res.ok) {
        toast.success('Lead excluído!');
        setLeadToDelete(null);
        fetchLeads(page, search);
      } else {
        toast.error('Erro ao excluir lead.');
      }
    } catch (err) {
      toast.error('Erro ao conectar com o servidor.');
    }
  };

  const handleBgUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WEBP).');
      return;
    }

    try {
      setUploadingBg(true);
      const data = new FormData();
      data.append('file', file);

      const res = await fetch(getApiUrl('/api/upload'), {
        method: 'POST',
        headers: getHeaders(false),
        body: data
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.detail || 'Erro ao realizar upload da imagem.');
      }

      const imageUrl = result.file_url || result.url;
      setFormData(prev => ({ ...prev, bg_image_url: imageUrl }));
      toast.success('Imagem de fundo enviada com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Falha ao enviar imagem.');
    } finally {
      setUploadingBg(false);
    }
  };

  const publicUrl = `${window.location.origin}/${formData.slug}`;

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-400">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Carregando informações da Página de Captura...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 text-gray-100 font-sans">
      {/* Header */}
      <CapturePageHeader publicUrl={publicUrl} />

      {/* Tabs */}
      <div className="flex border-b border-gray-800 gap-2">
        <button
          onClick={() => setActiveTab('config')}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm rounded-t-xl transition-all cursor-pointer ${
            activeTab === 'config'
              ? 'bg-[#111827] text-emerald-400 border-t-2 border-emerald-500'
              : 'text-gray-400 hover:text-white hover:bg-gray-900/50'
          }`}
        >
          <FiSettings />
          Configurações da Página
        </button>
        <button
          onClick={() => setActiveTab('leads')}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm rounded-t-xl transition-all cursor-pointer ${
            activeTab === 'leads'
              ? 'bg-[#111827] text-emerald-400 border-t-2 border-emerald-500'
              : 'text-gray-400 hover:text-white hover:bg-gray-900/50'
          }`}
        >
          <FiUsers />
          Leads Capturados ({totalLeads})
        </button>
      </div>

      {/* Tab Configurações */}
      {activeTab === 'config' && (
        <CapturePageConfigTab
          formData={formData}
          setFormData={setFormData}
          saving={saving}
          onSaveConfig={handleSaveConfig}
          handleBgUpload={handleBgUpload}
          uploadingBg={uploadingBg}
        />
      )}

      {/* Tab Leads Capturados */}
      {activeTab === 'leads' && (
        <CapturePageLeadsTab
          leads={leads}
          loadingLeads={loadingLeads}
          search={search}
          setSearch={setSearch}
          onSearchChange={(query) => fetchLeads(1, query)}
          onOpenDeleteModal={(lead) => setLeadToDelete(lead)}
        />
      )}

      {/* Modal de Confirmação de Deleção */}
      <DeleteCaptureLeadModal
        leadToDelete={leadToDelete}
        onClose={() => setLeadToDelete(null)}
        onConfirm={handleDeleteLead}
      />
    </div>
  );
}
