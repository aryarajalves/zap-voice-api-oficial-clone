import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiFileText, FiX, FiAlertTriangle, FiMaximize2, FiMinimize2, FiCode, FiZap, FiImage, FiVideo, FiPaperclip, FiUploadCloud, FiLink, FiEye, FiExternalLink, FiType, FiBold, FiItalic, FiMonitor, FiList, FiAlignCenter, FiDroplet } from 'react-icons/fi';
import { API_URL } from '../../config';

import { useClient } from '../../contexts/ClientContext';
import EmailButtonModal from './EmailButtonModal';
import EmailDragDropEditor from './EmailDragDropEditor';

// Lista completa das variáveis disponíveis na Aba de Contatos (WebhookLead)
const CONTACT_VARIABLES = [
  { code: '{{nome}}', label: 'Nome do Contato', desc: 'Nome completo do lead' },
  { code: '{{email}}', label: 'E-mail do Contato', desc: 'Endereço de e-mail principal' },
  { code: '{{phone}}', label: 'Telefone do Contato', desc: 'Número de telefone / WhatsApp' },
  { code: '{{produto}}', label: 'Nome do Produto', desc: 'Produto comprado pelo lead' },
  { code: '{{plataforma}}', label: 'Plataforma de Origem', desc: 'Ex: Hotmart, Kiwify, Eduzz, etc' },
  { code: '{{valor}}', label: 'Valor da Compra', desc: 'Preço / Valor transacionado' },
  { code: '{{forma_pagamento}}', label: 'Forma de Pagamento', desc: 'Ex: PIX, Cartão, Boleto' },
  { code: '{{etiquetas}}', label: 'Etiquetas do Contato', desc: 'Tags associadas na aba de contatos' },
];

// Limpa o HTML salvo para voltar a ser editável de forma limpa e agradável no editor
function cleanHtmlForEditing(html) {
  if (!html) return '';
  // Substitui múltiplos <br />, <br> e <br/> por quebras de linha reais \n
  let cleaned = html.replace(/<br\s*\/?>/gi, '\n');

  // Limpa múltiplos parágrafos wrapping
  cleaned = cleaned.replace(/<p style="[^"]*">(.*?)<\/p>/gi, '$1\n\n');

  // Remove redundância de \n acumuladas
  return cleaned.replace(/\n{3,}/g, '\n\n').trim();
}

// Converte texto com marcações simples e HTML em estrutura completa de e-mail
function formatTextToHtml(text) {
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

export default function EmailTemplatesTab() {
  const { activeClient } = useClient();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isFullscreenEditorOpen, setIsFullscreenEditorOpen] = useState(false);
  const [viewMode, setViewMode] = useState('visual'); // 'visual' | 'code'

  // Estado para Modal de Confirmação de Exclusão
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Estados para Modal de Inserção de Mídia (Imagem, Vídeo, Documento)
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [mediaType, setMediaType] = useState('image'); // 'image' | 'video' | 'document'
  const [uploadLoading, setUploadLoading] = useState(false);
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [mediaLinkText, setMediaLinkText] = useState('');

  // Estado para Modal de Inserção de Botão CTA
  const [isButtonModalOpen, setIsButtonModalOpen] = useState(false);

  // Estados para Formatador de Texto
  const [textColor, setTextColor] = useState('#1e293b');

  // Estados para Slash Command ( / )
  const [slashActive, setSlashActive] = useState(false);
  const [slashField, setSlashField] = useState('body_html'); // 'subject' | 'body_html'
  const [slashSearch, setSlashSearch] = useState('');
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);
  const [showVarDropdown, setShowVarDropdown] = useState(false);

  const bodyRef = useRef(null);
  const subjectRef = useRef(null);
  const fileInputRef = useRef(null);

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
    setIsFullscreenEditorOpen(false);
    setViewMode('visual');
    setSlashActive(false);
    setShowVarDropdown(false);
    setIsMediaModalOpen(false);
    setIsButtonModalOpen(false);
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
    e.preventDefault();
    if (!formData.name || !formData.subject || !formData.body_html) {
      return toast.error("Preencha o nome, assunto e corpo do e-mail.");
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
      setIsFullscreenEditorOpen(false);
      fetchTemplates();
    } catch (err) {
      toast.error(err.message || "Erro ao salvar template de e-mail.");
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

  // Inserção de texto/HTML na posição do cursor
  const insertTextAtCursor = (field, textToInsert) => {
    const inputEl = field === 'subject' ? subjectRef.current : bodyRef.current;
    const currentText = formData[field] || '';

    if (inputEl && typeof inputEl.selectionStart === 'number') {
      const pos = inputEl.selectionStart;
      const newText = currentText.substring(0, pos) + textToInsert + currentText.substring(pos);
      setFormData(prev => ({ ...prev, [field]: newText }));

      setTimeout(() => {
        if (inputEl) {
          inputEl.focus();
          const nextPos = pos + textToInsert.length;
          inputEl.setSelectionRange(nextPos, nextPos);
        }
      }, 50);
    } else {
      setFormData(prev => ({ ...prev, [field]: currentText + `\n${textToInsert}` }));
    }
  };

  // Aplicar formatação rápida ao texto selecionado ou cursor (Negrito, Itálico, Título, Cor, Lista, Centralizar)
  const applyTextFormat = (formatType, value = '') => {
    const inputEl = bodyRef.current;
    const currentText = formData.body_html || '';

    if (inputEl && typeof inputEl.selectionStart === 'number') {
      const start = inputEl.selectionStart;
      const end = inputEl.selectionEnd;
      const selected = currentText.substring(start, end) || 'seu texto aqui';

      let formatted = '';
      if (formatType === 'bold') formatted = `<b>${selected}</b>`;
      else if (formatType === 'italic') formatted = `<i>${selected}</i>`;
      else if (formatType === 'h2') formatted = `\n<h2 style="font-size: 22px; color: ${textColor}; font-weight: bold; margin: 16px 0 8px 0;">${selected}</h2>\n`;
      else if (formatType === 'h3') formatted = `\n<h3 style="font-size: 18px; color: ${textColor}; font-weight: bold; margin: 14px 0 6px 0;">${selected}</h3>\n`;
      else if (formatType === 'color') formatted = `<span style="color: ${value}; font-weight: bold;">${selected}</span>`;
      else if (formatType === 'center') formatted = `\n<div style="text-align: center; margin: 16px 0; font-size: 28px; font-weight: bold; color: ${value || '#2563eb'};">${selected}</div>\n`;
      else if (formatType === 'list') {
        const lines = selected.split(/\r?\n/);
        const listItems = lines.map(line => `* ${line.replace(/^[\*\-]\s+/, '')}`).join('\n');
        formatted = `\n${listItems}\n`;
      }

      const newText = currentText.substring(0, start) + formatted + currentText.substring(end);
      setFormData(prev => ({ ...prev, body_html: newText }));
    } else {
      if (formatType === 'list') {
        setFormData(prev => ({ ...prev, body_html: currentText + `\n* Primeiro item\n* Segundo item\n* Terceiro item` }));
      } else {
        setFormData(prev => ({ ...prev, body_html: currentText + `\n<b>Texto em negrito</b>` }));
      }
    }
  };

  // Inserção direta de variável
  const insertVariableCode = (varCode, targetField = slashField) => {
    const inputEl = targetField === 'subject' ? subjectRef.current : bodyRef.current;
    const currentText = formData[targetField] || '';

    if (inputEl && typeof inputEl.selectionStart === 'number') {
      const pos = inputEl.selectionStart;
      const textBefore = currentText.substring(0, pos);
      const textAfter = currentText.substring(pos);

      const slashMatch = textBefore.match(/\/([a-zA-Z0-9_]*)$/);
      let newText = '';
      let newCursorPos = 0;

      if (slashMatch) {
        const slashIndex = slashMatch.index;
        newText = currentText.substring(0, slashIndex) + varCode + ' ' + textAfter;
        newCursorPos = slashIndex + varCode.length + 1;
      } else {
        newText = textBefore + varCode + ' ' + textAfter;
        newCursorPos = pos + varCode.length + 1;
      }

      setFormData(prev => ({ ...prev, [targetField]: newText }));

      setTimeout(() => {
        if (inputEl) {
          inputEl.focus();
          inputEl.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 50);
    } else {
      setFormData(prev => ({ ...prev, [targetField]: currentText + ` ${varCode} ` }));
    }

    setSlashActive(false);
    setShowVarDropdown(false);
  };

  // Upload de Mídia (Imagem, Vídeo, Documento) para o Servidor
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    try {
      setUploadLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Client-ID': String(activeClient?.id || localStorage.getItem('activeClientId') || localStorage.getItem('client_id') || '1')
        },
        body: uploadFormData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Erro ao fazer upload do arquivo.");
      }

      const fileUrl = data.url;
      const fileName = file.name;
      const mimeType = file.type || "";

      let htmlCode = '';
      if (mediaType === 'image' || mimeType.startsWith('image/')) {
        htmlCode = `\n<img src="${fileUrl}" alt="${fileName}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 12px 0; display: block;" />\n`;
      } else if (mediaType === 'video' || mimeType.startsWith('video/')) {
        htmlCode = `\n<video controls style="max-width: 100%; border-radius: 8px; margin: 12px 0;"><source src="${fileUrl}" type="${mimeType || 'video/mp4'}">Seu navegador não suporta a exibição de vídeos.</video>\n`;
      } else {
        htmlCode = `\n<div style="margin: 12px 0; padding: 12px 16px; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; display: flex; align-items: center;"><a href="${fileUrl}" target="_blank" download style="color: #2563eb; font-weight: bold; text-decoration: none;">📄 Baixar Documento: ${fileName}</a></div>\n`;
      }

      insertTextAtCursor('body_html', htmlCode);
      setViewMode('visual');
      toast.success("Mídia enviada e inserida no e-mail com sucesso!");
      setIsMediaModalOpen(false);
      setMediaUrlInput('');
      setMediaLinkText('');
    } catch (err) {
      toast.error(err.message || "Erro ao fazer upload da mídia.");
    } finally {
      setUploadLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Inserir mídia via URL direta
  const handleInsertUrl = (e) => {
    e.preventDefault();
    if (!mediaUrlInput) return toast.error("Digite a URL pública da mídia ou documento.");

    let htmlCode = '';
    const label = mediaLinkText || 'Acessar Documento / Mídia';

    if (mediaType === 'image') {
      htmlCode = `\n<img src="${mediaUrlInput}" alt="${label}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 12px 0; display: block;" />\n`;
    } else if (mediaType === 'video') {
      htmlCode = `\n<video controls style="max-width: 100%; border-radius: 8px; margin: 12px 0;"><source src="${mediaUrlInput}">Seu navegador não suporta vídeos.</video>\n`;
    } else {
      htmlCode = `\n<div style="margin: 12px 0; padding: 12px 16px; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px;"><a href="${mediaUrlInput}" target="_blank" style="color: #2563eb; font-weight: bold; text-decoration: none;">📄 ${label}</a></div>\n`;
    }

    insertTextAtCursor('body_html', htmlCode);
    setViewMode('visual');
    toast.success("Mídia inserida no e-mail!");
    setIsMediaModalOpen(false);
    setMediaUrlInput('');
    setMediaLinkText('');
  };

  // Monitoramento da digitação para autocompletar barra /
  const handleInputChange = (field, e) => {
    const val = e.target.value;
    setFormData(prev => ({ ...prev, [field]: val }));

    const pos = e.target.selectionStart;
    const textBefore = val.substring(0, pos);
    const slashMatch = textBefore.match(/\/([a-zA-Z0-9_]*)$/);

    if (slashMatch) {
      setSlashActive(true);
      setSlashField(field);
      setSlashSearch(slashMatch[1].toLowerCase());
      setSlashSelectedIndex(0);
    } else {
      setSlashActive(false);
    }
  };

  // Navegação por teclado no autocompletar (Seta Cima/Baixo, Enter, Esc)
  const handleKeyDown = (field, e) => {
    if (!slashActive) return;

    const filteredVars = CONTACT_VARIABLES.filter(v =>
      v.code.toLowerCase().includes(slashSearch) ||
      v.label.toLowerCase().includes(slashSearch) ||
      v.desc.toLowerCase().includes(slashSearch)
    );

    if (filteredVars.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSlashSelectedIndex(prev => (prev + 1) % filteredVars.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSlashSelectedIndex(prev => (prev - 1 + filteredVars.length) % filteredVars.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      const selected = filteredVars[slashSelectedIndex] || filteredVars[0];
      if (selected) {
        insertVariableCode(selected.code, field);
      }
    } else if (e.key === 'Escape') {
      setSlashActive(false);
    }
  };

  const filteredSlashVars = CONTACT_VARIABLES.filter(v =>
    v.code.toLowerCase().includes(slashSearch) ||
    v.label.toLowerCase().includes(slashSearch) ||
    v.desc.toLowerCase().includes(slashSearch)
  );

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
                  onClick={() => openDeleteModal(t)}
                  className="text-xs font-semibold text-red-500 hover:underline flex items-center gap-1"
                >
                  <FiTrash2 /> Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Padrão de Criação / Edição usando React Portal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[99990] flex items-center justify-center p-2 md:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-6xl max-h-[96vh] overflow-y-auto border border-gray-100 dark:border-white/10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700 shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <FiFileText className="text-blue-500" /> {editingTemplate ? 'Editar Template de E-mail' : 'Novo Template de E-mail'}
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-500/10 text-blue-500 text-xs font-medium rounded-full">
                  <FiZap size={12} /> Digite / para variáveis
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsFullscreenEditorOpen(true)}
                  className="px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-blue-500/20"
                  title="Abrir em Tela Cheia no Computador (100% da tela)"
                >
                  <FiMaximize2 size={13} /> <span>Tela Cheia</span>
                </button>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  <FiX size={20} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                <div className="relative">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Assunto do E-mail *
                  </label>
                  <input
                    ref={subjectRef}
                    type="text"
                    required
                    placeholder="Ex: {{nome}}, seu convite exclusivo chegou! (Digite / para variáveis)"
                    value={formData.subject}
                    onChange={e => handleInputChange('subject', e)}
                    onKeyDown={e => handleKeyDown('subject', e)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="relative space-y-2">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Corpo do E-mail (Editor Drag & Drop Visual) *
                </label>
                
                <EmailDragDropEditor
                  initialHtml={formData.body_html}
                  onChangeHtml={(html) => setFormData(prev => ({ ...prev, body_html: html }))}
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700 shrink-0">
                <div className="text-[11px] text-gray-400 flex items-center gap-1">
                  💡 Clique no botão <span className="font-bold text-blue-500">Maximizar Tela</span> para abrir em 100% da tela do seu computador.
                </div>
                <div className="flex items-center gap-3">
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
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* POPUP EM TELA CHEIA (100% DA TELA DO COMPUTADOR) usando React Portal */}
      {isFullscreenEditorOpen && createPortal(
        <div className="fixed inset-0 z-[99995] flex flex-col bg-slate-950 text-white animate-fade-in p-6 w-screen h-screen overflow-hidden">
          {/* Header da Tela Cheia */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600/20 border border-blue-500/40 rounded-xl flex items-center justify-center text-blue-400">
                <FiMonitor size={22} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  Editor de E-mail em Tela Cheia (100% do Monitor)
                </h3>
                <p className="text-xs text-gray-400">
                  Visualização completa em tela cheia para texto, mídias, vídeos e imagens.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsFullscreenEditorOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-gray-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-slate-700"
              >
                <FiMinimize2 size={16} /> Restaurar Tamanho
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
              >
                Salvar Template
              </button>
            </div>
          </div>

          {/* Barra Superior de Controles na Tela Cheia */}
          <div className="flex flex-wrap items-center justify-between gap-3 my-4 p-3 bg-slate-900/90 rounded-2xl border border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              {/* Modos de Visualização */}
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setViewMode('visual')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    viewMode === 'visual'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <FiEye size={14} /> Visual (Renderizado)
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('code')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    viewMode === 'code'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <FiCode size={14} /> Código HTML
                </button>
              </div>

              {/* Botões de Formatação */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => applyTextFormat('bold')}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-lg text-xs"
                  title="Negrito"
                >
                  <FiBold size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => applyTextFormat('italic')}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white italic rounded-lg text-xs"
                  title="Itálico"
                >
                  <FiItalic size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => applyTextFormat('list')}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs flex items-center gap-1 font-bold"
                  title="Inserir Lista com Bolinhas"
                >
                  <FiList size={14} /> Lista
                </button>
                <button
                  type="button"
                  onClick={() => applyTextFormat('center', textColor)}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs flex items-center gap-1 font-bold"
                  title="Centralizar Bloco / Número"
                >
                  <FiAlignCenter size={14} /> Centralizar
                </button>

                <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800 ml-1">
                  <FiDroplet size={14} className="text-gray-400" />
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => {
                      setTextColor(e.target.value);
                      applyTextFormat('color', e.target.value);
                    }}
                    className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                    title="Escolher Cor Personalizada do Texto"
                  />
                </div>
              </div>
            </div>

            {/* Mídias & Botão CTA na Tela Cheia */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsButtonModalOpen(true)}
                className="px-3 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 text-xs font-bold rounded-xl transition-all border border-blue-500/30 flex items-center gap-1.5"
              >
                <FiExternalLink size={14} /> Botão CTA
              </button>
              <button
                type="button"
                onClick={() => { setMediaType('image'); setIsMediaModalOpen(true); }}
                className="px-3 py-1.5 bg-green-500/20 text-green-400 hover:bg-green-500/30 text-xs font-bold rounded-xl transition-all border border-green-500/30 flex items-center gap-1.5"
              >
                <FiImage size={14} /> Imagem
              </button>
              <button
                type="button"
                onClick={() => { setMediaType('video'); setIsMediaModalOpen(true); }}
                className="px-3 py-1.5 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 text-xs font-bold rounded-xl transition-all border border-purple-500/30 flex items-center gap-1.5"
              >
                <FiVideo size={14} /> Vídeo
              </button>
              <button
                type="button"
                onClick={() => { setMediaType('document'); setIsMediaModalOpen(true); }}
                className="px-3 py-1.5 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 text-xs font-bold rounded-xl transition-all border border-amber-500/30 flex items-center gap-1.5"
              >
                <FiPaperclip size={14} /> Documento
              </button>
            </div>
          </div>

          {/* Canvas de Edição / Visualização tomando 100% da Altura Restante */}
          <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 rounded-2xl border-2 border-blue-500/40 p-8 overflow-y-auto text-slate-800 dark:text-white shadow-2xl">
            {viewMode === 'visual' ? (
              <div className="max-w-4xl mx-auto space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-blue-500 border-b border-gray-200 dark:border-gray-800 pb-2 mb-4">
                  👁️ PRÉ-VISUALIZAÇÃO EM TELA CHEIA (100% DA RESOLUÇÃO DO COMPUTADOR)
                </div>
                <div
                  className="prose dark:prose-invert max-w-none text-base leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: formatTextToHtml(formData.body_html) }}
                />
              </div>
            ) : (
              <textarea
                ref={bodyRef}
                className="w-full h-full p-4 bg-transparent border-0 font-mono text-base resize-none focus:outline-none text-slate-800 dark:text-white leading-relaxed"
                placeholder="Escreva seu conteúdo em texto simples com quebras de linha Enter..."
                value={formData.body_html}
                onChange={e => handleInputChange('body_html', e)}
                onKeyDown={e => handleKeyDown('body_html', e)}
              />
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Modal de Inserção de Botão CTA */}
      <EmailButtonModal
        isOpen={isButtonModalOpen}
        onClose={() => setIsButtonModalOpen(false)}
        onInsert={(buttonHtml) => {
          insertTextAtCursor('body_html', buttonHtml);
          setViewMode('visual');
          toast.success("Botão CTA inserido com sucesso!");
        }}
      />

      {/* Modal de Inserção de Mídia (Upload ou Link Direct) */}
      {isMediaModalOpen && createPortal(
        <div className="fixed inset-0 z-[99990] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-gray-100 dark:border-white/10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-2">
                {mediaType === 'image' && <><FiImage className="text-green-500" /> Inserir Imagem</>}
                {mediaType === 'video' && <><FiVideo className="text-purple-500" /> Inserir Vídeo</>}
                {mediaType === 'document' && <><FiPaperclip className="text-amber-500" /> Inserir Documento / PDF</>}
              </h3>
              <button onClick={() => setIsMediaModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <FiX size={18} />
              </button>
            </div>

            {/* Abas: Upload do Computador OU Link de URL */}
            <div className="space-y-4">
              {/* Opção 1: Upload do Computador */}
              <div className="p-4 bg-gray-50 dark:bg-slate-900/60 rounded-xl border border-gray-200 dark:border-gray-700 text-center space-y-3">
                <FiUploadCloud size={32} className="mx-auto text-blue-500" />
                <div>
                  <h4 className="text-xs font-bold text-gray-700 dark:text-gray-200">Upload do seu Computador</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {mediaType === 'image' && 'Selecione uma imagem (PNG, JPG, GIF, WebP - até 50 MB)'}
                    {mediaType === 'video' && 'Selecione um vídeo (MP4, WebM, 3GP - até 250 MB)'}
                    {mediaType === 'document' && 'Selecione um documento (PDF, DOCX, XLSX, ZIP - até 250 MB)'}
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  accept={
                    mediaType === 'image' ? 'image/*' :
                    mediaType === 'video' ? 'video/*' :
                    '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar'
                  }
                  className="hidden"
                  id="media-file-input"
                />
                <button
                  type="button"
                  disabled={uploadLoading}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition-all shadow-sm disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <FiUploadCloud /> {uploadLoading ? 'Enviando...' : 'Selecionar Arquivo'}
                </button>
              </div>

              <div className="flex items-center gap-2 my-2">
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                <span className="text-[10px] font-bold text-gray-400 uppercase">OU VIA LINK / URL</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              </div>

              {/* Opção 2: URL / Link Direto */}
              <form onSubmit={handleInsertUrl} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    URL Pública do Arquivo *
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      placeholder="https://sua-cdn.com/arquivo.pdf"
                      value={mediaUrlInput}
                      onChange={e => setMediaUrlInput(e.target.value)}
                      className="w-full px-3 py-2 pl-9 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-gray-700 rounded-xl text-xs text-gray-800 dark:text-white"
                    />
                    <FiLink className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                {mediaType === 'document' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Texto do Botão de Download
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Baixar E-book em PDF"
                      value={mediaLinkText}
                      onChange={e => setMediaLinkText(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-gray-700 rounded-xl text-xs text-gray-800 dark:text-white"
                    />
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsMediaModalOpen(false)}
                    className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all shadow-sm"
                  >
                    Inserir por URL
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de Confirmação de Exclusão usando React Portal */}
      {isDeleteModalOpen && createPortal(
        <div className="fixed inset-0 z-[99990] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-gray-100 dark:border-white/10 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto text-xl border border-red-500/20">
              <FiAlertTriangle />
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                Excluir Template de E-mail
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Tem certeza que deseja remover o template <strong className="text-gray-700 dark:text-gray-200">"{templateToDelete?.name}"</strong>? Esta ação não poderá ser desfeita.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={deleteLoading}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteTemplate}
                disabled={deleteLoading}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-500/20 flex items-center gap-2"
              >
                {deleteLoading ? (
                  <span>Excluindo...</span>
                ) : (
                  <>
                    <FiTrash2 /> Confirmar Exclusão
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
