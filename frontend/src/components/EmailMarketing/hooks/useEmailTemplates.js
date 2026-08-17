import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../config';

// Converte texto com marcações simples e HTML em estrutura completa de e-mail
export function formatTextToHtml(text) {
  if (!text) return '';

  // Se já for um documento HTML ou estrutura gerada pelo editor visual
  if (text.includes('<!DOCTYPE html>') || text.includes('<table role="presentation"') || text.includes('<table') || text.includes('<body')) {
    return text;
  }

  let html = text;

  // Processa listas com asterisco/bolinha (* item ou - item) se não estiverem envoltas em <ul>
  if (!html.includes('<ul') && !html.includes('<ol')) {
    html = html.replace(/(?:^(?:[\*\-]\s+.*)(?:\r?\n)?)+/gm, (match) => {
      const items = match.trim().split(/\r?\n/).map(line => {
        const cleanLine = line.replace(/^[\*\-]\s+/, '');
        return `<li style="margin-bottom: 6px;">${cleanLine}</li>`;
      }).join('');
      return `<ul style="margin: 12px 0 12px 20px; padding-left: 10px; color: inherit;">${items}</ul>`;
    });
  }

  // Substitui quebras de linha por <br /> apenas se não estiverem dentro de tags
  return html.replace(/\r?\n/g, '<br />');
}

export function useEmailTemplates({ activeClient }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  useEffect(() => {
    fetchTemplates();
  }, [activeClient]);

  const handleOpenModal = (tmpl = null) => {
    if (tmpl) {
      setEditingTemplate(tmpl);
      setFormData({
        name: tmpl.name,
        subject: tmpl.subject,
        body_html: tmpl.body_html || ''
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        name: '',
        subject: '',
        body_html: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.name || !formData.subject || !formData.body_html) {
      toast.error("Preencha o nome, assunto e corpo do e-mail.");
      return false;
    }
    try {
      const finalBodyHtml = formatTextToHtml(formData.body_html);

      const payloadToSend = {
        ...formData,
        body_html: finalBodyHtml
      };

      let res;
      if (editingTemplate) {
        res = await fetch(`${API_URL}/email/templates/${editingTemplate.id}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(payloadToSend)
        });
      } else {
        res = await fetch(`${API_URL}/email/templates`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(payloadToSend)
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Erro ao salvar template de e-mail.");
      }
      toast.success(editingTemplate ? "Template de e-mail atualizado!" : "Template de e-mail criado com sucesso!");
      setIsModalOpen(false);
      fetchTemplates();
      return true;
    } catch (err) {
      toast.error(err.message || "Erro ao salvar template de e-mail.");
      return false;
    }
  };

  const openDeleteModal = (template) => {
    setTemplateToDelete(template);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteTemplate = async () => {
    if (!templateToDelete) return;
    try {
      setDeleteLoading(true);
      const res = await fetch(`${API_URL}/email/templates/${templateToDelete.id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      if (!res.ok) throw new Error("Erro ao excluir template.");
      toast.success("Template de e-mail excluído com sucesso!");
      setIsDeleteModalOpen(false);
      setTemplateToDelete(null);
      fetchTemplates();
    } catch (err) {
      toast.error(err.message || "Erro ao excluir template.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return {
    templates,
    loading,
    isModalOpen,
    setIsModalOpen,
    editingTemplate,
    formData,
    setFormData,
    handleOpenModal,
    handleSave,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    templateToDelete,
    deleteLoading,
    openDeleteModal,
    confirmDeleteTemplate,
    fetchTemplates
  };
}
