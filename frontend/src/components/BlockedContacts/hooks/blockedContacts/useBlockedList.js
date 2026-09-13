import { useState, useEffect, useCallback, useMemo } from 'react';
import { API_URL } from '../../../../config';
import { fetchWithAuth } from '../../../../AuthContext';
import { toast } from 'react-hot-toast';
import { cleanNumbers, getLast8 } from '../../utils/blockedUtils';

/**
 * Hook para listagem, paginação, filtros, seleção e exclusão de contatos bloqueados/em repouso.
 */
export function useBlockedList({ activeClient }) {
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [reasonFilter, setReasonFilter] = useState('');
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [listTab, setListTab] = useState('permanent'); // 'permanent' | 'resting'
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);

    const activeClientId = activeClient?.id;

    const fetchBlockedContacts = useCallback(async () => {
        if (!activeClientId) return;
        setLoading(true);
        try {
            const endpoint = listTab === 'resting' ? `${API_URL}/resting/` : `${API_URL}/blocked/`;
            const res = await fetchWithAuth(endpoint, {}, activeClientId);
            if (res && res.ok) {
                const data = await res.json();
                setContacts(Array.isArray(data) ? data : []);
                setSelectedIds(new Set());
            }
        } catch (err) {
            console.error("Erro ao buscar bloqueados:", err);
            toast.error("Erro ao carregar lista");
        } finally {
            setLoading(false);
        }
    }, [activeClientId, listTab]);

    useEffect(() => {
        fetchBlockedContacts();
    }, [fetchBlockedContacts]);

    const performUnblock = async (id) => {
        try {
            const endpoint = listTab === 'resting' ? `${API_URL}/resting/${id}` : `${API_URL}/blocked/${id}`;
            const res = await fetchWithAuth(endpoint, { method: 'DELETE' }, activeClient?.id);
            if (res && res.ok) {
                setContacts(prev => prev.filter(c => c.id !== id));
                setSelectedIds(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(id);
                    return newSet;
                });
                return true;
            }
        } catch (err) {
            console.error(err);
        }
        return false;
    };

    const handleBulkDelete = async ({ setImporting, setImportLabel, setImportProgress } = {}) => {
        if (selectedIds.size === 0) return;
        if (setImporting) setImporting(true);
        if (setImportLabel) setImportLabel('Excluindo Contatos');
        if (setImportProgress) setImportProgress({ current: 0, total: selectedIds.size });

        const idsToDelete = Array.from(selectedIds);
        try {
            const endpoint = listTab === 'resting' ? `${API_URL}/resting/unrest_bulk` : `${API_URL}/blocked/unblock_bulk`;
            const res = await fetchWithAuth(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: idsToDelete })
            }, activeClient?.id);

            if (res && res.ok) {
                const result = await res.json();
                toast.success(`${result.deleted_count || 0} contatos removidos.`);
                fetchBlockedContacts();
            } else {
                toast.error("Erro ao realizar exclusão em massa.");
            }
        } catch (err) {
            toast.error("Falha de conexão.");
        } finally {
            if (setImporting) setImporting(false);
        }
    };

    const filteredContacts = useMemo(() => {
        let result = Array.isArray(contacts) ? contacts : [];

        // Filtro por motivo (dropdown)
        if (reasonFilter) {
            result = result.filter(c =>
                (c.reason || '').toLowerCase().includes(reasonFilter.toLowerCase())
            );
        }

        if (!searchTerm) return result;
        const cleanSearch = searchTerm.trim();

        if (/[\n, ]/.test(cleanSearch)) {
            const searchNumbers = cleanNumbers(cleanSearch);
            if (searchNumbers.length > 0) {
                const searchSuffixes = searchNumbers.map(n => getLast8(n));
                return result.filter(c => {
                    const contactSuffix = getLast8(c.phone);
                    return searchSuffixes.some(suffix => {
                        if (suffix.length === 8) return contactSuffix.endsWith(suffix);
                        return c.phone.includes(suffix);
                    });
                });
            }
        }

        return result.filter(c => {
            if (c.reason?.toLowerCase().includes(cleanSearch.toLowerCase())) return true;
            if (c.name?.toLowerCase().includes(cleanSearch.toLowerCase())) return true;
            const singleSuffix = getLast8(cleanSearch);
            const contactSuffix = getLast8(c.phone);
            if (singleSuffix.length === 8) return contactSuffix.endsWith(singleSuffix);
            return (singleSuffix && c.phone.includes(singleSuffix)) || c.phone.includes(cleanSearch);
        });
    }, [contacts, searchTerm, reasonFilter]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const paginatedContacts = useMemo(() => {
        if (itemsPerPage === 'all') return filteredContacts;
        const start = (currentPage - 1) * itemsPerPage;
        return filteredContacts.slice(start, start + itemsPerPage);
    }, [filteredContacts, currentPage, itemsPerPage]);

    const totalPages = itemsPerPage === 'all' ? 1 : Math.ceil(filteredContacts.length / itemsPerPage);

    const exportBlockedContacts = () => {
        if (filteredContacts.length === 0) {
            toast.error("Nenhum contato bloqueado para exportar.");
            return;
        }

        const headers = ["Telefone", "Nome", "Motivo", "Data/Hora"];
        const rows = filteredContacts.map(c => [
            c.phone,
            c.name || "",
            c.reason || "",
            c.created_at ? new Date(c.created_at).toLocaleString('pt-BR') : ""
        ]);

        const csvContent = [
            headers.join(";"),
            ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(";"))
        ].join("\n");

        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `contatos_bloqueados_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Lista de contatos bloqueados exportada com sucesso!");
    };

    const toggleSelectAll = (checked) => {
        if (checked) {
            const visibleIds = paginatedContacts.map(c => c.id);
            const newSet = new Set(selectedIds);
            visibleIds.forEach(id => newSet.add(id));
            setSelectedIds(newSet);
        } else {
            const visibleIds = paginatedContacts.map(c => c.id);
            const newSet = new Set(selectedIds);
            visibleIds.forEach(id => newSet.delete(id));
            setSelectedIds(newSet);
        }
    };

    const selectAllFiltered = () => {
        const allIds = filteredContacts.map(c => c.id);
        setSelectedIds(new Set(allIds));
    };

    const clearSelection = () => setSelectedIds(new Set());

    const isAllFilteredSelected = filteredContacts.length > 0 && filteredContacts.every(c => selectedIds.has(c.id));

    const toggleSelectRow = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    return {
        contacts,
        setContacts,
        loading,
        setLoading,
        searchTerm,
        setSearchTerm,
        reasonFilter,
        setReasonFilter,
        selectedIds,
        setSelectedIds,
        listTab,
        setListTab,
        currentPage,
        setCurrentPage,
        itemsPerPage,
        setItemsPerPage,
        fetchBlockedContacts,
        performUnblock,
        handleBulkDelete,
        filteredContacts,
        paginatedContacts,
        totalPages,
        exportBlockedContacts,
        toggleSelectAll,
        selectAllFiltered,
        clearSelection,
        isAllFilteredSelected,
        toggleSelectRow
    };
}
