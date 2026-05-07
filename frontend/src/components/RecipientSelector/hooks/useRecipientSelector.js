
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { read, utils } from 'xlsx';
import { API_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';
import { useClient } from '../../../contexts/ClientContext';
import { applyFilters, getDispatchList } from '../../../utils/phoneFilters';

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
    const [isValidating, setIsValidating] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isWorking, setIsWorking] = useState(false);
    const [workingMessage, setWorkingMessage] = useState('');
    const [isReadingFile, setIsReadingFile] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [displayLimit, setDisplayLimit] = useState(100);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterOpenOnly, setFilterOpenOnly] = useState(requireOpenWindow);
    const [filterBlockedOnly, setFilterBlockedOnly] = useState(false);
    const [dddSearch, setDddSearch] = useState('');
    const [showList, setShowList] = useState(false);
    const [isSavingLeads, setIsSavingLeads] = useState(false);
    const [saveLeadsTags, setSaveLeadsTags] = useState('');
    const [isSaveTagsDropdownOpen, setIsSaveTagsDropdownOpen] = useState(false);
    const [saveTagsSearch, setSaveTagsSearch] = useState('');

    const [csvData, setCsvData] = useState({ headers: [], rows: [], nonEmptyIndices: [] });
    const [showColumnSelector, setShowColumnSelector] = useState(false);
    const [columnMapping, setColumnMapping] = useState({});
    const [availableTags, setAvailableTags] = useState([]);
    const [selectedTag, setSelectedTag] = useState('');
    const [isLoadingTags, setIsLoadingTags] = useState(false);
    const [tagVariables, setTagVariables] = useState({});
    const [fileVariables, setFileVariables] = useState({});
    const [activeDropdown, setActiveDropdown] = useState(null);

    useEffect(() => {
        if (requireOpenWindow) {
            setFilterOpenOnly(true);
        }
    }, [requireOpenWindow]);

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
        const payload = { list: selectedList, mode, tag: selectedTag };
        const payloadStr = JSON.stringify(payload);
        if (lastOnSelectRef.current !== payloadStr) {
            onSelect(selectedList, { mode, tag: selectedTag });
            lastOnSelectRef.current = payloadStr;
        }
    }, [selectedList, mode, selectedTag, onSelect]);

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
    };

    const startValidation = async () => {
        if (!activeClient) return toast.error("Selecione um cliente primeiro");
        if (contacts.length === 0) return toast.error("Adicione contatos primeiro");

        setIsValidating(true);
        setProgress({ current: 0, total: contacts.length });

        try {
            const phones = contacts.map(c => c.phone);
            const batchSize = 100;
            const updatedContacts = [...contacts];

            for (let i = 0; i < phones.length; i += batchSize) {
                const batch = phones.slice(i, i + batchSize);
                const res = await fetchWithAuth(`${API_URL}/chatwoot/validate-contacts`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        phones: batch,
                        wa_business_account_id: selectedInbox
                    })
                }, activeClient.id);

                if (res.ok) {
                    const results = await res.json();
                    batch.forEach(phone => {
                        const result = results[phone] || { exists: false, window_open: false, is_blocked: false };
                        const idx = updatedContacts.findIndex(c => c.phone === phone);
                        if (idx !== -1) {
                            updatedContacts[idx] = {
                                ...updatedContacts[idx],
                                status: result.exists ? 'verified' : 'not_found',
                                window_open: result.window_open,
                                is_blocked: result.is_blocked
                            };
                        }
                    });

                    if (i % 500 === 0 || i + batchSize >= phones.length) {
                        setContacts([...updatedContacts]);
                    }
                    setProgress(prev => ({ ...prev, current: Math.min(i + batch.length, phones.length) }));
                }
            }
            toast.success("Validação concluída!");
        } catch (err) {
            console.error(err);
            toast.error("Erro na validação");
        } finally {
            setIsValidating(false);
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsReadingFile(true);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = utils.sheet_to_json(ws, { header: 1 });

                if (data.length < 1) {
                    toast.error("Arquivo vazio");
                    setIsReadingFile(false);
                    return;
                }

                const headers = data[0];
                const rows = data.slice(1);
                const nonEmptyIndices = [];
                headers.forEach((h, idx) => {
                    if (h || rows.some(r => r[idx])) {
                        nonEmptyIndices.push(idx);
                    }
                });

                setCsvData({ headers, rows, nonEmptyIndices });
                setShowColumnSelector(true);
            } catch (err) {
                console.error(err);
                toast.error("Erro ao ler arquivo");
            } finally {
                setIsReadingFile(false);
            }
        };
        reader.readAsBinaryString(file);
    };

    const confirmColumns = async () => {
        const phoneIdx = Object.keys(columnMapping).find(k => columnMapping[k] === 'phone');
        if (phoneIdx === undefined) return toast.error("Selecione a coluna de TELEFONE");

        setWorkingMessage('Importando contatos e mapeando variáveis...');
        setIsProcessing(true);
        await new Promise(resolve => setTimeout(resolve, 800));

        const incoming = csvData.rows.map(row => {
            const rawCell = String(row[parseInt(phoneIdx)] || '');
            const firstPart = rawCell.split(/[,;|\s]+/)[0];
            let phone = firstPart.replace(/\D/g, '');
            if (phone.length === 0) return null;
            if (phone.length === 11 && phone.startsWith('0')) phone = phone.substring(1);

            const variables = { ...fileVariables }; // Include fixed variables as fallback
            Object.entries(columnMapping).forEach(([colIdx, varKey]) => {
                if (varKey === 'phone' || varKey === 'ignore') return;
                variables[varKey] = String(row[parseInt(colIdx)] ?? '');
            });

            return { phone, vars: variables, status: 'pending', window_open: false };
        }).filter(c => c !== null);

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
                toast(`${duplicatesCount} duplicados ignorados no arquivo.`, {
                    icon: 'ℹ️',
                    id: 'duplicates-file-ignored'
                });
            }

            return [...prev, ...uniqueIncoming];
        });

        setIsProcessing(false);
        setShowColumnSelector(false);
        setShowList(true);
        toast.success(`Contatos carregados com sucesso!`);
    };

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
        isValidating,
        isProcessing,
        isWorking,
        workingMessage,
        isReadingFile,
        progress,
        displayLimit, setDisplayLimit,
        searchTerm, setSearchTerm,
        filterOpenOnly, setFilterOpenOnly,
        filterBlockedOnly, setFilterBlockedOnly,
        dddSearch, setDddSearch,
        showList, setShowList,
        isSavingLeads,
        saveLeadsTags, setSaveLeadsTags,
        isSaveTagsDropdownOpen, setIsSaveTagsDropdownOpen,
        saveTagsSearch, setSaveTagsSearch,
        csvData,
        showColumnSelector, setShowColumnSelector,
        columnMapping, setColumnMapping,
        availableTags,
        selectedTag, setSelectedTag,
        isLoadingTags,
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
        startValidation,
        handleFileUpload,
        confirmColumns,
        loadContactsByTag,
        handleSaveToLeads,
        addBrazilCode,
        add55ToInput,
        activeClient
    };
};
