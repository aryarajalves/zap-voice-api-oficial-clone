import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiZap, FiSend, FiTag, FiFileText, FiCheckCircle, FiSearch, FiChevronDown, FiUsers, FiMail, FiAlertTriangle, FiClock, FiCalendar } from 'react-icons/fi';
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

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden animate-fade-in">
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

  // Estados para pré-visualização de destinatários
  const [recipients, setRecipients] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [showRecipientsList, setShowRecipientsList] = useState(true);

  const [formData, setFormData] = useState({
    title: '',
    template_id: '',
    tag_name: ''
  });

  // Agendamento
  const [sendMode, setSendMode] = useState('immediate'); // 'immediate' | 'scheduled'
  const [scheduledAt, setScheduledAt] = useState('');

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

  // Efeito para carregar destinatários que receberão o e-mail sempre que a etiqueta mudar
  useEffect(() => {
    fetchPreviewRecipients();
  }, [formData.tag_name, activeClient]);

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

  const fetchPreviewRecipients = async () => {
    if (!activeClient) return;
    try {
      setPreviewLoading(true);
      const tagParam = formData.tag_name ? `?tag_name=${encodeURIComponent(formData.tag_name)}` : '';
      const res = await fetch(`${API_URL}/email/preview-recipients${tagParam}`, { headers: getHeaders() });

      if (res.ok) {
        const data = await res.json();
        setRecipients(data.recipients || []);
      }
    } catch (err) {
      console.error("Erro ao buscar pré-visualização de destinatários:", err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSendBulk = async (e) => {
    e.preventDefault();
    if (!formData.template_id) {
      return toast.error("Selecione um template de e-mail.");
    }
    if (recipients.length === 0) {
      return toast.error("Nenhum destinatário com e-mail válido encontrado para a etiqueta selecionada.");
    }
    if (sendMode === 'scheduled') {
      if (!scheduledAt) {
        return toast.error("Informe a data e horário do agendamento.");
      }
      const scheduledDate = new Date(scheduledAt);
      if (scheduledDate <= new Date()) {
        return toast.error("O horário agendado deve ser no futuro.");
      }
    }
    try {
      setSendLoading(true);
      const payload = {
        ...formData,
        scheduled_at: sendMode === 'scheduled' ? scheduledAt : null
      };
      const res = await fetch(`${API_URL}/email/send-bulk`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Erro ao realizar disparo de e-mail.");
      }
      if (sendMode === 'scheduled') {
        toast.success(data.message || "Disparo agendado com sucesso! ✅");
      } else {
        toast.success(data.message || "Disparo de e-mail concluído com sucesso!");
      }
      if (onNavigateHistory) onNavigateHistory();
    } catch (err) {
      toast.error(err.message || "Erro ao realizar disparo de e-mail.");
    } finally {
      setSendLoading(false);
    }
  };

  const filteredRecipients = recipients.filter(r => {
    const q = recipientSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      r.email.toLowerCase().includes(q) ||
      (r.name && r.name.toLowerCase().includes(q))
    );
  });

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

          {/* Seleção do Template */}
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

          {/* Filtro por Etiqueta com Pré-visualização dos E-mails */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-gray-100 dark:border-gray-800 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 mb-1.5">
                <FiTag className="text-blue-500" /> Etiqueta da Aba de Contatos (Opcional)
              </label>
              <SearchableTagSelect
                tags={availableTags}
                selectedTag={formData.tag_name}
                onSelect={(tag) => setFormData(prev => ({ ...prev, tag_name: tag }))}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Filtrando contatos da <b>Aba de Contatos</b> com a etiqueta {formData.tag_name ? <strong className="text-blue-400">"{formData.tag_name}"</strong> : <span>todas</span>}.
              </p>
            </div>

            {/* Painel de Lista dos E-mails que vão receber a mensagem */}
            <div className="mt-3 bg-white dark:bg-slate-800/90 rounded-xl border border-gray-200 dark:border-white/10 p-3 shadow-inner space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <FiUsers className="text-blue-500" />
                  <span>E-mails que receberão esta mensagem:</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    recipients.length > 0
                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                      : 'bg-red-500/10 text-red-500 border border-red-500/20'
                  }`}>
                    {previewLoading ? 'Carregando...' : `${recipients.length} contatos`}
                  </span>
                </div>
                {recipients.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowRecipientsList(!showRecipientsList)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1"
                  >
                    {showRecipientsList ? 'Ocultar lista' : 'Ver e-mails'}
                    <FiChevronDown className={`transition-transform ${showRecipientsList ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>

              {previewLoading ? (
                <div className="py-4 text-center text-xs text-gray-400 animate-pulse">
                  Buscando contatos com e-mail...
                </div>
              ) : recipients.length === 0 ? (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
                  <FiAlertTriangle className="shrink-0 text-amber-500" size={16} />
                  <span>Nenhum contato com e-mail cadastrado foi encontrado para a etiqueta selecionada.</span>
                </div>
              ) : (
                showRecipientsList && (
                  <div className="space-y-2 pt-1 border-t border-gray-100 dark:border-gray-700/60">
                    {/* Campo de pesquisa rápida dentro dos destinatários */}
                    {recipients.length > 5 && (
                      <div className="relative">
                        <FiSearch className="absolute left-2.5 top-2 text-gray-400 text-xs" />
                        <input
                          type="text"
                          placeholder="Filtrar e-mail na lista..."
                          value={recipientSearch}
                          onChange={e => setRecipientSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-1 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none"
                        />
                      </div>
                    )}

                    {/* Lista scrollável de e-mails */}
                    <div className="max-h-48 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700/40 pr-1">
                      {filteredRecipients.map(r => (
                        <div key={r.id} className="py-1.5 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 truncate">
                            <FiMail className="text-blue-400 shrink-0" size={12} />
                            <span className="font-bold text-gray-800 dark:text-white truncate">{r.email}</span>
                            {r.name && r.name !== 'Sem nome' && (
                              <span className="text-gray-400 text-[11px] truncate">({r.name})</span>
                            )}
                          </div>
                          {r.tags && (
                            <span className="text-[10px] bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded font-mono shrink-0 ml-2">
                              {r.tags}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Agendamento de Disparo */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-gray-100 dark:border-gray-800 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <FiClock className="text-indigo-500" />
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Quando enviar?</span>
            </div>

            {/* Toggle Imediato / Agendado */}
            <div className="flex gap-2">
              <button
                type="button"
                id="btn-send-immediate"
                onClick={() => setSendMode('immediate')}
                className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                  sendMode === 'immediate'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20'
                    : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-400'
                }`}
              >
                <FiSend size={13} /> Enviar Agora
              </button>
              <button
                type="button"
                id="btn-send-scheduled"
                onClick={() => setSendMode('scheduled')}
                className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                  sendMode === 'scheduled'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/20'
                    : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-indigo-400'
                }`}
              >
                <FiCalendar size={13} /> Agendar Disparo
              </button>
            </div>

            {/* Seletor de data e hora (visível só no modo agendado) */}
            {sendMode === 'scheduled' && (
              <div className="mt-2 space-y-1.5 animate-fade-in">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Data e Horário do Disparo
                </label>
                <input
                  type="datetime-local"
                  id="input-scheduled-at"
                  value={scheduledAt}
                  onChange={e => setScheduledAt(e.target.value)}
                  min={(() => {
                    const d = new Date(Date.now() + 60000);
                    const pad = n => String(n).padStart(2, '0');
                    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                  })()}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 rounded-xl text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
                <p className="text-[11px] text-indigo-500 dark:text-indigo-400">
                  O disparo será executado automaticamente no horário selecionado (UTC).
                </p>
              </div>
            )}
          </div>

          {/* Botão de Envio */}
          <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
            <button
              type="submit"
              id="btn-submit-bulk-email"
              disabled={sendLoading || templates.length === 0 || recipients.length === 0}
              className={`px-6 py-3 font-bold rounded-xl text-sm transition-all shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-white ${
                sendMode === 'scheduled'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-indigo-500/25'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/25'
              }`}
            >
              {sendMode === 'scheduled' ? <FiCalendar /> : <FiSend />}
              {sendLoading
                ? (sendMode === 'scheduled' ? 'Agendando...' : 'Enviando E-mails...')
                : sendMode === 'scheduled'
                  ? `Agendar Disparo (${recipients.length} E-mails)`
                  : `Iniciar Disparo em Massa (${recipients.length} E-mails)`
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
