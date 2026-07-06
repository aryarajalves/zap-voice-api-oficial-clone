import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
    FiSearch, FiTrash2, FiDownload, FiCopy, FiFilter,
    FiAlertCircle, FiInfo, FiAlertTriangle, FiZap, FiList,
    FiRefreshCw, FiClipboard, FiChevronDown, FiCalendar, FiTag,
    FiCheckSquare, FiSquare, FiX, FiMaximize2
} from 'react-icons/fi';
import { fetchWithAuth } from '../../AuthContext';
import { API_URL } from '../../config';
import { toast } from 'react-hot-toast';
import ConfirmModal from '../../components/ConfirmModal';

// ─── Overlay de carregamento ──────────────────────────────────────────────────
function LoadingOverlay({ stage, progress, total, current }) {
    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-100 dark:border-white/10 shadow-2xl p-8 w-80 flex flex-col items-center gap-5">
                <div className="relative w-14 h-14">
                    <div className="absolute inset-0 rounded-full border-4 border-blue-500/20" />
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 animate-spin" />
                </div>
                {stage === 'fetching' ? (
                    <div className="text-center">
                        <p className="font-bold text-gray-800 dark:text-white text-sm">Buscando logs do servidor</p>
                        <p className="text-xs text-gray-400 mt-1">Aguarde, isso pode levar alguns segundos...</p>
                    </div>
                ) : (
                    <div className="text-center w-full">
                        <p className="font-bold text-gray-800 dark:text-white text-sm">Processando logs</p>
                        <p className="text-xs text-gray-400 mt-1">
                            {(current || 0).toLocaleString()} / {(total || 0).toLocaleString()} linhas
                        </p>
                        <div className="mt-3 w-full bg-gray-100 dark:bg-white/10 rounded-full h-2 overflow-hidden">
                            <div
                                className="h-full bg-blue-500 rounded-full transition-all duration-150"
                                style={{ width: `${progress || 0}%` }}
                            />
                        </div>
                        <p className="text-[11px] text-blue-400 font-bold mt-1">{progress || 0}%</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Parse ───────────────────────────────────────────────────────────────────
const TIME_RE  = /(\d{2}:\d{2}:\d{2})/;
const LEVEL_RE = /\b(CRITICAL|FATAL|ERROR|WARNING|WARN|INFO|DEBUG|TRACE)\b/i;

function parseLine(raw, idx) {
    const timeMatch  = raw.match(TIME_RE);
    const levelMatch = raw.match(LEVEL_RE);
    return {
        idx,
        raw,
        rawLower: raw.toLowerCase(),
        time:  timeMatch  ? timeMatch[1]  : null,
        level: levelMatch ? levelMatch[1].toUpperCase() : null,
    };
}

// ─── Assinatura de linha ───────────────────────────────────────────────────
// Texto da linha sem horário/números variáveis, usado para agrupar e apagar
// de uma vez todas as ocorrências (passadas e futuras) do mesmo erro.
function getLineSignature(raw) {
    return raw
        .replace(TIME_RE, '')
        .replace(/\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{2,4}/g, '')
        .replace(/\d+/g, '#')
        .replace(/\s+/g, ' ')
        .trim();
}

function formatDateBR(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
}

const LEVEL_COLORS = {
    CRITICAL: { bg: 'bg-purple-900/40', text: 'text-purple-300', badge: 'bg-purple-700 text-purple-100' },
    FATAL:    { bg: 'bg-purple-900/40', text: 'text-purple-300', badge: 'bg-purple-700 text-purple-100' },
    ERROR:    { bg: 'bg-red-900/30',    text: 'text-red-300',    badge: 'bg-red-700 text-red-100' },
    WARNING:  { bg: 'bg-yellow-900/20', text: 'text-yellow-300', badge: 'bg-yellow-700 text-yellow-100' },
    WARN:     { bg: 'bg-yellow-900/20', text: 'text-yellow-300', badge: 'bg-yellow-700 text-yellow-100' },
    INFO:     { bg: '',                 text: 'text-gray-300',   badge: 'bg-blue-700 text-blue-100' },
    DEBUG:    { bg: '',                 text: 'text-gray-500',   badge: 'bg-gray-600 text-gray-200' },
    TRACE:    { bg: '',                 text: 'text-gray-600',   badge: 'bg-gray-700 text-gray-300' },
};

function levelIcon(level) {
    if (!level) return null;
    if (['CRITICAL','FATAL','ERROR'].includes(level)) return <FiAlertCircle size={11} className="text-red-400 flex-shrink-0" />;
    if (['WARNING','WARN'].includes(level))           return <FiAlertTriangle size={11} className="text-yellow-400 flex-shrink-0" />;
    if (level === 'INFO')                             return <FiInfo size={11} className="text-blue-400 flex-shrink-0" />;
    return <FiZap size={11} className="text-gray-500 flex-shrink-0" />;
}

const QUICK_FILTERS = [
    {
        id: 'bulk', label: 'Disparo em Massa', emoji: '📤', color: 'bg-blue-700 text-blue-100',
        pattern: /\[(bulk|disparo|wa-trigger|direct|bulk-post-send|bulk_resend)\]/i,
        description: "Linhas de disparos em massa (envio para vários contatos de uma vez). Procura pelas marcações [bulk], [disparo], [wa-trigger], [direct], [bulk-post-send] e [bulk_resend]."
    },
    {
        id: 'followup', label: 'Follow-up', emoji: '🔁', color: 'bg-cyan-700 text-cyan-100',
        pattern: /\[follow-up|\[bulk-play-followup|\[play-followup/i,
        description: "Linhas de mensagens de follow-up automático (reenvio programado para quem não respondeu). Procura pelas marcações [follow-up], [bulk-play-followup] e [play-followup]."
    },
    {
        id: 'funnel', label: 'Funis', emoji: '🔀', color: 'bg-indigo-700 text-indigo-100',
        pattern: /\[(graph|engine|funil|wa-resume|play-clone|button_action_funnel|resume)\]/i,
        description: "Linhas da execução dos funis de automação (o motor que processa cada etapa do fluxo). Procura pelas marcações [graph], [engine], [funil], [wa-resume], [play-clone], [button_action_funnel] e [resume]."
    },
    {
        id: 'webhook', label: 'Webhooks / Atendimento', emoji: '🔗', color: 'bg-orange-700 text-orange-100',
        pattern: /\[(webhook|atendimento|chatwoot|meta|sync_atendimento|sync_chatwoot|meta_webhook|meta_inbound|webhooks)\]/i,
        description: "Linhas de webhooks recebidos (Meta/WhatsApp) e de sincronização com o chat de Atendimento do ZapVoice. Procura pelas marcações [webhook], [atendimento], [meta], [sync_atendimento], [meta_webhook], [meta_inbound] e [webhooks]."
    },
    {
        id: 'scheduler', label: 'Agendamentos', emoji: '⏰', color: 'bg-yellow-700 text-yellow-100',
        pattern: /\[(scheduler|backup-scheduler|schedule)\]/i,
        description: "Linhas do agendador de tarefas: disparos agendados e rotinas de backup programadas. Procura pelas marcações [scheduler], [backup-scheduler] e [schedule]."
    },
    {
        id: 'ai', label: 'IA', emoji: '🤖', color: 'bg-violet-700 text-violet-100',
        pattern: /\[(ai_condition|input-data-ai|mem_lock|event)\]/i,
        description: "Linhas de processamento por inteligência artificial: condições de funil decididas por IA e extração de dados de respostas. Procura pelas marcações [ai_condition], [input-data-ai], [mem_lock] e [event]."
    },
    {
        id: 'database', label: 'Banco / PostgreSQL', emoji: '🗄', color: 'bg-green-700 text-green-100',
        pattern: /\[(database|migration|auto-migrate|storage)\]|postgres|sqlalchemy|psycopg/i,
        description: "Linhas relacionadas ao banco de dados: migrações automáticas, armazenamento e erros de conexão. Procura pelas marcações [database], [migration], [auto-migrate], [storage] ou menções a postgres, sqlalchemy e psycopg."
    },
    {
        id: 'backup', label: 'Backup', emoji: '💾', color: 'bg-teal-700 text-teal-100',
        pattern: /\[(backup|upload-backup|restore)\]/i,
        description: "Linhas do processo de backup automático do banco de dados e uploads, incluindo restaurações. Procura pelas marcações [backup], [upload-backup] e [restore]."
    },
    {
        id: 'upload', label: 'Uploads', emoji: '📁', color: 'bg-pink-700 text-pink-100',
        pattern: /\[upload/i,
        description: "Linhas de upload de arquivos e mídias (imagens, áudios, vídeos, documentos). Procura pela marcação [upload."
    },
    {
        id: 'import', label: 'Importacao', emoji: '📥', color: 'bg-rose-700 text-rose-100',
        pattern: /import|duplicity_check|leads_import/i,
        description: "Linhas de importação de contatos/leads e verificação de duplicidade. Procura pelas palavras 'import', 'duplicity_check' e 'leads_import'."
    },
];

const LINE_OPTIONS    = [500, 1000, 2000, 5000, 10000];
const LEVELS_OPTIONS  = ['CRITICAL', 'ERROR', 'WARNING', 'INFO', 'DEBUG'];

// ─── Virtual scroll simples ──────────────────────────────────────────────────
const ROW_HEIGHT = 28; // px por linha (altura fixa)
const BUFFER     = 40; // linhas extras acima/abaixo da janela visível

function VirtualList({ items, filterText, selectedIdx, onToggleSelect, onOpenDetail }) {
    const containerRef = useRef(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [containerHeight, setContainerHeight] = useState(600);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver(() => setContainerHeight(el.clientHeight));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const totalHeight = items.length * ROW_HEIGHT;
    const startIdx    = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER);
    const endIdx      = Math.min(items.length, Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + BUFFER);
    const visibleItems = items.slice(startIdx, endIdx);

    return (
        <div
            ref={containerRef}
            className="overflow-y-auto max-h-[60vh] font-mono text-xs"
            onScroll={e => setScrollTop(e.currentTarget.scrollTop)}
        >
            {/* Espaço total para manter a scrollbar correta */}
            <div style={{ height: totalHeight, position: 'relative' }}>
                <div style={{ position: 'absolute', top: startIdx * ROW_HEIGHT, left: 0, right: 0 }}>
                    {visibleItems.map(line => {
                        const colors = LEVEL_COLORS[line.level] || { bg: '', text: 'text-gray-400', badge: '' };
                        const isSelected = selectedIdx.has(line.idx);
                        return (
                            <div
                                key={line.idx}
                                style={{ height: ROW_HEIGHT }}
                                className={`group flex items-center gap-2 px-4 border-b border-gray-800/40 hover:bg-white/[0.03] transition-colors cursor-pointer ${colors.bg} ${isSelected ? 'bg-blue-500/10 ring-1 ring-inset ring-blue-500/30' : ''}`}
                                onClick={() => onOpenDetail(line)}
                            >
                                <button
                                    onClick={(e) => { e.stopPropagation(); onToggleSelect(line.idx); }}
                                    className="flex-shrink-0 text-gray-500 hover:text-blue-400 transition-colors"
                                    title="Selecionar linha"
                                >
                                    {isSelected ? <FiCheckSquare size={13} className="text-blue-400" /> : <FiSquare size={13} />}
                                </button>
                                <span className="text-gray-600 select-none w-10 text-right flex-shrink-0">{line.idx + 1}</span>
                                <span>{levelIcon(line.level)}</span>
                                {line.level && (
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black flex-shrink-0 ${colors.badge}`}>
                                        {line.level}
                                    </span>
                                )}
                                <span className={`truncate flex-1 ${colors.text}`}>
                                    {filterText ? highlightText(line.raw, filterText) : line.raw}
                                </span>
                                <FiMaximize2 size={11} className="text-gray-600 flex-shrink-0 opacity-0 group-hover:opacity-100" />
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ─── Modal com a linha completa (sem corte) ───────────────────────────────────
function LineDetailModal({ line, onClose, onCopy, onDelete }) {
    if (!line) return null;
    const colors = LEVEL_COLORS[line.level] || { bg: '', text: 'text-gray-300', badge: '' };
    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
            <div
                className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-100 dark:border-white/10 shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className="px-5 py-3 bg-gray-50 dark:bg-white/[0.03] border-b border-gray-100 dark:border-white/5 flex items-center gap-2">
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Linha {line.idx + 1}</span>
                    {line.level && (
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black flex-shrink-0 ${colors.badge}`}>{line.level}</span>
                    )}
                    {line.time && <span className="text-xs text-gray-400">{line.time}</span>}
                    <button onClick={onClose} className="ml-auto p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all">
                        <FiX size={16} />
                    </button>
                </div>
                <div className="p-5 overflow-auto flex-1">
                    <pre className={`whitespace-pre-wrap break-all font-mono text-xs leading-relaxed ${colors.text}`}>{line.raw}</pre>
                </div>
                <div className="px-5 py-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-end gap-2">
                    <button onClick={() => onCopy(line.raw)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all">
                        <FiCopy size={12} /> Copiar
                    </button>
                    <button
                        onClick={() => onDelete(line)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-400 hover:text-white hover:bg-red-500/20 rounded-lg transition-all"
                    >
                        <FiTrash2 size={12} /> Apagar este log
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function LogViewer() {
    const [parsed, setParsed]               = useState([]);
    const [hasProcessed, setHasProcessed]   = useState(false);
    const [loading, setLoading]             = useState(false);
    const [loadingStage, setLoadingStage]   = useState('fetching');
    const [parseProgress, setParseProgress] = useState(0);
    const [parseTotal, setParseTotal]       = useState(0);
    const [parseCurrent, setParseCurrent]   = useState(0);
    const [totalLines, setTotalLines]       = useState(0);
    const [truncated, setTruncated]         = useState(false);
    const [currentPage, setCurrentPage]     = useState(1);
    const [totalPages, setTotalPages]       = useState(1);
    const [pageSize]                        = useState(5000);
    const [lineCount, setLineCount]         = useState(2000);
    const [showLineMenu, setShowLineMenu]   = useState(false);

    const [availableDates, setAvailableDates] = useState([]);
    const [selectedDate, setSelectedDate]     = useState(null);
    const [showDateMenu, setShowDateMenu]     = useState(false);

    const [pasteMode, setPasteMode] = useState(false);
    const [rawPaste, setRawPaste]   = useState('');

    const [selectedIdx, setSelectedIdx] = useState(() => new Set());
    const [detailLine, setDetailLine]   = useState(null);
    const [deleting, setDeleting]       = useState(false);
    const [confirmState, setConfirmState] = useState(null); // { title, message, confirmText, isDangerous, onConfirm }

    const askConfirm = (opts) => setConfirmState(opts);
    const closeConfirm = () => setConfirmState(null);

    const [filterTimeFrom, setFilterTimeFrom]           = useState('');
    const [filterTimeTo, setFilterTimeTo]               = useState('');
    const [filterLevels, setFilterLevels]               = useState([]);
    const [filterText, setFilterText]                   = useState('');
    const [filterTags, setFilterTags]                   = useState([]);
    const [activeQuickFilters, setActiveQuickFilters]   = useState([]);

    const dateMenuRef = useRef(null);
    const lineMenuRef = useRef(null);

    // Fechar dropdowns ao clicar fora
    useEffect(() => {
        const handler = (e) => {
            if (dateMenuRef.current && !dateMenuRef.current.contains(e.target)) setShowDateMenu(false);
            if (lineMenuRef.current && !lineMenuRef.current.contains(e.target)) setShowLineMenu(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Buscar datas disponíveis (silencioso — não quebra se o endpoint não existir ainda)
    const fetchAvailableDates = useCallback(async () => {
        try {
            const res = await fetchWithAuth(`${API_URL}/logs/available-dates`);
            if (res && res.ok) {
                const data = await res.json();
                setAvailableDates(Array.isArray(data.dates) ? data.dates : []);
            }
        } catch (_) {
            // silencioso — endpoint pode não existir no backend antigo
        }
    }, []);

    useEffect(() => { fetchAvailableDates(); }, [fetchAvailableDates]);

    // Processar em chunks para não travar o browser
    const parseInChunks = useCallback(async (rawContent) => {
        const CHUNK    = 1000;
        const rawLines = rawContent.split('\n');
        const total    = rawLines.length;

        setLoadingStage('parsing');
        setParseTotal(total);
        setParseCurrent(0);
        setParseProgress(0);

        const result = [];
        for (let i = 0; i < total; i += CHUNK) {
            const end = Math.min(i + CHUNK, total);
            for (let j = i; j < end; j++) {
                const raw = rawLines[j];
                if (raw && raw.trim()) result.push(parseLine(raw, j));
            }
            setParseCurrent(end);
            setParseProgress(Math.round((end / total) * 100));
            await new Promise(r => setTimeout(r, 0)); // cede controle ao browser
        }
        return result;
    }, []);

    const fetchLogs = useCallback(async (count, date, page = 1) => {
        const _count = count ?? lineCount;
        const _date  = date !== undefined ? date : selectedDate;

        setLoading(true);
        setLoadingStage('fetching');
        setParseProgress(0);
        try {
            const params = _date
                ? `date=${_date}&page=${page}&page_size=${pageSize}`
                : `lines=${_count}`;
            const res = await fetchWithAuth(`${API_URL}/logs/?${params}`);
            if (!res || !res.ok) {
                const err = res ? await res.json().catch(() => ({})) : {};
                throw new Error(err.detail || 'Erro ao buscar logs');
            }
            const data = await res.json();
            const lines = await parseInChunks(data.content || '');
            setParsed(lines);
            setTotalLines(data.total_lines || lines.length);
            setTruncated(false);
            setCurrentPage(data.current_page || 1);
            setTotalPages(data.total_pages || 1);
            setHasProcessed(true);
            toast.success(`${lines.length.toLocaleString()} linhas — pag. ${data.current_page || 1}/${data.total_pages || 1}`);
        } catch (e) {
            toast.error(e.message || 'Erro ao carregar logs');
        } finally {
            setLoading(false);
        }
    }, [lineCount, selectedDate, pageSize, parseInChunks]);

    const goToPage = useCallback((page) => {
        fetchLogs(lineCount, selectedDate, page);
    }, [fetchLogs, lineCount, selectedDate]);

    const handleProcessPaste = () => {
        try {
            const lines = rawPaste.split('\n').map((l, i) => parseLine(l, i)).filter(l => l.raw.trim());
            setParsed(lines); setTotalLines(lines.length); setHasProcessed(true);
        } catch (e) { toast.error('Erro ao processar logs'); }
    };

    const handleClear = () => {
        setParsed([]); setHasProcessed(false); setRawPaste(''); setTotalLines(0);
        setTruncated(false); setCurrentPage(1); setTotalPages(1);
        setFilterTimeFrom(''); setFilterTimeTo(''); setFilterLevels([]);
        setFilterText(''); setFilterTags([]); setActiveQuickFilters([]);
        setSelectedIdx(new Set()); setDetailLine(null);
    };

    const doClearServer = async () => {
        try {
            const res = await fetchWithAuth(`${API_URL}/logs/`, { method: 'DELETE' });
            if (!res || !res.ok) throw new Error('Erro ao limpar log');
            toast.success('Log do servidor limpo');
            handleClear();
            fetchAvailableDates();
        } catch (e) { toast.error(e.message); }
    };

    const handleClearServer = () => {
        askConfirm({
            title: 'Apagar log do servidor',
            message: 'Isso apaga o arquivo de log atual por completo, permanentemente. Deseja continuar?',
            confirmText: 'Apagar tudo',
            isDangerous: true,
            onConfirm: doClearServer,
        });
    };

    const toggleQuickFilter = (id) =>
        setActiveQuickFilters(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    // ─── Seleção e exclusão permanente de linhas ──────────────────────────────
    const toggleSelect = useCallback((idx) => {
        setSelectedIdx(prev => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx); else next.add(idx);
            return next;
        });
    }, []);

    const clearSelection = () => setSelectedIdx(new Set());

    // Apaga permanentemente do arquivo de log no servidor (por assinatura),
    // removendo também da lista local ocorrências já carregadas com a mesma
    // assinatura — inclusive as que ainda vierem a acontecer no futuro.
    const deleteLines = useCallback(async (linesToDelete) => {
        if (!linesToDelete.length) return;
        const signatures = [...new Set(linesToDelete.map(l => getLineSignature(l.raw)))];
        setDeleting(true);
        try {
            const res = await fetchWithAuth(`${API_URL}/logs/lines`, {
                method: 'DELETE',
                body: JSON.stringify({ signatures }),
            });
            if (!res || !res.ok) {
                const err = res ? await res.json().catch(() => ({})) : {};
                throw new Error(err.detail || 'Erro ao apagar linhas do log');
            }
            const data = await res.json();
            const sigSet = new Set(signatures);
            setParsed(prev => prev.filter(l => !sigSet.has(getLineSignature(l.raw))));
            setSelectedIdx(new Set());
            setDetailLine(null);
            toast.success(`${(data.removed ?? linesToDelete.length).toLocaleString()} linha(s) apagada(s) do log`);
        } catch (e) {
            toast.error(e.message || 'Erro ao apagar linhas do log');
        } finally {
            setDeleting(false);
        }
    }, []);

    const deleteSelected = () => {
        const lines = parsed.filter(l => selectedIdx.has(l.idx));
        if (lines.length === 0) return;
        askConfirm({
            title: 'Apagar linhas de log',
            message: `Apagar ${lines.length} linha${lines.length === 1 ? '' : 's'} de log permanentemente? Isso remove do arquivo no servidor, inclusive futuras ocorrências do mesmo erro.`,
            confirmText: 'Apagar',
            isDangerous: true,
            onConfirm: () => deleteLines(lines),
        });
    };

    const handleDeleteDetail = (line) => {
        askConfirm({
            title: 'Apagar esta linha',
            message: 'Apagar esta linha (e todas as ocorrências iguais) permanentemente do log?',
            confirmText: 'Apagar',
            isDangerous: true,
            onConfirm: () => deleteLines([line]),
        });
    };

    const copyLine = (raw) => {
        navigator.clipboard.writeText(raw);
        toast.success('Linha copiada!');
    };

    // Filtrar linhas
    const filtered = useMemo(() => {
        if (!parsed.length) return [];
        const activePatterns = activeQuickFilters
            .map(id => QUICK_FILTERS.find(f => f.id === id)?.pattern)
            .filter(Boolean);

        return parsed.filter(line => {
            if (filterTimeFrom && line.time && line.time < filterTimeFrom) return false;
            if (filterTimeTo   && line.time && line.time > filterTimeTo)   return false;
            if (filterLevels.length > 0) {
                const norm = line.level === 'WARN' ? 'WARNING' : line.level === 'FATAL' ? 'CRITICAL' : line.level;
                if (!filterLevels.includes(norm)) return false;
            }
            
            // Unir as tags confirmadas e o texto que o usuário está digitando atualmente
            const inputTerms = filterText.toLowerCase().split(/[\s,]+/).filter(t => t.trim().length > 0);
            const tagTerms = filterTags.map(tag => tag.toLowerCase());
            const allTerms = [...new Set([...tagTerms, ...inputTerms])];
            
            if (allTerms.length > 0) {
                const matchAll = allTerms.every(term => line.rawLower.includes(term));
                if (!matchAll) return false;
            }
            if (activePatterns.length > 0 && !activePatterns.some(re => re.test(line.raw))) return false;
            return true;
        });
    }, [parsed, filterTimeFrom, filterTimeTo, filterLevels, filterText, filterTags, activeQuickFilters]);

    const allFilteredSelected = filtered.length > 0 && filtered.every(l => selectedIdx.has(l.idx));

    const toggleSelectAllFiltered = () => {
        if (allFilteredSelected) {
            clearSelection();
        } else {
            setSelectedIdx(new Set(filtered.map(l => l.idx)));
        }
    };

    const counts = useMemo(() => {
        const c = { CRITICAL: 0, ERROR: 0, WARNING: 0, INFO: 0, DEBUG: 0 };
        filtered.forEach(l => {
            const lvl = l.level === 'WARN' ? 'WARNING' : l.level === 'FATAL' ? 'CRITICAL' : l.level;
            if (lvl && c[lvl] !== undefined) c[lvl]++;
        });
        return c;
    }, [filtered]);

    const copyFiltered = () => {
        navigator.clipboard.writeText(filtered.map(l => l.raw).join('\n'));
        toast.success(`${filtered.length.toLocaleString()} linha${filtered.length === 1 ? '' : 's'} copiada${filtered.length === 1 ? '' : 's'}!`);
    };

    const downloadFiltered = () => {
        const label = activeQuickFilters.length === 1
            ? QUICK_FILTERS.find(f => f.id === activeQuickFilters[0])?.id
            : selectedDate || 'recentes';
        const blob = new Blob([filtered.map(l => l.raw).join('\n')], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `logs_${label}_${new Date().toISOString().slice(0, 10)}.txt`;
        a.click();
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="space-y-4">

            {loading && (
                <LoadingOverlay
                    stage={loadingStage}
                    progress={parseProgress}
                    total={parseTotal}
                    current={parseCurrent}
                />
            )}

            {detailLine && (
                <LineDetailModal
                    line={detailLine}
                    onClose={() => setDetailLine(null)}
                    onCopy={copyLine}
                    onDelete={handleDeleteDetail}
                />
            )}

            <ConfirmModal
                isOpen={!!confirmState}
                onClose={closeConfirm}
                onConfirm={() => confirmState?.onConfirm?.()}
                title={confirmState?.title}
                message={confirmState?.message}
                confirmText={confirmState?.confirmText || 'Confirmar'}
                cancelText="Cancelar"
                isDangerous={confirmState?.isDangerous}
            />

            {/* Controles principais */}
            <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-100 dark:border-white/5 p-4 flex flex-wrap items-center gap-3">

                {/* Seletor de dia */}
                <div className="relative" ref={dateMenuRef}>
                    <button
                        onClick={() => setShowDateMenu(v => !v)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl border transition-colors ${
                            selectedDate
                                ? 'bg-indigo-600 text-white border-indigo-500'
                                : 'border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'
                        }`}
                    >
                        <FiCalendar size={14} />
                        {selectedDate ? formatDateBR(selectedDate) : 'Selecionar dia'}
                        <FiChevronDown size={12} />
                    </button>
                    {showDateMenu && (
                        <div className="absolute top-full left-0 mt-1 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl z-50 overflow-hidden min-w-[160px]">
                            <button
                                onClick={() => { setSelectedDate(null); setShowDateMenu(false); }}
                                className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-white/10 ${!selectedDate ? 'font-bold text-blue-500' : 'text-gray-700 dark:text-gray-200'}`}
                            >
                                Ultimas N linhas
                            </button>
                            <div className="border-t border-gray-100 dark:border-white/5" />
                            {availableDates.length === 0 ? (
                                <div className="px-4 py-3 text-xs text-gray-400">Nenhum dia disponivel</div>
                            ) : availableDates.map(d => (
                                <button
                                    key={d}
                                    onClick={() => { setSelectedDate(d); setShowDateMenu(false); }}
                                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-white/10 ${selectedDate === d ? 'font-bold text-indigo-400' : 'text-gray-700 dark:text-gray-200'}`}
                                >
                                    {formatDateBR(d)}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Botão carregar */}
                <div className="flex items-center">
                    <button
                        onClick={() => fetchLogs(lineCount, selectedDate)}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-l-xl transition-colors disabled:opacity-50"
                    >
                        <FiRefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        {loading ? 'Carregando...' : selectedDate ? `Carregar ${formatDateBR(selectedDate)}` : 'Carregar Logs'}
                    </button>
                    {!selectedDate ? (
                        <div className="relative" ref={lineMenuRef}>
                            <button
                                onClick={() => setShowLineMenu(v => !v)}
                                className="flex items-center gap-1 px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold rounded-r-xl border-l border-blue-500 transition-colors"
                            >
                                {lineCount.toLocaleString()} <FiChevronDown size={13} />
                            </button>
                            {showLineMenu && (
                                <div className="absolute top-full right-0 mt-1 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl z-50 overflow-hidden min-w-[130px]">
                                    {LINE_OPTIONS.map(n => (
                                        <button
                                            key={n}
                                            onClick={() => { setLineCount(n); setShowLineMenu(false); fetchLogs(n, null); }}
                                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-white/10 transition-colors ${n === lineCount ? 'font-bold text-blue-500' : 'text-gray-700 dark:text-gray-200'}`}
                                        >
                                            {n.toLocaleString()} linhas
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="w-3 h-9 bg-blue-600 rounded-r-xl" />
                    )}
                </div>

                <span className="text-gray-300 dark:text-gray-600 select-none">|</span>

                <button
                    onClick={() => setPasteMode(v => !v)}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl border transition-colors ${
                        pasteMode ? 'bg-gray-700 text-white border-gray-600' : 'border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                    }`}
                >
                    <FiClipboard size={14} /> Colar manualmente
                </button>

                {hasProcessed && (
                    <button onClick={handleClear} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all">
                        <FiTrash2 size={13} /> Limpar
                    </button>
                )}

                <button onClick={handleClearServer} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-400 hover:text-white hover:bg-red-500/20 rounded-xl transition-all ml-auto">
                    <FiTrash2 size={13} /> Apagar log no servidor
                </button>

                {totalLines > 0 && (
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                        {totalLines.toLocaleString()} linhas totais
                    </span>
                )}
            </div>

            {/* Paste manual */}
            {pasteMode && (
                <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden">
                    <div className="px-5 py-3 bg-gray-50 dark:bg-white/[0.03] border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <FiList size={13} /> Cole seus logs aqui
                        </span>
                        <button
                            onClick={handleProcessPaste}
                            disabled={!rawPaste.trim()}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-40"
                        >
                            <FiFilter size={12} /> Processar
                        </button>
                    </div>
                    <textarea
                        value={rawPaste}
                        onChange={e => { setRawPaste(e.target.value); setHasProcessed(false); }}
                        placeholder="Cole aqui os logs para analisar..."
                        className="w-full h-40 px-5 py-4 bg-transparent text-xs font-mono text-gray-300 placeholder:text-gray-600 outline-none resize-none"
                    />
                </div>
            )}

            {/* Filtros */}
            {hasProcessed && (
                <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-100 dark:border-white/5 p-4 space-y-4">

                    {/* Filtros rapidos */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <FiTag size={11} className="text-gray-400" />
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Filtros rapidos</span>
                            {activeQuickFilters.length > 0 && (
                                <button onClick={() => setActiveQuickFilters([])} className="text-[10px] text-gray-400 hover:text-gray-200 underline ml-1">
                                    limpar ({activeQuickFilters.length})
                                </button>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {QUICK_FILTERS.map(f => {
                                const active = activeQuickFilters.includes(f.id);
                                return (
                                    <button
                                        key={f.id}
                                        onClick={() => toggleQuickFilter(f.id)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                                            active
                                                ? `${f.color} border-transparent shadow-md`
                                                : 'bg-transparent border-gray-200 dark:border-white/10 text-gray-400 hover:border-gray-400 dark:hover:border-white/30'
                                        }`}
                                    >
                                        {f.emoji} {f.label}
                                        <span className="relative inline-flex group">
                                            <FiInfo size={11} className="opacity-60 hover:opacity-100 cursor-help" />
                                            <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 w-64 opacity-0 group-hover:opacity-100 transition-opacity z-50 bg-gray-900 text-gray-100 text-[11px] leading-snug font-normal normal-case p-2.5 rounded-lg shadow-xl">
                                                {f.description}
                                                <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                                            </span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="border-t border-gray-100 dark:border-white/5" />

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Horario de</label>
                            <input type="time" step="1" value={filterTimeFrom} onChange={e => setFilterTimeFrom(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-[#0b1120] border border-gray-100 dark:border-white/5 rounded-xl text-xs text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Horario ate</label>
                            <input type="time" step="1" value={filterTimeTo} onChange={e => setFilterTimeTo(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-[#0b1120] border border-gray-100 dark:border-white/5 rounded-xl text-xs text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Busca no texto</label>
                            <div className="relative">
                                <FiSearch size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input 
                                    type="text" 
                                    value={filterText} 
                                    onChange={e => setFilterText(e.target.value)} 
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' || e.key === ',') {
                                            e.preventDefault();
                                            const val = filterText.trim().replace(/,/g, '');
                                            if (val && !filterTags.includes(val)) {
                                                setFilterTags(prev => [...prev, val]);
                                                setFilterText('');
                                            }
                                        } else if (e.key === 'Backspace' && !filterText && filterTags.length > 0) {
                                            // Apagar última tag com Backspace se o input estiver vazio
                                            setFilterTags(prev => prev.slice(0, -1));
                                        }
                                    }}
                                    placeholder="Buscar ou pressionar Enter..." 
                                    className="w-full pl-8 pr-3 py-2 bg-gray-50 dark:bg-[#0b1120] border border-gray-100 dark:border-white/5 rounded-xl text-xs text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-gray-400"
                                />
                            </div>
                            
                            {/* Renderização das tags de busca na parte de baixo do input */}
                            {filterTags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {filterTags.map((tag, i) => (
                                        <span key={i} className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 rounded-lg text-xs font-bold transition-all">
                                            {tag}
                                            <button 
                                                onClick={() => setFilterTags(prev => prev.filter((_, idx) => idx !== i))}
                                                className="hover:text-blue-200 ml-0.5 focus:outline-none font-bold"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">Nivel:</span>
                        {LEVELS_OPTIONS.map(lvl => {
                            const active = filterLevels.includes(lvl);
                            const c = LEVEL_COLORS[lvl];
                            return (
                                <button key={lvl}
                                    onClick={() => setFilterLevels(prev => prev.includes(lvl) ? prev.filter(x => x !== lvl) : [...prev, lvl])}
                                    className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider transition-all border ${
                                        active ? `${c.badge} border-transparent` : 'bg-transparent border-gray-200 dark:border-white/10 text-gray-400 hover:border-gray-400'
                                    }`}
                                >
                                    {lvl}
                                </button>
                            );
                        })}
                        {filterLevels.length > 0 && (
                            <button onClick={() => setFilterLevels([])} className="text-[10px] text-gray-400 hover:text-gray-200 underline ml-1">limpar</button>
                        )}
                    </div>
                </div>
            )}

            {/* Resultado */}
            {hasProcessed && (
                <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden">
                    <div className="px-5 py-3 bg-gray-50 dark:bg-white/[0.03] border-b border-gray-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
                                {filtered.length.toLocaleString()} / {parsed.length.toLocaleString()} linhas
                                {selectedDate && <span className="ml-2 text-indigo-400">· {formatDateBR(selectedDate)}</span>}
                            </span>
                            {activeQuickFilters.map(id => {
                                const f = QUICK_FILTERS.find(x => x.id === id);
                                return f ? <span key={id} className={`px-2 py-0.5 rounded-full text-[9px] font-black ${f.color}`}>{f.emoji} {f.label}</span> : null;
                            })}
                            <div className="flex items-center gap-1.5">
                                {counts.CRITICAL > 0 && <span className="px-1.5 py-0.5 text-[9px] font-black rounded bg-purple-700 text-purple-100">{counts.CRITICAL} CRIT</span>}
                                {counts.ERROR    > 0 && <span className="px-1.5 py-0.5 text-[9px] font-black rounded bg-red-700 text-red-100">{counts.ERROR} ERR</span>}
                                {counts.WARNING  > 0 && <span className="px-1.5 py-0.5 text-[9px] font-black rounded bg-yellow-700 text-yellow-100">{counts.WARNING} WARN</span>}
                                {counts.INFO     > 0 && <span className="px-1.5 py-0.5 text-[9px] font-black rounded bg-blue-700 text-blue-100">{counts.INFO} INFO</span>}
                                {counts.DEBUG    > 0 && <span className="px-1.5 py-0.5 text-[9px] font-black rounded bg-gray-600 text-gray-200">{counts.DEBUG} DEBUG</span>}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={copyFiltered} disabled={filtered.length === 0}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all disabled:opacity-30">
                                <FiCopy size={12} /> Copiar
                            </button>
                            <button onClick={downloadFiltered} disabled={filtered.length === 0}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all disabled:opacity-30">
                                <FiDownload size={12} /> Download
                            </button>
                        </div>
                    </div>

                    {selectedIdx.size > 0 && (
                        <div className="px-5 py-2.5 bg-blue-900/20 border-b border-blue-700/30 flex items-center gap-3">
                            <span className="text-xs font-bold text-blue-300">
                                {selectedIdx.size} linha{selectedIdx.size === 1 ? '' : 's'} selecionada{selectedIdx.size === 1 ? '' : 's'}
                            </span>
                            <button
                                onClick={deleteSelected}
                                disabled={deleting}
                                className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-red-300 hover:text-white hover:bg-red-500/20 rounded-lg transition-all disabled:opacity-40"
                            >
                                <FiTrash2 size={12} /> {deleting ? 'Apagando...' : 'Apagar do log'}
                            </button>
                            <button onClick={clearSelection} className="text-xs text-gray-400 hover:text-gray-200 underline ml-auto">
                                limpar seleção
                            </button>
                        </div>
                    )}

                    {truncated && (
                        <div className="px-5 py-2 bg-yellow-900/20 border-b border-yellow-700/30 text-yellow-300 text-xs flex items-center gap-2">
                            <FiAlertTriangle size={12} />
                            Arquivo tem {totalLines.toLocaleString()} linhas — exibindo apenas as ultimas 50.000. Use filtros para refinar.
                        </div>
                    )}

                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                            <FiFilter size={32} className="mb-3 opacity-30" />
                            <p className="font-bold">Nenhuma linha corresponde aos filtros</p>
                        </div>
                    ) : (
                        <>
                        <div className="flex items-center gap-2 px-4 py-1.5 border-b border-gray-800/40 bg-white/[0.02]">
                            <button
                                onClick={toggleSelectAllFiltered}
                                className="flex-shrink-0 text-gray-500 hover:text-blue-400 transition-colors"
                                title={allFilteredSelected ? 'Desmarcar todos' : 'Selecionar todos os filtrados'}
                            >
                                {allFilteredSelected ? <FiCheckSquare size={13} className="text-blue-400" /> : <FiSquare size={13} />}
                            </button>
                            <button onClick={toggleSelectAllFiltered} className="text-[10px] font-black text-gray-400 hover:text-gray-200 uppercase tracking-widest transition-colors">
                                {allFilteredSelected ? 'Desmarcar todos' : `Selecionar todos os filtrados (${filtered.length.toLocaleString()})`}
                            </button>
                        </div>
                        <VirtualList
                            items={filtered}
                            filterText={[...filterTags, filterText].filter(t => t.trim().length > 0).join(' ')}
                            selectedIdx={selectedIdx}
                            onToggleSelect={toggleSelect}
                            onOpenDetail={setDetailLine}
                        />
                        </>
                    )}

                    {/* Paginação — só aparece no modo por data */}
                    {selectedDate && totalPages > 1 && (
                        <div className="px-5 py-3 border-t border-gray-800/40 flex items-center justify-between gap-3 flex-wrap">
                            <span className="text-xs text-gray-400">
                                Pagina <span className="font-bold text-white">{currentPage}</span> de <span className="font-bold text-white">{totalPages}</span>
                                {' '}· {totalLines.toLocaleString()} linhas totais
                            </span>
                            <div className="flex items-center gap-1">
                                {/* Primeira */}
                                <button onClick={() => goToPage(1)} disabled={currentPage === 1 || loading}
                                    className="px-2 py-1 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all disabled:opacity-30">
                                    «
                                </button>
                                {/* Anterior */}
                                <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1 || loading}
                                    className="px-3 py-1 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all disabled:opacity-30">
                                    ‹ Anterior
                                </button>

                                {/* Paginas ao redor da atual */}
                                {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                                    const half = 3;
                                    let start = Math.max(1, currentPage - half);
                                    const end = Math.min(totalPages, start + 6);
                                    start = Math.max(1, end - 6);
                                    return start + i;
                                }).filter(p => p >= 1 && p <= totalPages).map(p => (
                                    <button key={p} onClick={() => goToPage(p)} disabled={loading}
                                        className={`w-8 h-7 text-xs font-bold rounded-lg transition-all ${
                                            p === currentPage
                                                ? 'bg-blue-600 text-white'
                                                : 'text-gray-400 hover:text-white hover:bg-white/10'
                                        }`}>
                                        {p}
                                    </button>
                                ))}

                                {/* Proxima */}
                                <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages || loading}
                                    className="px-3 py-1 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all disabled:opacity-30">
                                    Proxima ›
                                </button>
                                {/* Ultima */}
                                <button onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages || loading}
                                    className="px-2 py-1 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all disabled:opacity-30">
                                    »
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function highlightText(text, search) {
    if (!search) return text;
    try {
        const terms = search.split(/[\s,]+/).filter(t => t.trim().length > 0);
        if (terms.length === 0) return text;
        
        // Escapar caracteres especiais e juntar termos em (termo1|termo2|...)
        const pattern = terms
            .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .join('|');
            
        const parts = text.split(new RegExp(`(${pattern})`, 'gi'));
        const termSet = new Set(terms.map(t => t.toLowerCase()));
        
        return parts.map((part, i) =>
            termSet.has(part.toLowerCase())
                ? <mark key={i} className="bg-yellow-400/40 text-yellow-200 rounded px-0.5">{part}</mark>
                : part
        );
    } catch (_) {
        return text;
    }
}
