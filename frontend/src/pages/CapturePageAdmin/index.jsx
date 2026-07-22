import React, { useState, useEffect } from 'react';
import { 
  FiGlobe, FiSave, FiCopy, FiTrash2, FiSearch, 
  FiCheckCircle, FiExternalLink, FiUsers, FiSettings, FiCheck, FiUpload, FiX
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { API_URL, getApiUrl } from '../../config';
import { useClient } from '../../contexts/ClientContext';

export default function CapturePageAdmin() {
  const { activeClient } = useClient();
  const [activeTab, setActiveTab] = useState('config'); // 'config' | 'leads'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
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

      // Usar a rota genérica de uploads protegida por X-Client-ID
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

  const publicUrl = `${window.location.origin}/#/p/${formData.slug}`;

  const copyPublicLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success('Link público copiado para a área de transferência!');
    setTimeout(() => setCopied(false), 2000);
  };

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0d1520] p-6 rounded-2xl border border-gray-800 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl flex items-center justify-center text-2xl">
            <FiGlobe />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              Página de Captura Personalizada
              <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">
                Neon Vibe
              </span>
            </h1>
            <p className="text-xs text-gray-400">
              Configure os textos da sua página de captura e da página de obrigado com link do WhatsApp.
            </p>
          </div>
        </div>

        {/* Link Público */}
        <div className="flex items-center gap-2 bg-[#060a0f] p-2.5 rounded-xl border border-gray-800">
          <span className="text-xs text-gray-400 truncate max-w-xs">{publicUrl}</span>
          <button
            onClick={copyPublicLink}
            className="p-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-sm transition-all"
            title="Copiar Link Público"
          >
            {copied ? <FiCheck /> : <FiCopy />}
          </button>
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-all"
            title="Abrir Página Pública"
          >
            <FiExternalLink />
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 gap-2">
        <button
          onClick={() => setActiveTab('config')}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm rounded-t-xl transition-all ${
            activeTab === 'config'
              ? 'bg-[#0d1520] text-emerald-400 border-t-2 border-emerald-500'
              : 'text-gray-400 hover:text-white hover:bg-gray-900/50'
          }`}
        >
          <FiSettings />
          Configurações da Página
        </button>
        <button
          onClick={() => setActiveTab('leads')}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm rounded-t-xl transition-all ${
            activeTab === 'leads'
              ? 'bg-[#0d1520] text-emerald-400 border-t-2 border-emerald-500'
              : 'text-gray-400 hover:text-white hover:bg-gray-900/50'
          }`}
        >
          <FiUsers />
          Leads Capturados ({totalLeads})
        </button>
      </div>

      {/* Tab Configurações */}
      {activeTab === 'config' && (
        <form onSubmit={handleSaveConfig} className="bg-[#0d1520] p-6 rounded-2xl border border-gray-800 space-y-6 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Seção 1: Configuração do Link (Slug) */}
            <div className="col-span-full bg-[#070d14] p-4 rounded-xl border border-gray-800/80 space-y-3">
              <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <FiGlobe /> URL Pública & Slug
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Slug da Página (Endereço Único)</label>
                  <div className="flex items-center">
                    <span className="bg-gray-800 text-gray-400 text-xs px-3 py-2.5 rounded-l-xl border border-r-0 border-gray-700">/p/</span>
                    <input
                      type="text"
                      required
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      className="w-full bg-[#04080d] border border-gray-700 text-white text-xs rounded-r-xl px-3 py-2.5 focus:border-emerald-500 outline-none"
                      placeholder="masterclass"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Tag para os Leads Capturados</label>
                  <input
                    type="text"
                    value={formData.tag_name}
                    onChange={(e) => setFormData({ ...formData, tag_name: e.target.value })}
                    className="w-full bg-[#04080d] border border-gray-700 text-white text-xs rounded-xl px-3 py-2.5 focus:border-emerald-500 outline-none"
                    placeholder="Página de Captura"
                  />
                </div>
              </div>
            </div>

            {/* Seção 2: Textos da Página de Captura */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-gray-800 pb-2">
                1. Textos da Página de Captura
              </h3>
              
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Headline Principal (Topo)</label>
                <input
                  type="text"
                  value={formData.headline}
                  onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                  className="w-full bg-[#060a0f] border border-gray-800 text-white text-xs rounded-xl p-3 focus:border-emerald-500 outline-none"
                  placeholder="INTENSIVO"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Badge de Texto</label>
                  <input
                    type="text"
                    value={formData.badge_text}
                    onChange={(e) => setFormData({ ...formData, badge_text: e.target.value })}
                    className="w-full bg-[#060a0f] border border-gray-800 text-white text-xs rounded-xl p-3 focus:border-emerald-500 outline-none"
                    placeholder="Aulas do Miguel"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Badge de Status</label>
                  <input
                    type="text"
                    value={formData.badge_status}
                    onChange={(e) => setFormData({ ...formData, badge_status: e.target.value })}
                    className="w-full bg-[#060a0f] border border-gray-800 text-white text-xs rounded-xl p-3 focus:border-emerald-500 outline-none"
                    placeholder="AO VIVO"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Data do Evento</label>
                <input
                  type="text"
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                  className="w-full bg-[#060a0f] border border-gray-800 text-white text-xs rounded-xl p-3 focus:border-emerald-500 outline-none"
                  placeholder="Hoje, 21 de Dezembro, às 20h"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Título de Chamada</label>
                <input
                  type="text"
                  value={formData.main_title}
                  onChange={(e) => setFormData({ ...formData, main_title: e.target.value })}
                  className="w-full bg-[#060a0f] border border-gray-800 text-white text-xs rounded-xl p-3 focus:border-emerald-500 outline-none"
                  placeholder="VOCÊ ESTÁ QUASE LÁ!"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Descrição em Destaque</label>
                <textarea
                  rows="3"
                  value={formData.main_description}
                  onChange={(e) => setFormData({ ...formData, main_description: e.target.value })}
                  className="w-full bg-[#060a0f] border border-gray-800 text-white text-xs rounded-xl p-3 focus:border-emerald-500 outline-none"
                  placeholder="Cadastre seu melhor email para receber o link de acesso..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Placeholder do E-mail</label>
                  <input
                    type="text"
                    value={formData.email_placeholder}
                    onChange={(e) => setFormData({ ...formData, email_placeholder: e.target.value })}
                    className="w-full bg-[#060a0f] border border-gray-800 text-white text-xs rounded-xl p-3 focus:border-emerald-500 outline-none"
                    placeholder="Seu melhor email"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Texto do Botão CTA</label>
                  <input
                    type="text"
                    value={formData.button_text}
                    onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
                    className="w-full bg-[#060a0f] border border-gray-800 text-white text-xs rounded-xl p-3 focus:border-emerald-500 outline-none"
                    placeholder="QUERO PARTICIPAR DO INTENSIVO!"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Imagem de Fundo da Página (Upload)</label>
                
                {formData.bg_image_url ? (
                  <div className="relative rounded-2xl overflow-hidden border border-emerald-500/40 bg-[#060a0f] p-3 flex items-center gap-4">
                    <img 
                      src={formData.bg_image_url} 
                      alt="Fundo da Página" 
                      className="w-20 h-14 object-cover rounded-xl border border-gray-800"
                    />
                    <div className="flex-1 truncate">
                      <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                        <FiCheckCircle /> Imagem Carregada
                      </p>
                      <p className="text-[11px] text-gray-400 truncate font-mono">{formData.bg_image_url}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, bg_image_url: '' })}
                      className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all"
                      title="Remover Imagem"
                    >
                      <FiX />
                    </button>
                  </div>
                ) : (
                  <div className="relative border-2 border-dashed border-gray-800 hover:border-emerald-500/50 rounded-2xl bg-[#060a0f] p-4 text-center transition-all">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBgUpload}
                      disabled={uploadingBg}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                    />
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center text-lg">
                        {uploadingBg ? (
                          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <FiUpload />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white">
                          {uploadingBg ? 'Fazemdo Upload...' : 'Clique para selecionar uma imagem do seu computador'}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5">PNG, JPG, WEBP até 10MB</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Nota de Segurança / Rodapé</label>
                <input
                  type="text"
                  value={formData.footer_note}
                  onChange={(e) => setFormData({ ...formData, footer_note: e.target.value })}
                  className="w-full bg-[#060a0f] border border-gray-800 text-white text-xs rounded-xl p-3 focus:border-emerald-500 outline-none"
                  placeholder="Seus dados estão seguros. Não enviamos spam."
                />
              </div>
            </div>

            {/* Seção 3: Textos & Link da Página de Obrigado */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider border-b border-gray-800 pb-2">
                2. Página de Obrigado & WhatsApp
              </h3>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Título de Confirmação</label>
                <input
                  type="text"
                  value={formData.thank_you_title}
                  onChange={(e) => setFormData({ ...formData, thank_you_title: e.target.value })}
                  className="w-full bg-[#060a0f] border border-gray-800 text-white text-xs rounded-xl p-3 focus:border-emerald-500 outline-none"
                  placeholder="Inscrição Confirmada!"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Instruções da Página de Obrigado</label>
                <textarea
                  rows="3"
                  value={formData.thank_you_description}
                  onChange={(e) => setFormData({ ...formData, thank_you_description: e.target.value })}
                  className="w-full bg-[#060a0f] border border-gray-800 text-white text-xs rounded-xl p-3 focus:border-emerald-500 outline-none"
                  placeholder="Entre no grupo VIP do WhatsApp para receber o link de acesso..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-400 mb-1">URL / Link do Grupo de WhatsApp</label>
                <input
                  type="url"
                  required
                  value={formData.whatsapp_group_url}
                  onChange={(e) => setFormData({ ...formData, whatsapp_group_url: e.target.value })}
                  className="w-full bg-[#060a0f] border border-emerald-500/40 text-emerald-300 text-xs rounded-xl p-3 focus:border-emerald-400 outline-none font-mono"
                  placeholder="https://chat.whatsapp.com/xyz123"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Texto do Botão do WhatsApp</label>
                <input
                  type="text"
                  value={formData.whatsapp_button_text}
                  onChange={(e) => setFormData({ ...formData, whatsapp_button_text: e.target.value })}
                  className="w-full bg-[#060a0f] border border-gray-800 text-white text-xs rounded-xl p-3 focus:border-emerald-500 outline-none"
                  placeholder="ENTRAR NO GRUPO DO WHATSAPP"
                />
              </div>
            </div>

          </div>

          <div className="flex justify-end pt-4 border-t border-gray-800">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm px-6 py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              <FiSave />
              {saving ? 'Salvando Alterações...' : 'Salvar Configuração'}
            </button>
          </div>
        </form>
      )}

      {/* Tab Leads Capturados */}
      {activeTab === 'leads' && (
        <div className="bg-[#0d1520] p-6 rounded-2xl border border-gray-800 space-y-4 shadow-xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <FiUsers /> Leads Capturados nesta Página
            </h3>

            <div className="relative w-full md:w-64">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por e-mail..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  fetchLeads(1, e.target.value);
                }}
                className="w-full bg-[#060a0f] border border-gray-800 text-xs text-white rounded-xl pl-9 pr-3 py-2 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          {loadingLeads ? (
            <div className="p-8 text-center text-gray-400">Buscando lista de e-mails...</div>
          ) : leads.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-xs bg-[#060a0f] rounded-xl border border-gray-800/50">
              Nenhum lead capturado até o momento.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400">
                    <th className="py-3 px-4">E-mail Registrado</th>
                    <th className="py-3 px-4">Data de Cadastro</th>
                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {leads.map((l) => (
                    <tr key={l.id} className="hover:bg-gray-800/30 transition-all">
                      <td className="py-3 px-4 font-mono text-emerald-400 font-semibold">{l.email}</td>
                      <td className="py-3 px-4 text-gray-400">
                        {l.created_at ? new Date(l.created_at).toLocaleString('pt-BR') : '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setLeadToDelete(l)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
                          title="Excluir Lead"
                        >
                          <FiTrash2 />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal de Confirmação de Deleção */}
      {leadToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d1520] border border-gray-800 rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl">
            <div className="w-12 h-12 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 text-xl">
              <FiTrash2 />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Excluir Lead</h3>
            <p className="text-xs text-gray-400 mb-6">
              Deseja remover o e-mail <span className="text-white font-mono">{leadToDelete.email}</span>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setLeadToDelete(null)}
                className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold text-xs rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteLead}
                className="w-full py-2.5 bg-red-500 hover:bg-red-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-500/20"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
