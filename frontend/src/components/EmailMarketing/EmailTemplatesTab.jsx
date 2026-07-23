import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiFileText, FiSave, FiX, FiTag } from 'react-icons/fi';
import { API_URL } from '../../config';

import { useClient } from '../../contexts/ClientContext';

export default function EmailTemplatesTab() {
  const { activeClient } = useClient();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    body_html: ''
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
      }
    } catch (err) {
      console.error("Erro ao listar templates de e-mail:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (tmpl = null) => {
    if (tmpl) {
      setEditingTemplate(tmpl);
      setFormData({
        name: tmpl.name,
        subject: tmpl.subject,
        body_html: tmpl.body_html
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        name: '',
        subject: '',
        body_html: '<div style="font-family: Arial, sans-serif; color: #333;\">\n  <h2>Olá {{nome}},</h2>\n  <p>Escreva seu conteúdo aqui...</p>\n</div>'
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.subject || !formData.body_html) {
      return toast.error("Preencha o nome, assunto e corpo do e-mail.");
    }
    try {
      let res;
      if (editingTemplate) {
        res = await fetch(`${API_URL}/email/templates/${editingTemplate.id}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(formData)
        });
      } else {
        res = await fetch(`${API_URL}/email/templates`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(formData)
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Erro ao salvar template de e-mail.");
      }
      toast.success(editingTemplate ? "Template de e-mail atualizado!" : "Template de e-mail criado com sucesso!");
      setIsModalOpen(false);
      fetchTemplates();
    } catch (err) {
      toast.error(err.message || "Erro ao salvar template de e-mail.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Deseja realmente excluir este template de e-mail?")) return;
    try {
      const res = await fetch(`${API_URL}/email/templates/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      if (!res.ok) throw new Error("Erro ao excluir template.");
      toast.success("Template excluído com sucesso!");
      fetchTemplates();
    } catch (err) {
      toast.error(err.message || "Erro ao excluir template.");
    }
  };

  const insertVariable = (varName) => {
    setFormData(prev => ({
      ...prev,
      body_html: prev.body_html + ` ${varName}`
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <FiFileText className="text-blue-500" /> Templates de E-mail
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Crie e gerencie os modelos de e-mail marketing utilizados nos disparos em massa.
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-blue-500/20 flex items-center gap-2"
        >
          <FiPlus /> Novo Template
        </button>
      </div>

      {/* Grid de Templates */}
      {loading ? (
        <div className="p-8 text-center text-gray-400">Carregando templates...</div>
      ) : templates.length === 0 ? (
        <div className="bg-white dark:bg-slate-800/80 p-8 rounded-2xl border border-gray-100 dark:border-white/10 text-center space-y-3">
          <FiFileText size={40} className="mx-auto text-gray-400" />
          <h3 className="font-bold text-gray-700 dark:text-gray-200">Nenhum template cadastrado</h3>
          <p className="text-xs text-gray-500">Clique em "Novo Template" acima para criar seu primeiro modelo de e-mail.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(t => (
            <div key={t.id} className="bg-white dark:bg-slate-800/80 backdrop-blur-md p-5 rounded-2xl border border-gray-100 dark:border-white/10 shadow-md flex flex-col justify-between hover:shadow-lg transition-all">
              <div>
                <h3 className="font-bold text-gray-800 dark:text-white text-base mb-1 truncate">{t.name}</h3>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-3 truncate">
                  📌 Assunto: {t.subject}
                </p>
                <div className="bg-gray-50 dark:bg-slate-900/60 p-3 rounded-xl text-xs text-gray-600 dark:text-gray-300 font-mono h-24 overflow-hidden text-ellipsis">
                  {t.body_html.replace(/<[^>]*>?/gm, '')}
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => handleOpenModal(t)}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <FiEdit2 /> Editar
                </button>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="text-xs font-semibold text-red-500 hover:underline flex items-center gap-1"
                >
                  <FiTrash2 /> Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Criação / Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-2xl w-full border border-gray-100 dark:border-white/10 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <FiFileText className="text-blue-500" /> {editingTemplate ? 'Editar Template de E-mail' : 'Novo Template de E-mail'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Nome do Template *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: E-mail de Boas Vindas"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Assunto do E-mail *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: {{nome}}, seu convite exclusivo chegou!"
                  value={formData.subject}
                  onChange={e => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                    Corpo do E-mail (HTML / Texto) *
                  </label>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => insertVariable('{{nome}}')}
                      className="px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded hover:bg-blue-500/20"
                    >
                      + {"{{nome}}"}
                    </button>
                    <button
                      type="button"
                      onClick={() => insertVariable('{{email}}')}
                      className="px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded hover:bg-blue-500/20"
                    >
                      + {"{{email}}"}
                    </button>
                  </div>
                </div>
                <textarea
                  rows={10}
                  required
                  value={formData.body_html}
                  onChange={e => setFormData({ ...formData, body_html: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-white font-mono leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20"
                >
                  Salvar Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
