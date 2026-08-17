import { useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../config';

export const CONTACT_VARIABLES = [
  { code: '{{nome}}', label: 'Nome do Contato', desc: 'Nome completo do lead' },
  { code: '{{email}}', label: 'E-mail do Contato', desc: 'Endereço de e-mail principal' },
  { code: '{{phone}}', label: 'Telefone do Contato', desc: 'Número de telefone / WhatsApp' },
  { code: '{{produto}}', label: 'Nome do Produto', desc: 'Produto comprado pelo lead' },
  { code: '{{plataforma}}', label: 'Plataforma de Origem', desc: 'Ex: Hotmart, Kiwify, Eduzz, etc' },
  { code: '{{valor}}', label: 'Valor da Compra', desc: 'Preço / Valor transacionado' },
  { code: '{{forma_pagamento}}', label: 'Forma de Pagamento', desc: 'Ex: PIX, Cartão, Boleto' },
  { code: '{{etiquetas}}', label: 'Etiquetas do Contato', desc: 'Tags associadas na aba de contatos' },
];

export function useEmailEditorActions({ formData, setFormData, activeClient, setViewMode }) {
  // Modal de mídia
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [mediaType, setMediaType] = useState('image'); // 'image' | 'video' | 'document'
  const [uploadLoading, setUploadLoading] = useState(false);
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [mediaLinkText, setMediaLinkText] = useState('');

  // Modal de botão CTA
  const [isButtonModalOpen, setIsButtonModalOpen] = useState(false);

  // Formatação de cor
  const [textColor, setTextColor] = useState('#1e293b');

  // Slash commands ( / )
  const [slashActive, setSlashActive] = useState(false);
  const [slashField, setSlashField] = useState('body_html');
  const [slashSearch, setSlashSearch] = useState('');
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);
  const [showVarDropdown, setShowVarDropdown] = useState(false);

  const bodyRef = useRef(null);
  const subjectRef = useRef(null);
  const fileInputRef = useRef(null);

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
      if (setViewMode) setViewMode('visual');
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
    if (setViewMode) setViewMode('visual');
    toast.success("Mídia inserida no e-mail!");
    setIsMediaModalOpen(false);
    setMediaUrlInput('');
    setMediaLinkText('');
  };

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

  return {
    isMediaModalOpen,
    setIsMediaModalOpen,
    mediaType,
    setMediaType,
    uploadLoading,
    mediaUrlInput,
    setMediaUrlInput,
    mediaLinkText,
    setMediaLinkText,
    isButtonModalOpen,
    setIsButtonModalOpen,
    textColor,
    setTextColor,
    slashActive,
    setSlashActive,
    slashField,
    setSlashField,
    slashSearch,
    setSlashSearch,
    slashSelectedIndex,
    setSlashSelectedIndex,
    showVarDropdown,
    setShowVarDropdown,
    bodyRef,
    subjectRef,
    fileInputRef,
    insertTextAtCursor,
    applyTextFormat,
    insertVariableCode,
    handleFileUpload,
    handleInsertUrl,
    handleInputChange,
    handleKeyDown
  };
}
