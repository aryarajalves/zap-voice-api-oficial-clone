import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../../../config';

export const ITEMS_PER_PAGE = 6;

export const useQuickMessagesTab = ({ user, activeClient }) => {
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

    const getHeaders = useCallback(() => {
        const token = localStorage.getItem('token');
        const clientId = activeClient?.id || user?.client_id || '';
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Client-ID': String(clientId)
        };
    }, [activeClient?.id, user?.client_id]);

    const fetchMessages = useCallback(async () => {
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
    }, [getHeaders]);

    useEffect(() => {
        fetchMessages();
    }, [fetchMessages]);

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
        if (e && e.preventDefault) {
            e.preventDefault();
        }
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

    return {
        // List & Search
        messages,
        search,
        setSearch,
        loadingList,
        page,
        setPage,
        totalPages,
        filteredMessages,
        paginatedMessages,
        fetchMessages,

        // Form Modal
        isFormModalOpen,
        setIsFormModalOpen,
        editingItem,
        formShortcut,
        setFormShortcut,
        formTitle,
        setFormTitle,
        formContent,
        setFormContent,
        isSaving,
        handleOpenCreate,
        handleOpenEdit,
        handleInsertVariable,
        handleSave,

        // Delete Modal
        itemToDelete,
        setItemToDelete,
        isDeleting,
        handleDelete
    };
};
