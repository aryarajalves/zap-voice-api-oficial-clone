import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import { toast } from 'react-hot-toast';
import { fetchWithAuth } from '../AuthContext';
import { useClient } from '../contexts/ClientContext';
import { FiPlus, FiTrash2, FiInfo, FiLayout, FiImage, FiFileText, FiVideo, FiCheckCircle, FiRefreshCw, FiAlertCircle, FiClock, FiCheck, FiSlash, FiPause, FiPlay, FiMaximize, FiMinimize } from 'react-icons/fi';
import ConfirmModal from './ConfirmModal';

const TemplateCreator = ({ onSuccess }) => {
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
    }, [activeClient]);

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
                        {editingId && (
                            <button
                                onClick={resetForm}
                                className="text-xs font-bold text-red-500 hover:underline px-3 py-1 bg-red-50 dark:bg-red-900/20 rounded-lg"
                            >
                                Cancelar Edição
                            </button>
                        )}
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
                                    <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1.5 tracking-wider">URL do Arquivo de Exemplo</label>
                                    <input
                                        type="text"
                                        value={formData.header_media_url}
                                        onChange={(e) => setFormData({ ...formData, header_media_url: e.target.value })}
                                        className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                                        placeholder={`Cole o link da ${formData.header_type === 'IMAGE' ? 'imagem' : formData.header_type === 'VIDEO' ? 'vídeo' : 'documento'} para exemplo...`}
                                    />
                                    <p className="text-[10px] text-gray-500 mt-1 italic">
                                        * Meta exige um link de exemplo para aprovar templates com mídia.
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
                            {templates.length === 0 && !fetchingTemplates && (
                                <div className="text-center py-10 text-gray-400">
                                    <p className="text-sm">Nenhum template encontrado.</p>
                                </div>
                            )}

                            {templates.map((tpl) => (
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
                                        </div>
                                    </div>

                                    {/* Preview rápido do corpo (truncado) */}
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-[11px] text-gray-600 dark:text-gray-400 line-clamp-2 italic leading-relaxed flex-1">
                                            {Array.isArray(tpl.components) ? tpl.components.find(c => c.type === 'BODY')?.text : ''}
                                        </p>
                                        {tpl.status === 'PAUSED' && (
                                            <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg border border-amber-100 dark:border-amber-800/30">
                                                <FiAlertCircle size={12} />
                                                <span>Edite para reativar</span>
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
        </div>
    );
};

export default TemplateCreator;
