import React, { useState } from 'react';
import { FiClock, FiCheckCircle, FiXCircle, FiInfo, FiChevronLeft, FiChevronRight, FiRefreshCw } from 'react-icons/fi';

export default function InstagramLogsTab({ logsData, loading, onRefresh, page, totalPages, totalItems, onPageChange, statusFilter, onStatusFilterChange }) {
  
  const getStatusBadge = (status) => {
    switch (status) {
      case 'success':
        return (
          <span className="flex items-center gap-1 w-fit px-2.5 py-1 rounded-lg bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400 text-[10px] font-black uppercase tracking-wider">
            <FiCheckCircle size={10} /> Sucesso
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-1 w-fit px-2.5 py-1 rounded-lg bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-[10px] font-black uppercase tracking-wider">
            <FiXCircle size={10} /> Falha
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 w-fit px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px] font-black uppercase tracking-wider">
            <FiInfo size={10} /> Sem Regra
          </span>
        );
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters & Refresh */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-white/50 dark:bg-[#1e293b]/20 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">Filtrar:</label>
          <select
            value={statusFilter || ''}
            onChange={(e) => onStatusFilterChange(e.target.value || null)}
            className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200/50 dark:border-white/10 outline-none text-xs font-bold transition-all text-gray-900 dark:text-gray-100 cursor-pointer"
          >
            <option value="" className="text-gray-900 dark:text-white bg-white dark:bg-gray-800">Todos</option>
            <option value="success" className="text-gray-900 dark:text-white bg-white dark:bg-gray-800">Sucesso</option>
            <option value="no_match" className="text-gray-900 dark:text-white bg-white dark:bg-gray-800">Sem correspondência</option>
            <option value="error" className="text-gray-900 dark:text-white bg-white dark:bg-gray-800">Erros</option>
          </select>
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 disabled:opacity-50 transition-all font-bold text-xs uppercase tracking-widest border border-white/5"
        >
          <FiRefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Atualizar
        </button>
      </div>

      {/* Table/List */}
      <div className="bg-white/50 dark:bg-[#1e293b]/40 rounded-2xl border border-gray-100 dark:border-white/5 backdrop-blur-xl shadow-xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800/50">
              <th className="px-6 py-4 text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Data/Hora</th>
              <th className="px-6 py-4 text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Usuário</th>
              <th className="px-6 py-4 text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Comentário</th>
              <th className="px-6 py-4 text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Status</th>
              <th className="px-6 py-4 text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Ações Executadas / Erro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <tr>
                <td colSpan="5" className="px-6 py-10 text-center">
                  <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <span className="text-xs text-gray-500 italic">Carregando histórico...</span>
                </td>
              </tr>
            ) : logsData.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-10 text-center text-gray-500 italic">
                  Nenhum evento registrado no histórico.
                </td>
              </tr>
            ) : (
              logsData.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.01] transition-all">
                  <td className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <FiClock size={12} />
                      {formatDate(log.created_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-gray-950 dark:text-white">
                      @{log.instagram_username || log.instagram_user_id || 'desconhecido'}
                    </span>
                  </td>
                  <td className="px-6 py-4 max-w-xs">
                    <p className="text-xs text-gray-850 dark:text-gray-300 font-medium truncate" title={log.comment_text}>
                      {log.comment_text || <span className="italic text-gray-400">Vazio / DM</span>}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(log.status)}
                  </td>
                  <td className="px-6 py-4">
                    {log.status === 'error' ? (
                      <p className="text-xs text-red-500 font-semibold" title={log.error_message}>
                        {log.error_message || 'Erro desconhecido ao processar ações'}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-950 dark:text-white font-semibold">
                        {log.actions_taken || 'Nenhuma ação'}
                      </p>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex justify-between items-center bg-white/50 dark:bg-[#1e293b]/20 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
          <span className="text-xs text-gray-500">
            Mostrando {logsData.length} de {totalItems} registros
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => onPageChange(page - 1)}
              className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <FiChevronLeft size={16} />
            </button>
            <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
              Página {page} de {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => onPageChange(page + 1)}
              className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <FiChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
