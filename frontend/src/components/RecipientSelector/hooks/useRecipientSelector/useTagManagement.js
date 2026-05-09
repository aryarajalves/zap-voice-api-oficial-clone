import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../../config';
import { fetchWithAuth } from '../../../../AuthContext';

export const useTagManagement = ({ 
    activeClient, 
    selectedList, 
    templateVariables, 
    tagVariables, 
    setContacts, 
    setWorkingMessage, 
    setIsProcessing, 
    setShowList, 
    setIsValidated 
}) => {
    const [availableTags, setAvailableTags] = useState([]);
    const [selectedTag, setSelectedTag] = useState('');
    const [isLoadingTags, setIsLoadingTags] = useState(false);
    const [isSavingLeads, setIsSavingLeads] = useState(false);
    const [saveLeadsTags, setSaveLeadsTags] = useState('');
    const [isSaveTagsDropdownOpen, setIsSaveTagsDropdownOpen] = useState(false);
    const [saveTagsSearch, setSaveTagsSearch] = useState('');

    const loadFilters = useCallback(async () => {
        if (!activeClient) return;
        setIsLoadingTags(true);
        try {
            const res = await fetchWithAuth(`${API_URL}/leads/filters`, {}, activeClient.id);
            if (res && res.ok) {
                const data = await res.json();
                setAvailableTags(data.tags || []);
            }
        } catch (err) {
            console.error("Erro ao carregar filtros de leads:", err);
        } finally {
            setIsLoadingTags(false);
        }
    }, [activeClient]);

    useEffect(() => {
        loadFilters();
    }, [loadFilters]);

    const loadContactsByTag = async () => {
        if (!selectedTag) return toast.error("Selecione uma etiqueta primeiro");
        if (!activeClient) return toast.error("Selecione um cliente primeiro");

        if (templateVariables && templateVariables.length > 0) {
            for (const v of templateVariables) {
                const val = tagVariables[v.key];
                if (!val || val.trim() === '') {
                    toast.error(`Faltou preencher a variável: ${v.label}`, {
                        icon: '⚠️',
                        duration: 4000
                    });
                    return;
                }
            }
        }

        setWorkingMessage(`Buscando contatos com a etiqueta "${selectedTag}"...`);
        setIsProcessing(true);
        try {
            const res = await fetchWithAuth(`${API_URL}/leads?tag=${encodeURIComponent(selectedTag)}&limit=10000`, {}, activeClient.id);
            if (res && res.ok) {
                const data = await res.json();
                const incoming = (data.items || []).map(lead => {
                    const vars = {};
                    templateVariables.forEach(v => {
                        let val = tagVariables[v.key] || '';
                        if (val) {
                            val = val.replace(/\{\{nome\}\}/gi, lead.name || '');
                            val = val.replace(/\{\{primeiro_nome\}\}/gi, (lead.name || '').split(' ')[0]);
                            val = val.replace(/\{\{email\}\}/gi, lead.email || '');
                            val = val.replace(/\{\{telefone\}\}/gi, lead.phone || '');
                            val = val.replace(/\{\{produto\}\}/gi, lead.product_name || '');
                        }
                        vars[v.key] = val;
                    });

                    return {
                        phone: lead.phone.replace(/\D/g, ''),
                        vars: vars,
                        status: 'pending',
                        window_open: false,
                        name: lead.name,
                        email: lead.email
                    };
                });

                if (incoming.length === 0) {
                    toast.error("Nenhum contato encontrado com esta etiqueta");
                    setIsProcessing(false);
                    return;
                }

                setContacts(prev => {
                    const existingPhones = new Set(prev.map(c => c.phone));
                    const seenInBatch = new Set();
                    const uniqueIncoming = incoming.filter(c => {
                        if (existingPhones.has(c.phone) || seenInBatch.has(c.phone)) return false;
                        seenInBatch.add(c.phone);
                        return true;
                    });
                    
                    const duplicatesCount = incoming.length - uniqueIncoming.length;
                    if (duplicatesCount > 0) {
                        toast(`${duplicatesCount} contatos já estavam na lista ou são duplicados.`, { icon: 'ℹ️' });
                    }
                    return [...prev, ...uniqueIncoming];
                });
                
                setShowList(true);
                setIsValidated(false);
                toast.success(`${incoming.length} contatos carregados da etiqueta!`);
            }
        } catch (err) {
            console.error(err);
            toast.error("Erro ao buscar contatos por etiqueta");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSaveToLeads = async () => {
        if (!activeClient) return toast.error("Selecione um cliente primeiro");
        if (selectedList.length === 0) return toast.error("Nenhum contato selecionado para salvar");

        setIsSavingLeads(true);
        const loadingToast = toast.loading(`Salvando ${selectedList.length} contatos na base de Leads...`);

        try {
            const res = await fetchWithAuth(`${API_URL}/leads/bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    leads: selectedList.map(c => ({
                        phone: c.phone,
                        name: c.name || c.vars?.nome || c.vars?.name || null,
                        email: c.email || c.vars?.email || null
                    })),
                    tags: saveLeadsTags
                })
            }, activeClient.id);

            if (res.ok) {
                const data = await res.json();
                toast.dismiss(loadingToast);
                toast.success(`${data.imported} contatos salvos com sucesso!`, { icon: '✅' });
                loadFilters();
                setSaveLeadsTags('');
            } else {
                const error = await res.json();
                throw new Error(error.detail || "Erro ao salvar leads");
            }
        } catch (err) {
            console.error(err);
            toast.dismiss(loadingToast);
            toast.error(err.message || "Erro ao salvar contatos no banco.");
        } finally {
            setIsSavingLeads(false);
        }
    };

    return {
        availableTags,
        selectedTag, setSelectedTag,
        isLoadingTags,
        isSavingLeads,
        saveLeadsTags, setSaveLeadsTags,
        isSaveTagsDropdownOpen, setIsSaveTagsDropdownOpen,
        saveTagsSearch, setSaveTagsSearch,
        loadFilters,
        loadContactsByTag,
        handleSaveToLeads
    };
};
