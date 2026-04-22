
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import { API_URL } from '../config';
import { fetchWithAuth } from '../AuthContext';
import { useClient } from '../contexts/ClientContext';
import { read, utils } from 'xlsx';
import { applyFilters, getDispatchList } from '../utils/phoneFilters';

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

const RecipientSelector = ({
    onSelect,
    selectedInbox,
    requireOpenWindow = false,
    title = "Destinatários",
    showValidation = true,
    exclusionList = [],
    templateVariables = []
}) => {
    const { activeClient } = useClient();
    const [mode, setMode] = useState('manual'); // 'manual' | 'upload'
    const [inputText, setInputText] = useState('');
    const [contacts, setContacts] = useState([]); // Array of { phone, status, window_open, ... }
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

    const [csvData, setCsvData] = useState({ headers: [], rows: [], nonEmptyIndices: [] });
    const [showColumnSelector, setShowColumnSelector] = useState(false);
    const [columnMapping, setColumnMapping] = useState({}); // { colIndex: 'phone' | 'ignore' | varKey }
    const [showFullPreview, setShowFullPreview] = useState(false);
    const [csvFilters, setCsvFilters] = useState([]);
    const [availableTags, setAvailableTags] = useState([]);
    const [selectedTag, setSelectedTag] = useState('');
    const [isLoadingTags, setIsLoadingTags] = useState(false);
    const [tagVariables, setTagVariables] = useState({});
    const [activeDropdown, setActiveDropdown] = useState(null); // which variable has the dropdown open

    const VAR_OPTIONS = [
        { label: 'Nome Completo', value: '{{nome}}', icon: '👤' },
        { label: 'Primeiro Nome', value: '{{primeiro_nome}}', icon: '👤' },
        { label: 'E-mail', value: '{{email}}', icon: '📧' },
        { label: 'Telefone', value: '{{telefone}}', icon: '📞' },
        { label: 'Nome do Produto', value: '{{produto}}', icon: '📦' },
    ];

    useEffect(() => {
        if (requireOpenWindow) {
            setFilterOpenOnly(true);
        }
    }, [requireOpenWindow]);

    useEffect(() => {
        const loadFilters = async () => {
            if (!activeClient) return;
            setIsLoadingTags(true);
            try {
                const res = await fetchWithAuth(`${API_URL}/leads/filters`, {}, activeClient.id);
                if (res.ok) {
                    const data = await res.json();
                    setAvailableTags(data.tags || []);
                }
            } catch (err) {
                console.error("Erro ao carregar filtros de leads:", err);
            } finally {
                setIsLoadingTags(false);
            }
        };
        loadFilters();
    }, [activeClient]);

    /**
     * PERFORMANCE OPTIMIZATION: Memoized calculations for large lists
     */
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

    // Memoize the selected list for sending — strictly filters based on what is shown + non-blocked
    const selectedList = useMemo(() => {
        return getDispatchList(filteredContacts);
    }, [filteredContacts]);

    // Sync selected list with parent
    useEffect(() => {
        onSelect(selectedList, { mode, tag: selectedTag });
    }, [selectedList, mode, selectedTag, onSelect]);

    // Prevent page reload during validation/processing
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (isValidating || isProcessing) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        if (isValidating || isProcessing) {
            window.addEventListener('beforeunload', handleBeforeUnload);
        }
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isValidating, isProcessing]);

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

    const handleManualInput = (e) => setInputText(e.target.value);

    const addBrazilCode = async () => {
        setWorkingMessage('Verificando cada número e adicionando o DDI 55 se necessário.');
        setIsWorking(true);
        // Pequeno delay para percepção do carregamento e "verificação" de cada número
        await new Promise(resolve => setTimeout(resolve, 800));

        setContacts(prev => {
            const updated = prev.map(c => {
                if (c.phone.startsWith('55')) return c;
                return {
                    ...c,
                    phone: `55${c.phone}`,
                    status: 'pending'
                };
            });

            const seen = new Set();
            return updated.filter(c => {
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
            if (p.length > 0 && !p.startsWith('55')) {
                return '55' + p;
            }
            return p;
        }).filter(l => l.length > 0);
        setInputText(lines.join('\n'));
        setIsWorking(false);
        toast.success("DDI 55 adicionado ao texto!");
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
            return { phone, variables, status: 'pending', window_open: false };
        }).filter(c => c.phone.length >= 8);

        if (incoming.length === 0) return toast.error("Nenhum número válido encontrado");

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
                    id: 'duplicates-ignored' // Evita múltiplos toasts iguais
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
            // Process in batches
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

                    // Update state every 500 contacts to show progress without killing performance
                    if (i % 500 === 0 || i + batchSize >= phones.length) {
                        setContacts([...updatedContacts]);
                    }
                    setProgress(prev => ({ ...prev, current: i + batch.length }));
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


    // Variable columns to show in the table (only those present in at least one contact)
    const activeVarColumns = useMemo(() => {
        if (templateVariables.length === 0) return [];
        return templateVariables.filter(v =>
            contacts.some(c => c.variables && c.variables[v.key] !== undefined && c.variables[v.key] !== '')
        );
    }, [contacts, templateVariables]);

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

                // Find column indices that are not entirely empty
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
            // Take only the first number if cell contains multiple (e.g. "5541999, 5541888")
            const rawCell = String(row[parseInt(phoneIdx)] || '');
            const firstPart = rawCell.split(/[,;|\s]+/)[0];
            let phone = firstPart.replace(/\D/g, '');
            if (phone.length === 0) return null;
            if (phone.length === 11 && phone.startsWith('0')) phone = phone.substring(1);

            const variables = {};
            Object.entries(columnMapping).forEach(([colIdx, varKey]) => {
                if (varKey === 'phone' || varKey === 'ignore') return;
                variables[varKey] = String(row[parseInt(colIdx)] ?? '');
            });

            return { phone, variables, status: 'pending', window_open: false };
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

        // 🔍 NEW: Validation for Template Variables
        if (templateVariables && templateVariables.length > 0) {
            for (const v of templateVariables) {
                const val = tagVariables[v.key];
                if (!val || val.trim() === '') {
                    toast.error(`Faltou preencher a variável: ${v.label}`, {
                        icon: '⚠️',
                        duration: 4000
                    });
                    return; // Abort
                }
            }
        }

        setWorkingMessage(`Buscando contatos com a etiqueta "${selectedTag}"...`);
        setIsProcessing(true);
        try {
            // Fetch contacts by tag (large limit to get all)
            const res = await fetchWithAuth(`${API_URL}/leads?tag=${encodeURIComponent(selectedTag)}&limit=10000`, {}, activeClient.id);
            if (res.ok) {
                const data = await res.json();
                const incoming = (data.items || []).map(lead => {
                    const vars = {};
                    templateVariables.forEach(v => {
                        let val = tagVariables[v.key] || '';
                        
                        // Dynamic Replacement
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
                        variables: vars,
                        status: 'pending',
                        window_open: false,
                        name: lead.name,
                        email: lead.email
                    };
                });

                if (incoming.length === 0) {
                    toast.error("Nenhum contato encontrado com esta etiqueta");
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

    return (
        <div className="space-y-6">
            <div className="bg-slate-900/40 backdrop-blur-sm p-1 rounded-3xl border border-white/5 p-8 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-50"></div>

                {/* Tabs / Segmented Control */}
                <div className="flex justify-center mb-8">
                    <div className="bg-black/40 p-1.5 rounded-2xl inline-flex relative w-full max-w-md border border-white/5 shadow-inner">
                        <button
                            onClick={() => setMode('manual')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 relative z-10 ${mode === 'manual'
                                ? 'text-white shadow-lg shadow-emerald-900/20 bg-slate-800 border border-white/5'
                                : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                            Manual
                        </button>
                        <button
                            onClick={() => setMode('upload')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 relative z-10 ${mode === 'upload'
                                ? 'text-white shadow-lg shadow-emerald-900/20 bg-slate-800 border border-white/5'
                                : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                            Arquivo
                        </button>
                        <button
                            onClick={() => setMode('tag')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 relative z-10 ${mode === 'tag'
                                ? 'text-white shadow-lg shadow-emerald-900/20 bg-slate-800 border border-white/5'
                                : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>
                            Etiquetas
                        </button>
                    </div>
                </div>

                {mode === 'manual' ? (
                    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="relative group/input">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-2xl blur opacity-0 group-hover/input:opacity-100 transition duration-500"></div>
                            <textarea
                                className="relative w-full p-6 bg-black/40 border border-white/10 rounded-2xl focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 outline-none text-slate-200 text-sm min-h-[160px] placeholder:text-slate-600 font-mono transition-all resize-none shadow-inner"
                                placeholder={templateVariables.length > 0
                                    ? `Cole sua lista aqui...\n5511999999999|${templateVariables.map(v => v.label).join('|')}\n5511888888888|${templateVariables.map(v => v.label).join('|')}`
                                    : "Cole sua lista aqui...\n5511999999999\n5511888888888"}
                                value={inputText}
                                onChange={handleManualInput}
                            />
                            <div className="absolute bottom-4 right-4 text-[10px] uppercase font-black text-slate-600 tracking-widest pointer-events-none">
                                Um por linha
                            </div>
                        </div>
                        {templateVariables.length > 0 && (
                            <div className="text-[11px] text-emerald-400/70 font-mono px-2 -mt-1">
                                💡 Separe variáveis com <span className="text-emerald-300 font-bold">|</span> — ex: <span className="text-slate-300">telefone|{templateVariables.map(v => v.label).join('|')}</span>
                            </div>
                        )}
                        <div className="flex gap-4">
                            <button
                                onClick={parseContacts}
                                disabled={!inputText.trim()}
                                className="flex-1 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-lg shadow-emerald-900/40 hover:shadow-emerald-900/60 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group-hover/input:shadow-emerald-500/10"
                            >
                                Processar Lista
                            </button>
                            {inputText.trim().length > 0 && (
                                <button
                                    onClick={add55ToInput}
                                    className="px-6 bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl font-black text-xs uppercase tracking-widest border border-white/5 transition-all shadow-md hover:shadow-lg active:scale-95 animate-in zoom-in duration-200"
                                    title="Adicionar 55 aos números abaixo"
                                >
                                    +55
                                </button>
                            )}
                        </div>
                    </div>
                ) : mode === 'upload' ? (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="border-2 border-dashed border-slate-700/50 hover:border-emerald-500/50 rounded-3xl p-12 text-center transition-all cursor-pointer group/upload relative bg-slate-900/20 hover:bg-slate-800/40">
                            <input
                                type="file"
                                accept=".csv,.xlsx,.xls"
                                className="absolute inset-0 opacity-0 cursor-pointer z-20"
                                onChange={handleFileUpload}
                            />
                            <div className="space-y-6 relative z-10 pointer-events-none">
                                <div className="w-20 h-20 bg-slate-800 rounded-[2rem] flex items-center justify-center mx-auto group-hover/upload:scale-110 group-hover/upload:bg-emerald-500/10 group-hover/upload:text-emerald-400 transition-all duration-300 shadow-xl shadow-black/50 border border-white/5">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                                </div>
                                <div>
                                    <h4 className="font-bold text-white text-lg mb-2 group-hover/upload:text-emerald-300 transition-colors">Selecione seu Arquivo</h4>
                                    <p className="text-xs text-slate-400 font-medium">Suporta Excel (.xlsx) ou CSV</p>
                                </div>
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-[10px] font-black uppercase text-emerald-400 tracking-widest opacity-0 group-hover/upload:opacity-100 transition-all transform translate-y-2 group-hover/upload:translate-y-0">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14" /></svg>
                                    Clique para buscar
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="p-8 bg-slate-800/20 border border-white/5 rounded-3xl space-y-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Selecione a Etiqueta Interna</label>
                                <div className="relative group/tag-select">
                                    <select
                                        className="w-full p-4 pl-5 bg-black/40 border border-white/10 rounded-2xl focus:border-emerald-500/50 outline-none transition-all text-white font-bold"
                                        value={selectedTag}
                                        onChange={(e) => setSelectedTag(e.target.value)}
                                        disabled={isLoadingTags}
                                    >
                                        <option value="">{isLoadingTags ? 'Carregando etiquetas...' : '-- Escolha uma etiqueta --'}</option>
                                        {availableTags.map(tag => (
                                            <option key={tag} value={tag} className="bg-slate-900">{tag}</option>
                                        ))}
                                    </select>
                                    {isLoadingTags && (
                                        <div className="absolute right-12 top-1/2 -translate-y-1/2">
                                            <div className="w-4 h-4 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Template Variables for Tags */}
                            {templateVariables && templateVariables.length > 0 && (
                                <div className="space-y-4 pt-6 border-t border-white/10">
                                    <div className="flex items-center justify-between px-1">
                                        <div className="space-y-0.5">
                                            <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Variáveis do Template</h4>
                                            <p className="text-[8px] text-slate-500 font-bold uppercase">Configure os valores para este disparo</p>
                                        </div>
                                        <div className="text-[8px] font-black text-slate-600 bg-slate-800/50 px-2 py-1 rounded border border-white/5 uppercase tracking-widest">
                                            Dica: Use {"{{nome}}"} ou {"{{telefone}}"}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {templateVariables.map(v => (
                                            <div key={v.key} className="space-y-2 group/var relative">
                                                <div className="flex items-center justify-between ml-1">
                                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider group-focus-within/var:text-emerald-400 transition-colors">{v.label}</label>
                                                </div>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        className="w-full p-4 pr-12 bg-black/40 border border-white/5 rounded-2xl focus:border-emerald-500/50 outline-none text-white text-xs transition-all shadow-inner placeholder:text-slate-700 font-bold"
                                                        placeholder={`Valor para ${v.label}...`}
                                                        value={tagVariables[v.key] || ''}
                                                        onChange={(e) => setTagVariables(prev => ({ ...prev, [v.key]: e.target.value }))}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setActiveDropdown(activeDropdown === v.key ? null : v.key)}
                                                        className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${activeDropdown === v.key ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:text-emerald-400 border border-white/5'}`}
                                                        title="Campos Mágicos"
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></svg>
                                                    </button>
                                                </div>

                                                {/* Magic Dropdown */}
                                                {activeDropdown === v.key && (
                                                    <>
                                                        <div className="fixed inset-0 z-40" onClick={() => setActiveDropdown(null)}></div>
                                                        <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-slate-900 border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                                            <div className="p-3 bg-slate-800/50 border-b border-white/5 text-[8px] font-black text-slate-500 uppercase tracking-widest text-center">Campos Disponíveis do Lead</div>
                                                            <div className="grid grid-cols-1 divide-y divide-white/5 max-h-64 overflow-y-auto premium-scrollbar">
                                                                {VAR_OPTIONS.map(opt => (
                                                                    <button
                                                                        key={opt.value}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setTagVariables(prev => ({ ...prev, [v.key]: opt.value }));
                                                                            setActiveDropdown(null);
                                                                        }}
                                                                        className="flex items-center gap-3 p-3 text-left hover:bg-emerald-500/10 transition-colors group/opt"
                                                                    >
                                                                        <span className="text-sm">{opt.icon}</span>
                                                                        <div className="flex-1">
                                                                            <div className="text-[10px] font-black text-slate-200 uppercase tracking-wide group-hover/opt:text-emerald-400 transition-colors">{opt.label}</div>
                                                                            <div className="text-[8px] font-bold text-slate-600 font-mono">{opt.value}</div>
                                                                        </div>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            <button
                                onClick={loadContactsByTag}
                                disabled={!selectedTag || isProcessing}
                                className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-blue-900/20 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                Carregar Leads da Etiqueta
                            </button>
                            
                            <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl text-center">
                                <p className="text-[10px] text-blue-300/60 font-bold uppercase tracking-widest leading-relaxed">
                                    💡 Isso buscará todos os contatos capturados via Webhook ou Importação que possuem esta etiqueta interna.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {contacts.length > 0 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-top-4 duration-500">
                    {/* Warning Banner for Blocked Contacts */}
                    {contacts.some(c => c.is_blocked) && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3 animate-in zoom-in-95 duration-300">
                            <div className="p-2 bg-red-500/20 text-red-400 rounded-lg">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
                            </div>
                            <div className="flex-1">
                                <div className="text-xs font-black text-red-400 uppercase tracking-widest">Contatos Bloqueados Detectados</div>
                                <div className="text-[10px] text-red-300/60 font-medium">Existem {blockedCount} contatos nesta lista que estão na sua lista de bloqueio global e serão ignorados pelo disparo.</div>
                            </div>
                            <button
                                onClick={() => setFilterBlockedOnly(!filterBlockedOnly)}
                                className="text-[10px] font-black text-red-400 hover:text-red-300 underline uppercase tracking-widest transition-colors"
                            >
                                {filterBlockedOnly ? 'Ver Todos' : 'Ver Bloqueados'}
                            </button>
                        </div>
                    )}

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
                        <div className="flex items-center gap-4 flex-wrap">
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">{title}</h3>
                            <span className="bg-slate-800 text-white text-[10px] px-2.5 py-1 rounded-lg font-black">{contacts.length}</span>
                            {contacts.length > 0 && (
                                <>
                                <button
                                    onClick={() => setContacts(prev => [...prev].reverse())}
                                    title="Inverter a ordem da lista (últimos viram primeiros)"
                                    className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/20 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-900/5 group"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="group-hover:rotate-180 transition-transform duration-300"><path d="M7 16V4m0 0L3 8m4-4l4 4"/><path d="M17 8v12m0 0l4-4m-4 4l-4-4"/></svg>
                                    Inverter Ordem
                                </button>
                                <button
                                    onClick={clearAll}
                                    className="flex items-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl border border-red-500/20 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-red-900/5 group"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="group-hover:rotate-12 transition-transform"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    Limpar Lista
                                </button>
                                </>
                            )}
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="relative group/search">
                                <input
                                    type="text"
                                    placeholder="BUSCAR NÚMERO..."
                                    className="bg-slate-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase text-white placeholder:text-slate-600 outline-none focus:border-blue-500/50 focus:bg-slate-800 transition-all w-full md:w-36 shadow-inner"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <svg className="absolute right-3 top-3 text-slate-600 group-focus-within/search:text-blue-500 transition-colors" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                            </div>

                            <div className="relative group/search-ddd">
                                <input
                                    type="text"
                                    placeholder="DDD..."
                                    maxLength={3}
                                    className="bg-slate-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase text-white placeholder:text-slate-600 outline-none focus:border-emerald-500/50 focus:bg-slate-800 transition-all w-16 md:w-20 shadow-inner text-center"
                                    value={dddSearch}
                                    onChange={(e) => setDddSearch(e.target.value)}
                                />
                            </div>

                            <div className="flex items-center bg-slate-800/40 rounded-xl border border-white/5 p-1 gap-1">
                                <button
                                    onClick={addBrazilCode}
                                    title="Adicionar 55 (Brasil)"
                                    className="px-3 py-2 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all flex items-center gap-1.5"
                                >
                                    <span className="text-[10px] font-black">+55</span>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14" /></svg>
                                </button>
                                <div className="w-[1px] h-4 bg-white/5 mx-1"></div>
                                <button
                                    onClick={copyToClipboard}
                                    title="Copiar lista"
                                    className="p-2.5 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></svg>
                                </button>
                            </div>

                            <div className="flex items-center gap-2">
                                {contacts.some(c => c.status !== 'pending') && (
                                <label className={`flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-xl border transition-all whitespace-nowrap group ${filterBlockedOnly ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-800/60 border-white/10 hover:bg-slate-800 hover:border-white/20'}`}>
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-red-500 focus:ring-red-500/30 transition-all cursor-pointer"
                                        checked={filterBlockedOnly}
                                        onChange={(e) => setFilterBlockedOnly(e.target.checked)}
                                    />
                                    <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${filterBlockedOnly ? 'text-red-400' : 'text-slate-400 group-hover:text-slate-300'}`}>Bloqueados</span>
                                    {blockedCount > 0 && (
                                        <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{blockedCount}</span>
                                    )}
                                </label>
                                )}

                                <label className="flex items-center gap-2 cursor-pointer px-4 py-2.5 bg-slate-800/60 rounded-xl border border-white/10 hover:bg-slate-800 hover:border-white/20 transition-all whitespace-nowrap group">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-green-500 focus:ring-green-500/30 transition-all cursor-pointer"
                                        checked={filterOpenOnly}
                                        onChange={(e) => setFilterOpenOnly(e.target.checked)}
                                    />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-300 transition-colors">Janela Aberta</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900/60 rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl">
                        <div className="max-h-[450px] overflow-y-auto premium-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-[#0f172a] sticky top-0 z-10 border-b border-white/10">
                                    <tr>
                                        <th className="px-4 py-5 text-[10px] font-black uppercase text-slate-600 tracking-[0.2em] text-center w-12">#</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Número</th>
                                        {activeVarColumns.map(v => (
                                            <th key={v.key} className="px-4 py-5 text-[10px] font-black uppercase text-emerald-500/70 tracking-[0.2em] text-center">{v.label}</th>
                                        ))}
                                        {showValidation && <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] text-center">Status</th>}
                                        {showValidation && <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] text-center">Janela 24h</th>}
                                        <th className="px-8 py-5 text-right"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {displayedContacts.map((c, i) => (
                                        <tr key={c.phone} className="group/row hover:bg-white/[0.03] transition-colors border-l-2 border-l-transparent hover:border-l-emerald-500/50">
                                            <td className="px-4 py-4 text-center text-[11px] font-black text-slate-600 w-12 tabular-nums">
                                                {i + 1}
                                            </td>
                                            <td className="px-8 py-4 font-mono text-sm text-slate-200 tracking-wider">
                                                {c.phone}
                                            </td>
                                            {activeVarColumns.map(v => (
                                                <td key={v.key} className="px-4 py-4 text-center text-xs text-emerald-300 font-medium max-w-[120px] truncate">
                                                    {c.variables?.[v.key] || <span className="text-slate-700">—</span>}
                                                </td>
                                            ))}
                                            {showValidation && (
                                                <td className="px-8 py-4 text-center">
                                                    {c.is_blocked ? (
                                                        <span className="text-[10px] font-black text-red-400 bg-red-500/10 px-3 py-1.5 rounded-xl border border-red-500/20 uppercase tracking-wider">Bloqueado</span>
                                                    ) : c.status === 'pending' ? (
                                                        <span className="inline-flex w-2 h-2 rounded-full bg-slate-700 animate-pulse"></span>
                                                    ) : c.status === 'verified' ? (
                                                        <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20 uppercase">Cadastrado</span>
                                                    ) : (
                                                        <span className="text-[10px] font-black text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20 uppercase">Novo</span>
                                                    )}
                                                </td>
                                            )}
                                            {showValidation && (
                                                <td className="px-6 py-4 text-center">
                                                    {c.status === 'verified' ? (
                                                        c.window_open ? (
                                                            <span className="text-[10px] font-black text-green-400 bg-green-500/10 px-2.5 py-1 rounded-lg border border-green-500/20 uppercase flex items-center justify-center gap-1.5 shadow-lg shadow-green-500/5">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                                                Aberta
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] font-black text-red-400 bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/20 uppercase">Fechada</span>
                                                        )
                                                    ) : <span className="text-slate-700 font-bold">-</span>}
                                                </td>
                                            )}
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => removeContact(c.phone)}
                                                    className="p-2 text-slate-600 hover:text-red-400 transition-all opacity-0 group-hover/row:opacity-100 transform scale-90 hover:scale-100"
                                                >
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {filteredContacts.length > displayLimit && (
                                <div className="p-8 text-center bg-black/10 border-t border-white/5">
                                    <button
                                        onClick={() => setDisplayLimit(prev => prev + 200)}
                                        className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95"
                                    >
                                        Carregar mais {Math.min(200, filteredContacts.length - displayLimit)} contatos
                                    </button>
                                    <div className="mt-3 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                                        Mostrando {displayLimit} de {filteredContacts.length} números filtrados
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={startValidation}
                        disabled={isValidating || contacts.length === 0}
                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-blue-900/20 active:scale-95 disabled:opacity-30 flex items-center justify-center gap-3"
                    >
                        {isValidating ? (
                            <>
                                <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                VALIDANDO ({progress.current}/{progress.total})
                            </>
                        ) : (
                            <>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                VALIDAR CANAIS & JANELAS
                            </>
                        )}
                    </button>
                </div>
            )}

            {isReadingFile && createPortal(
                <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-slate-900 w-full max-w-md p-10 rounded-[3rem] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] text-center space-y-8">
                        <div className="relative w-24 h-24 mx-auto">
                            <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-blue-500 animate-pulse"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black text-white">Lendo Arquivo</h3>
                            <p className="text-sm text-slate-400 font-medium">Extraindo dados das planilhas...</p>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {isProcessing && createPortal(
                <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-slate-900 w-full max-w-md p-10 rounded-[3rem] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] text-center space-y-8">
                        <div className="relative w-24 h-24 mx-auto">
                            <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-500 animate-pulse"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" /></svg>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black text-white">Processando</h3>
                            <p className="text-sm text-slate-400 font-medium">{workingMessage || 'Finalizando importação...'}</p>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Modals & Overlays (Validation / Column Selector) */}
            {isValidating && createPortal(
                <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-slate-900 w-full max-w-md p-10 rounded-[3rem] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] text-center space-y-8">
                        <div className="relative w-32 h-32 mx-auto">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-800" />
                                <circle
                                    cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="6"
                                    className="text-blue-500 transition-all duration-300"
                                    strokeDasharray="282.7"
                                    strokeDashoffset={282.7 - (282.7 * (progress.current / progress.total || 0))}
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-black text-white">{Math.round((progress.current / progress.total) * 100 || 0)}%</span>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{progress.current}/{progress.total}</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black text-white">Validando Público</h3>
                            <p className="text-sm text-slate-400 font-medium">Sincronizando com o banco do Chatwoot para identificar janelas ativas.</p>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {isWorking && createPortal(
                <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-slate-900 w-full max-w-md p-10 rounded-[3rem] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] text-center space-y-8">
                        <div className="relative w-24 h-24 mx-auto">
                            <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-500 animate-pulse"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" /></svg>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black text-white">Processando Lista</h3>
                            <p className="text-sm text-slate-400 font-medium">{workingMessage || 'Aguarde um instante...'}</p>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {showColumnSelector && createPortal(
                <div className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-[#0d1117] w-full max-w-2xl rounded-[2rem] border border-white/8 shadow-2xl overflow-hidden">
                        {/* Header */}
                        <div className="flex justify-between items-center px-8 pt-8 pb-6 border-b border-white/5">
                            <div>
                                <h3 className="text-xl font-black text-white tracking-tight">Mapear Colunas</h3>
                                <p className="text-xs text-slate-500 mt-1">Clique nos badges para definir o que cada coluna representa</p>
                            </div>
                            <button onClick={() => setShowColumnSelector(false)} className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 hover:text-white hover:bg-white/8 transition-all duration-200">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Columns list */}
                        <div className="px-8 py-5 space-y-3 max-h-[60vh] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e3a2f transparent' }}>
                            {csvData.nonEmptyIndices.map((idx) => {
                                const header = csvData.headers[idx] || `Coluna ${idx + 1}`;
                                const previewVal = csvData.rows[0]?.[idx];
                                const currentMapping = columnMapping[String(idx)] || 'ignore';

                                // All options: ignore + phone + template vars
                                const allOptions = [
                                    { value: 'ignore', label: 'Ignorar', icon: null, color: 'slate' },
                                    { value: 'phone', label: 'Telefone', icon: '📞', color: 'blue' },
                                    ...templateVariables.map(v => ({ value: v.key, label: v.label, icon: '✦', color: 'emerald' }))
                                ];

                                // Taken values by OTHER columns (for exclusivity)
                                const takenByOthers = new Set(
                                    Object.entries(columnMapping)
                                        .filter(([k, v]) => k !== String(idx) && v !== 'ignore')
                                        .map(([, v]) => v)
                                );

                                const handleSelect = (val) => {
                                    setColumnMapping(prev => {
                                        const next = { ...prev };
                                        // Remove this value from any other column first
                                        if (val !== 'ignore') {
                                            Object.keys(next).forEach(k => {
                                                if (k !== String(idx) && next[k] === val) next[k] = 'ignore';
                                            });
                                        }
                                        next[String(idx)] = val;
                                        return next;
                                    });
                                };

                                return (
                                    <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all duration-200">
                                        {/* Column name */}
                                        <div className="w-44 shrink-0">
                                            <div className="font-bold text-white text-sm truncate">{header}</div>
                                            {previewVal !== undefined && previewVal !== null && String(previewVal).trim() !== '' && (
                                                <div className="text-[10px] text-slate-600 truncate mt-0.5 font-mono">ex: {String(previewVal)}</div>
                                            )}
                                        </div>

                                        {/* Option pills */}
                                        <div className="flex flex-wrap gap-2 flex-1">
                                            {allOptions.map(opt => {
                                                const isSelected = currentMapping === opt.value;
                                                const isTaken = takenByOthers.has(opt.value) && opt.value !== 'ignore';
                                                const colorMap = {
                                                    slate: isSelected ? 'bg-slate-700 border-slate-500 text-slate-200' : 'bg-transparent border-slate-800 text-slate-600 hover:border-slate-600 hover:text-slate-400',
                                                    blue: isSelected ? 'bg-blue-500/20 border-blue-400/60 text-blue-300 shadow-sm shadow-blue-500/20' : isTaken ? 'bg-transparent border-slate-800/50 text-slate-700 cursor-not-allowed' : 'bg-transparent border-slate-700 text-slate-500 hover:border-blue-500/50 hover:text-blue-400',
                                                    emerald: isSelected ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-300 shadow-sm shadow-emerald-500/20' : isTaken ? 'bg-transparent border-slate-800/50 text-slate-700 cursor-not-allowed' : 'bg-transparent border-slate-700 text-slate-500 hover:border-emerald-500/50 hover:text-emerald-400',
                                                };
                                                return (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() => !isTaken && handleSelect(opt.value)}
                                                        disabled={isTaken}
                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all duration-200 ${colorMap[opt.color]} ${isSelected ? 'scale-105' : 'hover:scale-[1.03]'}`}
                                                    >
                                                        {opt.icon && <span className="text-[10px]">{opt.icon}</span>}
                                                        {opt.label}
                                                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-current ml-0.5 opacity-70"></span>}
                                                        {isTaken && <span className="opacity-40 text-[9px] ml-0.5">✓</span>}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Footer */}
                        <div className="px-8 py-6 border-t border-white/5 flex gap-3">
                            <button
                                onClick={() => setColumnMapping({})}
                                className="px-6 py-3 text-slate-500 font-bold hover:text-white transition-all duration-200 uppercase text-xs rounded-xl hover:bg-white/5"
                            >
                                Limpar
                            </button>
                            <button
                                onClick={confirmColumns}
                                className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-black text-sm uppercase tracking-widest transition-all duration-200 shadow-lg shadow-emerald-900/30 active:scale-[0.98]"
                            >
                                Confirmar Importação
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default RecipientSelector;
