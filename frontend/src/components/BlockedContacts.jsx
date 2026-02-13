import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { API_URL } from '../config';
import { fetchWithAuth } from '../AuthContext';
import { useClient } from '../contexts/ClientContext';
import { toast } from 'react-hot-toast';
import { FiTrash2, FiPlus, FiSlash, FiSearch, FiFileText, FiUpload, FiX, FiCheck, FiArrowRight } from 'react-icons/fi';
import { read, utils } from 'xlsx';
import ConfirmModal from './ConfirmModal';

const mapCountryToCode = (val) => {
    if (!val || typeof val !== 'string') return val;
    const clean = val.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const countries = {
        'brasil': '55', 'brazil': '55', 'br': '55',
        'portugal': '351', 'pt': '351',
        'angola': '244', 'ao': '244',
        'mocambique': '258', 'mz': '258',
        'estados unidos': '1', 'usa': '1', 'united states': '1', 'us': '1',
        'argentina': '54', 'ar': '54',
        'paraguai': '595', 'py': '595',
        'uruguai': '598', 'uy': '598',
        'chile': '56', 'cl': '56',
        'colombia': '57', 'co': '57',
        'espanha': '34', 'es': '34', 'spain': '34',
        'italia': '39', 'it': '39', 'italy': '39',
        'franca': '33', 'fr': '33', 'france': '33',
        'reino unido': '44', 'uk': '44', 'united kingdom': '44',
        'alemanha': '49', 'de': '49', 'germany': '49',
        'mexico': '52', 'mx': '52',
        'japao': '81', 'jp': '81', 'japan': '81',
        'china': '86', 'cn': '86'
    };
    return countries[clean] || val;
};

export default function BlockedContacts() {
    const { activeClient } = useClient();
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [manualInput, setManualInput] = useState('');
    const [adding, setAdding] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [bulkDeleting, setBulkDeleting] = useState(false);
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
    const [selectedPhoneCols, setSelectedPhoneCols] = useState([]); // Array of indices
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

    // Configuração do Modal de Confirmação
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        isDangerous: false,
        confirmText: 'Confirmar'
    });

    useEffect(() => {
        if (activeClient) {
            fetchBlockedContacts();
            fetchKeywords();
        }
    }, [activeClient]);

    // Prevenir fechamento acidental durante importação/exclusão
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (importing) {
                e.preventDefault();
                e.returnValue = ''; // Exibe o alerta padrão do navegador
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [importing]);

    const fetchBlockedContacts = async () => {
        setLoading(true);
        try {
            const res = await fetchWithAuth(`${API_URL}/blocked/`, {}, activeClient?.id);
            if (res.ok) {
                const data = await res.json();
                setContacts(data);
                setSelectedIds(new Set()); // Reset selection on refresh
            }
        } catch (err) {
            console.error("Erro ao buscar bloqueados:", err);
            toast.error("Erro ao carregar lista de bloqueios");
        } finally {
            setLoading(false);
        }
    };

    const fetchKeywords = async () => {
        try {
            const res = await fetchWithAuth(`${API_URL}/settings/`, {}, activeClient?.id);
            if (res.ok) {
                const data = await res.json();
                const kwStr = data.AUTO_BLOCK_KEYWORDS || "bloquear,parar,sair,cancelar,não quero,nao quero,stop,unsubscribe,opt-out,descadastrar";
                setKeywords(kwStr.split(',').map(k => k.trim()).filter(Boolean));
            }
        } catch (err) {
            console.error("Erro ao buscar gatilhos:", err);
        }
    };

    const persistKeywords = async (updatedKeywords) => {
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

            return res.ok;
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
        e.preventDefault();
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

        // Persistir no banco imediatamente
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
                        setIsReadingFile(false);
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
            reader.onerror = () => {
                toast.error("Erro ao ler arquivo.");
                setIsReadingFile(false);
            };
            reader.readAsArrayBuffer(file);
        } else {
            reader.onload = (evt) => {
                try {
                    const text = evt.target.result;
                    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
                    if (lines.length === 0) {
                        toast.error("Arquivo vazio.");
                        setIsReadingFile(false);
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
            reader.onerror = () => {
                toast.error("Erro ao ler arquivo.");
                setIsReadingFile(false);
            };
            reader.readAsText(file);
        }
        e.target.value = ''; // Reset input
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

        // Fetch current blocked contacts to check for suffix duplicates locally first
        const currentSuffixes = new Set(contacts.map(c => c.phone.replace(/\D/g, '').slice(-8)));

        const totalRows = importData.rows.length;
        const entries = importData.rows.map(row => {
            const rawPhone = selectedPhoneCols.map(idx => {
                const originalVal = String(row[idx] || '').trim();
                return mapCountryToCode(originalVal);
            }).join('');
            const phone = rawPhone.replace(/\D/g, '');

            // Skip truly empty or invalid numbers (must have at least 8 digits)
            if (!rawPhone || phone.length < 8) {
                ignoredCount++;
                return null;
            }

            const name = selectedNameCol !== -1 ? String(row[selectedNameCol] || '').trim() : '';
            return { phone, name };
        }).filter(Boolean);

        if (entries.length === 0) {
            toast.error("Nenhum número válido encontrado nas colunas selecionadas.");
            if (ignoredCount > 0) toast.error(`${ignoredCount} linhas vazias/inválidas ignoradas.`);
            setImporting(false);
            return;
        }

        setImportLabel('Importando Contatos');
        setImportProgress({ current: 0, total: entries.length });

        // Batched Bulk Processing - Send in groups of 100 to the backend for maximum speed
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

                if (res.ok) {
                    const result = await res.json();
                    successCount += result.success_count;
                    alreadyCount += result.already_blocked_count;
                } else {
                    failCount += batch.length;
                }
            } catch (err) {
                failCount += batch.length;
                console.error("Erro conexão lote importação:", err);
            } finally {
                setImportProgress(prev => ({
                    ...prev,
                    current: Math.min(prev.current + batch.length, entries.length)
                }));
            }
        }

        toast.success(`${successCount} contatos importados!`);
        if (alreadyCount > 0) toast.success(`${alreadyCount} já estavam na lista.`);
        if (ignoredCount > 0) toast.success(`${ignoredCount} linhas vazias ignoradas.`);
        if (failCount > 0) toast.error(`${failCount} falhas.`);

        setShowColumnSelector(false);
        setImportData({ headers: [], rows: [], nonEmptyIndices: [] });
        setSelectedPhoneCols([]);
        setSelectedNameCol(-1);
        fetchBlockedContacts();
        setImporting(false);
    };

    const parseManualEntry = (text) => {
        if (!text) return [];
        return text
            .split(/[\n,;\s]+/)
            .map(line => {
                if (!line.trim()) return null;
                const parts = line.split(/[;:]/);
                const phone = parts[0].replace(/\D/g, '');
                const name = parts[1]?.trim() || '';
                return phone.length >= 8 ? { phone, name } : null;
            })
            .filter(Boolean);
    };

    const add55ToManualInput = async () => {
        setWorkingMessage('Adicionando DDI 55 aos números informados...');
        setIsWorking(true);
        await new Promise(resolve => setTimeout(resolve, 800));

        const lines = manualInput.split(/[\n,;]+/).map(l => {
            let p = l.trim().replace(/\D/g, '');
            if (p.length > 0 && !p.startsWith('55')) {
                return '55' + p;
            }
            return p;
        }).filter(l => l.length > 0);
        setManualInput(lines.join('\n'));
        setIsWorking(false);
        toast.success("DDI 55 adicionado ao texto!");
    };

    const handleBlock = async (e) => {
        e.preventDefault();
        const entries = parseManualEntry(manualInput);
        if (entries.length === 0) {
            toast.error("Insira pelo menos um número válido.");
            return;
        }

        setWorkingMessage(`Bloqueando ${entries.length} contatos no sistema...`);
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

                if (res.ok) {
                    successCount++;
                } else {
                    const data = await res.json();
                    if (res.status === 400 && data.detail?.includes("já está bloqueado")) {
                        // Just ignore, it's already there
                    } else {
                        failCount++;
                        toast.error(data.detail || `Erro ao bloquear ${entry.phone}`);
                    }
                }
            } catch (err) {
                console.error(err);
                failCount++;
                toast.error(`Falha de conexão ao bloquear ${entry.phone}`);
            }
        }));

        if (successCount > 0) {
            toast.success(`${successCount} contatos bloqueados com sucesso!`);
            setManualInput('');
            fetchBlockedContacts();
        }

        if (failCount > 0) {
            toast.error(`${failCount} falhas.`);
        } else if (successCount === 0 && entries.length > 0) {
            toast.success("Todos os números já estavam bloqueados.");
            setManualInput('');
        }

        setAdding(false);
        setIsWorking(false);
    };

    const performUnblock = async (id, refresh = true) => {
        try {
            const res = await fetchWithAuth(`${API_URL}/blocked/${id}`, {
                method: 'DELETE'
            }, activeClient?.id);

            if (res.ok) {
                if (refresh) {
                    setContacts(prev => prev.filter(c => c.id !== id));
                    setSelectedIds(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(id);
                        return newSet;
                    });
                }
                return true;
            } else {
                throw new Error("Erro ao desbloquear");
            }
        } catch (err) {
            console.error(err);
            return false;
        }
    };

    const confirmUnblockSingle = (contactId) => {
        const contact = contacts.find(c => c.id === contactId);
        setConfirmModal({
            isOpen: true,
            title: 'Desbloquear Contato',
            message: `Tem certeza que deseja remover o bloqueio do número ${contact?.phone}?`,
            confirmText: 'Desbloquear',
            isDangerous: true,
            onConfirm: async () => {
                const success = await performUnblock(contactId);
                if (success) toast.success("Contato desbloqueado.");
                else toast.error("Erro ao desbloquear.");
            }
        });
    };

    // Filter Logic
    const filteredContacts = React.useMemo(() => {
        if (!searchTerm) return contacts;

        const cleanSearch = searchTerm.trim();

        // Helper to get last 8 digits
        const getLast8 = (num) => {
            const cleaned = num.replace(/\D/g, '');
            return cleaned.length >= 8 ? cleaned.slice(-8) : cleaned;
        };

        // Check if input looks like a list (has commas, newlines, or spaces)
        if (/[\n, ]/.test(cleanSearch)) {
            const searchNumbers = cleanNumbers(cleanSearch);
            if (searchNumbers.length > 0) {
                const searchSuffixes = searchNumbers.map(n => getLast8(n));

                // Return contacts that match ANY of the search suffixes (strict if 8 digits)
                return contacts.filter(c => {
                    const contactSuffix = getLast8(c.phone);
                    return searchSuffixes.some(suffix => {
                        if (suffix.length === 8) {
                            return contactSuffix.endsWith(suffix);
                        }
                        return c.phone.includes(suffix);
                    });
                });
            }
        }

        // Standard single term search
        return contacts.filter(c => {
            // Check content text (reason or name)
            if (c.reason?.toLowerCase().includes(cleanSearch.toLowerCase())) return true;
            if (c.name?.toLowerCase().includes(cleanSearch.toLowerCase())) return true;

            const singleSuffix = getLast8(cleanSearch);
            const contactSuffix = getLast8(c.phone);

            // If user typed at least 8 digits, match strictly on suffix
            if (singleSuffix.length === 8) {
                return contactSuffix.endsWith(singleSuffix);
            }

            // Otherwise partial match
            return c.phone.includes(singleSuffix) || c.phone.includes(cleanSearch);
        });
    }, [contacts, searchTerm]);

    // Reset page when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    // Pagination Logic
    const paginatedContacts = React.useMemo(() => {
        if (itemsPerPage === 'all') return filteredContacts;
        const start = (currentPage - 1) * itemsPerPage;
        return filteredContacts.slice(start, start + itemsPerPage);
    }, [filteredContacts, currentPage, itemsPerPage]);

    const totalPages = itemsPerPage === 'all' ? 1 : Math.ceil(filteredContacts.length / itemsPerPage);

    // Selection Logic
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            // Select ONLY currently visible/paginated items
            const visibleIds = paginatedContacts.map(c => c.id);
            const newSet = new Set(selectedIds);
            visibleIds.forEach(id => newSet.add(id));
            setSelectedIds(newSet);
        } else {
            // Deselect ONLY currently visible items
            const visibleIds = paginatedContacts.map(c => c.id);
            const newSet = new Set(selectedIds);
            visibleIds.forEach(id => newSet.delete(id));
            setSelectedIds(newSet);
        }
    };

    const isAllVisibleSelected = paginatedContacts.length > 0 && paginatedContacts.every(c => selectedIds.has(c.id));

    const handleSelectRow = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleBulkDelete = () => {
        if (selectedIds.size === 0) return;

        setConfirmModal({
            isOpen: true,
            title: 'Desbloqueio em Massa',
            message: `Tem certeza que deseja desbloquear ${selectedIds.size} contatos selecionados?`,
            confirmText: `Desbloquear ${selectedIds.size}`,
            isDangerous: true,
            onConfirm: async () => {
                setImporting(true);
                setImportLabel('Excluindo Contatos');
                setImportProgress({ current: 0, total: selectedIds.size });
                let successCount = 0;

                // Convert input to array for concurrent processing
                const idsToDelete = Array.from(selectedIds);

                try {
                    const res = await fetchWithAuth(`${API_URL}/blocked/unblock_bulk`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ids: idsToDelete })
                    }, activeClient?.id);

                    if (res.ok) {
                        const result = await res.json();
                        successCount = result.deleted_count || 0;
                        setImportProgress({ current: idsToDelete.length, total: idsToDelete.length });
                    } else {
                        toast.error("Erro ao realizar exclusão em massa.");
                    }
                } catch (err) {
                    console.error("Erro bulk delete:", err);
                    toast.error("Falha de conexão.");
                }

                toast.success(`${successCount} contatos desbloqueados.`);
                fetchBlockedContacts();
                setImporting(false);
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-200">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-4">
                    <FiSlash className="text-orange-500" />
                    Gatilhos de Auto-Bloqueio (Botões)
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    Se o contato clicar em um botão (ou enviar mensagem) contendo estas palavras, ele será <strong>bloqueado automaticamente</strong>.
                </p>

                <form onSubmit={addKeyword} className="flex gap-2 mb-4">
                    <input
                        type="text"
                        value={newKeyword}
                        onChange={(e) => setNewKeyword(e.target.value)}
                        placeholder="Ex: Parar, Sair, Desinscrever..."
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <button
                        type="submit"
                        className="px-4 py-2 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition"
                    >
                        Adicionar
                    </button>
                </form>

                <div className="flex flex-wrap gap-2 mb-6 min-h-[40px] p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    {keywords.map((kw, i) => (
                        <div key={i} className="flex items-center gap-1 bg-white dark:bg-gray-800 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 group">
                            {kw}
                            <button
                                onClick={() => removeKeyword(kw)}
                                className="text-gray-400 hover:text-red-500 transition ml-1"
                            >
                                &times;
                            </button>
                        </div>
                    ))}
                    {keywords.length === 0 && <span className="text-gray-400 text-sm italic">Nenhum gatilho configurado.</span>}
                </div>

                <div className="flex justify-between items-center text-xs text-gray-400">
                    <span>* Gatilhos são salvos automaticamente ao adicionar/remover.</span>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-200">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-4">
                    <FiSlash className="text-red-500" />
                    Bloqueio Manual de Números
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    Adicione contatos que <strong>NUNCA</strong> devem receber mensagens.
                </p>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
                    <button
                        onClick={() => setMode('manual')}
                        className={`pb-2 px-4 text-sm font-medium flex items-center gap-2 cursor-pointer transition-colors ${mode === 'manual' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        Manual ✍️
                    </button>
                    <button
                        onClick={() => setMode('upload')}
                        className={`pb-2 px-4 text-sm font-medium flex items-center gap-2 cursor-pointer transition-colors ${mode === 'upload' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        Upload CSV/Excel 📂
                    </button>
                </div>

                {/* Manual Tab */}
                {mode === 'manual' && (
                    <form onSubmit={handleBlock} className="flex flex-col gap-4">
                        <div className="flex-1 w-full">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Adicionar Números para Bloqueio
                            </label>
                            <textarea
                                value={manualInput}
                                onChange={(e) => setManualInput(e.target.value)}
                                placeholder="Cole os números aqui (um por linha ou separados por vírgula)..."
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none h-32 resize-none font-mono text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Formatos aceitos: 5511999999999, (11) 99999-9999 ou <strong>5511999999999;Nome</strong>
                            </p>
                        </div>
                        <div className="flex gap-4">
                            <button
                                type="submit"
                                disabled={adding || !manualInput}
                                className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-red-500/20"
                            >
                                {adding ? <span className="animate-pulse">Processando...</span> : (
                                    <>
                                        <FiPlus /> Bloquear {parseManualEntry(manualInput).length > 0 ? parseManualEntry(manualInput).length : ''} Contatos
                                    </>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={add55ToManualInput}
                                disabled={!manualInput.trim()}
                                className="px-6 bg-gray-800 text-white rounded-lg font-semibold hover:bg-gray-700 transition-all border border-gray-700 active:scale-95 disabled:opacity-30"
                                title="Adicionar 55 aos números abaixo"
                            >
                                +55
                            </button>
                        </div>
                    </form>
                )}

                {/* Upload Tab */}
                {mode === 'upload' && !showColumnSelector && (
                    <div className="space-y-4">
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-12 text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition cursor-pointer relative">
                            <input
                                type="file"
                                accept=".csv,.txt,.xlsx,.xls"
                                onChange={handleFileUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="flex flex-col items-center">
                                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                                    <FiUpload className="text-gray-400" size={32} />
                                </div>
                                <p className="text-base font-semibold text-gray-700 dark:text-gray-200">Clique para upload ou arraste o arquivo CSV/Excel</p>
                                <p className="text-sm text-gray-400 mt-2">O sistema permitirá escolher a coluna após o upload</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Column Selector UI (Dentro da aba de Upload) */}
                {mode === 'upload' && showColumnSelector && (
                    <div className="space-y-6 bg-gray-50 dark:bg-gray-900/30 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 animate-in fade-in duration-300">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <FiFileText className="text-blue-500" />
                                Configurar Importação
                            </h3>
                            <span className="text-xs font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full">
                                {importData.rows.length} linhas detectadas
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Coluna de Telefone */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    Qual coluna contém os números? <span className="text-red-500">*</span>
                                </label>
                                <div className="relative mb-2">
                                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                                    <input
                                        type="text"
                                        placeholder="Filtrar colunas..."
                                        value={phoneColSearch}
                                        onChange={(e) => setPhoneColSearch(e.target.value)}
                                        className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 outline-none focus:ring-1 focus:ring-red-500"
                                    />
                                </div>
                                <div className="max-h-[200px] overflow-y-auto grid grid-cols-1 gap-2 p-1">
                                    {(importData.nonEmptyIndices || [])
                                        .filter(idx => (importData.headers[idx] || '').toLowerCase().includes(phoneColSearch.toLowerCase()))
                                        .map((idx) => {
                                            const selectionIndex = (selectedPhoneCols || []).indexOf(idx);
                                            const isSelected = selectionIndex !== -1;
                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => {
                                                        setSelectedPhoneCols(prev => {
                                                            if (prev.includes(idx)) return prev.filter(i => i !== idx);
                                                            return [...prev, idx];
                                                        });
                                                    }}
                                                    className={`px-4 py-3 text-left text-sm rounded-xl border transition-all flex items-center justify-between relative ${isSelected
                                                        ? 'bg-red-600 border-red-600 text-white shadow-xl shadow-red-500/40 z-20 scale-105'
                                                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-red-400 hover:z-10 hover:shadow-md'
                                                        }`}
                                                >
                                                    <span className="truncate font-medium">{importData.headers[idx] || `Coluna ${idx + 1}`}</span>
                                                    {isSelected && (
                                                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white text-red-600 text-[10px] font-black">
                                                            {selectionIndex + 1}
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                </div>
                                <p className="text-xs text-gray-400 italic">Exemplo: {selectedPhoneCols.length > 0 ? selectedPhoneCols.map(idx => String(importData.rows[0]?.[idx] || '')).join('') : '-'}</p>
                            </div>

                            {/* Coluna de Nome */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    Qual coluna contém os nomes? (Opcional)
                                </label>
                                <div className="relative mb-2">
                                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                                    <input
                                        type="text"
                                        placeholder="Filtrar colunas..."
                                        value={nameColSearch}
                                        onChange={(e) => setNameColSearch(e.target.value)}
                                        className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="max-h-[200px] overflow-y-auto grid grid-cols-1 gap-2 p-1">
                                    <button
                                        onClick={() => setSelectedNameCol(-1)}
                                        className={`px-4 py-3 text-left text-sm rounded-xl border transition-all ${selectedNameCol === -1
                                            ? 'bg-gray-600 border-gray-600 text-white shadow-lg'
                                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                                            }`}
                                    >
                                        Nenhuma (Não importar nomes)
                                    </button>
                                    {(importData.nonEmptyIndices || [])
                                        .filter(idx => (importData.headers[idx] || '').toLowerCase().includes(nameColSearch.toLowerCase()))
                                        .map((idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setSelectedNameCol(idx)}
                                                className={`px-4 py-3 text-left text-sm rounded-xl border transition-all flex items-center justify-between relative ${selectedNameCol === idx
                                                    ? 'bg-gray-600 border-gray-600 text-white shadow-xl z-20 scale-105'
                                                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 hover:z-10 hover:shadow-md'
                                                    }`}
                                            >
                                                <span className="truncate">{importData.headers[idx] || `Coluna ${idx + 1}`}</span>
                                                {selectedNameCol === idx && <FiCheck size={18} />}
                                            </button>
                                        ))}
                                </div>
                                <p className="text-xs text-gray-400 italic">Exemplo: {selectedNameCol !== -1 ? String(importData.rows[0]?.[selectedNameCol] || 'Vazio') : '-'}</p>
                            </div>
                        </div>

                        {selectedPhoneCols.length > 0 && (
                            <div className="bg-gray-100/50 dark:bg-black/20 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 animate-in slide-in-from-top-2 duration-300">
                                <div className="flex justify-between items-center mb-3">
                                    <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                        Prévia da junção:
                                    </p>
                                    <button
                                        onClick={() => setShowFullPreview(true)}
                                        className="text-[10px] font-bold text-red-600 hover:text-red-700 bg-red-100 px-2 py-0.5 rounded cursor-pointer"
                                    >
                                        Ver Lista Completa
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {importData.rows.slice(0, 5).map((row, idx) => {
                                        const joinedParts = selectedPhoneCols.map(colIdx => {
                                            const originalVal = String(row[colIdx] || '').trim();
                                            return mapCountryToCode(originalVal);
                                        });
                                        const joinedVal = joinedParts.join('');
                                        const nameVal = selectedNameCol !== -1 ? String(row[selectedNameCol] || '').trim() : '';
                                        return (
                                            <div key={idx} className="text-sm font-mono text-gray-700 dark:text-gray-300 flex items-center gap-3">
                                                <span className="w-5 text-[11px] text-gray-400 text-right">{idx + 1}.</span>
                                                <div className="flex flex-wrap gap-2">
                                                    <span className="py-1 px-2 bg-white dark:bg-gray-800 rounded border border-gray-100 dark:border-gray-700">
                                                        {joinedVal || <span className="text-gray-400 italic">Vazio</span>}
                                                    </span>
                                                    {nameVal && (
                                                        <span className="py-1 px-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded border border-blue-100 dark:border-blue-800/50 text-[11px] font-sans">
                                                            {nameVal}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {importData.rows.length > 5 && (
                                        <div className="text-[11px] text-gray-500 dark:text-gray-400 pt-2 pl-8 italic border-t border-gray-100 dark:border-gray-800 mt-2">
                                            ... e mais {importData.rows.length - 5} linhas
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/30 flex gap-3">
                            <FiFileText className="text-blue-500 mt-1 flex-shrink-0" size={20} />
                            <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                                <p className="font-bold">Dica de Importação:</p>
                                <p>Os números serão limpos automaticamente. A importação processará todos os {importData.rows.length} contatos.</p>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
                            <button
                                onClick={processMappedImport}
                                disabled={importing || selectedPhoneCols.length === 0}
                                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {importing ? 'Importando...' : 'Confirmar Importação'}
                                {!importing && <FiArrowRight />}
                            </button>
                            <button
                                onClick={() => {
                                    setShowColumnSelector(false);
                                    setImportData({ headers: [], rows: [], nonEmptyIndices: [] });
                                    setSelectedPhoneCols([]);
                                    setSelectedNameCol(-1);
                                }}
                                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}

                {/* Full Preview Modal */}
                {showFullPreview && createPortal(
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
                            <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                                <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-3">
                                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                        <FiSlash className="text-red-500" />
                                    </div>
                                    Lista Completa da Junção
                                </h3>
                                <button
                                    onClick={() => setShowFullPreview(false)}
                                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                                >
                                    <FiX className="text-gray-500" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-2 bg-white dark:bg-gray-800">
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                                        <tr>
                                            <th className="text-left py-3 px-4 text-gray-400 font-bold text-[10px] uppercase tracking-widest text-right w-20">Linha</th>
                                            <th className="text-left py-3 px-4 text-gray-400 font-bold text-[10px] uppercase tracking-widest">Telefone</th>
                                            <th className="text-left py-3 px-4 text-gray-400 font-bold text-[10px] uppercase tracking-widest">Nome</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                        {importData.rows.map((row, idx) => {
                                            const joinedParts = selectedPhoneCols.map(colIdx => {
                                                const originalVal = String(row[colIdx] || '').trim();
                                                return mapCountryToCode(originalVal);
                                            });
                                            const joinedVal = joinedParts.join('');
                                            const nameVal = selectedNameCol !== -1 ? String(row[selectedNameCol] || '').trim() : '';
                                            return (
                                                <tr key={idx} className="hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-colors">
                                                    <td className="py-2.5 px-4 text-xs text-gray-400 font-mono text-right">{idx + 1}</td>
                                                    <td className="py-2.5 px-4 text-sm font-mono text-gray-800 dark:text-gray-200">
                                                        <span className="py-1 px-2 bg-gray-50 dark:bg-gray-900/50 rounded border border-gray-100 dark:border-gray-700">
                                                            {joinedVal || <span className="text-red-300 italic">vazio</span>}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-4 text-sm text-gray-600 dark:text-gray-400">
                                                        {nameVal || <span className="text-gray-300 italic">-</span>}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="p-5 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                                <button
                                    onClick={() => setShowFullPreview(false)}
                                    className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 transition-all active:scale-95"
                                >
                                    Fecar Prévia
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors duration-200">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center flex-wrap gap-4">
                    <h3 className="font-bold text-gray-700 dark:text-white">Lista de Contatos Bloqueados ({contacts.length})</h3>

                    <div className="flex gap-4 items-center">
                        {selectedIds.size > 0 && (
                            <button
                                onClick={handleBulkDelete}
                                disabled={bulkDeleting}
                                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-bold hover:bg-red-200 transition flex items-center gap-2"
                            >
                                <FiTrash2 /> Excluir {selectedIds.size} selecionados
                            </button>
                        )}

                        <div className="relative">
                            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar telefone (pode colar lista)..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64 transition-all focus:w-80 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-gray-500">Carregando...</div>
                ) : filteredContacts.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                        {searchTerm ? 'Nenhum resultado encontrado.' : 'Nenhum contato bloqueado.'}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-3 font-medium w-10">
                                        <input
                                            type="checkbox"
                                            onChange={handleSelectAll}
                                            checked={isAllVisibleSelected}
                                            className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                                        />
                                    </th>
                                    <th className="px-6 py-3 font-medium">Telefone</th>
                                    <th className="px-6 py-3 font-medium">Nome</th>
                                    <th className="px-6 py-3 font-medium">Motivo</th>
                                    <th className="px-6 py-3 font-medium">Data/Hora Bloqueio</th>
                                    <th className="px-6 py-3 font-medium text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {paginatedContacts.map((contact) => (
                                    <tr key={contact.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${selectedIds.has(contact.id) ? 'bg-red-50/30 dark:bg-red-900/20' : ''}`}>
                                        <td className="px-6 py-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(contact.id)}
                                                onChange={() => handleSelectRow(contact.id)}
                                                className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                                            />
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                            {contact.phone}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                                            {contact.name || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                            {contact.reason}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(contact.created_at).toLocaleString('pt-BR', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => confirmUnblockSingle(contact.id)}
                                                className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                                title="Desbloquear"
                                            >
                                                <FiTrash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {/* Pagination Controls */}
                {!loading && filteredContacts.length > 0 && (
                    <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                            <span>Mostrando <span className="font-bold">{itemsPerPage === 'all' ? 1 : (currentPage - 1) * itemsPerPage + 1}</span> a <span className="font-bold">{itemsPerPage === 'all' ? filteredContacts.length : Math.min(currentPage * itemsPerPage, filteredContacts.length)}</span> de <span className="font-bold">{filteredContacts.length}</span> resultados</span>

                            <select
                                value={itemsPerPage}
                                onChange={(e) => {
                                    setItemsPerPage(e.target.value === 'all' ? 'all' : Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-xs py-1 px-2 outline-none focus:ring-2 focus:ring-red-500"
                            >
                                <option value={50}>50 por página</option>
                                <option value={100}>100 por página</option>
                                <option value={1000}>1000 por página</option>
                                <option value="all">Mostrar Tudo (Cuidado)</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Anterior
                            </button>
                            <span className="text-sm text-gray-600 dark:text-gray-300 font-medium px-2">
                                Página {currentPage} de {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Próxima
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText={confirmModal.confirmText}
                isDangerous={confirmModal.isDangerous}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
            />

            {/* Loading/Progress Overlay - Usando Portal para garantir que cubra a tela inteira */}
            {
                importing && createPortal(
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 w-full max-w-md shadow-2xl text-center space-y-6 border border-gray-100 dark:border-gray-700/50">
                            <div className="relative w-28 h-28 mx-auto">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle
                                        cx="56"
                                        cy="56"
                                        r="50"
                                        stroke="currentColor"
                                        strokeWidth="8"
                                        fill="transparent"
                                        className="text-gray-100 dark:text-gray-700"
                                    />
                                    <circle
                                        cx="56"
                                        cy="56"
                                        r="50"
                                        stroke="currentColor"
                                        strokeWidth="8"
                                        fill="transparent"
                                        strokeDasharray={314}
                                        strokeDashoffset={314 - (314 * (importProgress.current / importProgress.total || 0))}
                                        className="text-red-600 transition-all duration-500 ease-out"
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-2xl font-black text-gray-900 dark:text-white">
                                        {Math.round((importProgress.current / importProgress.total) * 100 || 0)}%
                                    </span>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{importLabel}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Por favor, mantenha esta aba aberta. Estamos processando sua solicitação de forma segura.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3.5 overflow-hidden shadow-inner">
                                    <div
                                        className="h-full bg-gradient-to-r from-red-500 to-red-700 transition-all duration-300 rounded-full shadow-lg"
                                        style={{ width: `${(importProgress.current / importProgress.total) * 100 || 0}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Processando</span>
                                    <span className="text-xs font-black text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded">
                                        {importProgress.current} / {importProgress.total}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>,
                    document.body
                )
            }

            {/* File Reading Loading Overlay */}
            {isReadingFile && createPortal(
                <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-gray-800 p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center gap-6 border border-gray-100 dark:border-gray-700 max-w-sm w-full mx-4">
                        <div className="relative w-20 h-20">
                            <div className="absolute inset-0 border-4 border-red-50/30 dark:border-red-900/10 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-red-600 rounded-full border-t-transparent animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <FiUpload className="text-red-600 animate-pulse" size={32} />
                            </div>
                        </div>
                        <div className="text-center space-y-2">
                            <h4 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Lendo Arquivo</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Estamos processando as colunas do seu arquivo para bloqueio. Aguarde um instante...</p>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {isWorking && createPortal(
                <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-gray-800 p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center gap-6 border border-gray-100 dark:border-gray-700 max-w-sm w-full mx-4">
                        <div className="relative w-20 h-20">
                            <div className="absolute inset-0 border-4 border-red-50/30 dark:border-red-900/10 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-red-600 rounded-full border-t-transparent animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-red-600 animate-pulse"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" /></svg>
                            </div>
                        </div>
                        <div className="text-center space-y-2">
                            <h4 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Processando</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{workingMessage || 'Aguarde um instante...'}</p>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
