import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiZap, FiSend, FiTag, FiFileText, FiCheckCircle } from 'react-icons/fi';
import { API_URL } from '../../config';

import { useClient } from '../../contexts/ClientContext';

export default function EmailBulkTab({ onNavigateHistory }) {
  const { activeClient } = useClient();
  const [templates, setTemplates] = useState([]);
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
  }, [activeClient]);

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
              <select
                value={formData.template_id}
                onChange={e => setFormData({ ...formData, template_id: parseInt(e.target.value) })}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-white font-semibold"
              >
                {templates.map(t => (
                  <option key={t.id} value={t.id}>
                    ✉️ {t.name} (Assunto: {t.subject})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Filtro por Etiqueta da Aba de Contatos */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-gray-100 dark:border-gray-800 space-y-2">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <FiTag className="text-blue-500" /> Etiqueta da Aba de Contatos (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: aryaraj, compra-aprovada (Deixe em branco para todos os contatos)"
              value={formData.tag_name}
              onChange={e => setFormData({ ...formData, tag_name: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
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
