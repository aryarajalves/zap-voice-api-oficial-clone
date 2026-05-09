import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useClient } from '../../../../contexts/ClientContext';
import { applyFilters, getDispatchList } from '../../../../utils/phoneFilters';
import { useFileImport } from './useFileImport';
import { useValidation } from './useValidation';
import { useTagManagement } from './useTagManagement';

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
    const [filterOpenOnly, setFilterOpenOnly] = useState(requireOpenWindow);
    const [filterBlockedOnly, setFilterBlockedOnly] = useState(false);
    const [dddSearch, setDddSearch] = useState('');
    const [showList, setShowList] = useState(false);
    const [isValidated, setIsValidated] = useState(false);
    const [tagVariables, setTagVariables] = useState({});
    const [fileVariables, setFileVariables] = useState({});
    const [activeDropdown, setActiveDropdown] = useState(null);

    useEffect(() => {
        if (requireOpenWindow) {
            setFilterOpenOnly(true);
        }
    }, [requireOpenWindow]);

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

    const displayedContacts = useMemo(() => {
        return filteredContacts.slice(0, displayLimit);
    }, [filteredContacts, displayLimit]);

    const selectedList = useMemo(() => {
        return getDispatchList(filteredContacts);
    }, [filteredContacts]);

    const lastOnSelectRef = useRef(null);
    useEffect(() => {
        const payload = { list: selectedList, mode, tag: '', isValidated }; // Tag is handled by the subhook but here it is empty for the payload stringification
        const payloadStr = JSON.stringify(payload);
        if (lastOnSelectRef.current !== payloadStr) {
            onSelect(selectedList, { mode, tag: '', isValidated });
            lastOnSelectRef.current = payloadStr;
        }
    }, [selectedList, mode, isValidated, onSelect]);

    // Sub-hooks
    const fileImport = useFileImport({ 
        setContacts, 
        setWorkingMessage, 
        setIsProcessing, 
        setShowList, 
        setIsValidated, 
        fileVariables 
    });

    const validation = useValidation({ 
        contacts, 
        setContacts, 
        activeClient, 
        selectedInbox, 
        setIsValidated 
    });

    const tags = useTagManagement({ 
        activeClient, 
        selectedList, 
        templateVariables, 
        tagVariables, 
        setContacts, 
        setWorkingMessage, 
        setIsProcessing, 
        setShowList, 
        setIsValidated 
    });

    // Core Handlers
    const removeContact = (phone) => {
        setContacts(prev => prev.filter(c => c.phone !== phone));
        toast.success(`Número ${phone} removido.`);
    };

    const clearAll = () => {
        setContacts([]);
        setInputText('');
        setTagVariables({});
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
        clearAll,
        copyToClipboard,
        parseContacts,
        addBrazilCode,
        add55ToInput,
        activeClient,
        isValidated,
        // From Sub-hooks
        ...fileImport,
        ...validation,
        ...tags
    };
};
