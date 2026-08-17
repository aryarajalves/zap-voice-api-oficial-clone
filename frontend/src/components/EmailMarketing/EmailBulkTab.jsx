import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiZap, FiSend, FiTag, FiCalendar } from 'react-icons/fi';
import { API_URL } from '../../config';
import { useClient } from '../../contexts/ClientContext';

// Subcomponentes Modulares
import SearchableTemplateSelect from './components/bulk/SearchableTemplateSelect';
import SearchableTagSelect from './components/bulk/SearchableTagSelect';
import EmailRecipientsPreview from './components/bulk/EmailRecipientsPreview';
import EmailSchedulingSection from './components/bulk/EmailSchedulingSection';

export default function EmailBulkTab({ onNavigateHistory }) {
  const { activeClient } = useClient();
  const [templates, setTemplates] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);

  // Estados para pré-visualização de destinatários
  const [recipients, setRecipients] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);

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

            {/* Painel de Lista dos E-mails */}
            <EmailRecipientsPreview
              recipients={recipients}
              previewLoading={previewLoading}
            />
          </div>

          {/* Agendamento de Disparo */}
          <EmailSchedulingSection
            sendMode={sendMode}
            setSendMode={setSendMode}
            scheduledAt={scheduledAt}
            setScheduledAt={setScheduledAt}
          />

          {/* Botão de Envio */}
          <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
            <button
              type="submit"
              id="btn-submit-bulk-email"
              disabled={sendLoading || templates.length === 0 || recipients.length === 0}
              className={`px-6 py-3 font-bold rounded-xl text-sm transition-all shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-white cursor-pointer ${
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
