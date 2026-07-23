import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiZap, FiSend, FiTag, FiFileText, FiCheckCircle, FiSearch, FiChevronDown } from 'react-icons/fi';
import { API_URL } from '../../config';

import { useClient } from '../../contexts/ClientContext';

// Componente de Dropdown com Campo de Busca (Pesquisável em Tempo Real)
function SearchableTemplateSelect({ templates, selectedId, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedTemplate = templates.find(t => String(t.id) === String(selectedId));

  const filteredTemplates = templates.filter(t => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (t.name && t.name.toLowerCase().includes(q)) ||
      (t.subject && t.subject.toLowerCase().includes(q))
    );
  });

  return (
    <div className="relative w-full">
      {/* Botão de Seleção do Dropdown */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-white font-semibold flex items-center justify-between shadow-sm focus:ring-2 focus:ring-blue-500 transition-all text-left"
      >
        <span className="truncate">
          {selectedTemplate ? (
            <>✉️ <strong className="font-bold">{selectedTemplate.name}</strong> <span className="text-xs text-gray-400 font-normal">(Assunto: {selectedTemplate.subject})</span></>
          ) : (
            <span className="text-gray-400 font-normal">Selecione um template...</span>
          )}
        </span>
        <FiChevronDown className={`ml-2 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Painel do Dropdown com Campo de Busca em Tempo Real */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden animate-fade-in">
          {/* Campo de Texto para Pesquisa */}
          <div className="p-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-slate-900/80 flex items-center gap-2">
            <FiSearch className="text-gray-400 text-sm ml-1 shrink-0" />
            <input
              type="text"
              autoFocus
              placeholder="Digite o nome ou assunto do e-mail..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs text-gray-800 dark:text-white border-none focus:outline-none focus:ring-0 placeholder-gray-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-xs text-gray-400 hover:text-gray-200 px-1 font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Lista de Opções Filtradas */}
          <div className="max-h-56 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700/50">
            {filteredTemplates.length === 0 ? (
              <div className="p-3 text-xs text-center text-gray-400 italic">
                Nenhum template encontrado para "{searchQuery}"
              </div>
            ) : (
              filteredTemplates.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    onSelect(t.id);
                    setIsOpen(false);
                    setSearchQuery('');
                  }}
                  className={`w-full px-3 py-2.5 text-left text-xs hover:bg-blue-500/10 dark:hover:bg-blue-500/20 transition-all flex flex-col gap-0.5 ${
                    String(t.id) === String(selectedId)
                      ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold'
                      : 'text-gray-700 dark:text-gray-200'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    <span>✉️</span>
                    <span>{t.name}</span>
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 font-normal truncate">
                    Assunto: {t.subject}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}


// Componente de Dropdown Pesquisável para Seleção de Etiquetas da Aba de Contatos
function SearchableTagSelect({ tags, selectedTag, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTags = tags.filter(t => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return t.toLowerCase().includes(q);
  });

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-white font-semibold flex items-center justify-between shadow-sm focus:ring-2 focus:ring-blue-500 transition-all text-left"
      >
        <span className="truncate flex items-center gap-2">
          {selectedTag ? (
            <>🏷️ <strong className="font-bold text-blue-600 dark:text-blue-400">{selectedTag}</strong></>
          ) : (
            <span className="text-gray-400 font-normal">🏷️ Todas as etiquetas (Disparar para todos os contatos com e-mail)</span>
          )}
        </span>
        <FiChevronDown className={`ml-2 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden animate-fade-in">
          <div className="p-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-slate-900/80 flex items-center gap-2">
            <FiSearch className="text-gray-400 text-sm ml-1 shrink-0" />
            <input
              type="text"
              autoFocus
              placeholder="Pesquisar etiqueta..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs text-gray-800 dark:text-white border-none focus:outline-none focus:ring-0 placeholder-gray-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-xs text-gray-400 hover:text-gray-200 px-1 font-bold"
              >
                ✕
              </button>
            )}
          </div>

          <div className="max-h-56 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700/50">
            {/* Opção para selecionar NENHUMA (Todas as etiquetas) */}
            <button
              type="button"
              onClick={() => {
                onSelect('');
                setIsOpen(false);
                setSearchQuery('');
              }}
              className={`w-full px-3 py-2.5 text-left text-xs hover:bg-blue-500/10 dark:hover:bg-blue-500/20 transition-all font-semibold ${
                !selectedTag ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              🏷️ Todas as etiquetas (Sem filtro)
            </button>

            {filteredTags.length === 0 ? (
              <div className="p-3 text-xs text-center text-gray-400 italic">
                Nenhuma etiqueta encontrada para "{searchQuery}"
              </div>
            ) : (
              filteredTags.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    onSelect(t);
                    setIsOpen(false);
                    setSearchQuery('');
                  }}
                  className={`w-full px-3 py-2.5 text-left text-xs hover:bg-blue-500/10 dark:hover:bg-blue-500/20 transition-all flex items-center justify-between ${
                    selectedTag === t
                      ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold'
                      : 'text-gray-700 dark:text-gray-200'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    <span>🏷️</span>
                    <span>{t}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}


export default function EmailBulkTab({ onNavigateHistory }) {
  const { activeClient } = useClient();
  const [templates, setTemplates] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    template_id: '',
    tag_name: ''
  });

  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Client-ID': activeClient?.id ? String(activeClient.id) : ''
    };
  };

  useEffect(() => {
    fetchTemplates();
    fetchTags();
  }, [activeClient]);

  const fetchTags = async () => {
    if (!activeClient) return;
    try {
      const res = await fetch(`${API_URL}/leads/filters`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAvailableTags(data.tags || []);
      }
    } catch (err) {
      console.error("Erro ao carregar etiquetas:", err);
    }
  };

  const fetchTemplates = async () => {
    if (!activeClient) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/email/templates`, { headers: getHeaders() });

      if (res.ok) {
        const data = await res.json();
        setTemplates(data || []);
        if (data && data.length > 0) {
          setFormData(prev => ({ ...prev, template_id: data[0].id }));
        }
      }
    } catch (err) {

      console.error("Erro ao listar templates:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendBulk = async (e) => {
    e.preventDefault();
    if (!formData.template_id) {
      return toast.error("Selecione um template de e-mail.");
    }
    try {
      setSendLoading(true);
      const res = await fetch(`${API_URL}/email/send-bulk`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Erro ao realizar disparo de e-mail.");
      }
      toast.success(data.message || "Disparo de e-mail concluído com sucesso!");
      if (onNavigateHistory) onNavigateHistory();
    } catch (err) {
      toast.error(err.message || "Erro ao realizar disparo de e-mail.");
    } finally {
      setSendLoading(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="bg-white dark:bg-slate-800/80 backdrop-blur-md p-6 rounded-2xl border border-gray-100 dark:border-white/10 shadow-lg">
        <div className="mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <FiZap className="text-yellow-500" /> Disparo em Massa de E-mail
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Selecione o modelo de e-mail e filtre a audiência pelas etiquetas da **Aba de Contatos**.
          </p>
        </div>

        <form onSubmit={handleSendBulk} className="space-y-6">
          {/* Título da Campanha */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Título da Campanha (Identificação)
            </label>
            <input
              type="text"
              placeholder="Ex: Campanha Webinário Julho"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-white"
            />
          </div>

          {/* Seleção do Template com Filtro de Pesquisa Pesquisável */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Selecione o Template de E-mail *
            </label>
            {templates.length === 0 ? (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-xs rounded-xl">
                Nenhum template cadastrado. Vá até a aba <b>Templates</b> para criar seu primeiro modelo de e-mail.
              </div>
            ) : (
              <SearchableTemplateSelect
                templates={templates}
                selectedId={formData.template_id}
                onSelect={(id) => setFormData(prev => ({ ...prev, template_id: id }))}
              />
            )}
          </div>


          {/* Filtro por Etiqueta da Aba de Contatos */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-gray-100 dark:border-gray-800 space-y-2">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <FiTag className="text-blue-500" /> Etiqueta da Aba de Contatos (Opcional)
            </label>
            <SearchableTagSelect
              tags={availableTags}
              selectedTag={formData.tag_name}
              onSelect={(tag) => setFormData(prev => ({ ...prev, tag_name: tag }))}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Serão filtrados apenas os contatos da sua <b>Aba de Contatos</b> (`WebhookLead`) que possuírem essa etiqueta e um endereço de e-mail válido.
            </p>
          </div>


          {/* Botão de Envio */}
          <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
            <button
              type="submit"
              disabled={sendLoading || templates.length === 0}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2 disabled:opacity-50"
            >
              <FiSend /> {sendLoading ? 'Enviando E-mails...' : 'Iniciar Disparo em Massa de E-mail'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
