import React from 'react';
import { FiX, FiUpload, FiCheckCircle, FiAlertCircle, FiArrowRight, FiArrowLeft, FiLoader, FiMaximize2, FiChevronDown, FiCheck } from 'react-icons/fi';
import { useContactImport, getPhoneMappingError } from './ContactImportModal/hooks/useContactImport';
import { API_URL } from '../config';
import { fetchWithAuth } from '../AuthContext';

function TagChipInput({ tags, setTags, placeholder }) {
  const [input, setInput] = React.useState('');

  const addTag = (val) => {
    const trimmed = val.trim().toLowerCase().replace(/\s+/g, '-');
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  };

  const handleBlur = () => {
    if (input.trim()) addTag(input);
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-1 p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg min-h-[34px] focus-within:ring-2 focus-within:ring-blue-500 transition-all cursor-text">
        {tags.map((tag, i) => (
          <span key={i} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded text-[10px] font-medium">
            {tag}
            <button
              type="button"
              onClick={() => setTags(tags.filter((_, idx) => idx !== i))}
              className="ml-0.5 hover:text-red-500 transition-colors leading-none text-[11px] font-bold"
            >
              &times;
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[80px] text-xs bg-transparent outline-none text-gray-800 dark:text-white placeholder:text-gray-400"
        />
      </div>
      <p className="text-[9px] text-gray-400">Enter ou vírgula para adicionar · Backspace para remover</p>
    </div>
  );
}

// Dropdown de coluna com busca — usado em todos os seletores de coluna do mapeamento
// (Nome, Telefone, DDI, DDD, Número, Email, Etiquetas...). Planilhas grandes podem ter
// dezenas de colunas, então digitar para filtrar é bem mais rápido que rolar uma lista.
function ColumnCombobox({ value, onChange, headers, emptyLabel = '-- Ignorar --', small = false }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const containerRef = React.useRef(null);
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  React.useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return headers;
    return headers.filter(h => h.toLowerCase().includes(q));
  }, [headers, search]);

  const sizeClasses = small
    ? 'px-2 py-1.5 text-[11px]'
    : 'px-3 py-2 text-xs';

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(o => !o)}
        className={`w-full ${sizeClasses} bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-left flex items-center justify-between gap-2`}
      >
        <span className={`truncate ${value ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400'}`}>
          {value || emptyLabel}
        </span>
        <FiChevronDown size={13} className="text-gray-400 shrink-0" />
      </button>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl flex flex-col overflow-hidden">
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Digite para buscar..."
            className="px-2.5 py-1.5 text-xs border-b border-gray-100 dark:border-gray-700 outline-none bg-transparent text-gray-800 dark:text-white"
          />
          <div className="overflow-y-auto max-h-48">
            <div
              onClick={() => { onChange(''); setIsOpen(false); setSearch(''); }}
              className="px-3 py-1.5 text-xs text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer"
            >
              {emptyLabel}
            </div>
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-xs text-gray-400 italic">Nenhuma coluna encontrada</div>
            ) : filtered.map(h => (
              <div
                key={h}
                onClick={() => { onChange(h); setIsOpen(false); setSearch(''); }}
                className={`px-3 py-1.5 text-xs cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 truncate ${
                  h === value ? 'bg-blue-50 dark:bg-blue-900/30 font-semibold text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                }`}
                title={h}
              >
                {h}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Prévia "maximizada" de como TODOS os números vão ficar montados (não só as 3 linhas
// da prévia inicial) — refaz a junção DDI+DDD+Número no arquivo inteiro, sem importar
// nada, só para o usuário conferir antes de confirmar.
function PhonePreviewModal({ isOpen, onClose, file, mapping, activeClient }) {
  const [page, setPage] = React.useState(0);
  const [limit, setLimit] = React.useState(100);
  const [items, setItems] = React.useState([]);
  const [totalRows, setTotalRows] = React.useState(0);
  const [validCount, setValidCount] = React.useState(0);
  const [invalidCount, setInvalidCount] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (isOpen) setPage(0);
  }, [isOpen]);

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit);
    setPage(0);
  };

  React.useEffect(() => {
    if (!isOpen || !file || !activeClient?.id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('mapping', JSON.stringify(mapping));
    formData.append('skip', String(page * limit));
    formData.append('limit', String(limit));

    fetchWithAuth(`${API_URL}/leads/import/preview-phones`, { method: 'POST', body: formData }, activeClient.id)
      .then(async (response) => {
        if (cancelled) return;
        if (response && response.ok) {
          const data = await response.json();
          setItems(data.items || []);
          setTotalRows(data.total_rows || 0);
          setValidCount(data.valid_count || 0);
          setInvalidCount(data.invalid_count || 0);
        } else {
          let detail = 'Erro ao pré-visualizar telefones.';
          try { const errBody = await response.json(); detail = errBody.detail || detail; } catch (_) {}
          setError(detail);
        }
      })
      .catch(() => { if (!cancelled) setError('Erro ao pré-visualizar telefones.'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [isOpen, file, activeClient?.id, page, limit, mapping]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl h-[85vh] flex flex-col overflow-hidden border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50 shrink-0">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">Prévia de Todos os Números</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Como cada linha vai virar telefone com o mapeamento atual (DDI + DDD + Número).
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-400 shrink-0">
            <FiX size={20} />
          </button>
        </div>

        {/* Summary */}
        {!loading && !error && (
          <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3 shrink-0">
            <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/30 rounded-lg text-[11px] font-bold">
              ✓ {validCount.toLocaleString('pt-BR')} válidos
            </span>
            {invalidCount > 0 && (
              <span className="px-2.5 py-1 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800/20 rounded-lg text-[11px] font-bold">
                ⚠ {invalidCount.toLocaleString('pt-BR')} inválidos/incompletos
              </span>
            )}
            <span className="text-[11px] text-gray-400 font-semibold">de {totalRows.toLocaleString('pt-BR')} linhas</span>
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-y-auto px-6 py-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <FiLoader className="animate-spin mb-2" size={24} />
              <p className="text-xs font-semibold">Calculando...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-red-500">
              <p className="text-xs font-semibold">{error}</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <p className="text-xs font-semibold">Nenhuma linha encontrada.</p>
            </div>
          ) : (
            <table className="w-full text-xs text-left border-collapse">
              <thead className="sticky top-0 bg-white dark:bg-gray-800">
                <tr>
                  <th className="px-3 py-2 font-bold border-b border-gray-100 dark:border-gray-700">#</th>
                  <th className="px-3 py-2 font-bold border-b border-gray-100 dark:border-gray-700">Nome</th>
                  <th className="px-3 py-2 font-bold border-b border-gray-100 dark:border-gray-700">Telefone montado</th>
                  <th className="px-3 py-2 font-bold border-b border-gray-100 dark:border-gray-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {items.map((it) => (
                  <tr key={it.row_index}>
                    <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{it.row_index + 1}</td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {it.name || <span className="text-gray-400 italic">sem nome</span>}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-0.5 font-mono">
                        <span className={`px-1 py-0.5 rounded ${it.ddi ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300' : 'bg-gray-100 dark:bg-gray-900 text-gray-400'}`}>{it.ddi || '--'}</span>
                        <span className={`px-1 py-0.5 rounded ${it.ddd ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-900 text-gray-400'}`}>{it.ddd || '--'}</span>
                        <span className={`px-1 py-0.5 rounded ${it.number ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : 'bg-gray-100 dark:bg-gray-900 text-gray-400'}`}>{it.number || '--'}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {it.valid ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold"><FiCheck size={12} /> válido</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-500 text-[10px] font-bold">⚠ muito curto</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between shrink-0 gap-3">
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold whitespace-nowrap">
              {totalRows > 0 && items.length > 0 ? `Mostrando ${page * limit + 1}-${page * limit + items.length} de ${totalRows.toLocaleString('pt-BR')}` : ''}
            </span>
            <div className="flex items-center gap-1.5">
              <label htmlFor="phone-preview-page-size" className="text-[11px] text-gray-400 font-semibold whitespace-nowrap">
                Por página:
              </label>
              <select
                id="phone-preview-page-size"
                value={limit}
                onChange={(e) => handleLimitChange(Number(e.target.value))}
                disabled={loading}
                className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-[11px] font-bold text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40 transition-all"
              >
                {[20, 50, 100, 500, 1000].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-[11px] font-bold disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setPage(p => (page * limit + items.length < totalRows ? p + 1 : p))}
              disabled={page * limit + items.length >= totalRows || loading}
              className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-[11px] font-bold disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ContactImportModal({ isOpen, onClose, onImportComplete }) {
  const {
    activeClient, step, setStep, loading, previewData, mapping, setMapping, importResult,
    fileInputRef, file,
    fixedTags, setFixedTags, fixedRemoveTags, setFixedRemoveTags,
    handleFileChange, handleExecuteImport, reset
  } = useContactImport(onClose, onImportComplete);

  const [selectedTagsForModal, setSelectedTagsForModal] = React.useState(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isPreviewMaximized, setIsPreviewMaximized] = React.useState(false);
  const [isPhonePreviewMaximized, setIsPhonePreviewMaximized] = React.useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFile = e.dataTransfer?.files?.[0];
    if (!droppedFile) return;
    // Simulate a synthetic event that handleFileChange expects
    handleFileChange({ target: { files: [droppedFile] } });
  };

  const isTagsColumn = (header) => {
    if (!header) return false;
    const hLower = header.toLowerCase();
    return hLower === mapping.tags?.toLowerCase() || 
           hLower === mapping.remove_tags?.toLowerCase() ||
           hLower.includes('tag') || 
           hLower.includes('etiqueta');
  };

  const parseCellTags = (cellValue) => {
    if (!cellValue) return [];
    let val = String(cellValue).trim();
    if (val.startsWith('[') && val.endsWith(']')) {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) {
          return parsed.map(t => String(t).trim()).filter(Boolean);
        }
      } catch (e) {}
    }
    const cleaned = val.replace(/[\[\]'"]/g, '');
    return cleaned.split(',').map(t => t.trim()).filter(Boolean);
  };

  const renderPreviewTable = (compact) => {
    if (!previewData) return null;
    const textSize = compact ? 'text-[10px]' : 'text-xs';
    const cellPad = compact ? 'px-2 py-1.5' : 'px-3 py-2.5';
    return (
      <table className={`w-full ${textSize} text-left border-collapse`}>
        <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800">
          <tr>
            {previewData.headers.map(h => (
              <th key={h} className={`${cellPad} font-bold border-b border-gray-200 dark:border-gray-700 whitespace-nowrap`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {previewData.preview_rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => {
                const header = previewData.headers[j];
                const isTagCol = isTagsColumn(header);
                return (
                  <th key={j} className={`${cellPad} font-normal text-gray-600 dark:text-gray-400 whitespace-nowrap`}>
                    {isTagCol ? (
                      (() => {
                        const tags = parseCellTags(cell);
                        if (tags.length === 0) return <span className="text-gray-400">-</span>;
                        const displayedTags = tags.slice(0, 3);
                        const hasMore = tags.length > 3;
                        return (
                          <div className="flex flex-wrap gap-1 items-center max-w-[240px]">
                            {displayedTags.map((tag, idx) => (
                              <span key={idx} className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-[9px] font-medium border border-blue-100 dark:border-blue-800/30 whitespace-nowrap">
                                {tag}
                              </span>
                            ))}
                            {hasMore && (
                              <button
                                onClick={() => {
                                  const nameColIdx = previewData.headers.findIndex(h => {
                                    const hLower = h.toLowerCase();
                                    return hLower === mapping.name?.toLowerCase() || hLower.includes('nome') || hLower.includes('name');
                                  });
                                  const contactName = nameColIdx !== -1 ? String(row[nameColIdx]) : `Contato #${i + 1}`;
                                  setSelectedTagsForModal({ tags, contactName });
                                }}
                                className="px-1.5 py-0.5 bg-gray-150 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded text-[9px] font-bold transition-all shadow-sm"
                                title="Ver todas as etiquetas"
                              >
                                +{tags.length - 3}
                              </button>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      String(cell)
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  // Telefone dividido em várias colunas (DDI/DDD/Número) — mapping.phone vira um objeto
  // { mode: 'composite', ddi_column, ddd_column, number_column, manual_ddi } em vez de
  // um simples nome de coluna. Quando não há coluna de DDI na planilha, manual_ddi
  // (ex: "55") completa o número.
  const isPhoneComposite = mapping.phone && typeof mapping.phone === 'object';

  const switchPhoneMode = (composite) => {
    if (composite) {
      setMapping({ ...mapping, phone: { mode: 'composite', ddi_column: '', ddd_column: '', number_column: '', manual_ddi: '' } });
    } else {
      setMapping({ ...mapping, phone: '' });
    }
  };

  const updatePhoneComposite = (field, value) => {
    setMapping({ ...mapping, phone: { ...mapping.phone, [field]: value } });
  };

  // Monta uma prévia (do lado do front) de como o telefone final vai ficar,
  // usando as mesmas regras do backend (_build_phone_series): DDI (coluna ou manual) +
  // DDD + Número, só dígitos. Usa as primeiras linhas da prévia dos dados já carregada.
  // Colunas numéricas (DDI/DDD/Número) que vêm de planilha Excel costumam chegar como
  // float — "11" vira "11.0" — e sem remover a parte decimal, sobra um "0" grudado
  // no fim (ex: DDD "11" virava "110"). Remove ".0"/".00" antes de tirar os não-dígitos.
  const digitsOnly = (v) => {
    let s = String(v ?? '').trim();
    if (/^-?\d+\.0+$/.test(s)) s = s.replace(/\.0+$/, '');
    return s.replace(/\D/g, '');
  };
  const getPhonePreviewSamples = () => {
    if (!previewData || !isPhoneComposite) return [];
    const { ddi_column, ddd_column, number_column, manual_ddi } = mapping.phone;
    if (!number_column) return [];
    const ddiIdx = ddi_column ? previewData.headers.indexOf(ddi_column) : -1;
    const dddIdx = ddd_column ? previewData.headers.indexOf(ddd_column) : -1;
    const numIdx = previewData.headers.indexOf(number_column);
    if (numIdx === -1) return [];
    return previewData.preview_rows.slice(0, 3).map(row => {
      const dddVal = dddIdx !== -1 ? digitsOnly(row[dddIdx]) : '';
      const numVal = digitsOnly(row[numIdx]);
      // Sem DDD nessa linha e o Número já tem 10+ dígitos: provavelmente já é um
      // telefone completo (internacional, ou já veio com DDD embutido) — não gruda
      // o DDI em cima disso, senão corrompe o número.
      if (!dddVal && numVal.length >= 10) {
        return { ddi: '', ddd: dddVal, number: numVal };
      }
      let ddiVal = ddiIdx !== -1 ? digitsOnly(row[ddiIdx]) : '';
      if (!ddiVal) ddiVal = digitsOnly(manual_ddi);
      return { ddi: ddiVal, ddd: dddVal, number: numVal };
    });
  };

  const renderSimpleField = (field) => (
    <div key={field.key} className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-1">
        {field.label} {field.required && <span className="text-red-500">*</span>}
      </label>
      <ColumnCombobox
        headers={previewData.headers}
        value={mapping[field.key]}
        onChange={(val) => setMapping({ ...mapping, [field.key]: val })}
      />
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
              <FiUpload size={18} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">Importar Contatos</h3>
              <div className="flex items-center gap-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">Passo {step} de 3</p>
                {previewData && step === 2 && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full font-bold border border-blue-100 dark:border-blue-800/30">
                    {previewData.total_rows} contatos ({previewData.unique_rows} únicos) - {previewData.total_rows} linhas
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={() => { reset(); onClose(); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-400">
            <FiX size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(100vh-180px)]">
          {step === 1 && (
            <div className="space-y-6">
              <div
                onClick={() => fileInputRef.current.click()}
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all group ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 scale-[1.01]'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-900/10'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept=".csv,.xlsx,.xls" 
                  className="hidden" 
                />
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-full text-gray-400 group-hover:text-blue-500 transition-colors">
                  {loading ? <FiLoader className="animate-spin" size={32} /> : <FiUpload size={32} />}
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-700 dark:text-gray-300">
                    {loading ? 'Processando arquivo...' : 'Clique para selecionar ou arraste o arquivo'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Suporta CSV e Excel (.xlsx, .xls)</p>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 rounded-xl p-4 flex gap-3 text-amber-700 dark:text-amber-400">
                <FiAlertCircle className="shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold">Importante:</p>
                  <p>O sistema usa o número de telefone como chave. Se o contato já existir, ele será atualizado.</p>
                </div>
              </div>
            </div>
          )}

          {step === 2 && previewData && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Campos do Sistema</h4>
                  
                  <div className="space-y-3">
                    {renderSimpleField({ key: 'name', label: 'Nome', required: false })}

                    {/* Telefone: coluna única ou dividido em várias colunas (DDI/DDD/Número) */}
                    <div className="flex flex-col gap-1.5 pt-1 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          Telefone <span className="text-red-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => switchPhoneMode(!isPhoneComposite)}
                          className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
                        >
                          {isPhoneComposite ? 'Usar uma única coluna' : 'Dividido em várias colunas?'}
                        </button>
                      </div>

                      {!isPhoneComposite ? (
                        <ColumnCombobox
                          headers={previewData.headers}
                          value={mapping.phone}
                          onChange={(val) => setMapping({ ...mapping, phone: val })}
                        />
                      ) : (
                        <div className="space-y-2 p-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col gap-1">
                              <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider">Coluna DDI</p>
                              <ColumnCombobox
                                headers={previewData.headers}
                                value={mapping.phone.ddi_column || ''}
                                onChange={(val) => updatePhoneComposite('ddi_column', val)}
                                emptyLabel="-- Nenhuma --"
                                small
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider">Coluna DDD</p>
                              <ColumnCombobox
                                headers={previewData.headers}
                                value={mapping.phone.ddd_column || ''}
                                onChange={(val) => updatePhoneComposite('ddd_column', val)}
                                emptyLabel="-- Nenhuma --"
                                small
                              />
                            </div>
                          </div>

                          <div className="flex flex-col gap-1">
                            <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider">Coluna Número <span className="text-red-500">*</span></p>
                            <ColumnCombobox
                              headers={previewData.headers}
                              value={mapping.phone.number_column || ''}
                              onChange={(val) => updatePhoneComposite('number_column', val)}
                              emptyLabel="-- Selecione --"
                              small
                            />
                          </div>

                          {!mapping.phone.ddi_column && (
                            <div className="flex flex-col gap-1">
                              <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider">
                                DDI manual (sem coluna) <span className="text-red-500">*</span>
                              </p>
                              <input
                                type="text"
                                placeholder="Ex: 55"
                                maxLength={4}
                                value={mapping.phone.manual_ddi || ''}
                                onChange={(e) => updatePhoneComposite('manual_ddi', e.target.value.replace(/\D/g, ''))}
                                className="w-full px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-[11px] outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                              />
                            </div>
                          )}

                          <p className="text-[9px] text-gray-400 leading-relaxed">
                            As colunas selecionadas serão unidas (DDI + DDD + Número) para formar o telefone completo.
                          </p>

                          {mapping.phone.number_column && (
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-lg space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[9px] text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider">Prévia do número montado</p>
                                <div className="flex items-center gap-2 shrink-0">
                                  <div className="flex items-center gap-2 text-[8px] font-semibold">
                                    <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-sm bg-purple-400"></span>DDI</span>
                                    <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-sm bg-blue-400"></span>DDD</span>
                                    <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-sm bg-emerald-400"></span>Número</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setIsPhonePreviewMaximized(true)}
                                    title="Ver todos os números montados"
                                    className="p-1 text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                                  >
                                    <FiMaximize2 size={11} />
                                  </button>
                                </div>
                              </div>
                              {getPhonePreviewSamples().length === 0 ? (
                                <p className="text-xs text-gray-400 italic">Sem dados para pré-visualizar.</p>
                              ) : getPhonePreviewSamples().map((p, i) => {
                                const fullLength = p.ddi.length + p.ddd.length + p.number.length;
                                const tooShort = fullLength > 0 && fullLength < 10;
                                return (
                                  <div key={i} className="flex items-center gap-2">
                                    <div className="flex items-center gap-0.5 font-mono text-xs">
                                      <span className={`px-1 py-0.5 rounded ${p.ddi ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                                        {p.ddi || '--'}
                                      </span>
                                      <span className={`px-1 py-0.5 rounded ${p.ddd ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                                        {p.ddd || '--'}
                                      </span>
                                      <span className={`px-1 py-0.5 rounded ${p.number ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                                        {p.number || '--'}
                                      </span>
                                    </div>
                                    {tooShort && <span className="text-[9px] text-red-500 font-semibold">⚠ muito curto</span>}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {renderSimpleField({ key: 'email', label: 'Email', required: false })}

                    {/* Etiquetas a Adicionar */}
                    <div className="flex flex-col gap-1.5 pt-1 border-t border-gray-100 dark:border-gray-700">
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Etiquetas a Adicionar</label>
                      <div className="flex flex-col gap-1">
                        <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider">Via coluna CSV</p>
                        <ColumnCombobox
                          headers={previewData.headers}
                          value={mapping.tags}
                          onChange={(val) => setMapping({ ...mapping, tags: val })}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider">Ou digitar manualmente (para todos)</p>
                        <TagChipInput
                          tags={fixedTags}
                          setTags={setFixedTags}
                          placeholder="ex: lead, cliente-vip..."
                        />
                      </div>
                    </div>

                    {/* Etiquetas a Remover */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Etiquetas a Remover</label>
                      <div className="flex flex-col gap-1">
                        <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider">Via coluna CSV</p>
                        <ColumnCombobox
                          headers={previewData.headers}
                          value={mapping.remove_tags}
                          onChange={(val) => setMapping({ ...mapping, remove_tags: val })}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider">Ou digitar manualmente (para todos)</p>
                        <TagChipInput
                          tags={fixedRemoveTags}
                          setTags={setFixedRemoveTags}
                          placeholder="ex: prospecto, lista-fria..."
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Prévia dos Dados</h4>
                    <button
                      type="button"
                      onClick={() => setIsPreviewMaximized(true)}
                      title="Maximizar prévia"
                      className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                      <FiMaximize2 size={13} />
                    </button>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 overflow-x-auto max-h-[280px]">
                    {renderPreviewTable(true)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && importResult && (
            <div className="py-10 flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-2">
                <FiCheckCircle size={48} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Sucesso!</h3>
                <p className="text-gray-550 dark:text-gray-400">{importResult.message}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 w-full max-w-xs mt-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700">
                  <p className="text-[10px] uppercase font-bold text-gray-400">Importados</p>
                  <p className="text-2xl font-bold text-emerald-600">{importResult.imported}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700">
                  <p className="text-[10px] uppercase font-bold text-gray-400">Erros</p>
                  <p className="text-2xl font-bold text-red-500">{importResult.errors}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <button
            onClick={step === 1 ? onClose : step === 3 ? onClose : () => setStep(step - 1)}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-2 transition-colors"
          >
            {step === 1 ? 'Cancelar' : step === 3 ? 'Fechar' : (
              <><FiArrowLeft /> Voltar</>
            )}
          </button>

          {step === 2 && (
            <button 
              onClick={handleExecuteImport}
              disabled={loading || !!getPhoneMappingError(mapping.phone)}
              className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
            >
              {loading ? (
                <><FiLoader className="animate-spin" /> Processando...</>
              ) : (
                <><FiCheckCircle /> Finalizar Importação</>
              )}
            </button>
          )}

          {step === 3 && (
            <button 
              onClick={onClose}
              className="px-6 py-2 bg-gray-800 dark:bg-gray-700 text-white rounded-xl text-sm font-bold hover:bg-gray-900 dark:hover:bg-gray-600 transition-all"
            >
              Concluído
            </button>
          )}
        </div>
      </div>

      {/* Modal para ver a prévia dos dados maximizada */}
      {isPreviewMaximized && previewData && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-8 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full h-full max-w-6xl overflow-hidden border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-150 flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50 shrink-0">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">Prévia dos Dados</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {previewData.total_rows} contatos ({previewData.unique_rows} únicos)
                </p>
              </div>
              <button
                onClick={() => setIsPreviewMaximized(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-400"
              >
                <FiX size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-900/40">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 overflow-auto">
                {renderPreviewTable(false)}
              </div>
            </div>
          </div>
        </div>
      )}

      <PhonePreviewModal
        isOpen={isPhonePreviewMaximized}
        onClose={() => setIsPhonePreviewMaximized(false)}
        file={file}
        mapping={mapping}
        activeClient={activeClient}
      />

      {/* Modal para ver todas as etiquetas */}
      {selectedTagsForModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-200 p-6">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">
              Todas as etiquetas de: <span className="text-blue-500">{selectedTagsForModal.contactName}</span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Este contato possui {selectedTagsForModal.tags.length} etiquetas associadas:
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-[200px] overflow-y-auto p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-800">
              {selectedTagsForModal.tags.map((tag, idx) => (
                <span key={idx} className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-xs font-medium border border-blue-100 dark:border-blue-800/30">
                  {tag}
                </span>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setSelectedTagsForModal(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-lg transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
