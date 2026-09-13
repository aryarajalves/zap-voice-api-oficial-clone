import React from 'react';
import {
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiTag,
  FiCalendar,
  FiTrash2,
  FiFilter,
  FiChevronLeft,
  FiChevronRight
} from 'react-icons/fi';

export function StatusBadge({ status }) {
  if (status === 'completed')
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-bold rounded-full"><FiCheckCircle /> Concluído</span>;
  if (status === 'completed_with_errors')
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-xs font-bold rounded-full"><FiCheckCircle /> Com falhas</span>;
  if (status === 'scheduled')
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 text-xs font-bold rounded-full"><FiCalendar /> Agendado</span>;
  if (status === 'processing')
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-500/10 text-blue-500 text-xs font-bold rounded-full animate-pulse"><FiClock /> Processando</span>;
  return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-500/10 text-red-500 text-xs font-bold rounded-full"><FiXCircle /> Falhou</span>;
}

export function formatDate(dateStr) {
  if (!dateStr) return '-';
  let str = String(dateStr);
  if (!str.endsWith('Z') && !str.includes('+') && !/-\d{2}:\d{2}$/.test(str)) str += 'Z';
  try {
    return new Date(str).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  } catch (e) {
    return new Date(dateStr).toLocaleString('pt-BR');
  }
}

export default function EmailHistoryTable({
  loading,
  history,
  filteredHistory,
  currentHistory,
  clearFilters,
  setDeleteTarget,
  currentPage,
  setCurrentPage,
  totalPages,
  startIndex,
  endIndex
}) {
  if (loading) {
    return <div className="p-8 text-center text-gray-400">Carregando histórico...</div>;
  }

  if (filteredHistory.length === 0) {
    return (
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
    );
  }

  return (
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
  );
}
