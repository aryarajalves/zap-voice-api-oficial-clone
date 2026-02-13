
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

export default function TemplateBulkSender({ onViewChange }) {
    const { activeClient } = useClient();
    const [step, setStep] = useState(1); // 1: Config, 2: Contacts & Send
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [templateParams, setTemplateParams] = useState({});
    const [templateCategory, setTemplateCategory] = useState('OTHERS');

    // A/B Testing
    const [isABTesting, setIsABTesting] = useState(false);
    const [variations, setVariations] = useState([
        { id: 'v1', template: '', params: {}, weight: 50, cost: 0.0, category: 'OTHERS', direct_message: '', private_message: '', private_message_delay: 5, private_message_concurrency: 1 }
    ]);

    // Exclusion List
    const [exclusionList, setExclusionList] = useState([]);
    const [exclusionText, setExclusionText] = useState('');
    const [exclusionMode, setExclusionMode] = useState('manual'); // 'manual' | 'upload'
    const [exclusionCsvData, setExclusionCsvData] = useState(null);
    const [exclusionColSelector, setExclusionColSelector] = useState(false);
    const [exclusionSelectedCol, setExclusionSelectedCol] = useState(null);

    // Automation / Smart Logic
    const [directMessageText, setDirectMessageText] = useState('');
    const [directMessageButtons, setDirectMessageButtons] = useState([]);
    const [sendPrivateMessage, setSendPrivateMessage] = useState(false);
    const [privateMessageText, setPrivateMessageText] = useState('');
    const [privateMessageDelay, setPrivateMessageDelay] = useState(5);
    const [privateMessageConcurrency, setPrivateMessageConcurrency] = useState(1);

    // Contacts & Execution
    const [finalContacts, setFinalContacts] = useState([]);
    const [isSending, setIsSending] = useState(false);
    const [currentTriggerId, setCurrentTriggerId] = useState(null);
    const [progress, setProgress] = useState(null);
    const [delaySeconds, setDelaySeconds] = useState(5);
    const [delayUnit, setDelayUnit] = useState('seconds');
    const [concurrency, setConcurrency] = useState(1);
    const [costPerUnit, setCostPerUnit] = useState(0.0);
    const [scheduledTime, setScheduledTime] = useState('');

    // Private Message Delay Unit
    const [privateMessageDelayUnit, setPrivateMessageDelayUnit] = useState('seconds');

    // Modal State
    const [expansion, setExpansion] = useState({ isOpen: false, title: '', key: '', value: '' });
    const [isWorking, setIsWorking] = useState(false);
    const [workingMessage, setWorkingMessage] = useState('');

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

    // WebSocket for Progress removed per user request - Monitoring via History tab
    useEffect(() => {
        setIsSending(false);
    }, [activeClient]);

    useEffect(() => {
        const loadTemplates = async () => {
            try {
                const res = await fetchWithAuth(`${API_URL}/whatsapp/templates`, {}, activeClient?.id);
                if (res.ok) {
                    const data = await res.json();
                    setTemplates(data || []);
                }
            } catch (err) {
                console.error('Failed to load templates', err);
            }
        };
        loadTemplates();
    }, [activeClient]);

    const handleTemplateChange = (e) => {
        const val = e.target.value;
        setSelectedTemplate(val);
        const info = getTemplateCategoryInfo(val);
        setCostPerUnit(info.price);
        setTemplateCategory(info.key);

        const t = templates.find(x => x.name === val);
        if (t) {
            const initialParams = {};
            t.components?.forEach(c => {
                c.variables?.forEach((v, idx) => {
                    initialParams[`${c.type}_${idx}`] = '';
                });
            });
            setTemplateParams(initialParams);
        }
    };

    const handleAddVariation = () => {
        const newId = `v${variations.length + 1}`;
        setVariations([...variations, { id: newId, template: '', params: {}, weight: 50, cost: 0.0, category: 'OTHERS', direct_message: '', private_message: '', private_message_delay: 5, private_message_concurrency: 1 }]);
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
                        c.variables?.forEach((vars, idx) => {
                            updated.params[`${c.type}_${idx}`] = '';
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
        if (key === 'directMessageText') setDirectMessageText(val);
        else if (key === 'privateMessageText') setPrivateMessageText(val);
        else if (key.startsWith('param_')) {
            const paramKey = key.replace('param_', '');
            setTemplateParams(prev => ({ ...prev, [paramKey]: val }));
        } else if (key.startsWith('ab_dm_')) {
            const varId = key.replace('ab_dm_', '');
            handleUpdateVariation(varId, 'direct_message', val);
        } else if (key.startsWith('ab_pm_')) {
            const varId = key.replace('ab_pm_', '');
            handleUpdateVariation(varId, 'private_message', val);
        }
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
            // Se o componente não tem variáveis identificadas no frontend,
            // verificamos se o usuário preencheu algo nos params para ele.
            // A lógica de parse de variáveis {{1}} deve ter populado c.variables anteriormente.
            // Se não tiver c.variables, assumimos que não precisa enviar (texto fixo).

            // Exceção: Header de Mídia sempre precisa enviar se for imagem/video escolhido
            const isMediaHeader = c.type === 'HEADER' && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(c.format);

            // Botões são tratados de forma especial pela Meta
            if (c.type === 'BUTTONS') {
                c.buttons?.forEach((btn, idx) => {
                    // Checar se é botão de URL dinâmica (único que suporta variável nativa de envio em massa simples)
                    if (btn.type === 'URL' && btn.url?.includes('{{1}}')) {
                        const paramVal = params[`BUTTONS_${idx}`] || ''; // Ajustar chave conforme lógica de estado
                        if (paramVal) {
                            payloadComponents.push({
                                type: 'button',
                                sub_type: 'url',
                                index: idx,
                                parameters: [
                                    { type: 'text', text: paramVal }
                                ]
                            });
                        }
                    }
                    // Copy Code ou Quick Reply fixos não mandam payload
                });
                return;
            }

            const componentPayload = {
                type: c.type.toLowerCase(),
                parameters: []
            };

            // Adiciona parâmetros baseados nas variáveis
            if (c.variables && c.variables.length > 0) {
                c.variables.forEach((v, idx) => {
                    const val = params[`${c.type}_${idx}`] || '';
                    componentPayload.parameters.push({ type: 'text', text: val });
                });
            } else if (isMediaHeader && params[`${c.type}_0`]) {
                // Header de mídia sem variáveis de texto, mas com URL
                const val = params[`${c.type}_0`];
                const typeName = c.format.toLowerCase();
                // Create media object key (image, video, document)
                const mediaObj = {};
                mediaObj[typeName === 'document' ? 'document' : typeName] = { link: val };

                componentPayload.parameters.push({
                    type: typeName,
                    ...mediaObj
                });
            }

            // SÓ ADICIONA SE TIVER PARÂMETROS
            if (componentPayload.parameters.length > 0) {
                payloadComponents.push(componentPayload);
            }
        });

        return payloadComponents;
    };

    const handleAddDirectMessageButton = () => {
        if (directMessageButtons.length >= 3) return toast.error('Máximo de 3 botões');
        setDirectMessageButtons([...directMessageButtons, '']);
    };

    const handleRemoveDirectMessageButton = (index) => {
        setDirectMessageButtons(directMessageButtons.filter((_, i) => i !== index));
    };

    const handleDirectMessageButtonChange = (index, value) => {
        const newButtons = [...directMessageButtons];
        newButtons[index] = value;
        setDirectMessageButtons(newButtons);
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

        const finalPhoneList = contactsToUse.map(c => c.phone);
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
                direct_message: directMessageText || null,
                direct_message_params: directMessageButtons.length > 0 ? { buttons: directMessageButtons } : {},
                private_message: sendPrivateMessage ? privateMessageText : null,
                private_message_delay: finalPrivateMessageDelay,
                private_message_concurrency: privateMessageConcurrency
            };
        }

        try {
            console.log('📡 Sending payload:', payload);
            const res = await fetchWithAuth(`${API_URL}/bulk-send/schedule`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }, activeClient.id);

            if (res.ok) {
                const data = await res.json();
                setCurrentTriggerId(data.trigger_id);
                toast.success(scheduledTime ? 'Disparo agendado com sucesso! 📅' : 'Disparo iniciado com sucesso! 🚀');

                // Reset states
                setSelectedTemplate('');
                setFinalContacts([]);
                setScheduledTime('');
                setStep(1);

                // Redirect to History View
                if (onViewChange) onViewChange('history');
            } else {
                const err = await res.json();
                toast.error(err.detail || 'Erro ao agendar disparo');
            }
        } catch (err) {
            console.error('Send error:', err);
            toast.error('Erro de conexão ao iniciar disparo');
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
                    <h1 className="text-3xl font-black text-white tracking-tight">Disparo em Massa <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">Pro</span></h1>
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

                        <div className="flex items-center justify-between mb-8 relative z-10">
                            <h2 className="text-xl font-bold text-white flex items-center gap-3">
                                <span className="p-2 bg-green-500/10 text-green-400 rounded-xl border border-green-500/20">01</span>
                                Template Oficial
                            </h2>
                            <label className="flex items-center gap-3 cursor-pointer group px-4 py-2 bg-white/5 rounded-xl hover:bg-white/10 transition-all border border-transparent hover:border-white/10">
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-green-500 focus:ring-green-500/50 transition-all"
                                    checked={isABTesting}
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        setIsABTesting(checked);
                                        if (checked && variations.length === 1 && variations[0].template === '') {
                                            setVariations([{
                                                id: 'v1',
                                                template: selectedTemplate,
                                                params: { ...templateParams },
                                                weight: 100,
                                                cost: costPerUnit,
                                                category: templateCategory,
                                                direct_message: directMessageText,
                                                private_message: privateMessageText
                                            }]);
                                        }
                                    }}
                                />
                                <span className="text-sm font-bold text-slate-400 group-hover:text-green-400 transition-colors">Modo Teste A/B</span>
                            </label>
                        </div>

                        {isABTesting ? (
                            <div className="space-y-8 relative z-10">
                                <div className="p-5 bg-blue-500/10 text-blue-300 rounded-2xl text-sm border border-blue-500/20 flex items-start gap-4 backdrop-blur-sm">
                                    <span className="text-xl">✨</span>
                                    <p className="leading-relaxed">O <b>Teste A/B</b> permite comparar múltiplos templates ao mesmo tempo, distribuindo os contatos automaticamente.</p>
                                </div>

                                {variations.map((v, vIdx) => {
                                    const vTemplate = templates.find(t => t.name === v.template);
                                    const vInfo = getTemplateCategoryInfo(v.template);
                                    return (
                                        <div key={v.id} className="p-6 bg-slate-800/30 rounded-[2rem] border border-white/5 space-y-6 relative animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest bg-slate-900/50 px-3 py-1.5 rounded-lg border border-white/5">Variação #{vIdx + 1}</span>
                                                    {v.template && (
                                                        <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded-lg border border-blue-500/20">
                                                            {vInfo.type} - R$ {vInfo.price.toFixed(2)}
                                                        </span>
                                                    )}
                                                </div>
                                                {variations.length > 1 && (
                                                    <button onClick={() => handleRemoveVariation(v.id)} className="text-red-400 hover:text-red-500 transition-colors p-2 bg-red-500/10 rounded-xl border border-red-500/20">
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
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
                                                                {templates.map(t => (
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
                                            <option value="" className="bg-slate-900">-- Escolha um template cadastrado --</option>
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

                    {/* Bottom: Split Columns for Smart Send & Automation */}
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                        {/* Left: Smart Send (if !AB) */}
                        {!isABTesting && (
                            <div className="xl:col-span-7">
                                <section className="bg-slate-900/60 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/5 group/direct">
                                    <div className="flex items-center justify-between mb-8">
                                        <h2 className="text-xl font-bold text-white flex items-center gap-3">
                                            <span className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">02</span>
                                            Envio Inteligente: Mensagem Direta
                                        </h2>
                                        <div className="text-[10px] font-black bg-blue-500/20 text-blue-300 px-3 py-1.5 rounded-lg uppercase tracking-wider border border-blue-500/20 backdrop-blur-sm">Verificação de Janela 24h</div>
                                    </div>

                                    <p className="text-sm text-slate-400 mb-6 font-medium leading-relaxed">Se houver uma interação recente (janela de 24h), enviaremos esta mensagem livre em vez do template oficial, economizando custos e tornando o papo mais natural.</p>

                                    <div className="relative group/field">
                                        <textarea
                                            className="w-full p-6 pr-12 bg-slate-800/40 border-2 border-slate-700/50 rounded-3xl focus:border-blue-500/50 focus:bg-slate-800 outline-none transition-all text-white text-lg min-h-[160px] shadow-2xl placeholder:text-slate-600"
                                            placeholder="Digite a mensagem direta (apenas texto ou lista de botões)..."
                                            value={directMessageText}
                                            onChange={(e) => setDirectMessageText(e.target.value)}
                                        />
                                        <button
                                            onClick={() => openExpansion("Configuração - Mensagem Direta", "directMessageText", directMessageText)}
                                            className="absolute bottom-5 right-5 p-3 bg-slate-700/60 backdrop-blur-md shadow-xl text-slate-400 hover:text-blue-400 rounded-2xl transition-all opacity-0 group-hover/field:opacity-100 border border-white/5 active:scale-95"
                                            title="Maximizar"
                                        >
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
                                        </button>
                                    </div>

                                    <div className="mt-6 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Botões de Resposta (Opcional)</label>
                                            <button
                                                onClick={handleAddDirectMessageButton}
                                                disabled={directMessageButtons.length >= 3}
                                                className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20 hover:bg-blue-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                            >
                                                + ADICIONAR BOTÃO
                                            </button>
                                        </div>
                                        <div className="space-y-3">
                                            {directMessageButtons.map((btn, idx) => (
                                                <div key={idx} className="flex gap-2 animate-in slide-in-from-left-2 duration-300">
                                                    <input
                                                        type="text"
                                                        value={btn}
                                                        onChange={(e) => handleDirectMessageButtonChange(idx, e.target.value)}
                                                        placeholder={`Botão ${idx + 1}`}
                                                        maxLength={20}
                                                        className="flex-1 p-3 bg-slate-800/40 border border-slate-700/50 rounded-xl focus:border-blue-500/50 outline-none text-white text-sm"
                                                    />
                                                    <button
                                                        onClick={() => handleRemoveDirectMessageButton(idx)}
                                                        className="p-3 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-xl border border-red-500/20 transition-all"
                                                    >
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                                                    </button>
                                                </div>
                                            ))}
                                            {directMessageButtons.length === 0 && (
                                                <div className="text-center p-4 border border-dashed border-slate-800 rounded-xl text-slate-600 text-xs italic">
                                                    Nenhum botão adicionado. A mensagem será enviada apenas como texto.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}

                        {/* Right: Automation */}
                        <div className={`${!isABTesting ? 'xl:col-span-5 space-y-8' : 'xl:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-8'}`}>
                            <section className="bg-slate-900/60 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/5 h-fit">
                                <div className="flex items-center gap-3 mb-8">
                                    <h2 className="text-xl font-bold text-white flex items-center gap-3">
                                        <span className="p-2 bg-orange-500/10 text-orange-400 rounded-xl border border-orange-500/20">03</span>
                                        Fluxo Pós-Envio
                                    </h2>
                                </div>

                                <div className="space-y-6">
                                    <label className={`flex items-center p-5 rounded-2xl cursor-pointer transition-all border-2 group ${sendPrivateMessage ? 'bg-orange-500/5 border-orange-500/30' : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/60'}`}>
                                        <div className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-500 ${sendPrivateMessage ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/40 rotate-6' : 'bg-slate-700 text-slate-500'}`}>
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                                        </div>
                                        <div className="ml-4 flex-1">
                                            <div className={`font-bold transition-colors ${sendPrivateMessage ? 'text-white' : 'text-slate-400'}`}>Nota Privada Automatizada</div>
                                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Registro de histórico no Chatwoot</div>
                                        </div>
                                        <input
                                            type="checkbox"
                                            className="w-6 h-6 rounded-lg border-slate-700 bg-slate-800 text-orange-500 focus:ring-orange-500/50 transition-all"
                                            checked={sendPrivateMessage}
                                            onChange={(e) => setSendPrivateMessage(e.target.checked)}
                                        />
                                    </label>

                                    {sendPrivateMessage && !isABTesting && (
                                        <div className="space-y-4 animate-in slide-in-from-top-3 fade-in duration-500">
                                            <div className="relative group/field">
                                                <textarea
                                                    className="w-full p-5 pr-12 bg-slate-800/40 border-2 border-slate-700/50 rounded-2xl focus:border-orange-500/50 focus:bg-slate-800 outline-none transition-all text-slate-100 min-h-[130px] shadow-inner placeholder:text-slate-600"
                                                    placeholder="Conteúdo que será registrado na conversa do cliente..."
                                                    value={privateMessageText}
                                                    onChange={(e) => setPrivateMessageText(e.target.value)}
                                                />
                                                <button
                                                    onClick={() => openExpansion("Configuração - Nota Privada (Chatwoot)", "privateMessageText", privateMessageText)}
                                                    className="absolute bottom-4 right-4 p-2 bg-slate-700/50 backdrop-blur rounded-xl shadow-lg text-slate-400 hover:text-orange-400 hover:bg-slate-700 border border-white/5 transition-all opacity-0 group-hover/field:opacity-100"
                                                >
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-4 bg-slate-800/40 border border-slate-700/50 rounded-2xl">
                                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1">Delay de Registro</label>
                                                    <div className="flex items-center gap-2 bg-slate-900/40 p-2 rounded-xl border border-white/5">
                                                        <input
                                                            type="number"
                                                            className="flex-1 bg-transparent outline-none text-white font-bold text-lg w-12"
                                                            value={privateMessageDelay}
                                                            onChange={(e) => setPrivateMessageDelay(parseInt(e.target.value))}
                                                        />
                                                        <select
                                                            className="bg-slate-700 text-[10px] font-bold text-slate-200 outline-none px-2 py-1 rounded-lg border border-white/10"
                                                            value={privateMessageDelayUnit}
                                                            onChange={(e) => setPrivateMessageDelayUnit(e.target.value)}
                                                        >
                                                            <option value="seconds">seg</option>
                                                            <option value="minutes">min</option>
                                                            <option value="hours">hr</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="p-4 bg-slate-800/40 border border-slate-700/50 rounded-2xl">
                                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1">Máx. Concorrência</label>
                                                    <input
                                                        type="number"
                                                        className="w-full bg-transparent outline-none text-white font-bold text-lg"
                                                        value={privateMessageConcurrency}
                                                        onChange={(e) => setPrivateMessageConcurrency(parseInt(e.target.value))}
                                                    />
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
                                    onClick={() => setStep(2)}
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
                </div >
            )
            }

            {/* Step 2: Recipient Selection & Execution */}
            {
                step === 2 && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in slide-in-from-right-8 fade-in duration-700">
                        {/* Left: Recipient Selector */}
                        <div className="lg:col-span-12 xl:col-span-8 space-y-6">
                            <section className="bg-slate-900/60 backdrop-blur-md rounded-[2.5rem] p-8 shadow-2xl border border-white/5 relative overflow-hidden">
                                <div className="flex items-center justify-between mb-10 relative z-10 px-2">
                                    <h2 className="text-2xl font-black text-white flex items-center gap-4">
                                        <span className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl border border-purple-500/20 shadow-xl shadow-purple-500/10">04</span>
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
                                            onSelect={setFinalContacts}
                                            selectedInbox={activeClient?.wa_business_account_id}
                                            title="Configuração de Público"
                                            exclusionList={exclusionList}
                                        />
                                    </div>

                                    <div className="relative z-10 pt-10 border-t border-white/5">
                                        <div className="flex items-center justify-between mb-8 px-2">
                                            <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                                <span className="p-2.5 bg-green-500/10 text-green-400 rounded-xl border border-green-500/20">
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                                </span>
                                                Lista de Exclusão
                                            </h3>
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest bg-black/20 px-4 py-2 rounded-xl border border-white/5">
                                                    Total: <span className="text-green-400 ml-1">{exclusionList.length}</span>
                                                </div>
                                                {exclusionList.length > 0 && (
                                                    <button
                                                        onClick={() => setExclusionList([])}
                                                        className="flex items-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl border border-red-500/20 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-red-900/10"
                                                    >
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                        Limpar Tudo
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="bg-slate-900/40 rounded-[2rem] p-8 border border-white/5 space-y-8">
                                            {!exclusionColSelector ? (
                                                <div className="space-y-6">
                                                    <div className="flex items-center gap-3 bg-slate-800/50 p-1.5 rounded-2xl border border-white/5">
                                                        <button
                                                            onClick={() => setExclusionMode('manual')}
                                                            className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${exclusionMode === 'manual' ? 'bg-green-600 text-white shadow-lg shadow-green-900/20' : 'text-slate-500 hover:text-slate-300'}`}
                                                        >
                                                            Entrada Manual
                                                        </button>
                                                        <button
                                                            onClick={() => setExclusionMode('upload')}
                                                            className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${exclusionMode === 'upload' ? 'bg-green-600 text-white shadow-lg shadow-green-900/20' : 'text-slate-500 hover:text-slate-300'}`}
                                                        >
                                                            Upload Arquivo
                                                        </button>
                                                    </div>

                                                    {exclusionMode === 'manual' ? (
                                                        <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
                                                            <div className="relative group/field">
                                                                <textarea
                                                                    className="w-full bg-slate-800/30 border-2 border-slate-700/50 rounded-2xl p-6 text-white text-sm outline-none focus:border-green-500/50 transition-all font-mono min-h-[140px] shadow-inner placeholder:text-slate-700"
                                                                    placeholder="Insira um número por linha (ex: 5511999999999)..."
                                                                    value={exclusionText}
                                                                    onChange={(e) => setExclusionText(e.target.value)}
                                                                />
                                                            </div>
                                                            <div className="flex gap-4">
                                                                <button
                                                                    onClick={handleSaveExclusion}
                                                                    disabled={!exclusionText.trim()}
                                                                    className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest border border-white/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                                                                >
                                                                    ADICIONAR À LISTA
                                                                </button>
                                                                {exclusionText.trim().length > 0 && (
                                                                    <button
                                                                        onClick={add55ToExclusionText}
                                                                        className="px-6 bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl font-black text-xs uppercase tracking-widest border border-white/5 transition-all shadow-md hover:shadow-lg active:scale-95 animate-in zoom-in duration-200"
                                                                        title="Adicionar 55 aos números abaixo"
                                                                    >
                                                                        +55
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                                            <div className="relative h-48 flex flex-col items-center justify-center border-2 border-dashed border-slate-700/50 rounded-3xl p-8 hover:border-green-500/30 transition-all group cursor-pointer bg-slate-800/10">
                                                                <input
                                                                    type="file"
                                                                    accept=".csv,.xlsx,.xls"
                                                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                                    onChange={handleExclusionFileUpload}
                                                                />
                                                                <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-xl">
                                                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-500 group-hover:text-green-400"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
                                                                </div>
                                                                <h4 className="font-bold text-white text-sm">Carregar CSV ou Excel</h4>
                                                                <p className="text-slate-500 text-[10px] mt-1 font-bold uppercase tracking-widest">Arraste ou clique aqui</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {exclusionList.length > 0 && (
                                                        <div className="pt-4 space-y-3">
                                                            <div className="flex items-center justify-between px-1">
                                                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Números Ignorados</h4>
                                                                <button
                                                                    onClick={add55ToLoadedExclusionList}
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                                                                >
                                                                    <span>+55 TODOS</span>
                                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14" /></svg>
                                                                </button>
                                                            </div>
                                                            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto premium-scrollbar p-1">
                                                                {exclusionList.map(num => (
                                                                    <div key={num} className="group flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 rounded-lg text-xs font-mono text-slate-400 border border-white/5 hover:border-red-500/30 hover:text-red-400 transition-all">
                                                                        {num}
                                                                        <button onClick={() => setExclusionList(prev => prev.filter(n => n !== num))} className="text-slate-600 hover:text-red-500 font-black">
                                                                            ×
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="text-sm font-black text-white uppercase tracking-widest">Selecione a coluna do telefone</h4>
                                                        <button onClick={() => setExclusionColSelector(false)} className="text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest">Cancelar</button>
                                                    </div>
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                        {exclusionCsvData?.headers.map((h, idx) => (
                                                            <button
                                                                key={idx}
                                                                onClick={() => setExclusionSelectedCol(idx)}
                                                                className={`p-4 rounded-2xl border-2 text-left transition-all relative overflow-hidden ${exclusionSelectedCol === idx ? 'bg-green-500/10 border-green-500 text-white' : 'bg-slate-800/40 border-slate-700/50 text-slate-500 hover:border-slate-500'}`}
                                                            >
                                                                <div className="text-[9px] font-black uppercase mb-1 opacity-50">Col {idx + 1}</div>
                                                                <div className="font-bold text-xs truncate">{h || `Vazio`}</div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <button
                                                        onClick={confirmExclusionColumn}
                                                        disabled={exclusionSelectedCol === null}
                                                        className="w-full py-4 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-green-900/20 transition-all disabled:opacity-30"
                                                    >
                                                        Confirmar Importação
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Right: Execution Control */}
                        <div className="lg:col-span-12 xl:col-span-4 space-y-6">
                            <div className="bg-slate-900/80 backdrop-blur-2xl rounded-[3rem] p-10 shadow-3xl border border-white/10 space-y-10 sticky top-8 overflow-hidden group/exec">
                                {/* Animated Background Mesh */}
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-50"></div>

                                <h2 className="text-2xl font-black text-white tracking-tight relative px-2">Painel de Controle</h2>

                                <div className="space-y-10 relative z-10">
                                    <div className="space-y-4 px-2">
                                        <div className="flex items-center justify-between p-6 bg-slate-800/40 rounded-3xl border border-white/5 shadow-inner group/info">
                                            <div className="flex flex-col gap-1">
                                                <div className="text-xs font-black text-slate-500 uppercase tracking-widest">Contatos na Lista</div>
                                                <button
                                                    onClick={handleCopyFinalList}
                                                    className="flex items-center gap-2 text-[10px] font-black text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-widest bg-blue-500/5 px-2.5 py-1.5 rounded-lg border border-blue-500/10"
                                                >
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></svg>
                                                    Copiar Destinatários
                                                </button>
                                            </div>
                                            <div className="text-3xl font-black text-white group-hover/info:text-green-400 transition-colors tabular-nums">
                                                {finalContacts.length}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-5">
                                            <div className="p-5 bg-slate-800/40 border border-slate-700/50 rounded-3xl group/input focus-within:border-green-500/50 transition-all">
                                                <label className="block text-[9px] font-black text-slate-500 uppercase mb-2 tracking-[0.2em] group-hover/input:text-slate-300 transition-colors">Intervalo entre Envios</label>
                                                <div className="flex items-center gap-2 bg-slate-900/40 p-2.5 rounded-2xl border border-white/5">
                                                    <input
                                                        type="number"
                                                        className="flex-1 bg-transparent outline-none font-black text-2xl text-white tabular-nums w-12"
                                                        value={delaySeconds}
                                                        onChange={(e) => setDelaySeconds(parseInt(e.target.value))}
                                                    />
                                                    <select
                                                        className="bg-slate-700 text-xs font-bold text-slate-200 outline-none px-3 py-1.5 rounded-xl border border-white/10"
                                                        value={delayUnit}
                                                        onChange={(e) => setDelayUnit(e.target.value)}
                                                    >
                                                        <option value="seconds">seg</option>
                                                        <option value="minutes">min</option>
                                                        <option value="hours">hr</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="p-5 bg-slate-800/40 border border-slate-700/50 rounded-3xl group/input focus-within:border-green-500/50 transition-all">
                                                <label className="block text-[9px] font-black text-slate-500 uppercase mb-2 tracking-[0.2em] group-hover/input:text-slate-300 transition-colors">Jobs Paralelos</label>
                                                <input
                                                    type="number"
                                                    className="w-full bg-transparent outline-none font-black text-2xl text-white tabular-nums"
                                                    value={concurrency}
                                                    onChange={(e) => setConcurrency(parseInt(e.target.value))}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="px-2">
                                        <div className="p-5 bg-slate-800/40 border border-slate-700/50 rounded-3xl group/input focus-within:border-green-500/50 transition-all">
                                            <label className="block text-[9px] font-black text-slate-500 uppercase mb-2 tracking-[0.2em] group-hover/input:text-slate-300 transition-colors flex items-center gap-2">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M2 12h20M12 2a10 10 0 0 1 10 10 10 10 0 0 1-10 10 10 10 0 0 1-10-10 10 10 0 0 1 10-10z" /></svg>
                                                Agendamento (Opcional)
                                            </label>
                                            <input
                                                type="datetime-local"
                                                className="w-full bg-transparent outline-none font-bold text-lg text-white placeholder:text-slate-700/50"
                                                value={scheduledTime}
                                                onChange={(e) => setScheduledTime(e.target.value)}
                                                min={new Date().toISOString().slice(0, 16)}
                                            />
                                        </div>
                                    </div>

                                    <div className="p-2 bg-slate-800/50 rounded-[2.5rem] border border-white/5 shadow-2xl">
                                        <div className="bg-gradient-to-br from-green-600 to-emerald-700 p-8 rounded-[2rem] text-white shadow-xl shadow-green-900/40 relative overflow-hidden group/send">
                                            {/* Shine effect */}
                                            <div className="absolute top-0 -left-64 w-64 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-35deg] group-hover/send:left-[150%] transition-all duration-[1500ms] pointer-events-none"></div>

                                            <div className="flex items-center justify-between mb-8">
                                                <span className="text-green-100 text-[10px] font-black uppercase tracking-widest">Custo Total Previsto</span>
                                                <span className="text-3xl font-black tabular-nums">
                                                    R$ {isABTesting
                                                        ? variations.reduce((acc, v) => acc + (finalContacts.length * (v.weight / 100) * v.cost), 0).toFixed(2)
                                                        : (finalContacts.length * costPerUnit).toFixed(2)
                                                    }
                                                </span>
                                            </div>
                                            <button
                                                onClick={handleSend}
                                                disabled={isSending || finalContacts.length === 0 || (!selectedTemplate && !isABTesting)}
                                                className="w-full py-5 bg-white text-green-700 rounded-2xl font-black text-xl hover:shadow-2xl hover:scale-[1.03] active:scale-95 transition-all disabled:opacity-20 disabled:cursor-not-allowed uppercase tracking-tighter"
                                            >
                                                🚀 {scheduledTime ? (isSending ? 'Agendando...' : 'Disparo Agendado') : (isSending ? 'Iniciando...' : 'Iniciar Disparo')}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="text-[10px] text-slate-500 text-center font-bold px-8 leading-relaxed italic opacity-60">
                                        "Ao iniciar, a IA processará a fila respeitando os delays para simular comportamento humano."
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
                            <h3 className="text-2xl font-black text-white">Processando</h3>
                            <p className="text-sm text-slate-400 font-medium">{workingMessage || 'Aguarde um instante...'}</p>
                        </div>
                    </div>
                </div>,
                document.body
            )}

        </div >
    );
}
