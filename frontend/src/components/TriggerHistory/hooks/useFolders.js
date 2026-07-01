import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';

export const useFolders = ({ activeClient, setTriggers, fetchHistory, setSelectedIds, selectedFolderId, setSelectedFolderId }) => {
    const [folders, setFolders] = useState([]);
    const [loadingFolders, setLoadingFolders] = useState(false);

    const fetchFolders = useCallback(async () => {
        if (!activeClient) return;
        setLoadingFolders(true);
        try {
            const res = await fetchWithAuth(`${API_URL}/triggers/folders`, {}, activeClient?.id);
            if (res.ok) {
                const data = await res.json();
                setFolders(Array.isArray(data) ? data : []);
            }
        } catch (e) {
            // Silencioso — não interrompe a UI por falha ao listar pastas
        } finally {
            setLoadingFolders(false);
        }
    }, [activeClient]);

    useEffect(() => {
        fetchFolders();
    }, [fetchFolders]);

    const createFolder = async (name, color = '#6366f1') => {
        try {
            const res = await fetchWithAuth(`${API_URL}/triggers/folders`, {
                method: 'POST',
                body: JSON.stringify({ name, color })
            }, activeClient?.id);
            if (res.ok) {
                const folder = await res.json();
                setFolders(prev => [...prev, folder].sort((a, b) => a.name.localeCompare(b.name)));
                toast.success('Pasta criada!');
                return folder;
            } else {
                const data = await res.json().catch(() => ({}));
                toast.error(data.detail || 'Erro ao criar pasta');
            }
        } catch (e) {
            toast.error('Erro de conexão ao criar pasta');
        }
        return null;
    };

    const updateFolder = async (folderId, patch) => {
        try {
            const res = await fetchWithAuth(`${API_URL}/triggers/folders/${folderId}`, {
                method: 'PATCH',
                body: JSON.stringify(patch)
            }, activeClient?.id);
            if (res.ok) {
                const updated = await res.json();
                setFolders(prev => prev.map(f => f.id === folderId ? { ...f, ...updated } : f));
                toast.success('Pasta atualizada!');
                return updated;
            } else {
                const data = await res.json().catch(() => ({}));
                toast.error(data.detail || 'Erro ao atualizar pasta');
            }
        } catch (e) {
            toast.error('Erro de conexão ao atualizar pasta');
        }
        return null;
    };

    const deleteFolder = async (folderId) => {
        try {
            const res = await fetchWithAuth(`${API_URL}/triggers/folders/${folderId}`, {
                method: 'DELETE'
            }, activeClient?.id);
            if (res.ok) {
                setFolders(prev => prev.filter(f => f.id !== folderId));
                if (selectedFolderId === folderId && setSelectedFolderId) setSelectedFolderId(null);
                setTriggers(prev => prev.map(t => t.folder_id === folderId ? { ...t, folder_id: null, folder: null } : t));
                toast.success('Pasta excluída. Os disparos foram mantidos sem pasta.');
                fetchHistory && fetchHistory();
            } else {
                const data = await res.json().catch(() => ({}));
                toast.error(data.detail || 'Erro ao excluir pasta');
            }
        } catch (e) {
            toast.error('Erro de conexão ao excluir pasta');
        }
    };

    const moveTriggerToFolder = async (triggerId, folderId) => {
        try {
            const res = await fetchWithAuth(`${API_URL}/triggers/${triggerId}/folder`, {
                method: 'PATCH',
                body: JSON.stringify({ folder_id: folderId })
            }, activeClient?.id);
            if (res.ok) {
                const folder = folderId ? folders.find(f => f.id === folderId) || null : null;
                setTriggers(prev => prev.map(t => t.id === triggerId ? { ...t, folder_id: folderId, folder } : t));
                fetchFolders();
                toast.success(folderId ? 'Disparo movido para a pasta!' : 'Disparo removido da pasta.');
            } else {
                const data = await res.json().catch(() => ({}));
                toast.error(data.detail || 'Erro ao mover disparo');
            }
        } catch (e) {
            toast.error('Erro de conexão ao mover disparo');
        }
    };

    const bulkMoveToFolder = async (ids, folderId) => {
        if (!ids || ids.length === 0) return;
        try {
            const res = await fetchWithAuth(`${API_URL}/triggers/bulk-move-folder`, {
                method: 'POST',
                body: JSON.stringify({ ids, folder_id: folderId })
            }, activeClient?.id);
            if (res.ok) {
                const data = await res.json();
                const folder = folderId ? folders.find(f => f.id === folderId) || null : null;
                setTriggers(prev => prev.map(t => ids.includes(t.id) ? { ...t, folder_id: folderId, folder } : t));
                fetchFolders();
                setSelectedIds && setSelectedIds([]);
                toast.success(`${data.updated_count || ids.length} disparo(s) movido(s)${folderId ? ' para a pasta' : ''}.`);
            } else {
                const data = await res.json().catch(() => ({}));
                toast.error(data.detail || 'Erro ao mover disparos');
            }
        } catch (e) {
            toast.error('Erro de conexão ao mover disparos');
        }
    };

    return {
        folders,
        loadingFolders,
        fetchFolders,
        createFolder,
        updateFolder,
        deleteFolder,
        moveTriggerToFolder,
        bulkMoveToFolder
    };
};
