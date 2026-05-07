import { useState, useEffect, useCallback, useMemo } from 'react';
import { API_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';
import { useClient } from '../../../contexts/ClientContext';
import { toast } from 'react-hot-toast';
import { read, utils } from 'xlsx';
import { mapCountryToCode, parseManualEntry, cleanNumbers, getLast8 } from '../utils/blockedUtils';

export function useBlockedContacts() {
    const { activeClient } = useClient();
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [manualInput, setManualInput] = useState('');
    const [adding, setAdding] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [mode, setMode] = useState('manual'); // 'manual' | 'upload'

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);

    // Auto-block keywords
    const [keywords, setKeywords] = useState([]);
    const [newKeyword, setNewKeyword] = useState('');
    const [savingKeywords, setSavingKeywords] = useState(false);

    // File Import
    const [importData, setImportData] = useState({ headers: [], rows: [], nonEmptyIndices: [] });
    const [selectedPhoneCols, setSelectedPhoneCols] = useState([]);
    const [selectedNameCol, setSelectedNameCol] = useState(-1);
    const [isWorking, setIsWorking] = useState(false);
    const [workingMessage, setWorkingMessage] = useState('');
    const [importing, setImporting] = useState(false);
    const [showColumnSelector, setShowColumnSelector] = useState(false);
    const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
    const [importLabel, setImportLabel] = useState('Importando Contatos');
    const [showFullPreview, setShowFullPreview] = useState(false);
    const [isReadingFile, setIsReadingFile] = useState(false);
    const [phoneColSearch, setPhoneColSearch] = useState('');
    const [nameColSearch, setNameColSearch] = useState('');

    const fetchBlockedContacts = useCallback(async () => {
        if (!activeClient) return;
        setLoading(true);
        try {
            const res = await fetchWithAuth(`${API_URL}/blocked/`, {}, activeClient?.id);
            if (res && res.ok) {
                const data = await res.json();
                setContacts(data || []);
                setSelectedIds(new Set());
            }
        } catch (err) {
            console.error("Erro ao buscar bloqueados:", err);
            toast.error("Erro ao carregar lista de bloqueios");
        } finally {
            setLoading(false);
        }
    }, [activeClient]);

    const fetchKeywords = useCallback(async () => {
        if (!activeClient) return;
        try {
            const res = await fetchWithAuth(`${API_URL}/settings/`, {}, activeClient?.id);
            if (res && res.ok) {
                const data = await res.json();
                const kwStr = data.AUTO_BLOCK_KEYWORDS || "bloquear,parar,sair,cancelar,não quero,nao quero,stop,unsubscribe,opt-out,descadastrar";
                setKeywords(kwStr.split(',').map(k => k.trim()).filter(Boolean));
            }
        } catch (err) {
            console.error("Erro ao buscar gatilhos:", err);
        }
    }, [activeClient]);

    useEffect(() => {
        fetchBlockedContacts();
        fetchKeywords();
    }, [fetchBlockedContacts, fetchKeywords]);

    const persistKeywords = async (updatedKeywords) => {
        if (!activeClient) return false;
        try {
            const res = await fetchWithAuth(`${API_URL}/settings/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    settings: {
                        AUTO_BLOCK_KEYWORDS: updatedKeywords.join(',')
                    }
                })
            }, activeClient?.id);
            return res && res.ok;
        } catch (err) {
            console.error(err);
            return false;
        }
    };

    const handleSaveKeywords = async () => {
        setSavingKeywords(true);
        const success = await persistKeywords(keywords);
        if (success) {
            toast.success("Gatilhos salvos com sucesso!");
        } else {
            toast.error("Erro ao salvar gatilhos.");
        }
        setSavingKeywords(false);
    };

    const addKeyword = async (e) => {
        if (e) e.preventDefault();
        const val = newKeyword.trim().toLowerCase();
        if (!val) return;

        if (keywords.includes(val)) {
            toast.error("Este gatilho já está na lista.");
            setNewKeyword('');
            return;
        }

        const newList = [...keywords, val];
        setKeywords(newList);
        setNewKeyword('');

        const success = await persistKeywords(newList);
        if (success) {
            toast.success(`"${val}" adicionado e salvo com sucesso!`);
        } else {
            toast.error(`"${val}" adicionado, mas houve erro ao salvar no banco.`);
        }
    };

    const removeKeyword = async (kw) => {
        const newList = keywords.filter(k => k !== kw);
        setKeywords(newList);

        const success = await persistKeywords(newList);
        if (success) {
            toast.success("Gatilho removido.");
        } else {
            toast.error("Erro ao remover no banco.");
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsReadingFile(true);
        const reader = new FileReader();
        const extension = file.name.split('.').pop().toLowerCase();

        if (extension === 'xlsx' || extension === 'xls') {
            reader.onload = (evt) => {
                try {
                    const data = evt.target.result;
                    const workbook = read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];
                    const rows = utils.sheet_to_json(sheet, { header: 1, defval: '' });

                    if (!rows || rows.length === 0) {
                        toast.error("Arquivo vazio.");
                        return;
                    }

                    const headers = (rows[0] || []).map(h => String(h || ''));
                    const dataRows = rows.slice(1);

                    const nonEmptyIndices = headers.reduce((acc, _, i) => {
                        const hasValue = dataRows.some(row => row[i] !== undefined && row[i] !== null && String(row[i]).trim() !== '');
                        if (hasValue) acc.push(i);
                        return acc;
                    }, []);

                    setImportData({ headers, rows: dataRows, nonEmptyIndices });
                    setShowColumnSelector(true);
                } catch (err) {
                    console.error(err);
                    toast.error("Erro ao ler arquivo Excel.");
                } finally {
                    setIsReadingFile(false);
                }
            };
            reader.readAsArrayBuffer(file);
        } else {
            reader.onload = (evt) => {
                try {
                    const text = evt.target.result;
                    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
                    if (lines.length === 0) {
                        toast.error("Arquivo vazio.");
                        return;
                    }

                    const firstLine = lines[0];
                    const delimiters = [',', ';', '\t'];
                    const delimiter = delimiters.sort((a, b) => firstLine.split(b).length - firstLine.split(a).length)[0];

                    const rows = lines.map(line => line.split(delimiter).map(cell => cell.replace(/^["']|["']$/g, '').trim()));
                    const headers = rows[0];
                    const dataRows = rows.slice(1);

                    const nonEmptyIndices = headers.reduce((acc, _, i) => {
                        const hasValue = dataRows.some(row => row[i] !== undefined && row[i] !== null && String(row[i]).trim() !== '');
                        if (hasValue) acc.push(i);
                        return acc;
                    }, []);

                    setImportData({ headers, rows: dataRows, nonEmptyIndices });
                    setShowColumnSelector(true);
                } catch (err) {
                    toast.error("Erro ao ler arquivo CSV.");
                } finally {
                    setIsReadingFile(false);
                }
            };
            reader.readAsText(file);
        }
        e.target.value = '';
    };

    const processMappedImport = async () => {
        if (selectedPhoneCols.length === 0) {
            toast.error("Selecione pelo menos uma coluna de Telefone.");
            return;
        }

        setImporting(true);
        let successCount = 0;
        let failCount = 0;
        let alreadyCount = 0;
        let ignoredCount = 0;

        const entries = importData.rows.map(row => {
            const rawPhone = selectedPhoneCols.map(idx => {
                const originalVal = String(row[idx] || '').trim();
                return mapCountryToCode(originalVal);
            }).join('');
            const phone = rawPhone.replace(/\D/g, '');

            if (!rawPhone || phone.length < 8) {
                ignoredCount++;
                return null;
            }

            const name = selectedNameCol !== -1 ? String(row[selectedNameCol] || '').trim() : '';
            return { phone, name };
        }).filter(Boolean);

        if (entries.length === 0) {
            toast.error("Nenhum número válido encontrado.");
            setImporting(false);
            return;
        }

        setImportLabel('Importando Contatos');
        setImportProgress({ current: 0, total: entries.length });

        const batchSize = 100;
        for (let i = 0; i < entries.length; i += batchSize) {
            const batch = entries.slice(i, i + batchSize);
            try {
                const res = await fetchWithAuth(`${API_URL}/blocked/block_bulk`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contacts: batch.map(e => ({ ...e, reason: 'Importação' }))
                    })
                }, activeClient?.id);

                if (res && res.ok) {
                    const result = await res.json();
                    successCount += result.success_count;
                    alreadyCount += result.already_blocked_count;
                } else {
                    failCount += batch.length;
                }
            } catch (err) {
                failCount += batch.length;
            } finally {
                setImportProgress(prev => ({
                    ...prev,
                    current: Math.min(prev.current + batch.length, entries.length)
                }));
            }
        }

        toast.success(`${successCount} contatos importados!`);
        if (alreadyCount > 0) toast.success(`${alreadyCount} já estavam na lista.`);
        if (failCount > 0) toast.error(`${failCount} falhas.`);

        setShowColumnSelector(false);
        setImportData({ headers: [], rows: [], nonEmptyIndices: [] });
        setSelectedPhoneCols([]);
        setSelectedNameCol(-1);
        fetchBlockedContacts();
        setImporting(false);
    };

    const handleBlockManual = async (e) => {
        if (e) e.preventDefault();
        const entries = parseManualEntry(manualInput);
        if (entries.length === 0) {
            toast.error("Insira pelo menos um número válido.");
            return;
        }

        setWorkingMessage(`Bloqueando ${entries.length} contatos...`);
        setIsWorking(true);
        setAdding(true);
        let successCount = 0;
        let failCount = 0;

        await Promise.all(entries.map(async (entry) => {
            try {
                const res = await fetchWithAuth(`${API_URL}/blocked/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone: entry.phone, name: entry.name, reason: 'Manual' })
                }, activeClient?.id);

                if (res && res.ok) {
                    successCount++;
                } else {
                    const data = await res.json();
                    if (res.status !== 400 || !data.detail?.includes("já está bloqueado")) {
                        failCount++;
                    }
                }
            } catch (err) {
                failCount++;
            }
        }));

        if (successCount > 0) {
            toast.success(`${successCount} contatos bloqueados!`);
            setManualInput('');
            fetchBlockedContacts();
        } else if (entries.length > 0) {
            toast.success("Todos os números já estavam bloqueados.");
            setManualInput('');
        }

        if (failCount > 0) toast.error(`${failCount} falhas.`);
        setAdding(false);
        setIsWorking(false);
    };

    const add55ToManualInput = () => {
        const lines = manualInput.split(/[\n,;]+/).map(l => {
            let p = l.trim().replace(/\D/g, '');
            if (p.length > 0 && !p.startsWith('55')) {
                return '55' + p;
            }
            return p;
        }).filter(l => l.length > 0);
        setManualInput(lines.join('\n'));
        toast.success("DDI 55 adicionado!");
    };

    const performUnblock = async (id) => {
        try {
            const res = await fetchWithAuth(`${API_URL}/blocked/${id}`, { method: 'DELETE' }, activeClient?.id);
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

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        setImporting(true);
        setImportLabel('Excluindo Contatos');
        setImportProgress({ current: 0, total: selectedIds.size });
        
        const idsToDelete = Array.from(selectedIds);
        try {
            const res = await fetchWithAuth(`${API_URL}/blocked/unblock_bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: idsToDelete })
            }, activeClient?.id);

            if (res && res.ok) {
                const result = await res.json();
                toast.success(`${result.deleted_count || 0} contatos desbloqueados.`);
                fetchBlockedContacts();
            } else {
                toast.error("Erro ao realizar exclusão em massa.");
            }
        } catch (err) {
            toast.error("Falha de conexão.");
        } finally {
            setImporting(false);
        }
    };

    const filteredContacts = useMemo(() => {
        if (!searchTerm) return contacts;
        const cleanSearch = searchTerm.trim();

        if (/[\n, ]/.test(cleanSearch)) {
            const searchNumbers = cleanNumbers(cleanSearch);
            if (searchNumbers.length > 0) {
                const searchSuffixes = searchNumbers.map(n => getLast8(n));
                return contacts.filter(c => {
                    const contactSuffix = getLast8(c.phone);
                    return searchSuffixes.some(suffix => {
                        if (suffix.length === 8) return contactSuffix.endsWith(suffix);
                        return c.phone.includes(suffix);
                    });
                });
            }
        }

        return contacts.filter(c => {
            if (c.reason?.toLowerCase().includes(cleanSearch.toLowerCase())) return true;
            if (c.name?.toLowerCase().includes(cleanSearch.toLowerCase())) return true;
            const singleSuffix = getLast8(cleanSearch);
            const contactSuffix = getLast8(c.phone);
            if (singleSuffix.length === 8) return contactSuffix.endsWith(singleSuffix);
            return c.phone.includes(singleSuffix) || c.phone.includes(cleanSearch);
        });
    }, [contacts, searchTerm]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const paginatedContacts = useMemo(() => {
        if (itemsPerPage === 'all') return filteredContacts;
        const start = (currentPage - 1) * itemsPerPage;
        return filteredContacts.slice(start, start + itemsPerPage);
    }, [filteredContacts, currentPage, itemsPerPage]);

    const totalPages = itemsPerPage === 'all' ? 1 : Math.ceil(filteredContacts.length / itemsPerPage);

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

    const toggleSelectRow = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    return {
        contacts, loading, manualInput, setManualInput, adding, searchTerm, setSearchTerm,
        selectedIds, mode, setMode, currentPage, setCurrentPage, itemsPerPage, setItemsPerPage,
        keywords, newKeyword, setNewKeyword, savingKeywords, addKeyword, removeKeyword,
        importData, setImportData, selectedPhoneCols, setSelectedPhoneCols, selectedNameCol, setSelectedNameCol,
        isWorking, workingMessage, importing, showColumnSelector, setShowColumnSelector,
        importProgress, importLabel, showFullPreview, setShowFullPreview, isReadingFile,
        phoneColSearch, setPhoneColSearch, nameColSearch, setNameColSearch,
        handleSaveKeywords, handleFileUpload, processMappedImport, handleBlockManual,
        add55ToManualInput, performUnblock, handleBulkDelete, filteredContacts,
        paginatedContacts, totalPages, toggleSelectAll, toggleSelectRow
    };
}
