import React, { useEffect, useState, useCallback } from 'react';
import { FiX, FiSearch, FiLoader, FiUsers } from 'react-icons/fi';
import { useClient } from '../../../contexts/ClientContext';
import { API_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';

const STATUS_TABS = [
  { key: '', label: 'Todos' },
  { key: 'imported', label: 'Importados (novos)' },
  { key: 'updated', label: 'Atualizados' },
  { key: 'rejected', label: 'Rejeitados' },
  { key: 'error', label: 'Erros' },
];

// Classes estáticas (não interpoladas) — o Tailwind JIT precisa ver as classes
// completas no código para gerá-las, não aceita template strings dinâmicas.
const STATUS_META = {
  imported: { label: 'Importado', badgeClass: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/30' },
  updated: { label: 'Atualizado', badgeClass: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800/30' },
  rejected_invalid_phone: { label: 'Telefone inválido', badgeClass: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800/30' },
  rejected_duplicate_file: { label: 'Duplicado no arquivo', badgeClass: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800/30' },
  error: { label: 'Erro ao processar', badgeClass: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800/30' },
};

export default function ImportResultsModal({ isOpen, onClose, importItem }) {
  const { activeClient } = useClient();
  const [activeTab, setActiveTab] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(30);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState({});
  const [loading, setLoading] = useState(false);

  // Reset ao abrir para uma importação diferente
  useEffect(() => {
    if (isOpen) {
      setActiveTab('');
      setSearch('');
      setDebouncedSearch('');
      setPage(0);
    }
  }, [isOpen, importItem?.id]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(0);
  }, [activeTab, debouncedSearch, limit]);

  const rejectedTotal = (statusCounts.rejected_invalid_phone || 0) + (statusCounts.rejected_duplicate_file || 0);
  const countFor = useCallback((key) => {
    if (key === '') return Object.values(statusCounts).reduce((a, b) => a + b, 0);
    if (key === 'rejected') return rejectedTotal;
    return statusCounts[key] || 0;
  }, [statusCounts, rejectedTotal]);

  const fetchResults = useCallback(async () => {
    if (!isOpen || !importItem?.id || !activeClient?.id) return;

    // Se já conhecemos os contadores de status, não há busca por texto e a aba tem 0 itens,
    // responde instantaneamente sem fazer requisição de rede nem travar a UI no spinner.
    if (!debouncedSearch.trim() && Object.keys(statusCounts).length > 0 && countFor(activeTab) === 0) {
      setRows([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setRows([]);
    setTotal(countFor(activeTab));

    try {
      const params = new URLSearchParams({
        skip: String(page * limit),
        limit: String(limit),
      });
      if (activeTab) params.set('status', activeTab);
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());

      const response = await fetchWithAuth(
        `${API_URL}/leads/import/${importItem.id}/results?${params.toString()}`,
        {},
        activeClient.id
      );
      if (response && response.ok) {
        const data = await response.json();
        setRows(data.items || []);
        setTotal(data.total || 0);
        setStatusCounts(data.status_counts || {});
      }
    } catch (err) {
      console.error('Erro ao carregar resultados da importação:', err);
    } finally {
      setLoading(false);
    }
  }, [isOpen, importItem?.id, activeClient?.id, activeTab, debouncedSearch, page, limit, countFor, statusCounts]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  if (!isOpen || !importItem) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50 shrink-0">
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FiUsers /> Detalhes da Importação
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-md">{importItem.filename}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-400 shrink-0">
            <FiX size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-100 dark:border-gray-700 overflow-x-auto shrink-0">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {tab.label} ({countFor(tab.key).toLocaleString('pt-BR')})
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou telefone..."
              className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto px-6 py-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <FiLoader className="animate-spin mb-2" size={24} />
              <p className="text-xs font-semibold">Carregando...</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <p className="text-xs font-semibold">Nenhum contato encontrado.</p>
            </div>
          ) : (
            <table className="w-full text-xs text-left border-collapse">
              <thead className="sticky top-0 bg-white dark:bg-gray-800">
                <tr>
                  <th className="px-3 py-2 font-bold border-b border-gray-100 dark:border-gray-700">Nome</th>
                  <th className="px-3 py-2 font-bold border-b border-gray-100 dark:border-gray-700">Telefone</th>
                  <th className="px-3 py-2 font-bold border-b border-gray-100 dark:border-gray-700">Status</th>
                  <th className="px-3 py-2 font-bold border-b border-gray-100 dark:border-gray-700">Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {rows.map(r => {
                  const meta = STATUS_META[r.status] || { label: r.status, badgeClass: 'bg-gray-50 dark:bg-gray-700/30 text-gray-500 dark:text-gray-400 border-gray-100 dark:border-gray-700/40' };
                  return (
                    <tr key={r.id}>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {r.name || <span className="text-gray-400 italic">sem nome</span>}
                      </td>
                      <td className="px-3 py-2 font-mono text-gray-700 dark:text-gray-300 whitespace-nowrap">{r.phone || '-'}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border whitespace-nowrap ${meta.badgeClass}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{r.reason || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer / Pagination */}
        <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between shrink-0 gap-3">
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold whitespace-nowrap">
              {total > 0 ? `Mostrando ${page * limit + 1}-${Math.min((page + 1) * limit, total)} de ${total.toLocaleString('pt-BR')}` : ''}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-gray-400 font-semibold whitespace-nowrap">Por página:</span>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="px-2 py-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
                <option value={500}>500</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-[11px] font-bold disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setPage(p => ((p + 1) * limit < total ? p + 1 : p))}
              disabled={(page + 1) * limit >= total}
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
