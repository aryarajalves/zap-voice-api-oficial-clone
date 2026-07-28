import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiClock, FiCheckCircle, FiXCircle, FiTag, FiRefreshCw, FiChevronLeft, FiChevronRight, FiSearch, FiFilter, FiX, FiCalendar, FiTrash2, FiAlertTriangle } from 'react-icons/fi';
import { API_URL } from '../../config';
import toast from 'react-hot-toast';

import { useClient } from '../../contexts/ClientContext';

export default function EmailHistoryTab() {
  const { activeClient } = useClient();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  // State para confirmação de deleção
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // --- Filtros ---
  const [filterSearch, setFilterSearch] = useState('');   // por nome de campanha / assunto
  const [filterStatus, setFilterStatus] = useState('');   // '' = todos
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Client-ID': activeClient?.id ? String(activeClient.id) : ''
    };
  };

  useEffect(() => {
    fetchHistory();
  }, [activeClient]);

  // WebSocket Realtime Sync
  useEffect(() => {
    if (!activeClient) return;

    let ws = null;
    try {
      const token = localStorage.getItem('token');
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      const port = '8000';
      const wsUrl = `${wsProtocol}//${host}:${port}/ws?token=${token}`;

      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'email_dispatch_updated' && message.data) {
            const data = message.data;
            if (activeClient?.id && data.client_id && String(data.client_id) !== String(activeClient.id)) {
              return;
            }

            setHistory(prevHistory => {
              const exists = prevHistory.some(item => item.id === data.dispatch_id);
              if (exists) {
                return prevHistory.map(item => {
                  if (item.id === data.dispatch_id) {
                    return {
                      ...item,
                      status: data.status,
                      total_sent: data.total_sent !== undefined ? data.total_sent : item.total_sent,
                      total_failed: data.total_failed !== undefined ? data.total_failed : item.total_failed,
                      failure_reason: data.failure_reason || item.failure_reason
                    };
                  }
                  return item;
                });
              } else {
                fetchHistory();
                return prevHistory;
              }
            });
          }
        } catch (e) {
          console.error("Erro ao processar evento WS no histórico de e-mails:", e);
        }
      };
    } catch (err) {
      console.error("Erro ao conectar no WebSocket do histórico de e-mails:", err);
    }

    return () => {
      if (ws) ws.close();
    };
  }, [activeClient]);

  const fetchHistory = async () => {
    if (!activeClient) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/email/history?limit=500`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setHistory(data || []);
        setCurrentPage(1);
      }
    } catch (err) {
      console.error("Erro ao carregar histórico de e-mails:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDispatch = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const res = await fetch(`${API_URL}/email/history/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      if (res.ok) {
        toast.success("Registro de disparo deletado com sucesso!");
        setHistory(prev => prev.filter(item => item.id !== deleteTarget.id));
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.detail || "Erro ao deletar registro.");
      }
    } catch (err) {
      console.error("Erro ao excluir disparo:", err);
      toast.error("Falha ao comunicar com o servidor.");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    let str = String(dateStr);
    if (!str.endsWith('Z') && !str.includes('+') && !/-\d{2}:\d{2}$/.test(str)) str += 'Z';
    try {
      return new Date(str).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    } catch (e) {
      return new Date(dateStr).toLocaleString('pt-BR');
    }
  };

  // ---------- Lógica de filtros (frontend) ----------
  const filteredHistory = history.filter(item => {
    // Filtro por status
    if (filterStatus && item.status !== filterStatus) return false;

    // Filtro por nome / assunto (case-insensitive)
    if (filterSearch.trim()) {
      const q = filterSearch.trim().toLowerCase();
      const inTitle = (item.title || '').toLowerCase().includes(q);
      const inSubject = (item.subject || '').toLowerCase().includes(q);
      const inTag = (item.tag_name || '').toLowerCase().includes(q);
      if (!inTitle && !inSubject && !inTag) return false;
    }

    // Filtro por data (usando created_at comparado em Brasília)
    if (filterDateFrom || filterDateTo) {
      let str = String(item.created_at || '');
      if (!str.endsWith('Z') && !str.includes('+') && !/-\d{2}:\d{2}$/.test(str)) str += 'Z';
      const itemDate = new Date(str);

      if (filterDateFrom) {
        const fromDate = new Date(filterDateFrom + 'T00:00:00-03:00');
        if (itemDate < fromDate) return false;
      }
      if (filterDateTo) {
        const toDate = new Date(filterDateTo + 'T23:59:59-03:00');
        if (itemDate > toDate) return false;
      }
    }

    return true;
  });

  const hasFilters = filterSearch || filterStatus || filterDateFrom || filterDateTo;

  const clearFilters = () => {
    setFilterSearch('');
    setFilterStatus('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setCurrentPage(1);
  };

  // Resetar para página 1 quando filtros mudarem
  useEffect(() => { setCurrentPage(1); }, [filterSearch, filterStatus, filterDateFrom, filterDateTo]);

  const totalPages = Math.ceil(filteredHistory.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredHistory.length);
  const currentHistory = filteredHistory.slice(startIndex, endIndex);

  // Badge de status reutilizável
  const StatusBadge = ({ status }) => {
    if (status === 'completed')
      return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-bold rounded-full"><FiCheckCircle /> Concluído</span>;
    if (status === 'completed_with_errors')
      return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-xs font-bold rounded-full"><FiCheckCircle /> Com falhas</span>;
    if (status === 'scheduled')
      return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 text-xs font-bold rounded-full"><FiCalendar /> Agendado</span>;
    if (status === 'processing')
      return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-500/10 text-blue-500 text-xs font-bold rounded-full animate-pulse"><FiClock /> Processando</span>;
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-500/10 text-red-500 text-xs font-bold rounded-full"><FiXCircle /> Falhou</span>;
  };

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <FiClock className="text-blue-500" /> Histórico de Disparos de E-mail
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Auditoria completa dos envios de e-mail marketing realizados.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
            <span>Mostrar por página:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-white px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm"
            >
              <option value={20}>20 disparos</option>
              <option value={50}>50 disparos</option>
              <option value={100}>100 disparos</option>
              <option value={200}>200 disparos</option>
            </select>
          </div>

          <button
            onClick={fetchHistory}
            className="p-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl transition-all shadow-sm"
            title="Atualizar histórico"
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Painel de Filtros */}
      <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <FiFilter className="text-blue-500" size={14} />
          <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Filtros</span>
          {hasFilters && (
            <button
              onClick={clearFilters}
              id="btn-clear-history-filters"
              className="ml-auto flex items-center gap-1 px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-semibold rounded-lg transition-all"
            >
              <FiX size={12} /> Limpar filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Busca por nome / assunto */}
          <div className="relative flex items-center">
            <FiSearch className="absolute left-3 text-gray-400 pointer-events-none" size={13} />
            <input
              type="text"
              id="input-history-search"
              placeholder="Buscar campanha ou assunto..."
              value={filterSearch}
              onChange={e => setFilterSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          {/* Filtro por status */}
          <div>
            <select
              id="select-history-status"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            >
              <option value="">Todos os status</option>
              <option value="completed">✅ Concluído</option>
              <option value="completed_with_errors">⚠️ Concluído com falhas</option>
              <option value="failed">❌ Falhou</option>
              <option value="scheduled">📅 Agendado</option>
              <option value="processing">⏳ Processando</option>
            </select>
          </div>

          {/* Data de início */}
          <div>
            <input
              type="date"
              id="input-history-date-from"
              value={filterDateFrom}
              onChange={e => setFilterDateFrom(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              title="Data inicial (Brasília)"
            />
            <p className="text-[10px] text-gray-400 mt-0.5 pl-1">De (data)</p>
          </div>

          {/* Data de fim */}
          <div>
            <input
              type="date"
              id="input-history-date-to"
              value={filterDateTo}
              onChange={e => setFilterDateTo(e.target.value)}
              min={filterDateFrom || undefined}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              title="Data final (Brasília)"
            />
            <p className="text-[10px] text-gray-400 mt-0.5 pl-1">Até (data)</p>
          </div>
        </div>

        {/* Contador de resultados filtrados */}
        {hasFilters && (
          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Exibindo <span className="font-bold text-blue-600 dark:text-blue-400">{filteredHistory.length}</span> resultado(s) de{' '}
            <span className="font-bold">{history.length}</span> no total.
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-400">Carregando histórico...</div>
      ) : filteredHistory.length === 0 ? (
        <div className="bg-white dark:bg-slate-800/80 p-8 rounded-2xl border border-gray-100 dark:border-white/10 text-center space-y-3">
          {history.length === 0 ? (
            <>
              <FiClock size={40} className="mx-auto text-gray-400" />
              <h3 className="font-bold text-gray-700 dark:text-gray-200">Nenhum disparo de e-mail realizado ainda</h3>
              <p className="text-xs text-gray-500">Realize um disparo na aba "Disparo em Massa" para visualizar o histórico aqui.</p>
            </>
          ) : (
            <>
              <FiFilter size={40} className="mx-auto text-gray-400" />
              <h3 className="font-bold text-gray-700 dark:text-gray-200">Nenhum resultado com os filtros aplicados</h3>
              <button onClick={clearFilters} className="text-xs text-blue-500 hover:underline">Limpar filtros</button>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800/80 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-white/10 shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-50 dark:bg-slate-900/60 text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-4">Campanha</th>
                  <th className="px-6 py-4">Etiqueta</th>
                  <th className="px-6 py-4">Contatos</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Data (Horário de Brasília)</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {currentHistory.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/30 transition-all">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-800 dark:text-white">{item.title}</div>
                      <div className="text-xs text-gray-500 truncate max-w-xs">📌 {item.subject}</div>
                    </td>
                    <td className="px-6 py-4">
                      {item.tag_name ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded-lg">
                          <FiTag size={12} /> {item.tag_name}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Todos</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 text-xs">
                        <span className="font-semibold text-gray-700 dark:text-gray-300">🚀 {item.total_contacts}</span>
                        <span className="text-green-600 dark:text-green-400 font-semibold">✅ {item.total_sent}</span>
                        {item.total_failed > 0 && (
                          <span className="text-red-500 font-semibold">❌ {item.total_failed}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={item.status} />
                      {item.failure_reason && (
                        <div className="mt-1 text-[10px] text-red-400 max-w-[200px] leading-tight" title={item.failure_reason}>
                          ⚠️ {item.failure_reason.length > 80 ? item.failure_reason.slice(0, 80) + '...' : item.failure_reason}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 font-mono">
                      {formatDate(item.created_at)}
                      {item.scheduled_time && (
                        <div className={`mt-0.5 ${item.status === 'scheduled' ? 'text-indigo-400' : 'text-gray-400'}`}>
                          🗓️ Agendado: {formatDate(item.scheduled_time)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setDeleteTarget(item)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                        title="Deletar registro do histórico"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Barra de Paginação */}
          <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 gap-3 bg-gray-50/50 dark:bg-slate-900/30">
            <div>
              Exibindo <span className="font-bold text-gray-700 dark:text-gray-200">{filteredHistory.length > 0 ? startIndex + 1 : 0}</span> a{' '}
              <span className="font-bold text-gray-700 dark:text-gray-200">{endIndex}</span> de{' '}
              <span className="font-bold text-gray-700 dark:text-gray-200">{filteredHistory.length}</span> disparos
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <FiChevronLeft size={14} /> Anterior
              </button>
              <span className="px-2 font-semibold text-gray-700 dark:text-gray-300">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage >= totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Próximo <FiChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Deleção com Portal */}
      {deleteTarget && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-3 bg-red-500/10 rounded-xl">
                <FiAlertTriangle size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">Excluir Histórico de Disparo</h3>
                <p className="text-xs text-gray-400">Esta ação não poderá ser desfeita.</p>
              </div>
            </div>

            <p className="text-sm text-gray-300">
              Tem certeza que deseja apagar o registro do disparo <strong className="text-white">"{deleteTarget.title}"</strong> (Assunto: <em>{deleteTarget.subject}</em>)?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-gray-300 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteDispatch}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {deleting ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
