import React, { useState, useEffect } from 'react';
import { FiX, FiLoader, FiCheck } from 'react-icons/fi';
import { API_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';

export default function PhonePreviewModal({ isOpen, onClose, file, mapping, activeClient }) {
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(100);
  const [items, setItems] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [validCount, setValidCount] = useState(0);
  const [invalidCount, setInvalidCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) setPage(0);
  }, [isOpen]);

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit);
    setPage(0);
  };

  useEffect(() => {
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
          <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-400 shrink-0">
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
