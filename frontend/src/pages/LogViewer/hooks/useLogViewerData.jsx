import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { fetchWithAuth } from '../../../AuthContext';
import { API_URL } from '../../../config';
import { parseLine, getLineSignature } from '../utils/logHelpers';

export function useLogViewerData() {
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
  const [confirmState, setConfirmState] = useState(null);

  const [filterTimeFrom, setFilterTimeFrom]         = useState('');
  const [filterTimeTo, setFilterTimeTo]             = useState('');
  const [filterLevels, setFilterLevels]             = useState([]);
  const [filterText, setFilterText]                 = useState('');
  const [filterTags, setFilterTags]                 = useState([]);
  const [activeQuickFilters, setActiveQuickFilters] = useState([]);

  const dateMenuRef = useRef(null);
  const lineMenuRef = useRef(null);

  const askConfirm = (opts) => setConfirmState(opts);
  const closeConfirm = () => setConfirmState(null);

  // Fechar dropdowns ao clicar fora
  useEffect(() => {
    const handler = (e) => {
      if (dateMenuRef.current && !dateMenuRef.current.contains(e.target)) setShowDateMenu(false);
      if (lineMenuRef.current && !lineMenuRef.current.contains(e.target)) setShowLineMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchAvailableDates = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${API_URL}/logs/available-dates`);
      if (res && res.ok) {
        const data = await res.json();
        setAvailableDates(Array.isArray(data.dates) ? data.dates : []);
      }
    } catch (_) {
      // silencioso
    }
  }, []);

  useEffect(() => { fetchAvailableDates(); }, [fetchAvailableDates]);

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
      await new Promise(r => setTimeout(r, 0));
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
      setParsed(lines);
      setTotalLines(lines.length);
      setHasProcessed(true);
    } catch (e) {
      toast.error('Erro ao processar logs');
    }
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
    } catch (e) {
      toast.error(e.message);
    }
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

  const toggleSelect = useCallback((idx) => {
    setSelectedIdx(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }, []);

  const clearSelection = () => setSelectedIdx(new Set());

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
    const sig = getLineSignature(line.raw);
    const matchCount = parsed.filter(l => getLineSignature(l.raw) === sig).length;
    const messageNode = matchCount > 1 ? (
      <span>
        Apagar esta linha e todas as ocorrências idênticas permanentemente do log (inclusive no servidor)?{' '}
        <br /><br />
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/15 border border-orange-500/30 text-orange-400 font-black text-sm">
          ⚠️ {matchCount} ocorrências encontradas — todas serão apagadas.
        </span>
      </span>
    ) : 'Apagar esta linha permanentemente do log? Apenas esta ocorrência foi encontrada no log atual.';
    askConfirm({
      title: 'Apagar esta linha',
      message: messageNode,
      confirmText: matchCount > 1 ? `Apagar ${matchCount} linhas` : 'Apagar',
      isDangerous: true,
      onConfirm: () => deleteLines([line]),
    });
  };

  const copyLine = (raw) => {
    navigator.clipboard.writeText(raw);
    toast.success('Linha copiada!');
  };

  return {
    parsed,
    setParsed,
    hasProcessed,
    loading,
    loadingStage,
    parseProgress,
    parseTotal,
    parseCurrent,
    totalLines,
    truncated,
    currentPage,
    totalPages,
    lineCount,
    setLineCount,
    showLineMenu,
    setShowLineMenu,
    availableDates,
    selectedDate,
    setSelectedDate,
    showDateMenu,
    setShowDateMenu,
    pasteMode,
    setPasteMode,
    rawPaste,
    setRawPaste,
    selectedIdx,
    setSelectedIdx,
    detailLine,
    setDetailLine,
    deleting,
    confirmState,
    askConfirm,
    closeConfirm,
    filterTimeFrom,
    setFilterTimeFrom,
    filterTimeTo,
    setFilterTimeTo,
    filterLevels,
    setFilterLevels,
    filterText,
    setFilterText,
    filterTags,
    setFilterTags,
    activeQuickFilters,
    setActiveQuickFilters,
    dateMenuRef,
    lineMenuRef,
    fetchLogs,
    goToPage,
    handleProcessPaste,
    handleClear,
    handleClearServer,
    toggleQuickFilter,
    toggleSelect,
    clearSelection,
    deleteSelected,
    handleDeleteDetail,
    copyLine,
  };
}
