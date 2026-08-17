import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { FiPlus, FiTrash2, FiEdit2, FiSearch, FiZap, FiX, FiCheck, FiInfo, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../config';

const ITEMS_PER_PAGE = 6;

const QuickMessagesTab = ({ user, activeClient }) => {
    const [messages, setMessages] = useState([]);
    const [search, setSearch] = useState('');
    const [loadingList, setLoadingList] = useState(true);
    const [page, setPage] = useState(1);

    // Modal de Criar/Editar
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formShortcut, setFormShortcut] = useState('');
    const [formTitle, setFormTitle] = useState('');
    const [formContent, setFormContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Modal de Exclusão
    const [itemToDelete, setItemToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const getHeaders = () => {
        const token = localStorage.getItem('token');
        const clientId = activeClient?.id || user?.client_id || '';
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Client-ID': String(clientId)
        };
    };

    const fetchMessages = async () => {
        setLoadingList(true);
        try {
            const response = await fetch(`${API_URL}/quick-messages`, {
                headers: getHeaders()
            });
            if (response.ok) {
                const data = await response.json();
                setMessages(data);
            } else {
                toast.error('Erro ao buscar mensagens rápidas.');
            }
        } catch (error) {
            console.error('Erro ao buscar mensagens rápidas:', error);
            toast.error('Falha na comunicação com o servidor.');
        } finally {
            setLoadingList(false);
        }
    };

    useEffect(() => {
        fetchMessages();
    }, [activeClient?.id, user?.client_id]);

    useEffect(() => {
        setPage(1);
    }, [search]);

    const filteredMessages = useMemo(() => {
        const q = search.toLowerCase().trim();
        if (!q) return messages;
        return messages.filter(
            m =>
                (m.shortcut || '').toLowerCase().includes(q) ||
                (m.title || '').toLowerCase().includes(q) ||
                (m.content || '').toLowerCase().includes(q)
        );
    }, [messages, search]);

    const totalPages = Math.ceil(filteredMessages.length / ITEMS_PER_PAGE) || 1;

    const paginatedMessages = useMemo(() => {
        const start = (page - 1) * ITEMS_PER_PAGE;
        return filteredMessages.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredMessages, page]);

    const handleOpenCreate = () => {
        setEditingItem(null);
        setFormShortcut('');
        setFormTitle('');
        setFormContent('');
        setIsFormModalOpen(true);
    };

    const handleOpenEdit = (item) => {
        setEditingItem(item);
        setFormShortcut(item.shortcut);
        setFormTitle(item.title);
        setFormContent(item.content);
        setIsFormModalOpen(true);
    };

    const handleInsertVariable = (variable) => {
        setFormContent(prev => `${prev} {{${variable}}}`);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const cleanShortcut = formShortcut.trim().replace(/^\//, '').toLowerCase();

        if (!cleanShortcut) {
            toast.error('O atalho é obrigatório.');
            return;
        }
        if (!formTitle.trim()) {
            toast.error('O título é obrigatório.');
            return;
        }
        if (!formContent.trim()) {
            toast.error('O conteúdo da mensagem é obrigatório.');
            return;
        }

        setIsSaving(true);
        try {
            const url = editingItem
                ? `${API_URL}/quick-messages/${editingItem.id}`
                : `${API_URL}/quick-messages`;
            const method = editingItem ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: getHeaders(),
                body: JSON.stringify({
                    shortcut: cleanShortcut,
                    title: formTitle.trim(),
                    content: formContent.trim()
                })
            });

            if (response.ok) {
                toast.success(editingItem ? 'Mensagem rápida atualizada!' : 'Mensagem rápida criada!');
                setIsFormModalOpen(false);
                fetchMessages();
            } else {
                const errData = await response.json();
                toast.error(errData.detail || 'Erro ao salvar mensagem rápida.');
            }
        } catch (error) {
            console.error('Erro ao salvar mensagem rápida:', error);
            toast.error('Falha na comunicação com o servidor.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        setIsDeleting(true);
        try {
            const response = await fetch(`${API_URL}/quick-messages/${itemToDelete.id}`, {
                method: 'DELETE',
                headers: getHeaders()
            });

            if (response.ok) {
                toast.success('Mensagem rápida excluída com sucesso!');
                setItemToDelete(null);
                fetchMessages();
            } else {
                const errData = await response.json();
                toast.error(errData.detail || 'Erro ao excluir mensagem rápida.');
            }
        } catch (error) {
            console.error('Erro ao excluir mensagem rápida:', error);
            toast.error('Falha ao excluir mensagem rápida.');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header com Info e Botão Novo */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-white/5">
                <div>
                    <h3 className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <FiZap className="text-amber-500" />
                        <span>Mensagens Rápidas</span>
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Cadastre mensagens padrão para disparar no chat digitando uma barra <span className="font-mono text-emerald-500 font-semibold bg-emerald-500/10 px-1 py-0.5 rounded">/</span> seguida do atalho.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleOpenCreate}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
                >
                    <FiPlus size={16} />
                    <span>Nova Mensagem</span>
                </button>
            </div>

            {/* Campo de Busca */}
            <div className="relative flex items-center">
                <FiSearch className="absolute left-3.5 text-gray-400" size={16} />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Pesquisar por atalho, título ou conteúdo..."
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                />
            </div>

            {/* Listagem com Scroll e Paginação */}
            {loadingList ? (
                <div className="py-12 text-center text-xs text-gray-400">Carregando mensagens rápidas...</div>
            ) : filteredMessages.length === 0 ? (
                <div className="py-12 text-center text-gray-400 border border-dashed border-gray-200 dark:border-white/10 rounded-2xl flex flex-col items-center gap-2">
                    <FiZap size={32} className="text-gray-300 dark:text-gray-600" />
                    <p className="text-xs font-medium">Nenhuma mensagem rápida encontrada.</p>
                    <p className="text-[11px] text-gray-500">Clique no botão "Nova Mensagem" acima para cadastrar a primeira.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto custom-scrollbar pr-1">
                        {paginatedMessages.map((item) => (
                            <div
                                key={item.id}
                                className="p-4 bg-gray-50/50 dark:bg-white/[0.02] border border-gray-200/80 dark:border-white/5 rounded-2xl hover:border-emerald-500/30 transition-all flex flex-col justify-between gap-3 group"
                            >
                                <div>
                                    <div className="flex items-center justify-between gap-2 mb-1.5">
                                        <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                                            /{item.shortcut}
                                        </span>
                                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                            <button
                                                type="button"
                                                onClick={() => handleOpenEdit(item)}
                                                className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors cursor-pointer"
                                                title="Editar mensagem"
                                            >
                                                <FiEdit2 size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setItemToDelete(item)}
                                                className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                                title="Excluir mensagem"
                                            >
                                                <FiTrash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 mb-1">{item.title}</h4>
                                    <p className="text-[11px] text-gray-600 dark:text-gray-400 line-clamp-3 whitespace-pre-wrap leading-relaxed">
                                        {item.content}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Paginação da Aba */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-white/5 text-xs text-gray-500 dark:text-gray-400">
                            <span>
                                Exibindo <strong>{(page - 1) * ITEMS_PER_PAGE + 1}</strong> a <strong>{Math.min(page * ITEMS_PER_PAGE, filteredMessages.length)}</strong> de <strong>{filteredMessages.length}</strong> mensagens
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-1.5 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer text-gray-700 dark:text-gray-300"
                                    title="Página Anterior"
                                >
                                    <FiChevronLeft size={14} />
                                </button>
                                <span className="font-mono text-xs font-semibold px-1">
                                    {page} / {totalPages}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="p-1.5 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer text-gray-700 dark:text-gray-300"
                                    title="Próxima Página"
                                >
                                    <FiChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modal de Criação / Edição */}
            {isFormModalOpen && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#111827] text-gray-800 dark:text-gray-100 w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
                            <h4 className="text-sm font-bold flex items-center gap-2">
                                <FiZap className="text-emerald-500" />
                                <span>{editingItem ? 'Editar Mensagem Rápida' : 'Nova Mensagem Rápida'}</span>
                            </h4>
                            <button
                                type="button"
                                onClick={() => setIsFormModalOpen(false)}
                                className="p-1 text-gray-400 hover:text-white rounded-lg cursor-pointer"
                            >
                                <FiX size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-5 space-y-4">
                            <div>
                                <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                                    Atalho (Gatilho da Barra) *
                                </label>
                                <div className="relative flex items-center">
                                    <span className="absolute left-3 font-mono font-bold text-emerald-500 text-sm">/</span>
                                    <input
                                        type="text"
                                        value={formShortcut}
                                        onChange={(e) => setFormShortcut(e.target.value.replace(/\s+/g, ''))}
                                        placeholder="ex: pix, ola, horario, suporte"
                                        required
                                        className="w-full pl-7 pr-3 py-2 bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-mono text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                    />
                                </div>
                                <span className="text-[10px] text-gray-400 mt-0.5 block">Digite apenas a palavra-chave (sem espaços).</span>
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                                    Título da Mensagem *
                                </label>
                                <input
                                    type="text"
                                    value={formTitle}
                                    onChange={(e) => setFormTitle(e.target.value)}
                                    placeholder="ex: Chave PIX e Instruções"
                                    required
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Conteúdo da Mensagem *
                                    </label>
                                    <div className="flex items-center gap-1 text-[10px]">
                                        <span className="text-gray-400">Inserir tag:</span>
                                        <button
                                            type="button"
                                            onClick={() => handleInsertVariable('nome')}
                                            className="px-1.5 py-0.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded font-mono font-medium cursor-pointer"
                                        >
                                            {'{nome}'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleInsertVariable('primeiro_nome')}
                                            className="px-1.5 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded font-mono font-medium cursor-pointer"
                                        >
                                            {'{primeiro_nome}'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleInsertVariable('telefone')}
                                            className="px-1.5 py-0.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded font-mono font-medium cursor-pointer"
                                        >
                                            {'{telefone}'}
                                        </button>
                                    </div>
                                </div>
                                <textarea
                                    value={formContent}
                                    onChange={(e) => setFormContent(e.target.value)}
                                    rows={5}
                                    placeholder="Digite o texto da mensagem que será inserido no chat..."
                                    required
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none leading-relaxed"
                                />
                            </div>

                            <div className="pt-3 border-t border-gray-100 dark:border-white/10 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsFormModalOpen(false)}
                                    disabled={isSaving}
                                    className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-white rounded-xl transition cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
                                >
                                    {isSaving ? 'Salvando...' : 'Salvar Mensagem'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal de Confirmação de Deleção */}
            {itemToDelete && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#111827] text-gray-800 dark:text-gray-100 w-full max-w-sm rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 p-5 space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                                <FiTrash2 size={20} />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Excluir Mensagem Rápida</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Deseja realmente remover o atalho <span className="font-mono font-bold text-rose-400">/{itemToDelete.shortcut}</span>?
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-white/10">
                            <button
                                type="button"
                                onClick={() => setItemToDelete(null)}
                                disabled={isDeleting}
                                className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-white rounded-xl transition cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
                            >
                                {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default QuickMessagesTab;
