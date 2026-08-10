import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useClient } from '../../../../contexts/ClientContext';
import { applyFilters, getDispatchList } from '../../../../utils/phoneFilters';
import { useFileImport } from './useFileImport';
import { useValidation } from './useValidation';
import { useTagManagement } from './useTagManagement';
import { API_URL } from '../../../../config';
import { fetchWithAuth } from '../../../../AuthContext';

export const useRecipientSelector = ({
    onSelect,
    selectedInbox,
    requireOpenWindow = false,
    templateVariables = [],
    exclusionList = []
}) => {
    const { activeClient } = useClient();
    const [mode, setMode] = useState('manual'); // 'manual' | 'upload' | 'tag'
    const [inputText, setInputText] = useState('');
    const [contacts, setContacts] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isWorking, setIsWorking] = useState(false);
    const [workingMessage, setWorkingMessage] = useState('');
    const [displayLimit, setDisplayLimit] = useState(100);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterOpenOnly, setFilterOpenOnly] = useState(false);
    const [filterBlockedOnly, setFilterBlockedOnly] = useState(false);
    const [dddSearch, setDddSearch] = useState('');
    const [showList, setShowList] = useState(false);
    const [isValidated, setIsValidated] = useState(false);
    const [tagVariables, setTagVariables] = useState({});
    const [fileVariables, setFileVariables] = useState({});
    const [activeDropdown, setActiveDropdown] = useState(null);

    const [variableFilters, setVariableFilters] = useState({});
    const [limitMode, setLimitMode] = useState('all'); // 'all' | 'limit'
    const [dispatchLimit, setDispatchLimit] = useState(500);

    useEffect(() => {
        if (requireOpenWindow) {
            setFilterOpenOnly(true);
        }
    }, [requireOpenWindow]);

    useEffect(() => {
        if (!activeClient || contacts.length === 0) return;

        const toCheck = contacts.filter(c => c.is_blocked === undefined);
        if (toCheck.length === 0) return;

        const phonesToCheck = toCheck.map(c => c.phone);
        let active = true;

        const checkBlockedBulk = async () => {
            try {
                const res = await fetchWithAuth(`${API_URL}/blocked/check_bulk`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phones: phonesToCheck })
                }, activeClient.id);

                if (res && res.ok && active) {
                    const data = await res.json();
                    const blockedSet = new Set(data.blocked_phones || []);
                    
                    setContacts(prev => prev.map(c => {
                        if (phonesToCheck.includes(c.phone)) {
                            return {
                                ...c,
                                is_blocked: blockedSet.has(c.phone)
                            };
                        }
                        return c;
                    }));
                }
            } catch (err) {
                console.error("Erro ao verificar bloqueados em lote:", err);
            }
        };

        checkBlockedBulk();

        return () => {
            active = false;
        };
    }, [contacts, activeClient]);

    const blockedCount = useMemo(() => contacts.filter(c => c.is_blocked).length, [contacts]);

    const filteredContacts = useMemo(() => {
        return applyFilters(contacts, {
            searchTerm,
            dddSearch,
            filterOpenOnly,
            filterBlockedOnly,
            exclusionList
        });
    }, [contacts, searchTerm, filterOpenOnly, filterBlockedOnly, dddSearch, exclusionList]);

    const selectedList = useMemo(() => {
        return getDispatchList(filteredContacts, limitMode, dispatchLimit);
    }, [filteredContacts, limitMode, dispatchLimit]);

    const displayedContacts = useMemo(() => {
        return filteredContacts.slice(0, displayLimit);
    }, [filteredContacts, displayLimit]);

    const [originalTagPhones, setOriginalTagPhones] = useState([]);

    const tags = useTagManagement({ 
        activeClient, 
        selectedList, 
        templateVariables, 
        tagVariables, 
        setContacts, 
        setWorkingMessage, 
        setIsProcessing, 
        setShowList, 
        setIsValidated,
        setOriginalTagPhones
    });

    const { saveLeadsTags } = tags;

    // Sub-hooks
    const fileImport = useFileImport({ 
        setContacts, 
        setWorkingMessage, 
        setIsProcessing, 
        setShowList, 
        setIsValidated, 
        fileVariables,
        activeClient,
        saveLeadsTags,
        loadFilters: () => tags.loadFilters()
    });

    const validation = useValidation({ 
        contacts, 
        setContacts, 
        activeClient, 
        selectedInbox, 
        setIsValidated 
    });

    const lastOnSelectRef = useRef(null);
    useEffect(() => {
        const currentTag = mode === 'tag' ? (tags.selectedTags || []).join(', ') : '';
        const tagExclusions = mode === 'tag' 
            ? originalTagPhones.filter(phone => !selectedList.some(c => c.phone === phone))
            : [];
        const payload = { list: selectedList, mode, tag: currentTag, tagExclusions, isValidated, variableFilters };
        const payloadStr = JSON.stringify(payload);
        if (lastOnSelectRef.current !== payloadStr) {
            if (typeof onSelect === 'function') {
                onSelect(selectedList, { mode, tag: currentTag, tagExclusions, isValidated, variableFilters });
            }
            lastOnSelectRef.current = payloadStr;
        }
    }, [selectedList, mode, isValidated, onSelect, variableFilters, tags.selectedTags, originalTagPhones]);

    // Core Handlers
    const removeContact = (phone) => {
        setContacts(prev => prev.filter(c => c.phone !== phone));
        toast.success(`Número ${phone} removido.`);
    };

    const clearAll = () => {
        setContacts([]);
        setInputText('');
        setTagVariables({});
        setOriginalTagPhones([]);
        toast.success("Lista limpa com sucesso!");
    };

    const copyToClipboard = () => {
        if (selectedList.length === 0) return toast.error("Nenhuma lista para copiar");
        const text = selectedList.map(c => c.phone).join('\n');
        navigator.clipboard.writeText(text);
        toast.success("Lista de disparos copiada para a área de transferência!", { icon: '📋' });
    };

    const parseContacts = async () => {
        setWorkingMessage('Processando e validando lista de números...');
        setIsWorking(true);
        await new Promise(resolve => setTimeout(resolve, 1000));

        const lines = inputText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const incoming = lines.map(l => {
            const parts = l.split('|').map(p => p.trim());
            const phone = parts[0].replace(/\D/g, '');
            const variables = {};
            parts.slice(1).forEach((val, pos) => {
                const varKey = templateVariables[pos]?.key || `BODY_${pos}`;
                variables[varKey] = val;
            });
            return { phone, vars: variables, status: 'pending', window_open: false };
        }).filter(c => c.phone.length >= 8);

        if (incoming.length === 0) {
            setIsWorking(false);
            return toast.error("Nenhum número válido encontrado");
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
                toast(`${duplicatesCount} números duplicados foram ignorados.`, {
                    icon: 'ℹ️',
                    id: 'duplicates-ignored'
                });
            }
            return [...prev, ...uniqueIncoming];
        });

        setInputText('');
        setShowList(true);
        setIsWorking(false);
        setIsValidated(false);
    };

    const addBrazilCode = async () => {
        setWorkingMessage('Verificando cada número e adicionando o DDI 55 se necessário.');
        setIsWorking(true);
        await new Promise(resolve => setTimeout(resolve, 800));

        setContacts(prev => {
            const seen = new Set();
            return prev.map(c => {
                if (c.phone.startsWith('55')) return c;
                return { ...c, phone: `55${c.phone}`, status: 'pending' };
            }).filter(c => {
                if (seen.has(c.phone)) return false;
                seen.add(c.phone);
                return true;
            });
        });
        setIsWorking(false);
        toast.success("DDI 55 adicionado!");
    };

    const add55ToInput = async () => {
        setWorkingMessage('Adicionando DDI 55 aos números informados...');
        setIsWorking(true);
        await new Promise(resolve => setTimeout(resolve, 600));

        const lines = inputText.split('\n').map(l => {
            let p = l.trim().replace(/\D/g, '');
            if (p.length > 0 && !p.startsWith('55')) return '55' + p;
            return p;
        }).filter(l => l.length > 0);
        setInputText(lines.join('\n'));
        setIsWorking(false);
        toast.success("DDI 55 adicionado ao texto!");
    };

    const unblockContact = async (phone) => {
        try {
            const res = await fetchWithAuth(`${API_URL}/blocked/by_phone/${phone}`, {
                method: 'DELETE'
            }, activeClient.id);

            if (res && res.ok) {
                setContacts(prev => prev.map(c => {
                    if (c.phone === phone) {
                        return { ...c, is_blocked: false };
                    }
                    return c;
                }));
                toast.success(`Número ${phone} removido da lista de bloqueio!`);
            } else {
                let errData = {};
                try { errData = await res.json(); } catch(e) {}
                toast.error(errData.detail || "Erro ao desbloquear contato.");
            }
        } catch (err) {
            console.error("Erro ao remover da lista de bloqueio:", err);
            toast.error("Erro ao remover da lista de bloqueio.");
        }
    };

    return {
        mode, setMode,
        inputText, setInputText,
        contacts, setContacts,
        isProcessing,
        isWorking,
        workingMessage,
        displayLimit, setDisplayLimit,
        searchTerm, setSearchTerm,
        filterOpenOnly, setFilterOpenOnly,
        filterBlockedOnly, setFilterBlockedOnly,
        dddSearch, setDddSearch,
        showList, setShowList,
        tagVariables, setTagVariables,
        fileVariables, setFileVariables,
        activeDropdown, setActiveDropdown,
        blockedCount,
        filteredContacts,
        displayedContacts,
        selectedList,
        removeContact,
        unblockContact,
        clearAll,
        copyToClipboard,
        parseContacts,
        addBrazilCode,
        add55ToInput,
        activeClient,
        isValidated,
        variableFilters, setVariableFilters,
        limitMode, setLimitMode,
        dispatchLimit, setDispatchLimit,
        // From Sub-hooks
        ...fileImport,
        ...validation,
        ...tags
    };
};
