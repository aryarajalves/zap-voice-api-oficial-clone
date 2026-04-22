
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL, WS_URL } from '../config';
import { fetchWithAuth } from '../AuthContext';
import { useClient } from '../contexts/ClientContext';
import RecipientSelector from './RecipientSelector';
import { createPortal } from 'react-dom';
import { read, utils } from 'xlsx';

/**
 * Premium Hook for Scroll Locking
 */
const useScrollLock = (lock) => {
    useEffect(() => {
        if (lock) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [lock]);
};

/**
 * Premium Modal for Text Expansion
 */
const ExpandTextModal = ({ isOpen, onClose, title, value, onSave, fieldKey }) => {
    const [localValue, setLocalValue] = useState(value);
    useScrollLock(isOpen);

    useEffect(() => {
        if (isOpen) setLocalValue(value);
    }, [isOpen, value]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-slate-900 w-full max-w-6xl rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col h-[85vh] border border-white/10 scale-in-center transition-all">
                <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-white/5 backdrop-blur-xl">
                    <h3 className="text-2xl font-black text-white flex items-center gap-4">
                        <span className="p-3 bg-green-500/10 text-green-400 rounded-2xl border border-green-500/20 shadow-xl shadow-green-500/5">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
                        </span>
                        {title}
                    </h3>
                    <button onClick={onClose} className="p-3 text-slate-400 hover:text-white rounded-full hover:bg-white/5 transition-all">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="flex-1 p-8 overflow-hidden flex flex-col bg-slate-950/20">
                    <textarea
                        className="w-full flex-1 p-10 bg-slate-800/20 border-2 border-white/5 rounded-[2rem] focus:border-green-500/30 focus:bg-slate-800/40 outline-none resize-none text-2xl text-slate-100 font-medium leading-relaxed shadow-inner placeholder:text-slate-600 transition-all"
                        value={localValue}
                        onChange={(e) => setLocalValue(e.target.value)}
                        placeholder="Digite aqui sua mensagem expandida..."
                    />
                    <div className="mt-6 flex items-center justify-between px-4">
                        <div className="text-sm font-bold text-slate-500 flex items-center gap-4">
                            <span className="px-4 py-1.5 bg-black/40 rounded-xl text-green-400 font-mono border border-white/5">
                                {localValue.length} caracteres
                            </span>
                            <span className="opacity-40">•</span>
                            <span className="italic opacity-80 uppercase tracking-widest text-[10px]">As variáveis (ex: {"{{1}}"}) serão mantidas durante o envio em massa.</span>
                        </div>
                    </div>
                </div>
                <div className="px-10 py-8 bg-black/20 border-t border-white/5 flex justify-end gap-6 items-center">
                    <button
                        onClick={onClose}
                        className="px-8 py-3 text-slate-400 font-black hover:text-white transition-all uppercase tracking-widest text-xs"
                    >
                        Descartar
                    </button>
                    <button
                        onClick={() => { onSave(fieldKey, localValue); onClose(); }}
                        className="px-12 py-4 bg-gradient-to-r from-green-600 to-emerald-500 text-white font-black rounded-2xl hover:from-green-500 hover:to-emerald-400 shadow-2xl shadow-green-900/20 transition-all active:scale-95 flex items-center gap-3"
                    >
                        SALVAR ALTERAÇÕES
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

const TemplatePreview = ({ template, params = {} }) => {
    if (!template) return null;

    const renderHeader = () => {
        const header = template.components.find(c => c.type === 'HEADER');
        if (!header) return null;
        if (header.format === 'TEXT') {
            const text = header.text;
            const parts = text.split(/(\{\{1\}\})/g);
            // Header usually only has 1 variable {{1}} if any
            return (
                <div className="font-bold mb-3 text-white text-base">
                    {parts.map((part, i) => {
                        if (part.match(/\{\{\d+\}\}/)) {
                            const varIndex = part.replace(/\D/g, '');
                            const val = params[`HEADER_${parseInt(varIndex) - 1}`];
                            return <span key={i} className={val ? "text-white" : "text-green-400 bg-green-500/10 px-1 rounded"}>{val || part}</span>;
                        }
                        return part;
                    })}
                </div>
            );
        }
        if (header.format === 'IMAGE') return (
            <div className="h-40 bg-slate-800 rounded-lg mb-4 flex items-center justify-center text-slate-500 overflow-hidden relative group">
                <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
                    {params['HEADER_0'] ? (
                        <img src={params['HEADER_0']} alt="Header" className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />
                    ) : (
                        <svg className="w-10 h-10 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    )}
                </div>
            </div>
        );
        if (header.format === 'VIDEO') return <div className="h-40 bg-slate-800 rounded-lg mb-4 flex items-center justify-center text-slate-500"><svg className="w-10 h-10 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>;
        return <div className="h-40 bg-slate-800 rounded-lg mb-4 flex items-center justify-center text-slate-500 text-xs font-mono">{header.format} HEADER</div>;
    };

    const renderBody = () => {
        const body = template.components.find(c => c.type === 'BODY');
        if (!body) return null;
        let text = body.text;
        const parts = text.split(/(\{\{\d+\}\})/g);
        return (
            <div className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                {parts.map((part, i) => {
                    if (part.match(/\{\{\d+\}\}/)) {
                        const varIndex = part.replace(/\D/g, '');
                        const val = params[`BODY_${parseInt(varIndex) - 1}`];
                        return <span key={i} className={val ? "font-semibold text-white" : "text-green-400 font-bold bg-green-500/10 px-1 rounded"}>{val || part}</span>;
                    }
                    return part;
                })}
            </div>
        );
    };

    const renderFooter = () => {
        const footer = template.components.find(c => c.type === 'FOOTER');
        if (!footer) return null;
        return <div className="text-[10px] text-slate-500 mt-3 pt-3 border-t border-white/5">{footer.text}</div>;
    };

    const renderButtons = () => {
        const buttons = template.components.find(c => c.type === 'BUTTONS');
        if (!buttons) return null;
        return (
            <div className="mt-4 grid gap-2">
                {buttons.buttons.map((btn, i) => (
                    <div key={i} className="bg-slate-800 text-blue-400 text-center py-2.5 rounded-lg text-xs font-bold border border-white/5 shadow-sm hover:bg-slate-700/50 cursor-default transition-colors flex items-center justify-center gap-2">
                        {btn.type === 'PHONE_NUMBER' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>}
                        {btn.type === 'URL' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>}
                        {btn.text}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="bg-[#0b141a] rounded-[1rem] p-4 border border-slate-800 max-w-sm w-full mx-auto font-sans relative overflow-hidden shadow-2xl">
            {/* WhatsApp Chat Bubble Style */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-[#25D366]"></div>
            <div className="bg-[#1f2c34] p-3 rounded-lg rounded-tl-none shadow-sm relative">
                {/* Tail */}
                <svg className="absolute -left-2 top-0 text-[#1f2c34]" width="8" height="13" viewBox="0 0 8 13" fill="currentColor"><path d="M-2.28882e-07 -1.04222e-06L0 12.0003L8 0.500295L-2.28882e-07 -1.04222e-06Z" /></svg>

                {renderHeader()}
                {renderBody()}
                {renderFooter()}
            </div>
            {renderButtons()}

            <div className="mt-3 flex justify-end items-center gap-1 opacity-50 text-[10px] text-slate-400">
                <span>12:00</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-400"><path d="M20 6L9 17l-5-5" /></svg>
            </div>
        </div>
    );
};

export default function TemplateBulkSender({ onViewChange, refreshKey }) {
    const { activeClient } = useClient();
    const [step, setStep] = useState(1); // 1: Config, 2: Contacts & Send
    const [templates, setTemplates] = useState([]);
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [templateParams, setTemplateParams] = useState({});
    // A/B Testing
    const [isABTesting] = useState(false);
    const [variations, setVariations] = useState([
        { id: 'v1', template: '', params: {}, weight: 50, cost: 0.0, category: 'OTHERS', direct_message: '', private_message: '', private_message_delay: 15, private_message_concurrency: 1 }
    ]);

    // Exclusion List
    const [exclusionList, setExclusionList] = useState([]);
    const [exclusionText, setExclusionText] = useState('');
    const [exclusionMode, setExclusionMode] = useState('manual'); // 'manual' | 'upload'
    const [exclusionCsvData, setExclusionCsvData] = useState(null);
    const [exclusionColSelector, setExclusionColSelector] = useState(false);
    const [exclusionSelectedCol, setExclusionSelectedCol] = useState(null);
    const [exclusionAvailableTags, setExclusionAvailableTags] = useState([]);
    const [selectedExclusionTag, setSelectedExclusionTag] = useState('');
    const [isLoadingExclusionTags, setIsLoadingExclusionTags] = useState(false);

    // --- RECURRENCE STATES ---
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrenceFrequency, setRecurrenceFrequency] = useState('weekly');
    const [recurrenceDaysOfWeek, setRecurrenceDaysOfWeek] = useState([]); // [{day: 0, time: '09:00'}]
    const [recurrenceDayOfMonth, setRecurrenceDayOfMonth] = useState(""); // "1, 15, 30"
    const [recurrenceTime, setRecurrenceTime] = useState("09:00");
    const [recurringDispatches, setRecurringDispatches] = useState([]);
    const [isLoadingRecurring, setIsLoadingRecurring] = useState(false);

    // Automation / Smart Logic
    const [sendPrivateMessage, setSendPrivateMessage] = useState(false);
    const [privateMessageText, setPrivateMessageText] = useState('');
    const [privateMessageDelay, setPrivateMessageDelay] = useState(15);
    const [privateMessageConcurrency, setPrivateMessageConcurrency] = useState(1);

    // Contacts & Execution
    const [finalContacts, setFinalContacts] = useState([]);
    const [selectionMetadata, setSelectionMetadata] = useState({ mode: 'manual', tag: '' });
    const [isSending, setIsSending] = useState(false);
    const [currentTriggerId, setCurrentTriggerId] = useState(null);
    const [progress, setProgress] = useState(null);
    const [delaySeconds, setDelaySeconds] = useState(1);
    const [delayUnit, setDelayUnit] = useState('seconds');
    const [concurrency, setConcurrency] = useState(4);
    const [costPerUnit, setCostPerUnit] = useState(0.0);
    const [scheduledTime, setScheduledTime] = useState('');

    // Private Message Delay Unit
    const [privateMessageDelayUnit, setPrivateMessageDelayUnit] = useState('seconds');

    // Modal State
    const [expansion, setExpansion] = useState({ isOpen: false, title: '', key: '', value: '' });
    const [isWorking, setIsWorking] = useState(false);
    const [workingMessage, setWorkingMessage] = useState('');
    const [isBulkGuideOpen, setIsBulkGuideOpen] = useState(false);

    /** 
     * Logic to detect category and price automatically
     */
    const getTemplateCategoryInfo = useCallback((templateName) => {
        const t = templates.find(x => x.name === templateName);
        if (!t) return { type: 'Desconhecido', price: 0.0, key: 'OTHERS' };

        const cat = t.category?.toUpperCase() || 'OTHERS';
        if (cat === 'MARKETING') return { type: 'Marketing', price: 0.35, key: 'MARKETING' };
        if (cat === 'UTILITY') return { type: 'Utilidade', price: 0.07, key: 'UTILITY' };
        if (cat === 'AUTHENTICATION') return { type: 'Autenticação', price: 0.05, key: 'AUTHENTICATION' };
        return { type: 'Outros', price: 0.10, key: 'OTHERS' };
    }, [templates]);

    const selectedTemplateObj = useMemo(() =>
        templates.find(t => t.name === selectedTemplate),
        [templates, selectedTemplate]);

    const templateVariables = useMemo(() => {
        if (!selectedTemplateObj) return [];
        const seen = new Set();
        const vars = [];
        selectedTemplateObj.components?.forEach(c => {
            if (!c.text) return;
            const matches = [...c.text.matchAll(/\{\{(\d+)\}\}/g)];
            matches.forEach(match => {
                const varNum = parseInt(match[1]);
                const key = `${c.type}_${varNum - 1}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    vars.push({ key, label: `{{${varNum}}}` });
                }
            });
        });
        return vars;
    }, [selectedTemplateObj]);

    // WebSocket for Progress removed per user request - Monitoring via History tab
    useEffect(() => {
        setIsSending(false);

        // Fetch unique tags for exclusion filter
        const loadExclusionTags = async () => {
            if (!activeClient) return;
            setIsLoadingExclusionTags(true);
            try {
                const res = await fetchWithAuth(`${API_URL}/leads/filters`, {}, activeClient.id);
                if (res.ok) {
                    const data = await res.json();
                    setExclusionAvailableTags(data.tags || []);
                }
            } catch (err) {
                console.error("Erro ao carregar etiquetas para exclusão:", err);
            } finally {
                setIsLoadingExclusionTags(false);
            }
        };
        loadExclusionTags();
    }, [activeClient]);

    // Fetch recurring dispatches
    useEffect(() => {
        const loadRecurring = async () => {
            if (!activeClient) return;
            setIsLoadingRecurring(true);
            try {
                const res = await fetchWithAuth(`${API_URL}/schedules/recurring`, {}, activeClient.id);
                if (res.ok) {
                    const data = await res.json();
                    setRecurringDispatches(data.items || []);
                }
            } catch (err) {
                console.error("Erro ao carregar disparos recorrentes:", err);
            } finally {
                setIsLoadingRecurring(false);
            }
        };
        loadRecurring();
    }, [activeClient]);

    const toggleRecurringStatus = async (id) => {
        try {
            const res = await fetchWithAuth(`${API_URL}/schedules/recurring/${id}/toggle`, {
                method: 'PATCH'
            }, activeClient.id);
            if (res.ok) {
                const data = await res.json();
                setRecurringDispatches(prev => prev.map(rd => rd.id === id ? { ...rd, is_active: data.is_active } : rd));
                toast.success(data.message);
            }
        } catch (err) {
            toast.error("Erro ao alterar status");
        }
    };

    const deleteRecurringDispatch = async (id) => {
        if (!confirm("Deseja realmente excluir este disparo recorrente?")) return;
        try {
            const res = await fetchWithAuth(`${API_URL}/schedules/recurring/${id}`, {
                method: 'DELETE'
            }, activeClient.id);
            if (res.ok) {
                setRecurringDispatches(prev => prev.filter(rd => rd.id !== id));
                toast.success("Excluído com sucesso");
            }
        } catch (err) {
            toast.error("Erro ao excluir");
        }
    };

    useEffect(() => {
        const loadTemplates = async () => {
            if (!activeClient) return;
            setIsLoadingTemplates(true);
            try {
                const res = await fetchWithAuth(`${API_URL}/whatsapp/templates`, {}, activeClient?.id);
                if (res.ok) {
                    const data = await res.json();
                    // Filter APPROVED and ACTIVE only
                    const approved = (data || []).filter(t => ['APPROVED', 'ACTIVE'].includes(t.status));
                    setTemplates(approved);
                }
            } catch (err) {
                console.error('Failed to load templates', err);
            } finally {
                setIsLoadingTemplates(false);
            }
        };
        loadTemplates();
    }, [activeClient, refreshKey]);

    const handleTemplateChange = (e) => {
        const val = e.target.value;
        setSelectedTemplate(val);
        const info = getTemplateCategoryInfo(val);
        setCostPerUnit(info.price);

        // Reset fields that depend on the template
        setDirectMessageText('');
        setDirectMessageButtons([]);
        setPrivateMessageText('');

        const t = templates.find(x => x.name === val);
        if (t) {
            const initialParams = {};
            t.components?.forEach(c => {
                // Extrai variáveis do texto via regex (fonte da verdade)
                if (c.text) {
                    const seen = new Set();
                    [...c.text.matchAll(/\{\{(\d+)\}\}/g)].forEach(match => {
                        const varNum = parseInt(match[1]);
                        if (!seen.has(varNum)) {
                            seen.add(varNum);
                            initialParams[`${c.type}_${varNum - 1}`] = '';
                        }
                    });
                }
                // fallback legado
                c.variables?.forEach((v, idx) => {
                    const key = `${c.type}_${idx}`;
                    if (!(key in initialParams)) initialParams[key] = '';
                });
            });
            setTemplateParams(initialParams);
        }
    };

    const handleAddVariation = () => {
        const newId = `v${variations.length + 1}`;
        setVariations([...variations, { id: newId, template: '', params: {}, weight: 50, cost: 0.0, category: 'OTHERS', direct_message: '', private_message: '', private_message_delay: 15, private_message_concurrency: 1 }]);
    };

    const handleRemoveVariation = (id) => {
        if (variations.length <= 1) return;
        setVariations(variations.filter(v => v.id !== id));
    };

    const handleUpdateVariation = (id, field, value) => {
        setVariations(variations.map(v => {
            if (v.id === id) {
                const updated = { ...v, [field]: value };
                if (field === 'template') {
                    const info = getTemplateCategoryInfo(value);
                    updated.cost = info.price;
                    updated.category = info.key;
                    // Reset params
                    const t = templates.find(x => x.name === value);
                    updated.params = {};
                    t?.components?.forEach(c => {
                        const seen = new Set();
                        [... (c.text || '').matchAll(/\{\{(\d+)\}\}/g)].forEach(match => {
                             const varNum = parseInt(match[1]);
                             if (!seen.has(varNum)) {
                                 seen.add(varNum);
                                 updated.params[`${c.type}_${varNum - 1}`] = '';
                             }
                        });
                        // Safe fallback for legacy
                        c.variables?.forEach((vars, idx) => {
                            const key = `${c.type}_${idx}`;
                            if (!(key in updated.params)) updated.params[key] = '';
                        });
                    });
                }
                return updated;
            }
            return v;
        }));
    };

    const handleUpdateVariationParam = (id, paramKey, value) => {
        setVariations(variations.map(v => {
            if (v.id === id) {
                return { ...v, params: { ...v.params, [paramKey]: value } };
            }
            return v;
        }));
    };

    const handleParamChange = (key, val) => {
        setTemplateParams(prev => ({ ...prev, [key]: val }));
    };

    const openExpansion = (title, key, value) => {
        setExpansion({ isOpen: true, title, key, value });
    };

    const saveExpansion = (key, val) => {
        if (key === 'privateMessageText') setPrivateMessageText(val);
        else if (key.startsWith('param_')) {
            const paramKey = key.replace('param_', '');
            setTemplateParams(prev => ({ ...prev, [paramKey]: val }));
        } else if (key.startsWith('ab_pm_')) {
            const varId = key.replace('ab_pm_', '');
            handleUpdateVariation(varId, 'private_message', val);
        }
    };

    const cloneToPrivateNote = (vId = null) => {
        const tObj = vId ? templates.find(t => t.name === variations.find(v => v.id === vId)?.template) : selectedTemplateObj;
        if (!tObj) return toast.error("Selecione um template primeiro");

        const body = tObj.components?.find(c => c.type === 'BODY')?.text || '';
        
        if (vId) {
            setVariations(variations.map(v => v.id === vId ? { ...v, private_message: body } : v));
        } else {
            setPrivateMessageText(body);
            setSendPrivateMessage(true);
        }
        toast.success("Texto do template clonado para Nota Privada!");
    };

    const handleSaveExclusion = () => {
        const nums = exclusionText.split(/[\n,;]+/)
            .map(n => n.replace(/\D/g, '').trim())
            .filter(n => n.length >= 8);
        setExclusionList(prev => [...new Set([...prev, ...nums])]);
        setExclusionText('');
        toast.success(`${nums.length} números adicionados à lista de exclusão.`);
    };

    const handleExclusionFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setWorkingMessage('Lendo arquivo de exclusão...');
        setIsWorking(true);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = utils.sheet_to_json(ws, { header: 1 });

                if (data.length < 1) return toast.error("Arquivo vazio");

                const headers = data[0];
                const rows = data.slice(1);
                setExclusionCsvData({ headers, rows });
                setExclusionColSelector(true);
                setIsWorking(false);
            } catch (err) {
                console.error(err);
                toast.error("Erro ao ler arquivo");
                setIsWorking(false);
            }
        };
        reader.readAsBinaryString(file);
    };

    const confirmExclusionColumn = async () => {
        if (exclusionSelectedCol === null) return toast.error("Selecione a coluna de telefone");

        setWorkingMessage('Importando números para exclusão...');
        setIsWorking(true);
        // Small delay for UI feedback
        await new Promise(resolve => setTimeout(resolve, 500));

        const newNums = exclusionCsvData.rows.map(r => {
            const val = r[exclusionSelectedCol];
            return String(val || '').replace(/\D/g, '');
        }).filter(n => n.length >= 8);

        setExclusionList(prev => [...new Set([...prev, ...newNums])]);
        setIsWorking(false);
        setExclusionColSelector(false);
        setExclusionCsvData(null);
        setExclusionSelectedCol(null);
        // We stay in the modal to allow more additions or review
        toast.success(`${newNums.length} números importados para exclusão.`);
    };

    const add55ToExclusionText = async () => {
        if (!exclusionText.trim()) return;
        setWorkingMessage('Adicionando DDI 55 aos números de exclusão...');
        setIsWorking(true);
        await new Promise(resolve => setTimeout(resolve, 600));

        const lines = exclusionText.split('\n').map(l => {
            let p = l.trim().replace(/\D/g, '');
            if (p.length > 0 && !p.startsWith('55')) {
                return '55' + p;
            }
            return p;
        }).filter(l => l.length > 0);
        setExclusionText(lines.join('\n'));
        setIsWorking(false);
        toast.success("DDI 55 adicionado à lista de exclusão!");
    };

    const add55ToLoadedExclusionList = async () => {
        if (exclusionList.length === 0) return;
        setWorkingMessage('Padronizando números da exclusão com DDI 55...');
        setIsWorking(true);
        await new Promise(resolve => setTimeout(resolve, 800));

        const updated = exclusionList.map(num => {
            if (num.startsWith('55')) return num;
            return '55' + num;
        });
        setExclusionList([...new Set(updated)]);
        setIsWorking(false);
        toast.success("DDI 55 adicionado a todos os números da exclusão!");
    };

    const loadExclusionContactsByTag = async () => {
        if (!selectedExclusionTag) return toast.error("Selecione uma etiqueta primeiro");
        if (!activeClient) return toast.error("Selecione um cliente primeiro");

        setWorkingMessage(`Buscando contatos da etiqueta "${selectedExclusionTag}" para exclusão...`);
        setIsWorking(true);
        try {
            const res = await fetchWithAuth(`${API_URL}/leads?tag=${encodeURIComponent(selectedExclusionTag)}&limit=10000`, {}, activeClient.id);
            if (res.ok) {
                const data = await res.json();
                const phones = (data.items || []).map(lead => lead.phone.replace(/\D/g, '')).filter(p => p.length >= 8);

                if (phones.length === 0) {
                    toast.error("Nenhum contato encontrado com esta etiqueta");
                    return;
                }

                setExclusionList(prev => [...new Set([...prev, ...phones])]);
                toast.success(`${phones.length} contatos da etiqueta adicionados à exclusão!`);
            }
        } catch (err) {
            console.error(err);
            toast.error("Erro ao buscar contatos por etiqueta");
        } finally {
            setIsWorking(false);
        }
    };

    const handleCopyFinalList = () => {
        if (finalContacts.length === 0) return toast.error("Nenhum contato na lista final!");
        const text = finalContacts.map(c => c.phone).join('\n');
        navigator.clipboard.writeText(text);
        toast.success("Lista final copiada para a área de transferência!", { icon: '📋' });
    };

    const buildComponentsPayload = (template, params) => {
        if (!template || !template.components) return [];

        const payloadComponents = [];

        template.components.forEach(c => {
            const isMediaHeader = c.type === 'HEADER' && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(c.format);

            if (c.type === 'BUTTONS') {
                c.buttons?.forEach((btn, idx) => {
                    if (btn.type === 'URL' && btn.url?.includes('{{1}}')) {
                        const paramVal = params[`BUTTONS_${idx}`] || '';
                        if (paramVal) {
                            payloadComponents.push({
                                type: 'button',
                                sub_type: 'url',
                                index: idx,
                                parameters: [{ type: 'text', text: paramVal }]
                            });
                        }
                    }
                });
                return;
            }

            const componentPayload = { type: c.type.toLowerCase(), parameters: [] };

            // Extrai {{N}} do texto via regex (fonte da verdade, igual ao templateVariables)
            if (c.text) {
                const seen = new Set();
                const matches = [...c.text.matchAll(/\{\{(\d+)\}\}/g)];
                matches.forEach(match => {
                    const varNum = parseInt(match[1]);
                    if (!seen.has(varNum)) {
                        seen.add(varNum);
                        const val = params[`${c.type}_${varNum - 1}`] || '';
                        componentPayload.parameters.push({ type: 'text', text: val });
                    }
                });
            } else if (c.variables && c.variables.length > 0) {
                // fallback legado
                c.variables.forEach((v, idx) => {
                    const val = params[`${c.type}_${idx}`] || '';
                    componentPayload.parameters.push({ type: 'text', text: val });
                });
            } else if (isMediaHeader && params[`${c.type}_0`]) {
                const val = params[`${c.type}_0`];
                const typeName = c.format.toLowerCase();
                const mediaObj = {};
                mediaObj[typeName === 'document' ? 'document' : typeName] = { link: val };
                componentPayload.parameters.push({ type: typeName, ...mediaObj });
            }

            if (componentPayload.parameters.length > 0) {
                payloadComponents.push(componentPayload);
            }
        });

        return payloadComponents;
    };

    const handleSend = async () => {
        if (!activeClient) return toast.error('Selecione um cliente');
        if (finalContacts.length === 0) return toast.error('Selecione os destinatários');

        setIsSending(true);
        // Filter Exclusion List
        const contactsToUse = finalContacts.filter(c => !exclusionList.includes(c.phone));

        if (contactsToUse.length === 0) return toast.error('Todos os contatos foram filtrados pela lista de exclusão.');
        if (contactsToUse.length < finalContacts.length) {
            toast(`${finalContacts.length - contactsToUse.length} contatos removidos pela lista de exclusão.`, { icon: '🛡️' });
        }

        console.log('🚀 Initiating send with', contactsToUse.length, 'contacts');

        // Build contacts list: with per-contact components if any contact has variables
        const hasPerContactVars = contactsToUse.some(c => c.variables && Object.keys(c.variables).length > 0);
        const finalPhoneList = hasPerContactVars
            ? contactsToUse.map(c => {
                if (!c.variables || Object.keys(c.variables).length === 0) return c.phone;
                const mergedParams = { ...templateParams, ...c.variables };
                const perContactComponents = buildComponentsPayload(selectedTemplateObj, mergedParams);
                return perContactComponents.length > 0 ? { phone: c.phone, components: perContactComponents } : c.phone;
            })
            : contactsToUse.map(c => c.phone);

        const scheduleAt = scheduledTime ? new Date(scheduledTime).toISOString() : new Date().toISOString();

        // Convert delay to seconds for API
        const getSeconds = (val, unit) => {
            const v = parseInt(val) || 0;
            if (unit === 'minutes') return v * 60;
            if (unit === 'hours') return v * 3600;
            return v;
        };

        const finalDelaySeconds = getSeconds(delaySeconds, delayUnit);
        const finalPrivateMessageDelay = getSeconds(privateMessageDelay, privateMessageDelayUnit);

        let payload;
        if (isABTesting) {
            payload = {
                variations: variations.map(v => {
                    const vObj = templates.find(t => t.name === v.template);
                    return {
                        template_name: v.template,
                        language: vObj?.language || 'pt_BR',
                        weight: v.weight,
                        components: buildComponentsPayload(vObj, v.params),
                        cost_per_unit: v.cost,
                        direct_message: v.direct_message || null,
                        direct_message_params: v.direct_message_buttons?.length > 0 ? { buttons: v.direct_message_buttons } : {},
                        private_message: sendPrivateMessage ? (v.private_message || null) : null,
                        private_message_delay: v.private_message_delay || 5,
                        private_message_concurrency: v.private_message_concurrency || 1
                    };
                }),
                schedule_at: scheduleAt,
                contacts_list: finalPhoneList,
                delay_seconds: finalDelaySeconds,
                concurrency_limit: concurrency
            };
        } else {
            payload = {
                template_name: selectedTemplate,
                schedule_at: scheduleAt,
                contacts_list: finalPhoneList,
                delay_seconds: finalDelaySeconds,
                concurrency_limit: concurrency,
                language: selectedTemplateObj?.language || 'pt_BR',
                cost_per_unit: costPerUnit,
                components: buildComponentsPayload(selectedTemplateObj, templateParams),
                direct_message: null,
                direct_message_params: {},
                private_message: sendPrivateMessage ? privateMessageText : null,
                private_message_delay: finalPrivateMessageDelay,
                private_message_concurrency: privateMessageConcurrency
            };
        }

        try {
            console.log('📡 Sending payload:', payload);
            
            const endpoint = isRecurring ? `${API_URL}/schedules/recurring` : `${API_URL}/bulk-send/schedule`;
            
            // Reusing recurrenceDaysOfWeek state for both weekly and monthly but sending to specific fields
            const finalDaysOfWeek = isRecurring && recurrenceFrequency === 'weekly' ? recurrenceDaysOfWeek : [];
            const finalDaysOfMonth = isRecurring && recurrenceFrequency === 'monthly' ? recurrenceDaysOfWeek : [];

            const recurringPayload = isRecurring ? {
                frequency: recurrenceFrequency,
                days_of_week: finalDaysOfWeek, // Agora suporta [{day, time}]
                day_of_month: finalDaysOfMonth, // Agora suporta [{day, time}]
                scheduled_time: recurrenceTime,
                funnel_id: null, // To be extended if needed
                template_name: selectedTemplate,
                template_language: selectedTemplateObj?.language || 'pt_BR',
                template_components: buildComponentsPayload(selectedTemplateObj, templateParams),
                contacts_list: selectionMetadata.mode === 'tag' ? null : finalPhoneList,
                tag: selectionMetadata.mode === 'tag' ? selectionMetadata.tag : null,
                exclusion_list: exclusionList,
                delay_seconds: finalDelaySeconds,
                concurrency_limit: concurrency,
                private_message: sendPrivateMessage ? privateMessageText : null,
                private_message_delay: finalPrivateMessageDelay,
                private_message_concurrency: privateMessageConcurrency,
                is_active: true
            } : payload;

            const res = await fetchWithAuth(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(recurringPayload)
            }, activeClient.id);

            if (res.ok) {
                const data = await res.json();
                if (isRecurring) {
                    toast.success('Disparo recorrente criado com sucesso! 🔄');
                    // Add to list and clear
                    setRecurringDispatches(prev => [data, ...prev]);
                } else {
                    setCurrentTriggerId(data.trigger_id);
                    toast.success(scheduledTime ? 'Disparo agendado com sucesso! 📅' : 'Disparo iniciado com sucesso! 🚀');
                }

                // Reset states
                setSelectedTemplate('');
                setFinalContacts([]);
                setScheduledTime('');
                setStep(1);

                // Redirect to History View
                if (onViewChange) onViewChange('history');
            } else {
                let errorData = { detail: 'Erro ao agendar disparo' };
                try {
                    errorData = await res.json();
                } catch (e) {
                    console.error("Erro ao ler JSON de erro:", e);
                }
                toast.error(errorData.detail || 'Erro ao agendar disparo');
            }
        } catch (err) {
            console.error('Send error details:', err);
            toast.error(`Erro de conexão: ${err.message || 'Falha ao iniciar disparo'}`);
        } finally {
            setIsSending(false);
        }
    };

    const handleCancel = async () => {
        if (!currentTriggerId) return;
        try {
            const res = await fetchWithAuth(`${API_URL}/triggers/${currentTriggerId}/cancel`, { method: 'POST' }, activeClient?.id);
            if (res.ok) {
                toast.success('Disparo cancelado');
                setIsSending(false);
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500 pb-20">
            {/* Header com Stepper */}
            <div className="bg-slate-900/40 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-black text-white tracking-tight">Disparo em Massa <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">Pro</span></h1>
                        <button
                            type="button"
                            onClick={() => setIsBulkGuideOpen(true)}
                            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all hover:scale-105"
                            style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399' }}
                            title="Abrir guia do Disparo em Massa"
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                            Guia
                        </button>
                    </div>
                    <p className="text-slate-400 font-medium">Configure e execute disparos inteligentes em massa com IA.</p>
                </div>

                <div className="flex items-center gap-4 bg-black/20 p-2 rounded-2xl border border-white/5">
                    <button
                        onClick={() => setStep(1)}
                        className={`flex items-center gap-3 px-6 py-2.5 rounded-xl font-bold transition-all ${step === 1 ? 'bg-white/10 text-green-400 shadow-lg ring-1 ring-white/10' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 1 ? 'bg-green-500 text-white' : 'bg-slate-800 text-slate-500'}`}>1</span>
                        Configuração
                    </button>
                    <div className="w-8 h-[1px] bg-slate-800"></div>
                    <button
                        onClick={() => setStep(2)}
                        disabled={isABTesting ? variations.some(v => !v.template) : !selectedTemplate}
                        className={`flex items-center gap-3 px-6 py-2.5 rounded-xl font-bold transition-all ${step === 2 ? 'bg-white/10 text-green-400 shadow-lg ring-1 ring-white/10' : 'text-slate-500 hover:text-slate-300'} disabled:opacity-30`}
                    >
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 2 ? 'bg-green-500 text-white' : 'bg-slate-800 text-slate-500'}`}>2</span>
                        Envio
                    </button>
                </div>
            </div>

            {/* Step 1: Configuration */}
            {step === 1 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                    {/* Top: Template & Variables (Full Width) */}
                    <section className="bg-slate-900/60 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/5 overflow-hidden relative group/section">
                        <div className="hidden"></div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10 relative z-10 px-2">
                            <h2 className="text-2xl font-black text-white flex items-center gap-4">
                                <span className="p-3 bg-green-500/10 text-green-400 rounded-2xl border border-green-500/20 shadow-xl shadow-green-500/10">01</span>
                                Configuração de Template
                            </h2>
                        </div>

                        {isABTesting ? (
                            <div className="space-y-10 relative z-10">
                                <div className="p-6 bg-gradient-to-r from-blue-500/10 to-teal-500/10 text-blue-300 rounded-[2rem] text-sm border border-blue-500/20 flex items-center gap-5 backdrop-blur-md shadow-2xl">
                                    <div className="p-3 bg-blue-500/20 rounded-2xl text-2xl">✨</div>
                                    <p className="leading-relaxed font-medium">O <b>Modo A/B</b> distribui seus contatos entre diferentes templates. Defina o <b>Peso (%)</b> para controlar a proporção de cada variação no disparo total.</p>
                                </div>

                                {variations.map((v, vIdx) => {
                                    const vTemplate = templates.find(t => t.name === v.template);
                                    const vInfo = getTemplateCategoryInfo(v.template);
                                    return (
                                        <div key={v.id} className="group/var p-8 bg-slate-800/20 hover:bg-slate-800/40 rounded-[3rem] border border-white/5 hover:border-green-500/20 transition-all duration-500 relative animate-in fade-in slide-in-from-top-4 shadow-xl hover:shadow-green-500/5">
                                            <div className="flex items-center justify-between mb-8">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-12 h-12 flex items-center justify-center bg-slate-900 rounded-2xl text-xl font-black text-white border border-white/10 group-hover/var:bg-green-600 transition-colors">
                                                        {vIdx + 1}
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Variação de Template</h3>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-lg font-bold text-white tracking-tight">{v.template || 'Não selecionado'}</span>
                                                            {v.template && (
                                                                <span className="text-[9px] font-black text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20 uppercase tracking-wider">
                                                                    {vInfo.type} • R$ {vInfo.price.toFixed(2)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                {variations.length > 1 && (
                                                    <button
                                                        onClick={() => handleRemoveVariation(v.id)}
                                                        className="w-12 h-12 flex items-center justify-center text-red-500 hover:text-white bg-red-500/10 hover:bg-red-500 rounded-2xl transition-all border border-red-500/10 shadow-lg"
                                                        title="Remover esta variação"
                                                    >
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                                    </button>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                                                {/* Left Column: Config */}
                                                <div className="xl:col-span-8 space-y-6">
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                                        <div className="md:col-span-2">
                                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Selecione o Template</label>
                                                            <select
                                                                className="w-full p-4 bg-slate-900/50 border-2 border-slate-700/50 rounded-2xl focus:border-green-500/50 outline-none transition-all font-bold text-white text-xs"
                                                                value={v.template}
                                                                onChange={(e) => handleUpdateVariation(v.id, 'template', e.target.value)}
                                                            >
                                                                <option value="" className="bg-slate-900">-- Escolha --</option>
                                                                {templates
                                                                    .filter(t => ['APPROVED', 'ACTIVE'].includes(t.status))
                                                                    .map(t => (
                                                                        <option key={t.name} value={t.name} className="bg-slate-900">
                                                                            {t.name} ({getTemplateCategoryInfo(t.name).type})
                                                                        </option>
                                                                    ))}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Peso (%)</label>
                                                            <input
                                                                type="number"
                                                                className="w-full p-4 bg-slate-900/50 border-2 border-slate-700/50 rounded-2xl focus:border-green-500/50 outline-none transition-all font-bold text-white text-xs"
                                                                value={v.weight}
                                                                onChange={(e) => handleUpdateVariation(v.id, 'weight', parseInt(e.target.value))}
                                                            />
                                                        </div>
                                                    </div>

                                                    {vTemplate && (
                                                        <div className="space-y-4 pt-4 border-t border-white/5">
                                                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Variáveis da Variação</h4>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                {vTemplate.components?.map(c => (
                                                                    c.variables?.map((vars, idx) => (
                                                                        <div key={`${c.type}_${idx}`}>
                                                                            <label className="block text-[9px] font-bold text-slate-600 mb-1 ml-1 uppercase">{c.type} Var #{idx + 1}</label>
                                                                            <input
                                                                                type="text"
                                                                                className="w-full p-3 bg-slate-900/40 border border-slate-700/50 rounded-xl focus:border-green-500/50 outline-none text-white text-xs"
                                                                                value={v.params[`${c.type}_${idx}`] || ''}
                                                                                onChange={(e) => handleUpdateVariationParam(v.id, `${c.type}_${idx}`, e.target.value)}
                                                                            />
                                                                        </div>
                                                                    ))
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Smart Send & Private Message */}
                                                    <div className="pt-6 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <div>
                                                            <label className="block text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2 px-1 flex items-center gap-2">
                                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                                                                Verificação de Envio Inteligente (24h)
                                                            </label>
                                                            <div className="flex justify-end mb-2">
                                                                <button
                                                                    onClick={() => cloneToSmartSend(v.id)}
                                                                    className="text-[8px] font-black text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-500/20 px-2 py-1 rounded border border-blue-500/20 transition-all flex items-center gap-1 uppercase"
                                                                >
                                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></svg>
                                                                    Clonar Template
                                                                </button>
                                                            </div>
                                                            <div className="relative group/field-sm">
                                                                <textarea
                                                                    className="w-full p-3 bg-slate-900/40 border border-slate-700/50 rounded-xl focus:border-blue-500/50 outline-none text-white text-xs min-h-[80px]"
                                                                    placeholder="Mensagem direta alternativa..."
                                                                    value={v.direct_message || ''}
                                                                    onChange={(e) => handleUpdateVariation(v.id, 'direct_message', e.target.value)}
                                                                />
                                                                <button
                                                                    onClick={() => openExpansion(`Variação #${vIdx + 1} - Smart Send`, `ab_dm_${v.id}`, v.direct_message || '')}
                                                                    className="absolute bottom-2 right-2 p-1.5 bg-slate-700/50 rounded-lg text-slate-400 hover:text-white opacity-0 group-hover/field-sm:opacity-100 transition-opacity"
                                                                >
                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
                                                                </button>
                                                            </div>

                                                            {/* NEW: Buttons for A/B Variation Smart Send */}
                                                            <div className="mt-2 space-y-2">
                                                                <div className="flex items-center justify-between px-1">
                                                                    <span className="text-[8px] font-black text-slate-500 uppercase">Botões (Opcional)</span>
                                                                    <button
                                                                        onClick={() => {
                                                                            const btns = v.direct_message_buttons || [];
                                                                            if (btns.length >= 3) return;
                                                                            handleUpdateVariation(v.id, 'direct_message_buttons', [...btns, '']);
                                                                        }}
                                                                        className="text-[8px] font-bold text-blue-400 hover:text-blue-300"
                                                                    >
                                                                        + ADICIONAR
                                                                    </button>
                                                                </div>
                                                                {(v.direct_message_buttons || []).map((btn, bIdx) => (
                                                                    <div key={bIdx} className="flex gap-1">
                                                                        <input
                                                                            type="text"
                                                                            className="flex-1 p-2 bg-slate-900/40 border border-slate-700/50 rounded-lg text-white text-[10px] outline-none focus:border-blue-500/50"
                                                                            placeholder={`Botão ${bIdx + 1}`}
                                                                            value={btn}
                                                                            onChange={(e) => {
                                                                                const newBtns = [...v.direct_message_buttons];
                                                                                newBtns[bIdx] = e.target.value;
                                                                                handleUpdateVariation(v.id, 'direct_message_buttons', newBtns);
                                                                            }}
                                                                            maxLength={20}
                                                                        />
                                                                        <button
                                                                            onClick={() => {
                                                                                const newBtns = v.direct_message_buttons.filter((_, i) => i !== bIdx);
                                                                                handleUpdateVariation(v.id, 'direct_message_buttons', newBtns);
                                                                            }}
                                                                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"
                                                                        >
                                                                            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {sendPrivateMessage && (
                                                            <div className="animate-in fade-in slide-in-from-left-2 space-y-3">
                                                                <label className="block text-[9px] font-black text-orange-400 uppercase tracking-widest px-1 flex items-center gap-2">
                                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                                                    Nota Interna (Chatwoot)
                                                                </label>
                                                                <div className="flex justify-end mb-2">
                                                                    <button
                                                                        onClick={() => cloneToPrivateNote(v.id)}
                                                                        className="text-[8px] font-black text-orange-400 hover:text-white bg-orange-500/10 hover:bg-orange-500/20 px-2 py-1 rounded border border-orange-500/20 transition-all flex items-center gap-1 uppercase"
                                                                    >
                                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></svg>
                                                                        Clonar Template
                                                                    </button>
                                                                </div>
                                                                <div className="relative group/field-pm">
                                                                    <textarea
                                                                        className="w-full p-3 bg-slate-900/40 border border-slate-700/50 rounded-xl focus:border-orange-500/50 outline-none text-white text-xs min-h-[80px]"
                                                                        placeholder="Nota interna desta variação..."
                                                                        value={v.private_message || ''}
                                                                        onChange={(e) => handleUpdateVariation(v.id, 'private_message', e.target.value)}
                                                                    />
                                                                    <button
                                                                        onClick={() => openExpansion(`Variação #${vIdx + 1} - Nota Privada`, `ab_pm_${v.id}`, v.private_message || '')}
                                                                        className="absolute bottom-2 right-2 p-1.5 bg-slate-700/50 rounded-lg text-slate-400 hover:text-white opacity-0 group-hover/field-pm:opacity-100 transition-opacity"
                                                                    >
                                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
                                                                    </button>
                                                                </div>

                                                                {/* Local Settings for A/B */}
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <div className="bg-slate-900/30 border border-slate-700/50 rounded-lg p-2">
                                                                        <label className="block text-[8px] font-black text-slate-500 uppercase mb-1">Delay (s)</label>
                                                                        <input
                                                                            type="number"
                                                                            className="w-full bg-transparent outline-none text-white text-xs font-bold"
                                                                            value={v.private_message_delay || 5}
                                                                            onChange={(e) => handleUpdateVariation(v.id, 'private_message_delay', parseInt(e.target.value))}
                                                                        />
                                                                    </div>
                                                                    <div className="bg-slate-900/30 border border-slate-700/50 rounded-lg p-2">
                                                                        <label className="block text-[8px] font-black text-slate-500 uppercase mb-1">Concorrência</label>
                                                                        <input
                                                                            type="number"
                                                                            className="w-full bg-transparent outline-none text-white text-xs font-bold"
                                                                            value={v.private_message_concurrency || 1}
                                                                            onChange={(e) => handleUpdateVariation(v.id, 'private_message_concurrency', parseInt(e.target.value))}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Right Column: Preview */}
                                                {vTemplate && (
                                                    <div className="xl:col-span-4 bg-slate-900/50 rounded-2xl p-6 border border-white/5 flex flex-col items-center">
                                                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 w-full text-center">Pré-visualização</h4>
                                                        <div className="w-full flex justify-center scale-95 origin-top">
                                                            <TemplatePreview template={vTemplate} params={v.params} />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}

                                <button
                                    onClick={handleAddVariation}
                                    className="w-full py-4 border-2 border-dashed border-slate-800 hover:border-green-500/30 rounded-[2rem] text-slate-500 hover:text-green-400 hover:bg-green-500/5 transition-all font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 group"
                                >
                                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-green-500 group-hover:text-white transition-all transform group-hover:rotate-90">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14" /></svg>
                                    </div>
                                    Adicionar Variação de Template
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-8 relative z-10">
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3 px-1">Selecione o Template</label>
                                    <div className="relative">
                                        <select
                                            className="w-full p-4 pl-5 bg-slate-800/50 border-2 border-slate-700/50 rounded-2xl focus:border-green-500/50 focus:bg-slate-800 outline-none transition-all font-semibold text-white text-lg shadow-sm appearance-none"
                                            value={selectedTemplate}
                                            onChange={handleTemplateChange}
                                        >
                                            <option value="" className="bg-slate-900">
                                                {isLoadingTemplates ? "Carregando templates..." : "-- Escolha um template cadastrado --"}
                                            </option>
                                            {templates.map(t => (
                                                <option key={t.name} value={t.name} className="bg-slate-900">
                                                    {t.name} ({getTemplateCategoryInfo(t.name).type})
                                                </option>
                                            ))}
                                        </select>
                                        <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none text-slate-500">
                                            <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
                                        </div>
                                    </div>
                                </div>

                                {selectedTemplateObj && (
                                    <div className="space-y-6 animate-in zoom-in-95 duration-300">
                                        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                                            <div className="md:col-span-3 space-y-6">
                                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">Variáveis Dinâmicas</h3>
                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                                    {selectedTemplateObj.components?.map(c => (
                                                        c.variables?.map((v, idx) => {
                                                            const key = `${c.type}_${idx}`;
                                                            return (
                                                                <div key={key} className="relative group/field">
                                                                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5 ml-1 uppercase tracking-wider">{c.type} Var #{idx + 1}</label>
                                                                    <div className="relative">
                                                                        <textarea
                                                                            className="w-full p-4 pr-12 bg-slate-800/40 border-2 border-slate-700/50 rounded-2xl focus:border-green-500/50 focus:bg-slate-800 outline-none transition-all text-slate-200 min-h-[110px] shadow-inner placeholder:text-slate-600"
                                                                            placeholder={`Valor para ${v}`}
                                                                            value={templateParams[key] || ''}
                                                                            onChange={(e) => handleParamChange(key, e.target.value)}
                                                                        />
                                                                        <button
                                                                            onClick={() => openExpansion(`Variável: ${c.type} #${idx + 1}`, `param_${key}`, templateParams[key] || '')}
                                                                            className="absolute bottom-3 right-3 p-2 bg-slate-700/50 backdrop-blur rounded-xl shadow-lg text-slate-400 hover:text-green-400 hover:bg-slate-700 border border-white/5 transition-all opacity-0 group-hover/field:opacity-100"
                                                                            title="Maximizar"
                                                                        >
                                                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="md:col-span-2">
                                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest px-1 mb-4 text-center">Pré-visualização</h3>
                                                <TemplatePreview template={selectedTemplateObj} params={templateParams} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>

                        {/* Automation Section (Now full width if not AB) */}
                        <div className={`${!isABTesting ? 'xl:col-span-12' : 'xl:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-8'}`}>
                            <section className="bg-slate-900/60 backdrop-blur-md rounded-[2.5rem] p-10 shadow-2xl border border-white/5 h-fit relative overflow-hidden group/auto">
                                <div className="absolute -top-12 -right-12 w-32 h-32 bg-orange-500/5 blur-3xl rounded-full"></div>

                                <div className="flex items-center gap-4 mb-10 relative z-10">
                                    <h2 className="text-2xl font-black text-white flex items-center gap-4">
                                        <span className="p-3 bg-orange-500/10 text-orange-400 rounded-2xl border border-orange-500/20 shadow-xl shadow-orange-500/10">02</span>
                                        Fluxo Automático Pós-Envio
                                    </h2>
                                    <button
                                        onClick={() => cloneToPrivateNote()}
                                        className="text-[10px] font-black bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-white px-4 py-2 rounded-xl uppercase tracking-widest border border-orange-500/20 backdrop-blur-md transition-all flex items-center gap-2"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></svg>
                                        Clonar Template
                                    </button>
                                </div>

                                <div className="space-y-8 relative z-10">
                                    <label className={`flex items-center p-6 rounded-3xl cursor-pointer transition-all border-2 group/card ${sendPrivateMessage ? 'bg-orange-500/5 border-orange-500/30' : 'bg-slate-800/10 border-white/5 hover:border-white/10 hover:bg-slate-800/20'}`}>
                                        <div className={`w-14 h-14 flex items-center justify-center rounded-2xl transition-all duration-700 ${sendPrivateMessage ? 'bg-orange-600 text-white shadow-2xl shadow-orange-900/40 rotate-6 scale-110' : 'bg-slate-800 text-slate-500'}`}>
                                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                                        </div>
                                        <div className="ml-5 flex-1">
                                            <div className={`text-lg font-black tracking-tight transition-colors ${sendPrivateMessage ? 'text-white' : 'text-slate-500'}`}>Nota Privada Automatizada</div>
                                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Registro Automático Chatwoot</div>
                                        </div>
                                        <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${sendPrivateMessage ? 'bg-orange-600 border-orange-400' : 'bg-slate-900 border-slate-700'}`}>
                                            {sendPrivateMessage && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="text-white"><path d="M20 6L9 17l-5-5" /></svg>}
                                        </div>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={sendPrivateMessage}
                                            onChange={(e) => setSendPrivateMessage(e.target.checked)}
                                        />
                                    </label>

                                    {sendPrivateMessage && !isABTesting && (
                                        <div className="space-y-6 animate-in slide-in-from-top-4 fade-in duration-500">
                                            <div className="relative group/field">
                                                <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500/20 to-yellow-500/20 rounded-3xl blur opacity-0 group-hover/field:opacity-100 transition duration-500"></div>
                                                <textarea
                                                    className="relative w-full p-6 pr-14 bg-black/40 border border-white/10 rounded-3xl focus:border-orange-500/40 outline-none transition-all text-slate-200 min-h-[140px] shadow-inner placeholder:text-slate-800 text-sm font-medium leading-relaxed"
                                                    placeholder="Este conteúdo será visível apenas internamente no Chatwoot..."
                                                    value={privateMessageText}
                                                    onChange={(e) => setPrivateMessageText(e.target.value)}
                                                />
                                                <button
                                                    onClick={() => openExpansion("Configuração - Nota Privada (Chatwoot)", "privateMessageText", privateMessageText)}
                                                    className="absolute bottom-5 right-5 p-3 bg-slate-800/80 backdrop-blur shadow-2xl text-slate-400 hover:text-orange-400 rounded-xl transition-all opacity-0 group-hover/field:opacity-100"
                                                >
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-2 gap-5">
                                                <div className="p-5 bg-slate-800/40 border border-white/5 rounded-3xl group/param transition-all hover:bg-slate-800/60">
                                                    <label className="block text-[9px] font-black text-slate-600 uppercase mb-3 px-1 tracking-widest group-hover/param:text-orange-400 transition-colors">Atrás do Envio</label>
                                                    <div className="flex items-center gap-3 bg-black/40 p-2.5 rounded-2xl border border-white/5 shadow-inner">
                                                        <input
                                                            type="number"
                                                            className="flex-1 bg-transparent outline-none font-black text-xl text-white tabular-nums w-12"
                                                            value={privateMessageDelay}
                                                            onChange={(e) => setPrivateMessageDelay(parseInt(e.target.value))}
                                                        />
                                                        <select
                                                            className="bg-slate-700 text-[10px] font-black text-slate-200 outline-none px-3 py-1.5 rounded-xl border border-white/10"
                                                            value={privateMessageDelayUnit}
                                                            onChange={(e) => setPrivateMessageDelayUnit(e.target.value)}
                                                        >
                                                            <option value="seconds">SEG</option>
                                                            <option value="minutes">MIN</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="p-5 bg-slate-800/40 border border-white/5 rounded-3xl group/param transition-all hover:bg-slate-800/60">
                                                    <label className="block text-[9px] font-black text-slate-600 uppercase mb-3 px-1 tracking-widest group-hover/param:text-orange-400 transition-colors">Concorrência</label>
                                                    <div className="bg-black/40 p-2.5 rounded-2xl border border-white/5 shadow-inner flex items-center">
                                                        <input
                                                            type="number"
                                                            className="w-full bg-transparent outline-none font-black text-xl text-white tabular-nums"
                                                            value={privateMessageConcurrency}
                                                            onChange={(e) => setPrivateMessageConcurrency(parseInt(e.target.value))}
                                                        />
                                                        <span className="text-[10px] font-black text-slate-700 uppercase">Jobs</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {sendPrivateMessage && isABTesting && (
                                        <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl text-[11px] text-orange-200 font-medium">
                                            ⚠️ Configuração individual por variação
                                        </div>
                                    )}
                                </div>
                            </section>

                            <div className="flex flex-col justify-end h-full">
                                <button
                                    onClick={() => {
                                        setStep(2);
                                        document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    disabled={isABTesting ? variations.some(v => !v.template) : !selectedTemplate}
                                    className="w-full py-6 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white rounded-[2rem] font-black text-xl transition-all shadow-2xl shadow-green-900/30 active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed group/btn overflow-hidden relative"
                                >
                                    <span className="relative z-10 flex items-center justify-center gap-3">
                                        PRÓXIMO: DESTINATÁRIOS
                                        <svg className="w-6 h-6 group-hover/btn:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                                    </span>
                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300 rounded-[2rem]"></div>
                                </button>
                            </div>
                        </div>
                </div>
            )}

            {/* Step 2: Recipient Selection & Execution */}
            {step === 2 && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in slide-in-from-right-8 fade-in duration-700">
                    {/* Left: Recipient Selector */}
                    <div className="lg:col-span-12 xl:col-span-8 space-y-6">
                        <section className="bg-slate-900/60 backdrop-blur-md rounded-[2.5rem] p-8 shadow-2xl border border-white/5 relative overflow-hidden">
                            <div className="flex items-center justify-between mb-10 relative z-10 px-2">
                                <h2 className="text-2xl font-black text-white flex items-center gap-4">
                                    <span className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl border border-purple-500/20 shadow-xl shadow-purple-500/10">03</span>
                                    Filtros & Destinatários
                                </h2>
                                <button onClick={() => setStep(1)} className="group flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-all bg-white/5 hover:bg-white/10 px-5 py-2.5 rounded-2xl border border-white/5">
                                    <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M15 19l-7-7 7-7" /></svg>
                                    Voltar
                                </button>
                            </div>

                            <div className="space-y-10">
                                <div className="relative z-10 glass-recipient-container">
                                    <RecipientSelector
                                        onSelect={(contacts, meta) => {
                                            setFinalContacts(contacts);
                                            setSelectionMetadata(meta);
                                        }}
                                        selectedInbox={activeClient?.wa_business_account_id}
                                        title="Configuração de Público"
                                        exclusionList={exclusionList}
                                        templateVariables={templateVariables}
                                    />
                                </div>

                                <div className="relative z-10 pt-10 border-t border-white/5 animate-in fade-in duration-700 delay-150">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 px-2 gap-4">
                                        <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                            <span className="p-3 bg-red-500/10 text-red-400 rounded-2xl border border-red-500/20 shadow-xl shadow-red-500/10">
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                            </span>
                                            Filtro de Exclusão
                                        </h3>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-3 text-xs font-black text-slate-400 uppercase tracking-widest bg-black/40 px-5 py-2.5 rounded-2xl border border-white/5 shadow-inner">
                                                Ignorando: <span className="text-red-400 text-sm">{exclusionList.length}</span>
                                            </div>
                                            {exclusionList.length > 0 && (
                                                <button
                                                    onClick={() => setExclusionList([])}
                                                    className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 hover:bg-red-500 text-white rounded-2xl border border-red-500/20 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-red-900/10 group"
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="group-hover:rotate-12 transition-transform"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    Limpar Tudo
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-slate-900/60 backdrop-blur-md rounded-[3rem] p-8 border border-white/5 space-y-8 shadow-2xl">
                                        {!exclusionColSelector ? (
                                            <div className="space-y-6">
                                                <div className="flex items-center gap-3 bg-slate-800/50 p-1.5 rounded-2xl border border-white/10 shadow-inner">
                                                    <button
                                                        onClick={() => setExclusionMode('manual')}
                                                        className={`flex-1 py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-300 ${exclusionMode === 'manual' ? 'bg-white/10 text-white shadow-lg ring-1 ring-white/10' : 'text-slate-500 hover:text-slate-300'}`}
                                                    >
                                                        Entrada Manual
                                                    </button>
                                                    <button
                                                        onClick={() => setExclusionMode('upload')}
                                                        className={`flex-1 py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-300 ${exclusionMode === 'upload' ? 'bg-white/10 text-white shadow-lg ring-1 ring-white/10' : 'text-slate-500 hover:text-slate-300'}`}
                                                    >
                                                        Upload Planilha
                                                    </button>
                                                    <button
                                                        onClick={() => setExclusionMode('tag')}
                                                        className={`flex-1 py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-300 ${exclusionMode === 'tag' ? 'bg-white/10 text-white shadow-lg ring-1 ring-white/10' : 'text-slate-500 hover:text-slate-300'}`}
                                                    >
                                                        Etiquetas
                                                    </button>
                                                </div>

                                                {exclusionMode === 'manual' ? (
                                                    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                                                        <div className="relative group/field">
                                                            <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-3xl blur opacity-0 group-hover/field:opacity-100 transition duration-500"></div>
                                                            <textarea
                                                                className="relative w-full bg-black/40 border border-white/10 rounded-3xl p-8 text-white text-sm outline-none focus:border-red-500/50 transition-all font-mono min-h-[160px] shadow-inner placeholder:text-slate-800"
                                                                placeholder="Insira um número por linha (ex: 5511999999999)..."
                                                                value={exclusionText}
                                                                onChange={(e) => setExclusionText(e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="flex gap-4">
                                                            <button
                                                                onClick={handleSaveExclusion}
                                                                disabled={!exclusionText.trim()}
                                                                className="flex-1 py-5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black text-xs uppercase tracking-[0.26em] border border-white/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98] shadow-xl"
                                                            >
                                                                ATUALIZAR LISTA
                                                            </button>
                                                            {exclusionText.trim().length > 0 && (
                                                                <button
                                                                    onClick={add55ToExclusionText}
                                                                    className="px-8 bg-slate-800/80 hover:bg-slate-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest border border-white/5 transition-all shadow-md hover:shadow-lg active:scale-95 animate-in zoom-in duration-300"
                                                                    title="Adicionar 55 aos números abaixo"
                                                                >
                                                                    +55
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : exclusionMode === 'upload' ? (
                                                    <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                                                        <div className="relative h-56 flex flex-col items-center justify-center border-2 border-dashed border-slate-700/50 rounded-[2.5rem] p-8 hover:border-red-500/30 transition-all group cursor-pointer bg-slate-900/40 hover:bg-slate-800/40 overflow-hidden">
                                                            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                            <input
                                                                type="file"
                                                                accept=".csv,.xlsx,.xls"
                                                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                                onChange={handleExclusionFileUpload}
                                                            />
                                                            <div className="w-20 h-20 bg-slate-800/80 rounded-[2rem] flex items-center justify-center mb-6 group-hover:scale-110 group-hover:text-red-400 transition-all shadow-2xl border border-white/5">
                                                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
                                                            </div>
                                                            <h4 className="font-bold text-white text-lg">Carregar CSV ou Excel</h4>
                                                            <p className="text-slate-500 text-[10px] mt-2 font-black uppercase tracking-[0.3em]">Clique ou arraste o arquivo</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                                                        <div className="p-8 bg-slate-800/10 border border-white/5 rounded-3xl space-y-6">
                                                            <div className="flex flex-col gap-2">
                                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 text-center">Selecione a Etiqueta para Excluir</label>
                                                                <div className="relative group/tag-select-exclusion">
                                                                    <select
                                                                        className="w-full p-4 pl-5 bg-black/60 border border-white/10 rounded-2xl focus:border-red-500/50 outline-none transition-all text-white font-bold"
                                                                        value={selectedExclusionTag}
                                                                        onChange={(e) => setSelectedExclusionTag(e.target.value)}
                                                                        disabled={isLoadingExclusionTags}
                                                                    >
                                                                        <option value="">{isLoadingExclusionTags ? 'Carregando etiquetas...' : '-- Escolha uma etiqueta --'}</option>
                                                                        {exclusionAvailableTags.map(tag => (
                                                                            <option key={tag} value={tag} className="bg-slate-900">{tag}</option>
                                                                        ))}
                                                                    </select>
                                                                    {isLoadingExclusionTags && (
                                                                        <div className="absolute right-12 top-1/2 -translate-y-1/2">
                                                                            <div className="w-4 h-4 border-2 border-red-500/20 border-t-red-500 rounded-full animate-spin"></div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            
                                                            <button
                                                                onClick={loadExclusionContactsByTag}
                                                                disabled={!selectedExclusionTag || isWorking}
                                                                className="w-full py-5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl active:scale-[0.98] border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                                                            >
                                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                                                Adicionar Etiquetas à Exclusão
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {exclusionList.length > 0 && (
                                                    <div className="pt-8 space-y-4 border-t border-white/5">
                                                        <div className="flex items-center justify-between px-2">
                                                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Base de Exclusão</h4>
                                                            <button
                                                                onClick={add55ToLoadedExclusionList}
                                                                className="flex items-center gap-2 px-4 py-2 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/10 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                                                            >
                                                                <span>PADRONIZAR +55</span>
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14" /></svg>
                                                            </button>
                                                        </div>
                                                        <div className="flex flex-wrap gap-3 max-h-56 overflow-y-auto premium-scrollbar p-2 bg-black/20 rounded-3xl border border-white/5">
                                                            {exclusionList.map(num => (
                                                                <div key={num} className="group flex items-center gap-3 pl-4 pr-2 py-2 bg-slate-800/40 rounded-xl text-xs font-mono text-slate-400 border border-white/5 hover:border-red-500/30 hover:text-red-400 transition-all shadow-sm">
                                                                    <span className="tracking-widest">{num}</span>
                                                                    <button onClick={() => setExclusionList(prev => prev.filter(n => n !== num))} className="p-1 px-2 hover:bg-red-500/10 rounded-lg text-slate-600 hover:text-red-500 font-black transition-colors">
                                                                        ×
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="space-y-8 animate-in slide-in-from-right-8 duration-500 p-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="space-y-1">
                                                        <h4 className="text-xl font-bold text-white">Mapeamento de Importação</h4>
                                                        <p className="text-xs text-slate-500 font-medium">Selecione a coluna que contém os números de telefone.</p>
                                                    </div>
                                                    <button onClick={() => setExclusionColSelector(false)} className="px-4 py-2 bg-slate-800 text-slate-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Cancelar</button>
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                                    {exclusionCsvData?.headers.map((h, idx) => (
                                                        <button
                                                            key={idx}
                                                            onClick={() => setExclusionSelectedCol(idx)}
                                                            className={`p-6 rounded-3xl border-2 text-left transition-all relative overflow-hidden group/col ${exclusionSelectedCol === idx ? 'bg-red-500/10 border-red-500 text-white shadow-xl shadow-red-500/10' : 'bg-slate-800/40 border-slate-700/50 text-slate-500 hover:border-slate-500'}`}
                                                        >
                                                            <div className={`text-[9px] font-black uppercase mb-2 tracking-widest ${exclusionSelectedCol === idx ? 'text-red-400' : 'text-slate-600'}`}>Coluna {idx + 1}</div>
                                                            <div className="font-bold text-sm truncate">{h || `Sem Nome`}</div>
                                                            {exclusionSelectedCol === idx && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>}
                                                        </button>
                                                    ))}
                                                </div>
                                                <button
                                                    onClick={confirmExclusionColumn}
                                                    disabled={exclusionSelectedCol === null}
                                                    className="w-full py-6 bg-red-600 hover:bg-red-500 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.3em] shadow-2xl shadow-red-900/30 transition-all disabled:opacity-20 active:scale-[0.98]"
                                                >
                                                    Confirmar Importação de Exclusão
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Right: Execution Control */}
                    <div className="lg:col-span-12 xl:col-span-4 space-y-8">
                        <div className="bg-slate-900/90 backdrop-blur-3xl rounded-[3.5rem] p-10 shadow-3xl border border-white/10 space-y-12 sticky top-8 overflow-hidden group/exec">
                            {/* Animated Background Gradient */}
                            <div className="absolute -top-24 -right-24 w-64 h-64 bg-green-500/5 blur-[100px] rounded-full pointer-events-none"></div>
                            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/5 blur-[100px] rounded-full pointer-events-none"></div>

                            <div className="space-y-2 relative px-2">
                                <h2 className="text-3xl font-black text-white tracking-tighter">Resumo de Envio</h2>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Confirmação final do disparo</p>
                            </div>

                            <div className="space-y-10 relative z-10">
                                <div className="space-y-6 px-2">
                                    <div className="flex items-center justify-between p-8 bg-slate-800/40 rounded-[2.5rem] border border-white/5 shadow-inner group/info relative overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover/info:opacity-100 transition-opacity"></div>
                                        <div className="flex flex-col gap-2 relative z-10">
                                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Destinatários Ativos</div>
                                            <button
                                                onClick={handleCopyFinalList}
                                                className="flex items-center gap-2 text-[9px] font-black text-blue-400 hover:text-white transition-all uppercase tracking-widest bg-blue-500/10 px-3 py-1.5 rounded-xl border border-blue-500/10 hover:bg-blue-500 shadow-md"
                                            >
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></svg>
                                                Copiar Lista
                                            </button>
                                        </div>
                                        <div className="text-5xl font-black text-white group-hover/info:text-blue-400 transition-all tabular-nums tracking-tighter relative z-10">
                                            {finalContacts.length}
                                        </div>
                                    </div>
                                    <div className="px-2">
                                        <div className={`p-6 rounded-[2.5rem] border-2 transition-all shadow-lg group/recurrence ${isRecurring ? 'bg-blue-500/5 border-blue-500/30' : 'bg-slate-800/40 border-white/5 hover:border-white/10'}`}>
                                            <div className="flex items-center justify-between mb-6">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] group-hover/recurrence:text-slate-200 transition-colors flex items-center gap-2">
                                                    <div className={`p-1.5 rounded-lg transition-all ${isRecurring ? 'bg-blue-500 text-white shadow-lg' : 'bg-slate-700 text-slate-500'}`}>
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M17 2.1l4 4-4 4M3 12.2v-2a4 4 0 0 1 4-4h12.8M7 21.9l-4-4 4-4M21 11.8v2a4 4 0 0 1-4 4H4.2" /></svg>
                                                    </div>
                                                    Disparo Recorrente
                                                </label>
                                                 <div 
                                                    onClick={() => {
                                                        const newVal = !isRecurring;
                                                        setIsRecurring(newVal);
                                                        if (newVal) setScheduledTime('');
                                                    }}
                                                    className={`w-14 h-7 rounded-full relative cursor-pointer transition-all duration-500 ${isRecurring ? 'bg-blue-600 shadow-lg shadow-blue-900/40' : 'bg-slate-800 border border-white/5'}`}
                                                >
                                                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all duration-500 shadow-md ${isRecurring ? 'left-8' : 'left-1'}`}></div>
                                                </div>
                                            </div>

                                            {isRecurring && (
                                                <div className="space-y-6 animate-in slide-in-from-top-4 fade-in duration-500">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <button 
                                                            onClick={() => setRecurrenceFrequency('weekly')}
                                                            className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${recurrenceFrequency === 'weekly' ? 'bg-blue-500 border-blue-400 text-white shadow-lg' : 'bg-black/20 border-white/5 text-slate-500 hover:text-slate-300'}`}
                                                        >
                                                            Semanal
                                                        </button>
                                                        <button 
                                                            onClick={() => setRecurrenceFrequency('monthly')}
                                                            className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${recurrenceFrequency === 'monthly' ? 'bg-blue-500 border-blue-400 text-white shadow-lg' : 'bg-black/20 border-white/5 text-slate-500 hover:text-slate-300'}`}
                                                        >
                                                            Mensal
                                                        </button>
                                                    </div>

                                                    {recurrenceFrequency === 'weekly' ? (
                                                        <div className="space-y-4">
                                                            <div className="flex flex-wrap gap-2 justify-center">
                                                                {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((day, idx) => {
                                                                    const isSelected = recurrenceDaysOfWeek.some(d => d.day === idx);
                                                                    return (
                                                                        <button
                                                                            key={idx}
                                                                            type="button"
                                                                            onClick={() => {
                                                                                if (isSelected) {
                                                                                    setRecurrenceDaysOfWeek(prev => prev.filter(d => d.day !== idx));
                                                                                } else {
                                                                                    setRecurrenceDaysOfWeek(prev => [...prev, { day: idx, time: recurrenceTime }].sort((a, b) => a.day - b.day));
                                                                                }
                                                                            }}
                                                                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs transition-all ${isSelected ? 'bg-blue-500 text-white shadow-md border-blue-400/30' : 'bg-black/40 text-slate-600 hover:bg-black/60 border border-white/5'}`}
                                                                            title={['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'][idx]}
                                                                        >
                                                                            {day}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col gap-4">
                                                            <div className="space-y-2">
                                                                <div className="flex items-center justify-between px-1">
                                                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Dias do Mês</label>
                                                                    <span className="text-[8px] text-slate-500 font-bold uppercase italic">Ex: 1, 15, 30</span>
                                                                </div>
                                                                <input
                                                                    type="text"
                                                                    placeholder="1, 15, 30"
                                                                    value={recurrenceDayOfMonth}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        setRecurrenceDayOfMonth(val);
                                                                        const dayNumbers = val.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d) && d >= 1 && d <= 31);
                                                                        const newDays = dayNumbers.map(d => {
                                                                            const existing = recurrenceDaysOfWeek.find(ed => ed.day === d);
                                                                            return existing || { day: d, time: recurrenceTime };
                                                                        });
                                                                        setRecurrenceDaysOfWeek(newDays);
                                                                    }}
                                                                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-blue-500/50 shadow-inner"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}

                                                    {recurrenceDaysOfWeek.length > 0 && (
                                                        <div className="space-y-3 pt-4 border-t border-white/10">
                                                            <label className="text-[9px] font-black text-slate-500 uppercase px-1 tracking-widest text-center block">Horários por Dia</label>
                                                            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto premium-scrollbar pr-1">
                                                                {recurrenceDaysOfWeek.map((dayConfig, i) => (
                                                                    <div key={i} className="flex items-center justify-between bg-black/40 p-3 rounded-2xl border border-white/5 shadow-sm">
                                                                        <span className="text-[10px] font-black text-slate-300 uppercase">
                                                                            {recurrenceFrequency === 'weekly' 
                                                                                ? ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'][dayConfig.day]
                                                                                : `Dia ${dayConfig.day}`
                                                                            }
                                                                        </span>
                                                                        <input 
                                                                            type="time" 
                                                                            value={dayConfig.time}
                                                                            onChange={(e) => {
                                                                                const newDays = [...recurrenceDaysOfWeek];
                                                                                newDays[i].time = e.target.value;
                                                                                setRecurrenceDaysOfWeek(newDays);
                                                                            }}
                                                                            className="bg-slate-800 text-white font-bold text-xs p-2 rounded-xl outline-none focus:ring-1 ring-blue-500/50"
                                                                        />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                                                        <label className="text-[9px] font-black text-slate-600 uppercase px-1">{recurrenceFrequency === 'weekly' ? 'Horário Padrão (Fallback)' : 'Horário de Disparo (Todos os Dias)'}</label>
                                                        <input
                                                            type="time"
                                                            value={recurrenceTime}
                                                            onChange={(e) => setRecurrenceTime(e.target.value)}
                                                            className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-blue-500/50"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="p-6 bg-slate-800/40 border border-white/5 rounded-[2.5rem] group/input focus-within:border-emerald-500/50 transition-all shadow-lg">
                                            <label className="block text-[9px] font-black text-slate-500 uppercase mb-3 tracking-[0.2em] group-hover/input:text-slate-300 transition-colors">Delay (Frequência)</label>
                                            <div className="flex items-center gap-3 bg-black/40 p-3 rounded-2xl border border-white/5 shadow-inner">
                                                <input
                                                    type="number"
                                                    className="flex-1 bg-transparent outline-none font-black text-2xl text-white tabular-nums w-12"
                                                    value={delaySeconds}
                                                    onChange={(e) => setDelaySeconds(parseInt(e.target.value))}
                                                />
                                                <select
                                                    className="bg-slate-700 text-[10px] font-black text-slate-200 outline-none px-3 py-2 rounded-xl border border-white/10 shadow-lg"
                                                    value={delayUnit}
                                                    onChange={(e) => setDelayUnit(e.target.value)}
                                                >
                                                    <option value="seconds">SEG</option>
                                                    <option value="minutes">MIN</option>
                                                    <option value="hours">HR</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="p-6 bg-slate-800/40 border border-white/5 rounded-[2.5rem] group/input focus-within:border-emerald-500/50 transition-all shadow-lg">
                                            <label className="block text-[9px] font-black text-slate-500 uppercase mb-3 tracking-[0.2em] group-hover/input:text-slate-300 transition-colors">Paralelismo</label>
                                            <div className="bg-black/40 p-3 rounded-2xl border border-white/5 shadow-inner flex items-center">
                                                <input
                                                    type="number"
                                                    className="w-full bg-transparent outline-none font-black text-2xl text-white tabular-nums"
                                                    value={concurrency}
                                                    onChange={(e) => setConcurrency(parseInt(e.target.value))}
                                                />
                                                <div className="text-[10px] font-black text-slate-600 uppercase">Jobs</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                 {!isRecurring && (
                                    <div className="px-2">
                                        <div className="p-6 bg-slate-800/40 border border-white/5 rounded-[2.5rem] group/input focus-within:border-emerald-500/50 transition-all shadow-lg">
                                            <label className="block text-[9px] font-black text-slate-400 uppercase mb-4 tracking-[0.2em] group-hover/input:text-slate-200 transition-colors flex items-center gap-2">
                                                <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2v20M2 12h20M12 2a10 10 0 0 1 10 10 10 10 0 0 1-10 10 10 10 0 0 1-10-10 10 10 0 0 1 10-10z" /></svg>
                                                </div>
                                                Agendamento para o Futuro
                                            </label>
                                            <div className="bg-black/40 p-4 rounded-2xl border border-white/5 shadow-inner">
                                                <input
                                                    type="datetime-local"
                                                    className="w-full bg-transparent outline-none font-bold text-lg text-white placeholder:text-slate-800 cursor-pointer"
                                                    value={scheduledTime}
                                                    onChange={(e) => setScheduledTime(e.target.value)}
                                                    min={new Date().toISOString().slice(0, 16)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="p-2 bg-slate-800/60 rounded-[3rem] border border-white/10 shadow-3xl">
                                    <div className="bg-gradient-to-br from-green-600 to-emerald-800 p-10 rounded-[2.5rem] text-white shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative overflow-hidden group/send">
                                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                                        {/* Shine effect */}
                                        <div className="absolute top-0 -left-64 w-64 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-35deg] group-hover/send:left-[150%] transition-all duration-[1200ms] pointer-events-none"></div>

                                        <div className="flex flex-col gap-1 mb-8 relative z-10">
                                            <span className="text-green-100/60 text-[10px] font-black uppercase tracking-[0.3em]">Investimento Previsto</span>
                                            <span className="text-4xl font-black tabular-nums tracking-tighter">
                                                R$ {isABTesting
                                                    ? variations.reduce((acc, v) => acc + (finalContacts.length * (v.weight / 100) * v.cost), 0).toFixed(2)
                                                    : (finalContacts.length * costPerUnit).toFixed(2)
                                                }
                                            </span>
                                        </div>
                                        <button
                                            onClick={handleSend}
                                            disabled={isSending || finalContacts.length === 0 || (!selectedTemplate && !isABTesting)}
                                            className="w-full py-6 bg-white text-emerald-900 rounded-3xl font-black text-xl hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-20 disabled:cursor-not-allowed uppercase tracking-widest relative z-10"
                                        >
                                            {isRecurring 
                                                ? (isSending ? 'CRIANDO...' : 'INICIAR RECORRÊNCIA')
                                                : scheduledTime 
                                                    ? (isSending ? 'AGENDANDO...' : 'CONFIRMAR AGENDAMENTO') 
                                                    : (isSending ? 'INICIANDO...' : 'INICIAR DISPARO')}
                                        </button>
                                    </div>
                                </div>

                                <div className="text-[10px] text-slate-600 text-center font-bold px-10 leading-relaxed uppercase tracking-widest opacity-60">
                                    "Respeitando intervalos de segurança para proteção contra bloqueios."
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )
            }

            {/* Expansion Modal */}
            <ExpandTextModal
                isOpen={expansion.isOpen}
                onClose={() => setExpansion({ ...expansion, isOpen: false })}
                title={expansion.title}
                value={expansion.value}
                fieldKey={expansion.key}
                onSave={saveExpansion}
            />

            {
                isWorking && createPortal(
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
                                <p className="text-sm text-slate-400 font-medium">{workingMessage || 'Aguarde um instante...'}</p>
                            </div>
                        </div>
                    </div>,
                    document.body
                )
            }

            {/* ========= MODAL GUIA DISPARO EM MASSA ========= */}
            {isBulkGuideOpen && createPortal(
                <div
                    className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
                    onClick={(e) => { if (e.target === e.currentTarget) setIsBulkGuideOpen(false); }}
                >
                    <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden"
                        style={{ background: 'linear-gradient(160deg, #0a1628 0%, #0f1f14 100%)', border: '1px solid rgba(52,211,153,0.2)' }}>

                        {/* Header */}
                        <div className="flex items-center justify-between px-8 py-6 border-b border-white/5"
                            style={{ background: 'linear-gradient(90deg, rgba(52,211,153,0.12) 0%, transparent 100%)' }}>
                            <div className="flex items-center gap-4">
                                <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl"
                                    style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.35)' }}>
                                    🚀
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">Guia do Disparo em Massa</h2>
                                    <p className="text-sm text-slate-400">Entenda cada etapa e como enviar mensagens com inteligência.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsBulkGuideOpen(false)}
                                className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-white transition-all hover:scale-110"
                                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
                            </button>
                        </div>

                        {/* Conteúdo */}
                        <div className="overflow-y-auto flex-1 px-8 py-6 space-y-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e3a2f transparent' }}>

                            {/* Card 1 — Visão Geral */}
                            <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #34d399' }}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">📡</span>
                                    <h3 className="font-bold text-white text-sm">O que é o Disparo em Massa?</h3>
                                </div>
                                <p className="text-slate-300 text-sm leading-relaxed">Permite enviar um <b className="text-white">template aprovado pela Meta</b> para centenas ou milhares de contatos de uma vez. Cada envio é individualizado e pode conter variáveis personalizadas por contato.</p>
                                <p className="text-emerald-400 text-xs mt-2 italic">💡 Use junto com Funis e Agendamentos para criar sequências automáticas de relacionamento.</p>
                            </div>

                            {/* Card 2 — Passo 1: Configuração */}
                            <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #6366f1' }}>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="w-6 h-6 rounded-full bg-indigo-500 text-white text-xs font-black flex items-center justify-center shrink-0">1</span>
                                    <h3 className="font-bold text-white text-sm">Etapa 1 — Configuração de Template</h3>
                                </div>
                                <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.1)' }}>
                                    <p className="text-slate-300 text-xs leading-relaxed">Um único template enviado para toda a lista. Você preenche as variáveis (ex: nome, data) com valores fixos ou por contato.</p>
                                </div>
                            </div>

                            {/* Card 3 — Variáveis */}
                            <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #a78bfa' }}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">🔡</span>
                                    <h3 className="font-bold text-white text-sm">Variáveis do Template</h3>
                                </div>
                                <p className="text-slate-300 text-sm leading-relaxed mb-3">Campos <b className="text-white">{'{{1}}'}, {'{{2}}'}</b> etc. aparecem ao selecionar o template. Preencha-os com o valor fixo desejado ou deixe em branco para ser preenchido por coluna do CSV.</p>
                                <div className="rounded-xl p-3 font-mono text-xs text-purple-300 leading-relaxed" style={{ background: 'rgba(0,0,0,0.3)' }}>
                                    {'{{1}}'} = Nome do cliente → "Maria"<br/>
                                    {'{{2}}'} = Data → "15/03/2026"
                                </div>
                                <p className="text-purple-400 text-xs mt-2 italic">💡 Use o botão ⛶ para expandir o campo e editar textos longos com conforto.</p>
                            </div>

                            {/* Card 4 — Mensagem Direta */}
                            <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #f59e0b' }}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">💬</span>
                                    <h3 className="font-bold text-white text-sm">Mensagem Direta Pós-Envio</h3>
                                </div>
                                <p className="text-slate-300 text-sm leading-relaxed">Mensagem de texto livre enviada <b className="text-white">imediatamente após</b> o template, quando a janela de 24h já estiver aberta. Ideal para complementar o template com um texto mais pessoal.</p>
                                <p className="text-amber-400 text-xs mt-2 italic">💡 Suporta botões de resposta rápida para qualificar o lead logo após o disparo.</p>
                            </div>

                            {/* Card 5 — Mensagem Privada */}
                            <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #10b981' }}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">⏱️</span>
                                    <h3 className="font-bold text-white text-sm">Mensagem Privada com Delay</h3>
                                </div>
                                <p className="text-slate-300 text-sm leading-relaxed">Segunda mensagem enviada com um <b className="text-white">atraso configurável</b> (ex: 30 min, 2h). Enviada apenas internamente no Chatwoot como nota, ou também para o contato.</p>
                                <div className="mt-3 space-y-1.5">
                                    <p className="text-slate-400 text-xs"><span className="text-emerald-400 font-bold">Delay:</span> tempo de espera antes do envio da 2ª mensagem.</p>
                                    <p className="text-slate-400 text-xs"><span className="text-emerald-400 font-bold">Concorrência:</span> quantas mensagens privadas são enviadas simultaneamente.</p>
                                </div>
                            </div>

                            {/* Card 6 — Passo 2: Contatos */}
                            <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #3b82f6' }}>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-black flex items-center justify-center shrink-0">2</span>
                                    <h3 className="font-bold text-white text-sm">Etapa 2 — Contatos e Envio</h3>
                                </div>
                                <div className="space-y-2">
                                    {[
                                        { label: 'Lista Manual', desc: 'Cole números diretamente ou importe um CSV/Excel com coluna de telefone.' },
                                        { label: 'Lista de Exclusão', desc: 'Números nesta lista serão pulados. Ideal para quem já recebeu ou pediu para sair.' },
                                        { label: 'Delay entre envios', desc: 'Intervalo em segundos entre cada mensagem. Valores menores são mais rápidos mas aumentam o risco de bloqueio.' },
                                        { label: 'Concorrência', desc: 'Quantas mensagens são enviadas em paralelo. Recomendado: 1-3 para contas novas.' },
                                    ].map(item => (
                                        <div key={item.label} className="flex items-start gap-3 p-2.5 rounded-xl" style={{ background: 'rgba(59,130,246,0.08)' }}>
                                            <span className="text-blue-300 font-bold text-xs shrink-0 mt-0.5 w-28">{item.label}</span>
                                            <p className="text-slate-400 text-xs leading-relaxed">{item.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Card 7 — Agendamento */}
                            <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #ec4899' }}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">📅</span>
                                    <h3 className="font-bold text-white text-sm">Agendamento</h3>
                                </div>
                                <p className="text-slate-300 text-sm leading-relaxed">Programe o disparo para uma <b className="text-white">data e hora futura</b>. O sistema enfileira o disparo e executa automaticamente, mesmo que você feche o navegador.</p>
                                <p className="text-pink-400 text-xs mt-2 italic">💡 Combine com a seção "Agenda de Disparos" para visualizar e gerenciar todos os envios programados.</p>
                            </div>

                            {/* Card 8 — Custos */}
                            <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #f97316' }}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">💰</span>
                                    <h3 className="font-bold text-white text-sm">Estimativa de Custo (Meta)</h3>
                                </div>
                                <p className="text-slate-300 text-sm leading-relaxed mb-3">Cada template enviado tem um custo cobrado pela Meta. Os valores estimados são:</p>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { cat: 'Marketing', price: 'R$ 0,35', color: 'text-indigo-300' },
                                        { cat: 'Utilidade', price: 'R$ 0,07', color: 'text-emerald-300' },
                                        { cat: 'Autenticação', price: 'R$ 0,05', color: 'text-blue-300' },
                                    ].map(item => (
                                        <div key={item.cat} className="text-center p-2.5 rounded-xl" style={{ background: 'rgba(0,0,0,0.25)' }}>
                                            <p className={`font-black text-sm ${item.color}`}>{item.price}</p>
                                            <p className="text-slate-500 text-[10px] mt-0.5">{item.cat}</p>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-orange-400 text-xs mt-3 italic">⚠️ Valores podem variar conforme tabela oficial da Meta para o Brasil.</p>
                            </div>

                        </div>

                        {/* Footer */}
                        <div className="px-8 py-5 border-t border-white/5 flex justify-end" style={{ background: 'rgba(0,0,0,0.2)' }}>
                            <button
                                onClick={() => setIsBulkGuideOpen(false)}
                                className="px-8 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 active:scale-95"
                                style={{ background: 'linear-gradient(135deg, #10b981, #34d399)', boxShadow: '0 4px 20px rgba(16,185,129,0.35)' }}
                            >
                                Entendido!
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

        </div >
    );
}
