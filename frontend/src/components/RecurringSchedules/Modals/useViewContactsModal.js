import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

export function useViewContactsModal({ viewingContacts, onSaveExclusions, onRefreshContacts }) {
    const [localExclusions, setLocalExclusions] = useState([]);
    const [filterType, setFilterType] = useState('all'); // 'all' | 'active' | 'excluded'
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    // Estados de Paginação
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);

    useEffect(() => {
        if (viewingContacts) {
            setLocalExclusions(viewingContacts.exclusion_list || []);
            setFilterType('all');
            setCurrentPage(0);
        }
    }, [viewingContacts]);

    // Resetar página quando filtrar ou alterar limite
    useEffect(() => {
        setCurrentPage(0);
    }, [filterType, pageSize]);

    const contacts = viewingContacts?.contacts || [];

    const handleToggleExclusion = (phone) => {
        setLocalExclusions(prev => {
            if (prev.includes(phone)) {
                return prev.filter(p => p !== phone);
            } else {
                return [...prev, phone];
            }
        });
    };

    const hasChanges = viewingContacts
        ? JSON.stringify([...localExclusions].sort()) !== JSON.stringify([...(viewingContacts.exclusion_list || [])].sort())
        : false;

    const activeContacts = contacts.filter(c => !localExclusions.includes(c.phone));
    const excludedContacts = contacts.filter(c => localExclusions.includes(c.phone));

    const filteredContacts = contacts.filter(c => {
        const isExcluded = localExclusions.includes(c.phone);
        if (filterType === 'active') return !isExcluded;
        if (filterType === 'excluded') return isExcluded;
        return true;
    });

    // Fatiar contatos para a página atual
    const totalFiltered = filteredContacts.length;
    const totalPages = Math.ceil(totalFiltered / pageSize);
    const displayedContacts = filteredContacts.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

    const handleSave = async () => {
        if (onSaveExclusions && viewingContacts) {
            await onSaveExclusions(viewingContacts.id, localExclusions);
        }
    };

    const handleRefresh = async () => {
        if (onRefreshContacts && viewingContacts) {
            setIsRefreshing(true);
            try {
                await onRefreshContacts(viewingContacts.id);
                toast.success("Contatos atualizados com sucesso!");
            } catch (err) {
                toast.error("Erro ao atualizar contatos.");
            } finally {
                setIsRefreshing(false);
            }
        }
    };

    return {
        localExclusions,
        filterType,
        setFilterType,
        isRefreshing,
        currentPage,
        setCurrentPage,
        pageSize,
        setPageSize,
        contacts,
        activeContacts,
        excludedContacts,
        totalFiltered,
        totalPages,
        displayedContacts,
        hasChanges,
        handleToggleExclusion,
        handleSave,
        handleRefresh
    };
}
