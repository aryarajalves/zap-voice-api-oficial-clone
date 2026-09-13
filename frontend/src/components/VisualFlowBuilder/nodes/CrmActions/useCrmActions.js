import { useState, useEffect, useMemo, useRef } from 'react';
import { useClient } from '../../../../contexts/ClientContext';
import { fetchWithAuth } from '../../../../AuthContext';
import { API_URL } from '../../../../config';

export function useCrmActions(id, data) {
    const { activeClient } = useClient();
    const platform = data.platform || 'chatwoot';
    const action = data.action || '';
    const value = data.value || '';
    const nameType = data.nameType || 'fixed';

    const [labels, setLabels] = useState([]);
    const [loadingLabels, setLoadingLabels] = useState(false);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isRemoveOpen, setIsRemoveOpen] = useState(false);
    const [addSearch, setAddSearch] = useState('');
    const [removeSearch, setRemoveSearch] = useState('');

    const [existingTags, setExistingTags] = useState([]);
    const [showLocalSuggestions, setShowLocalSuggestions] = useState(false);

    const addDropdownRef = useRef(null);
    const removeDropdownRef = useRef(null);

    // Carrega etiquetas se for a ação 'chatwoot_label' ou carrega as tags locais do cliente
    useEffect(() => {
        if (!activeClient) return;
        if (platform === 'chatwoot' && action === 'chatwoot_label') {
            setLoadingLabels(true);
            fetchWithAuth(`${API_URL}/chat/labels`, { headers: { 'X-Client-ID': activeClient.id } })
                .then(res => res.json())
                .then(responseData => {
                    const formatted = Array.isArray(responseData) ? responseData.map((item, idx) => {
                        if (typeof item === 'string') return { id: idx, title: item };
                        if (item && typeof item === 'object') return { id: item.id || idx, title: item.name || item.title || item.label || '' };
                        return { id: idx, title: String(item || '') };
                    }).filter(l => l.title) : [];
                    setLabels(formatted);
                })
                .catch(console.error)
                .finally(() => setLoadingLabels(false));
        } else if (platform === 'local' && (action === 'add_tag' || action === 'remove_tag')) {
            fetchWithAuth(`${API_URL}/leads/filters`, {}, activeClient.id)
                .then(res => res.json())
                .then(responseData => {
                    if (responseData && Array.isArray(responseData.tags)) {
                        setExistingTags(responseData.tags);
                    }
                })
                .catch(console.error);
        }
    }, [platform, action, activeClient]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (addDropdownRef.current && !addDropdownRef.current.contains(event.target)) {
                setIsAddOpen(false);
            }
            if (removeDropdownRef.current && !removeDropdownRef.current.contains(event.target)) {
                setIsRemoveOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedAddLabels = useMemo(() => {
        if (!data.label) return [];
        return data.label.split(',').map(l => l.trim()).filter(l => l);
    }, [data.label]);

    const selectedRemoveLabels = useMemo(() => {
        if (!data.remove_label) return [];
        return data.remove_label.split(',').map(l => l.trim()).filter(l => l);
    }, [data.remove_label]);

    const toggleAddLabel = (labelTitle) => {
        let newList = selectedAddLabels.includes(labelTitle)
            ? selectedAddLabels.filter(l => l !== labelTitle)
            : [...selectedAddLabels, labelTitle];
        data.onChange(id, { label: newList.join(',') });
    };

    const toggleRemoveLabel = (labelTitle) => {
        let newList = selectedRemoveLabels.includes(labelTitle)
            ? selectedRemoveLabels.filter(l => l !== labelTitle)
            : [...selectedRemoveLabels, labelTitle];
        data.onChange(id, { remove_label: newList.join(',') });
    };

    const filteredAddLabels = useMemo(() => {
        if (!Array.isArray(labels)) return [];
        return labels
            .filter(l => !selectedAddLabels.includes(l.title))
            .filter(l => l.title.toLowerCase().includes(addSearch.toLowerCase()));
    }, [labels, selectedAddLabels, addSearch]);

    const filteredRemoveLabels = useMemo(() => {
        if (!Array.isArray(labels)) return [];
        return labels
            .filter(l => !selectedRemoveLabels.includes(l.title))
            .filter(l => l.title.toLowerCase().includes(removeSearch.toLowerCase()));
    }, [labels, selectedRemoveLabels, removeSearch]);

    const handlePlatformChange = (newPlatform) => {
        const defaultAction = newPlatform === 'chatwoot' ? 'chatwoot_label' : 'add_tag';
        data.onChange(id, { platform: newPlatform, action: defaultAction, value: '', label: '', remove_label: '', nameType: 'fixed', newName: '' });
    };

    const handleActionChange = (newAction) => {
        data.onChange(id, { action: newAction, value: '', label: '', remove_label: '', nameType: 'fixed', newName: '' });
    };

    return {
        platform,
        action,
        value,
        nameType,
        labels,
        setLabels,
        loadingLabels,
        isAddOpen,
        setIsAddOpen,
        isRemoveOpen,
        setIsRemoveOpen,
        addSearch,
        setAddSearch,
        removeSearch,
        setRemoveSearch,
        existingTags,
        showLocalSuggestions,
        setShowLocalSuggestions,
        addDropdownRef,
        removeDropdownRef,
        selectedAddLabels,
        selectedRemoveLabels,
        toggleAddLabel,
        toggleRemoveLabel,
        filteredAddLabels,
        filteredRemoveLabels,
        handlePlatformChange,
        handleActionChange
    };
}
