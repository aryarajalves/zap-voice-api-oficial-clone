import React, { useState, useEffect, useRef } from 'react';
import { API_URL } from '../config';
import { toast } from 'react-hot-toast';
import { fetchWithAuth } from '../AuthContext';
import { useClient } from '../contexts/ClientContext';
import { FiPlus, FiTrash2, FiInfo, FiLayout, FiImage, FiFileText, FiVideo, FiCheckCircle, FiRefreshCw, FiAlertCircle, FiClock, FiCheck, FiSlash, FiPause, FiPlay, FiMaximize, FiMinimize, FiHelpCircle, FiX, FiType, FiLink, FiPhone, FiZap, FiBookOpen, FiSearch, FiChevronDown, FiUpload, FiPaperclip } from 'react-icons/fi';
import ConfirmModal from './ConfirmModal';

const TemplateCreator = ({ onSuccess, refreshKey }) => {
    const { activeClient } = useClient();
    const [loading, setLoading] = useState(false);
    const [templates, setTemplates] = useState([]);
    const [fetchingTemplates, setFetchingTemplates] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [templateToDelete, setTemplateToDelete] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [buttonIndexToRemove, setButtonIndexToRemove] = useState(null);
    const [isRemoveButtonModalOpen, setIsRemoveButtonModalOpen] = useState(false);
    const [isBodyExpanded, setIsBodyExpanded] = useState(false);
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [templateSearch, setTemplateSearch] = useState('');
    const [templateCategoryFilter, setTemplateCategoryFilter] = useState('ALL');
    const [templateStatusFilter, setTemplateStatusFilter] = useState('ALL');
    const [openFilterDropdown, setOpenFilterDropdown] = useState(null);
    const [mediaUploading, setMediaUploading] = useState(false);
    const [mediaFileName, setMediaFileName] = useState('');
    const fileInputRef = useRef(null);

    const fetchTemplates = async () => {
        if (!activeClient) return;
        setFetchingTemplates(true);
        try {
            const res = await fetchWithAuth(`${API_URL}/whatsapp/templates`, {}, activeClient.id);
            if (res.ok) {
                const data = await res.json();
                setTemplates(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error("Error fetching templates:", err);
        } finally {
            setFetchingTemplates(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, [activeClient, refreshKey]);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        category: 'MARKETING',
        language: 'pt_BR',
        header_type: 'NONE',
        header_text: '',
        header_media_url: '',
        body_text: '',
        footer_text: '',
        buttons: [] // { type: 'QUICK_REPLY', text: 'Sim' } or { type: 'URL', text: 'Site', url: '...' }
    });

    const handleAddButton = () => {
        if (formData.buttons.length >= 10) {
            toast.error("Máximo de 10 botões permitidos.");
            return;
        }
        setFormData(prev => ({
            ...prev,
            buttons: [...prev.buttons, { type: 'QUICK_REPLY', text: '' }]
        }));
    };

    const removeButton = (index) => {
        setButtonIndexToRemove(index);
        setIsRemoveButtonModalOpen(true);
    };

    const confirmRemoveButton = () => {
        if (buttonIndexToRemove === null) return;
        setFormData(prev => ({
            ...prev,
            buttons: prev.buttons.filter((_, i) => i !== buttonIndexToRemove)
        }));
        setIsRemoveButtonModalOpen(false);
        setButtonIndexToRemove(null);
    };

    const updateButton = (index, field, value) => {
        const newButtons = [...formData.buttons];
        newButtons[index][field] = value;
        setFormData(prev => ({ ...prev, buttons: newButtons }));
    };

    const handleEdit = (tpl) => {
        setEditingId(tpl.id);
        const bodyComp = tpl.components?.find(c => c.type === 'BODY');
        const headerComp = tpl.components?.find(c => c.type === 'HEADER');
        const footerComp = tpl.components?.find(c => c.type === 'FOOTER');
        const buttonsComp = tpl.components?.find(c => c.type === 'BUTTONS');

        setFormData({
            name: tpl.name,
            category: tpl.category || 'MARKETING',
            language: tpl.language || 'pt_BR',
            header_type: headerComp ? headerComp.format : 'NONE',
            header_text: headerComp && headerComp.format === 'TEXT' ? headerComp.text : '',
            header_media_url: headerComp && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerComp.format) ? (headerComp.example?.header_handle?.[0] || '') : '',
            body_text: bodyComp ? bodyComp.text : '',
            footer_text: footerComp ? footerComp.text : '',
            buttons: buttonsComp ? (buttonsComp.buttons || []) : []
        });

        // Scroll to form (smothly scroll to top or the form container)
        const formEl = document.getElementById('templateForm');
        if (formEl) {
            formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({
            name: '',
            category: 'MARKETING',
            language: 'pt_BR',
            header_type: 'NONE',
            header_text: '',
            header_media_url: '',
            body_text: '',
            footer_text: '',
            buttons: []
        });
        setMediaFileName('');
    };

    const handleDeleteTemplate = async () => {
        if (!templateToDelete) return;

        const loadingToast = toast.loading("Excluindo template...");
        try {
            const res = await fetchWithAuth(`${API_URL}/whatsapp/templates/${templateToDelete}`, {
                method: 'DELETE'
            }, activeClient?.id);

            if (res.ok) {
                toast.dismiss(loadingToast);
                toast.success("Template excluído com sucesso!");
                fetchTemplates();
                if (editingId && templates.find(t => t.id === editingId)?.name === templateToDelete) {
                    resetForm();
                }
            } else {
                const err = await res.json();
                toast.dismiss(loadingToast);
                toast.error(err.detail || "Erro ao excluir template");
            }
        } catch (error) {
            console.error(error);
            toast.dismiss(loadingToast);
            toast.error("Erro de conexão ao excluir");
        } finally {
            setTemplateToDelete(null);
            setIsDeleteModalOpen(false);
        }
    };

    const hasMetaVarIssue = (text) => {
        if (!text || !/\{\{\d+\}\}/.test(text)) return false;
        const t = text.trim();
        return /^\{\{\d+\}\}/.test(t) || /\{\{\d+\}\}[\s\W]*$/.test(t);
    };

    const fixBodyTextForMeta = () => {
        let fixed = formData.body_text.trim();
        if (/^\{\{\d+\}\}/.test(fixed)) {
            fixed = 'Olá ' + fixed;
        }
        fixed = fixed.replace(/(\{\{\d+\}\})[\s\W]*$/, '$1, tudo bem?');
        setFormData({ ...formData, body_text: fixed });
        toast.success('Texto corrigido para o formato da Meta!');
    };

    const handleMediaUpload = async (file) => {
        if (!file) return;
        setMediaUploading(true);
        setMediaFileName(file.name);
        try {
            const formPayload = new FormData();
            formPayload.append('file', file);
            const res = await fetchWithAuth(
                `${API_URL}/whatsapp/upload-template-media`,
                { method: 'POST', body: formPayload },
                activeClient?.id
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Erro no upload');
            setFormData(prev => ({ ...prev, header_media_url: data.handle }));
            toast.success('Mídia enviada para a Meta com sucesso!');
        } catch (err) {
            toast.error(err.message || 'Erro ao fazer upload da mídia');
            setMediaFileName('');
        } finally {
            setMediaUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name || !formData.body_text) {
            toast.error("Nome e Corpo da mensagem são obrigatórios.");
            return;
        }

        // Validate name (lowercase, underscores, only alpha-numeric)
        if (!/^[a-z0-9_]+$/.test(formData.name)) {
            toast.error("Nome deve conter apenas letras minúsculas, números e sublinhados (_).");
            return;
        }

        setLoading(true);
        const actionText = editingId ? "Atualizando" : "Enviando";
        const loadingToast = toast.loading(`${actionText} template na Meta...`);

        try {
            const url = editingId
                ? `${API_URL}/whatsapp/templates/${editingId}`
                : `${API_URL}/whatsapp/templates`;

            const method = editingId ? 'PUT' : 'POST';

            const res = await fetchWithAuth(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            }, activeClient?.id);

            if (res.ok) {
                toast.dismiss(loadingToast);
                toast.success(editingId ? "Template atualizado com sucesso!" : "Template enviado com sucesso!");
                fetchTemplates();
                if (!editingId && onSuccess) onSuccess();
                resetForm();
            } else {
                const err = await res.json();
                toast.dismiss(loadingToast);
                toast.error(err.detail || `Erro ao ${editingId ? 'atualizar' : 'criar'} template`);
            }
        } catch (error) {
            console.error(error);
            toast.dismiss(loadingToast);
            toast.error("Erro de conexão");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* Lado Esquerdo: Formulário de Criação */}
                <div id="templateForm" className="lg:col-span-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700 transition-all duration-300">
                    <div className="flex items-center justify-between mb-8 border-b border-gray-100 dark:border-gray-700 pb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <FiLayout size={24} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                                    {editingId ? 'Editar Template' : 'Criar Novo Template'}
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Desenvolva templates de mensagens para a API Oficial do WhatsApp</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setIsGuideOpen(true)}
                                className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-700/50 px-3 py-1.5 rounded-xl transition-all hover:scale-105 shadow-sm"
                                title="Abrir guia de criação de templates"
                            >
                                <FiBookOpen size={14} />
                                Guia
                            </button>
                            {editingId && (
                                <button
                                    onClick={resetForm}
                                    className="text-xs font-bold text-red-500 hover:underline px-3 py-1 bg-red-50 dark:bg-red-900/20 rounded-lg"
                                >
                                    Cancelar Edição
                                </button>
                            )}
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                    Nome do Template <FiInfo className="text-gray-400 cursor-help" title="Apenas minúsculas, números e _" />
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                                    className={`w-full p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white ${editingId ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    placeholder="ex: promocao_natal_2024"
                                    required
                                    disabled={editingId !== null}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Categoria</label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white cursor-pointer appearance-none"
                                >
                                    <option value="MARKETING" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Marketing (Promoções, Convites)</option>
                                    <option value="UTILITY" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Utilidade (Alertas, Cobranças, Updates)</option>
                                </select>
                            </div>
                        </div>

                        {/* Header Section */}
                        <div className="bg-gray-50/50 dark:bg-gray-900/20 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-4">Cabeçalho (Opcional)</label>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                                {[
                                    { id: 'NONE', label: 'Nenhum', icon: FiSlash },
                                    { id: 'TEXT', label: 'Texto', icon: FiFileText },
                                    { id: 'IMAGE', label: 'Imagem', icon: FiImage },
                                    { id: 'VIDEO', label: 'Vídeo', icon: FiVideo },
                                    { id: 'DOCUMENT', label: 'Documento', icon: FiFileText },
                                ].map((m) => (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, header_type: m.id })}
                                        className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${formData.header_type === m.id
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                            : 'border-transparent bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        <m.icon size={20} className="mb-1" />
                                        <span className="text-[10px] font-bold uppercase">{m.label}</span>
                                    </button>
                                ))}
                            </div>

                            {formData.header_type === 'TEXT' && (
                                <input
                                    type="text"
                                    value={formData.header_text}
                                    onChange={(e) => setFormData({ ...formData, header_text: e.target.value })}
                                    className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white mt-4"
                                    placeholder="Texto do cabeçalho..."
                                    maxLength={60}
                                />
                            )}

                            {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(formData.header_type) && (
                                <div className="mt-4">
                                    <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1.5 tracking-wider">Arquivo de Exemplo</label>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        className="hidden"
                                        accept={
                                            formData.header_type === 'IMAGE' ? 'image/jpeg,image/png,image/webp' :
                                            formData.header_type === 'VIDEO' ? 'video/mp4,video/3gpp' :
                                            '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx'
                                        }
                                        onChange={(e) => handleMediaUpload(e.target.files?.[0])}
                                    />
                                    <div
                                        onClick={() => !mediaUploading && fileInputRef.current?.click()}
                                        className={`w-full flex items-center gap-3 p-3 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                                            formData.header_media_url
                                                ? 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/20'
                                                : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 hover:border-blue-400 dark:hover:border-blue-500'
                                        } ${mediaUploading ? 'opacity-60 cursor-wait' : ''}`}
                                    >
                                        {mediaUploading ? (
                                            <>
                                                <svg className="animate-spin w-5 h-5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                                </svg>
                                                <span className="text-sm text-blue-500">Enviando para a Meta...</span>
                                            </>
                                        ) : formData.header_media_url ? (
                                            <>
                                                <FiCheckCircle className="text-green-500 shrink-0" size={18} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-green-600 dark:text-green-400 font-medium truncate">{mediaFileName || 'Arquivo enviado'}</p>
                                                    <p className="text-[10px] text-gray-400 truncate">{formData.header_media_url}</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); setFormData(prev => ({ ...prev, header_media_url: '' })); setMediaFileName(''); }}
                                                    className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
                                                >
                                                    <FiX size={16} />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <FiUpload className="text-gray-400 shrink-0" size={18} />
                                                <div>
                                                    <p className="text-sm text-gray-600 dark:text-gray-300">
                                                        Clique para selecionar {formData.header_type === 'IMAGE' ? 'uma imagem' : formData.header_type === 'VIDEO' ? 'um vídeo' : 'um documento'}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400">
                                                        {formData.header_type === 'IMAGE' ? 'JPEG, PNG, WEBP' : formData.header_type === 'VIDEO' ? 'MP4, 3GPP' : 'PDF, DOC, XLS, PPT'}
                                                    </p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-1 italic">
                                        * O arquivo será enviado para a Meta para aprovação do template.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Body Text Section */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-bold text-gray-700 dark:text-white">Corpo da Mensagem</label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const ta = document.getElementById('bodyTextarea');
                                        const start = ta.selectionStart;
                                        const end = ta.selectionEnd;
                                        const text = formData.body_text;
                                        const matches = text.match(/\{\{(\d+)\}\}/g) || [];
                                        const nextNum = matches.length + 1;
                                        const varStr = `{{${nextNum}}}`;
                                        const newText = text.substring(0, start) + varStr + text.substring(end);
                                        setFormData({ ...formData, body_text: newText });
                                    }}
                                    className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded"
                                >
                                    + Adicionar Variável
                                </button>
                            </div>
                            <div className="relative group">
                                <textarea
                                    id="bodyTextarea"
                                    value={formData.body_text}
                                    onChange={(e) => setFormData({ ...formData, body_text: e.target.value })}
                                    rows="10"
                                    className="w-full p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white font-sans text-base leading-relaxed"
                                    placeholder="Escreva sua mensagem aqui. Use {{1}}, {{2}} para variáveis que poderá preencher no momento do envio."
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setIsBodyExpanded(true)}
                                    className="absolute top-2 right-2 p-2 text-gray-400 hover:text-blue-500 bg-white/50 dark:bg-black/20 rounded-lg opacity-0 group-hover:opacity-100 transition shadow-sm border border-gray-200 dark:border-gray-700"
                                    title="Maximizar"
                                >
                                    <FiMaximize size={16} />
                                </button>
                            </div>
                            {hasMetaVarIssue(formData.body_text) && (
                                <div className="mt-2 flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-xl px-4 py-2.5">
                                    <FiAlertCircle className="text-amber-500 shrink-0" size={16} />
                                    <span className="text-xs text-amber-700 dark:text-amber-300 flex-1">
                                        Variável no início ou fim do texto — a Meta vai rejeitar. Clique para corrigir automaticamente.
                                    </span>
                                    <button
                                        type="button"
                                        onClick={fixBodyTextForMeta}
                                        className="text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 px-3 py-1 rounded-lg transition shrink-0"
                                    >
                                        Corrigir
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Footer Section */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Rodapé (Opcional)</label>
                            <input
                                type="text"
                                value={formData.footer_text}
                                onChange={(e) => setFormData({ ...formData, footer_text: e.target.value })}
                                className="w-full p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                                placeholder="Texto cinza pequeno ao final..."
                                maxLength={60}
                            />
                        </div>

                        {/* Buttons Section */}
                        <div className="bg-gray-50 dark:bg-gray-900/40 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-inner">
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center gap-2">
                                    <label className="block text-sm font-bold text-gray-700 dark:text-white">Botões de Interação</label>
                                    <span className="text-[10px] bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded-full font-bold">Até 10</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAddButton}
                                    className="flex items-center gap-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                                >
                                    <FiPlus size={16} /> Adicionar Botão
                                </button>
                            </div>

                            <div className="space-y-4">
                                {formData.buttons.map((btn, idx) => (
                                    <div key={idx} className="flex flex-wrap md:flex-nowrap items-start gap-4 bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm animate-in fade-in slide-in-from-top-3">
                                        <div className="flex-1 min-w-[150px]">
                                            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1.5 block tracking-wider">Tipo de Ação</label>
                                            <select
                                                value={btn.type}
                                                onChange={(e) => updateButton(idx, 'type', e.target.value)}
                                                className="w-full text-sm p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white appearance-none cursor-pointer"
                                            >
                                                <option value="QUICK_REPLY" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Resposta Rápida (Botão Normal)</option>
                                                <option value="URL" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Link (Abrir Site)</option>
                                                <option value="PHONE_NUMBER" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Ligar para Número</option>
                                            </select>
                                        </div>
                                        <div className="flex-[1.5] min-w-[200px]">
                                            <div className="flex justify-between items-center mb-1.5">
                                                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase block tracking-wider">Texto do Botão</label>
                                                <span className={`text-[10px] font-bold ${(btn.text?.length || 0) >= 25 ? 'text-red-500' : 'text-gray-400'}`}>
                                                    {(btn.text?.length || 0)}/25
                                                </span>
                                            </div>
                                            <input
                                                type="text"
                                                value={btn.text}
                                                onChange={(e) => updateButton(idx, 'text', e.target.value)}
                                                className="w-full text-sm p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                                                placeholder="Ex: Falar com Suporte"
                                                maxLength={25}
                                            />
                                        </div>
                                        {btn.type === 'URL' && (
                                            <div className="flex-[2] min-w-[200px]">
                                                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1.5 block tracking-wider">URL do Link</label>
                                                <input
                                                    type="text"
                                                    value={btn.url || ''}
                                                    onChange={(e) => updateButton(idx, 'url', e.target.value)}
                                                    className="w-full text-sm p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                                                    placeholder="https://exemplo.com"
                                                />
                                            </div>
                                        )}
                                        {btn.type === 'PHONE_NUMBER' && (
                                            <div className="flex-[2] min-w-[200px]">
                                                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1.5 block tracking-wider">Número de Telefone</label>
                                                <input
                                                    type="text"
                                                    value={btn.phone_number || ''}
                                                    onChange={(e) => updateButton(idx, 'phone_number', e.target.value)}
                                                    className="w-full text-sm p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                                                    placeholder="+558599999999"
                                                />
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => removeButton(idx)}
                                            className="mt-6 p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors border border-transparent hover:border-red-100 dark:hover:border-red-500/20"
                                            title="Remover Botão"
                                        >
                                            <FiTrash2 size={18} />
                                        </button>
                                    </div>
                                ))}
                                {formData.buttons.length === 0 && (
                                    <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-xl">
                                        <p className="text-sm italic">Nenhum botão adicionado ainda</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end gap-4 pt-6 border-t border-gray-100 dark:border-gray-700">
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-all"
                            >
                                {loading ? 'Processando...' : <><FiCheckCircle /> {editingId ? 'Salvar Alterações' : 'Enviar para Aprovação'}</>}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Lado Direito: Lista de Templates */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-gray-700 transition-all duration-300">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <FiLayout size={18} /> Meus Templates
                            </h3>
                            <button
                                onClick={fetchTemplates}
                                disabled={fetchingTemplates}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${fetchingTemplates
                                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                    : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                                    }`}
                            >
                                <FiRefreshCw size={14} className={fetchingTemplates ? 'animate-spin' : ''} />
                                {fetchingTemplates ? 'Atualizando...' : 'Atualizar Lista'}
                            </button>
                        </div>

                        {/* Filtros */}
                        <div className="mb-4 space-y-2">
                            <div className="relative">
                                <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="Pesquisar por nome..."
                                    value={templateSearch}
                                    onChange={e => setTemplateSearch(e.target.value)}
                                    className="w-full pl-8 pr-3 py-2 text-[12px] rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500 transition-all"
                                />
                            </div>
                            <div className="flex gap-2">
                                {/* Dropdown Categoria */}
                                <div className="relative flex-1">
                                    <button
                                        type="button"
                                        onClick={() => setOpenFilterDropdown(openFilterDropdown === 'category' ? null : 'category')}
                                        className="w-full flex items-center justify-between gap-1 py-1.5 px-2.5 text-[11px] font-bold rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-200 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all"
                                    >
                                        <span className="truncate">{templateCategoryFilter === 'ALL' ? 'Categoria: Todas' : templateCategoryFilter}</span>
                                        <FiChevronDown size={11} className={`shrink-0 transition-transform duration-200 ${openFilterDropdown === 'category' ? 'rotate-180' : ''}`} />
                                    </button>
                                    {openFilterDropdown === 'category' && (
                                        <div className="absolute top-full left-0 mt-1 w-full z-50 rounded-xl overflow-hidden shadow-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
                                            {[
                                                { value: 'ALL', label: 'Todas' },
                                                { value: 'MARKETING', label: 'MARKETING' },
                                                { value: 'UTILITY', label: 'UTILITY' },
                                                { value: 'AUTHENTICATION', label: 'AUTHENTICATION' },
                                            ].map(opt => (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => { setTemplateCategoryFilter(opt.value); setOpenFilterDropdown(null); }}
                                                    className={`w-full text-left px-3 py-2 text-[11px] font-bold transition-colors ${templateCategoryFilter === opt.value ? 'bg-indigo-600 text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {/* Dropdown Status */}
                                <div className="relative flex-1">
                                    <button
                                        type="button"
                                        onClick={() => setOpenFilterDropdown(openFilterDropdown === 'status' ? null : 'status')}
                                        className="w-full flex items-center justify-between gap-1 py-1.5 px-2.5 text-[11px] font-bold rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-200 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all"
                                    >
                                        <span className="truncate">
                                            {templateStatusFilter === 'ALL' ? 'Status: Todos' :
                                             templateStatusFilter === 'APPROVED' ? 'Aprovado' :
                                             templateStatusFilter === 'PAUSED' ? 'Pausado' :
                                             templateStatusFilter === 'REJECTED' ? 'Rejeitado' : templateStatusFilter}
                                        </span>
                                        <FiChevronDown size={11} className={`shrink-0 transition-transform duration-200 ${openFilterDropdown === 'status' ? 'rotate-180' : ''}`} />
                                    </button>
                                    {openFilterDropdown === 'status' && (
                                        <div className="absolute top-full left-0 mt-1 w-full z-50 rounded-xl overflow-hidden shadow-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
                                            {[
                                                { value: 'ALL', label: 'Todos', color: '' },
                                                { value: 'APPROVED', label: 'Aprovado', color: 'text-green-500' },
                                                { value: 'PAUSED', label: 'Pausado', color: 'text-amber-500' },
                                                { value: 'REJECTED', label: 'Rejeitado', color: 'text-red-500' },
                                            ].map(opt => (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => { setTemplateStatusFilter(opt.value); setOpenFilterDropdown(null); }}
                                                    className={`w-full text-left px-3 py-2 text-[11px] font-bold transition-colors ${templateStatusFilter === opt.value ? 'bg-indigo-600 text-white' : `${opt.color || 'text-gray-700 dark:text-gray-200'} hover:bg-gray-100 dark:hover:bg-gray-700`}`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                            <style>{`
                                .custom-scrollbar::-webkit-scrollbar {
                                    width: 6px;
                                }
                                .custom-scrollbar::-webkit-scrollbar-track {
                                    background: transparent;
                                }
                                .custom-scrollbar::-webkit-scrollbar-thumb {
                                    background: #e2e8f0;
                                    border-radius: 10px;
                                }
                                .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                                    background: #334155;
                                }
                                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                                    background: #cbd5e1;
                                }
                            `}</style>
                            {templates.filter(t =>
                                (templateCategoryFilter === 'ALL' || t.category === templateCategoryFilter) &&
                                (templateStatusFilter === 'ALL' || (templateStatusFilter === 'APPROVED' ? ['APPROVED', 'ACTIVE'].includes(t.status) : t.status === templateStatusFilter)) &&
                                t.name.toLowerCase().includes(templateSearch.toLowerCase())
                            ).length === 0 && !fetchingTemplates && (
                                <div className="text-center py-10 text-gray-400">
                                    <p className="text-sm">Nenhum template encontrado.</p>
                                </div>
                            )}

                            {templates.filter(t =>
                                (templateCategoryFilter === 'ALL' || t.category === templateCategoryFilter) &&
                                (templateStatusFilter === 'ALL' || (templateStatusFilter === 'APPROVED' ? ['APPROVED', 'ACTIVE'].includes(t.status) : t.status === templateStatusFilter)) &&
                                t.name.toLowerCase().includes(templateSearch.toLowerCase())
                            ).map((tpl) => (
                                <div key={tpl.id} className="p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 hover:border-blue-200 dark:hover:border-blue-800 transition-all group">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-sm text-gray-800 dark:text-gray-100 truncate" title={tpl.name}>
                                                {tpl.name}
                                            </p>
                                            <p className="text-[10px] text-gray-500 font-medium">{tpl.category} • {tpl.language}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${['APPROVED', 'ACTIVE'].includes(tpl.status) ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                tpl.status === 'PENDING' || tpl.status === 'IN_APPEAL' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                    tpl.status === 'REJECTED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                        'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                                                }`}>
                                                {['APPROVED', 'ACTIVE'].includes(tpl.status) && <FiCheck size={10} />}
                                                {tpl.status === 'PENDING' && <FiClock size={10} />}
                                                {tpl.status === 'REJECTED' && <FiAlertCircle size={10} />}
                                                {tpl.status}
                                            </span>
                                            {tpl.quality_score && (
                                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-lg border flex items-center gap-1 ${tpl.quality_score === 'HIGH' ? 'text-green-500 border-green-500/20 bg-green-500/5' :
                                                    tpl.quality_score === 'MEDIUM' ? 'text-yellow-500 border-yellow-500/20 bg-yellow-500/5' :
                                                        'text-red-500 border-red-500/20 bg-red-500/5'
                                                    }`}>
                                                    <FiZap size={8} /> {tpl.quality_score}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Preview rápido do corpo (truncado) */}
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-[11px] text-gray-600 dark:text-gray-400 line-clamp-2 italic leading-relaxed flex-1">
                                            {Array.isArray(tpl.components) ? tpl.components.find(c => c.type === 'BODY')?.text : ''}
                                        </p>
                                        {tpl.rejection_reason && tpl.status === 'REJECTED' && (
                                            <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300 w-full mb-2">
                                                <p className="text-[10px] text-red-600 dark:text-red-400 font-bold flex items-center gap-1">
                                                    <FiAlertCircle size={12} className="shrink-0" /> Motivo da Rejeição:
                                                </p>
                                                <p className="text-[10px] text-red-500/80 dark:text-red-400/80 mt-1 italic leading-tight">
                                                    {tpl.rejection_reason}
                                                </p>
                                            </div>
                                        )}
                                        {tpl.status === 'PAUSED' && (
                                            <div className="flex flex-col gap-1 w-full mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300 mb-2">
                                                <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                                                    <FiAlertCircle size={12} className="shrink-0" />
                                                    <span>Template Pausado por Baixa Qualidade</span>
                                                </div>
                                                <p className="text-[10px] text-amber-500/80 dark:text-amber-400/80 italic leading-tight">
                                                    Meta pausou este template. Clique em <b>EDITAR</b>, melhore o conteúdo e envie novamente.
                                                </p>
                                            </div>
                                        )}
                                        {tpl.status !== 'PENDING' && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setTemplateToDelete(tpl.name);
                                                    setIsDeleteModalOpen(true);
                                                }}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-800 transition-all"
                                                title="Excluir Template"
                                            >
                                                <FiTrash2 size={12} />
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEdit(tpl);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800 transition-all text-[10px] font-bold"
                                        >
                                            EDITAR
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Meta Info Card */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-2xl border border-blue-100 dark:border-blue-800/50">
                        <h4 className="text-blue-800 dark:text-blue-300 font-bold text-sm mb-2 flex items-center gap-2">
                            <FiInfo size={16} /> Status de Aprovação
                        </h4>
                        <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-2 leading-relaxed">
                            <li>• <b>APPROVED:</b> Pronto para usar.</li>
                            <li>• <b>PENDING:</b> Meta está revisando (2h a 24h).</li>
                            <li>• <b>PAUSED:</b> Pausado pela Meta por baixa qualidade. <b>Clique em EDITAR, altere o conteúdo e envie novamente para reativar.</b></li>
                            <li>• <b>REJECTED:</b> Não aprovado. Evite nomes de marcas ou promessas enganosas.</li>
                        </ul>
                    </div>
                </div>
            </div>

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteTemplate}
                title="Excluir Template"
                message={`Tem certeza que deseja excluir o template "${templateToDelete}" da sua conta do WhatsApp? Esta ação não pode ser desfeita e ele será removido da Meta.`}
                confirmText="Excluir Permanentemente"
                isDangerous={true}
            />

            <ConfirmModal
                isOpen={isRemoveButtonModalOpen}
                onClose={() => setIsRemoveButtonModalOpen(false)}
                onConfirm={confirmRemoveButton}
                title="Remover Botão"
                message={`Deseja realmente remover o botão "${formData.buttons[buttonIndexToRemove]?.text || 'sem texto'}"?`}
                confirmText="Excluir Botão"
                isDangerous={true}
            />

            {/* Modal Expansível para o Corpo da Mensagem */}
            {isBodyExpanded && (
                <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-5xl h-full max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl">
                                    <FiFileText size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-xl text-gray-800 dark:text-white">Corpo da Mensagem</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Edição em tela cheia para melhor visualização</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsBodyExpanded(false)}
                                className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl transition-all text-gray-500 hover:text-gray-800 dark:hover:text-white border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
                            >
                                <FiMinimize size={24} />
                            </button>
                        </div>
                        <div className="p-6 flex-1 bg-white dark:bg-gray-800">
                            <textarea
                                className="w-full h-full text-lg p-6 bg-gray-50/50 dark:bg-gray-900/30 text-gray-900 dark:text-gray-100 rounded-2xl border border-gray-200 dark:border-gray-700 focus:ring-4 focus:ring-blue-500/10 outline-none resize-none font-sans leading-relaxed shadow-inner"
                                value={formData.body_text}
                                onChange={(e) => setFormData({ ...formData, body_text: e.target.value })}
                                placeholder="Escreva sua mensagem aqui..."
                                autoFocus
                            />
                        </div>
                        <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/20">
                            <div className="text-xs text-gray-400 font-medium">
                                Use <b>{"{{1}}"}</b>, <b>{"{{2}}"}</b> para variáveis
                            </div>
                            <button
                                onClick={() => setIsBodyExpanded(false)}
                                className="px-10 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all font-bold text-base shadow-lg shadow-blue-500/20 active:scale-95"
                            >
                                Concluir Edição
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* ========= MODAL GUIA DE TEMPLATES ========= */}
            {isGuideOpen && (
                <div
                    className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
                    onClick={(e) => { if (e.target === e.currentTarget) setIsGuideOpen(false); }}
                >
                    <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden"
                        style={{ background: 'linear-gradient(160deg, #0f1729 0%, #111827 100%)', border: '1px solid rgba(99,102,241,0.25)' }}>

                        {/* Header do modal */}
                        <div className="flex items-center justify-between px-8 py-6 border-b border-white/5"
                            style={{ background: 'linear-gradient(90deg, rgba(99,102,241,0.15) 0%, transparent 100%)' }}>
                            <div className="flex items-center gap-4">
                                <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl"
                                    style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)' }}>
                                    📋
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">Guia de Criação de Templates</h2>
                                    <p className="text-sm text-gray-400">Entenda cada campo e como criar templates aprovados pela Meta.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsGuideOpen(false)}
                                className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-white transition-all hover:scale-110"
                                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                            >
                                <FiX size={18} />
                            </button>
                        </div>

                        {/* Conteúdo rolável */}
                        <div className="overflow-y-auto flex-1 px-8 py-6 space-y-4 custom-scrollbar">

                            {/* Card 1 — O que é um Template? */}
                            <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #6366f1' }}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">🚀</span>
                                    <h3 className="font-bold text-white text-sm">O que é um Template?</h3>
                                </div>
                                <p className="text-gray-300 text-sm leading-relaxed">Um template é uma mensagem <b className="text-white">pré-aprovada pela Meta</b> que permite iniciar conversas proativas no WhatsApp Business. Sem um template aprovado, você só pode responder — não pode iniciar.</p>
                                <p className="text-indigo-400 text-xs mt-2 italic">💡 Use templates para disparos em massa, funis automáticos e agendamentos.</p>
                            </div>

                            {/* Card 2 — Nome do Template */}
                            <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #f59e0b' }}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">✏️</span>
                                    <h3 className="font-bold text-white text-sm">Nome do Template</h3>
                                </div>
                                <p className="text-gray-300 text-sm leading-relaxed mb-3">Identificador único do template. Deve ser em <b className="text-white">minúsculas com underscores</b> (snake_case), sem espaços ou caracteres especiais.</p>
                                <div className="rounded-xl p-3 font-mono text-xs text-emerald-400 space-y-1" style={{ background: 'rgba(0,0,0,0.3)' }}>
                                    <div>promocao_natal_2024</div>
                                    <div>boas_vindas_cliente</div>
                                    <div>lembrete_consulta_v2</div>
                                </div>
                                <p className="text-amber-400 text-xs mt-2 italic">💡 Seja descritivo. "lembrete_consulta" é melhor do que "msg1".</p>
                            </div>

                            {/* Card 3 — Categoria */}
                            <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #10b981' }}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">🏷️</span>
                                    <h3 className="font-bold text-white text-sm">Categoria</h3>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.1)' }}>
                                        <span className="text-indigo-400 font-bold text-xs mt-0.5 shrink-0">MARKETING</span>
                                        <p className="text-gray-300 text-xs leading-relaxed">Promoções, convites, novidades. Ideal para campanhas e lançamentos. Custo por mensagem mais alto.</p>
                                    </div>
                                    <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(16,185,129,0.1)' }}>
                                        <span className="text-emerald-400 font-bold text-xs mt-0.5 shrink-0">UTILITY</span>
                                        <p className="text-gray-300 text-xs leading-relaxed">Alertas, cobranças, confirmações, atualizações de pedido. Custo menor, mas o conteúdo deve ser transacional.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Card 4 — Cabeçalho */}
                            <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #3b82f6' }}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">🖼️</span>
                                    <h3 className="font-bold text-white text-sm">Cabeçalho (Opcional)</h3>
                                </div>
                                <p className="text-gray-300 text-sm leading-relaxed mb-3">Aparece <b className="text-white">acima do corpo</b> da mensagem. Pode ser texto, imagem, vídeo ou documento.</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { label: 'Nenhum', desc: 'Sem cabeçalho. Mensagem simples de texto.' },
                                        { label: 'Texto', desc: 'Frase de destaque no topo. Máx. 60 caracteres.' },
                                        { label: 'Imagem', desc: 'JPG ou PNG. Cole a URL de exemplo para aprovação.' },
                                        { label: 'Vídeo / Doc', desc: 'Arquivos de mídia. Requer URL de exemplo da Meta.' },
                                    ].map(item => (
                                        <div key={item.label} className="p-2.5 rounded-xl" style={{ background: 'rgba(59,130,246,0.1)' }}>
                                            <p className="text-blue-300 font-bold text-xs">{item.label}</p>
                                            <p className="text-gray-400 text-xs mt-0.5">{item.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Card 5 — Corpo da Mensagem */}
                            <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #a78bfa' }}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">📝</span>
                                    <h3 className="font-bold text-white text-sm">Corpo da Mensagem</h3>
                                </div>
                                <p className="text-gray-300 text-sm leading-relaxed mb-3">É o <b className="text-white">conteúdo principal</b> — obrigatório. Use variáveis para personalizar cada envio.</p>
                                <div className="rounded-xl p-3 font-mono text-xs text-purple-300 leading-relaxed" style={{ background: 'rgba(0,0,0,0.3)' }}>
                                    {'Olá, {{1}}! Sua consulta está confirmada para {{2}}. Responda SIM para confirmar.'}
                                </div>
                                <div className="mt-3 space-y-1.5">
                                    <p className="text-gray-400 text-xs"><span className="text-purple-400 font-mono">{'{{1}}'}, {'{{2}}'}</span> — substituídos pelo nome, data, etc. no momento do envio.</p>
                                    <p className="text-gray-400 text-xs"><span className="text-white font-mono">*texto*</span> — <b>negrito</b> &nbsp;|&nbsp; <span className="text-white font-mono">_texto_</span> — <i>itálico</i> &nbsp;|&nbsp; <span className="text-white font-mono">~texto~</span> — <s>tachado</s></p>
                                </div>
                                <p className="text-purple-400 text-xs mt-2 italic">💡 Use o botão "Maximizar" para editar confortavelmente textos longos.</p>
                            </div>

                            {/* Card 6 — Rodapé */}
                            <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #6b7280' }}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">📄</span>
                                    <h3 className="font-bold text-white text-sm">Rodapé (Opcional)</h3>
                                </div>
                                <p className="text-gray-300 text-sm leading-relaxed">Texto cinza pequeno exibido abaixo do corpo. Ideal para <b className="text-white">avisos legais</b> ou instrução de descadastro. Máx. 60 caracteres.</p>
                                <div className="rounded-xl p-3 font-mono text-xs text-gray-400 mt-3" style={{ background: 'rgba(0,0,0,0.3)' }}>
                                    Digite SAIR para não receber mais mensagens.
                                </div>
                            </div>

                            {/* Card 7 — Botões */}
                            <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #f97316' }}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">🔘</span>
                                    <h3 className="font-bold text-white text-sm">Botões de Interação (Opcional)</h3>
                                </div>
                                <p className="text-gray-300 text-sm leading-relaxed mb-3">Aparecem abaixo da mensagem no WhatsApp. Até <b className="text-white">10 botões</b> por template.</p>
                                <div className="space-y-2">
                                    {[
                                        { icon: <FiZap size={12} />, label: 'Resposta Rápida', color: 'text-orange-300', desc: 'Botão simples que o cliente toca para responder. Ótimo para "Sim / Não / Tenho interesse".' },
                                        { icon: <FiLink size={12} />, label: 'Link (Abrir Site)', color: 'text-blue-300', desc: 'Abre uma URL no navegador. Ideal para páginas de compra, rastreamento, ou landing pages.' },
                                        { icon: <FiPhone size={12} />, label: 'Ligar para Número', color: 'text-emerald-300', desc: 'Inicia uma ligação diretamente. Use para suporte ou vendas por voz.' },
                                    ].map(item => (
                                        <div key={item.label} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                            <span className={`${item.color} mt-0.5 shrink-0`}>{item.icon}</span>
                                            <div>
                                                <p className={`font-bold text-xs ${item.color}`}>{item.label}</p>
                                                <p className="text-gray-400 text-xs mt-0.5">{item.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Card 8 — Status */}
                            <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #ec4899' }}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">✅</span>
                                    <h3 className="font-bold text-white text-sm">Status de Aprovação da Meta</h3>
                                </div>
                                <div className="space-y-2">
                                    {[
                                        { status: 'APPROVED', color: 'text-emerald-400 bg-emerald-900/30', desc: 'Aprovado e pronto para uso em disparos e funis.' },
                                        { status: 'PENDING', color: 'text-yellow-400 bg-yellow-900/30', desc: 'Em revisão pela Meta. Pode levar de 2h a 24h.' },
                                        { status: 'PAUSED', color: 'text-amber-400 bg-amber-900/30', desc: 'Pausado por baixa qualidade. Edite e reenvie para reativar.' },
                                        { status: 'REJECTED', color: 'text-red-400 bg-red-900/30', desc: 'Reprovado. Evite nomes de marcas, links suspeitos ou promessas enganosas.' },
                                    ].map(item => (
                                        <div key={item.status} className="flex items-start gap-3 p-2.5 rounded-xl" style={{ background: 'rgba(0,0,0,0.2)' }}>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${item.color}`}>{item.status}</span>
                                            <p className="text-gray-400 text-xs leading-relaxed">{item.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>

                        {/* Footer do modal */}
                        <div className="px-8 py-5 border-t border-white/5 flex justify-end" style={{ background: 'rgba(0,0,0,0.2)' }}>
                            <button
                                onClick={() => setIsGuideOpen(false)}
                                className="px-8 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 active:scale-95"
                                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 20px rgba(99,102,241,0.4)' }}
                            >
                                Entendido!
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Overlay de Carregamento Promitente */}
            {loading && (
                <div className="fixed inset-0 z-[10000] bg-black/40 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4 border border-gray-100 dark:border-gray-700">
                        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <div className="text-center">
                            <h3 className="font-bold text-xl text-gray-800 dark:text-white">Enviando template na Meta...</h3>
                            <p className="text-sm text-gray-500 mt-1">Isso pode levar alguns segundos.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TemplateCreator;
