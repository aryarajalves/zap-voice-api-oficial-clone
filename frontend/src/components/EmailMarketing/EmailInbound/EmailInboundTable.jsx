import React from 'react';
import { FiMessageSquare, FiSearch, FiUser, FiClock } from 'react-icons/fi';
import { formatDate } from './constants';

const EmailInboundTable = ({
  inbounds,
  loading,
  search,
  setSearch,
  onRefresh,
  onOpenInbound
}) => {
  return (
    <>
      {/* Barra de Filtro e Busca */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Buscar por lead, e-mail ou assunto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-3.5 py-2 pl-9 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-800 dark:text-white shadow-sm"
          />
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="px-3.5 py-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
        >
          Atualizar Lista
        </button>
      </div>

      {/* Tabela de Respostas Recebidas */}
      {loading ? (
        <div className="p-8 text-center text-gray-400">Carregando respostas recebidas...</div>
      ) : inbounds.length === 0 ? (
        <div className="bg-white dark:bg-slate-800/80 p-8 rounded-2xl border border-gray-100 dark:border-white/10 text-center space-y-3">
          <FiMessageSquare size={40} className="mx-auto text-gray-400" />
          <h3 className="font-bold text-gray-700 dark:text-gray-200">Nenhuma resposta recebida até o momento</h3>
          <p className="text-xs text-gray-500">As respostas enviadas pelos seus leads aparecerão nesta lista em tempo real.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800/80 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-white/10 shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-slate-900/60 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="p-4">Status</th>
                  <th className="p-4">Remetente / Lead</th>
                  <th className="p-4">Assunto</th>
                  <th className="p-4">Data / Hora (Brasília)</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {inbounds.map(item => (
                  <tr
                    key={item.id}
                    className={`hover:bg-blue-500/5 transition-colors cursor-pointer ${
                      !item.is_read ? 'bg-blue-500/10 font-bold' : ''
                    }`}
                    onClick={() => onOpenInbound(item)}
                  >
                    <td className="p-4">
                      {!item.is_read ? (
                        <span className="px-2.5 py-1 bg-blue-500 text-white text-[10px] font-bold rounded-full animate-pulse shadow-sm">
                          NOVA
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-[10px] font-semibold rounded-full">
                          LIDA
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-blue-600/10 text-blue-600 rounded-full flex items-center justify-center font-bold">
                          <FiUser size={12} />
                        </div>
                        <div>
                          <div className="text-gray-800 dark:text-white">{item.from_name || 'Lead sem nome'}</div>
                          <div className="text-[11px] text-gray-400 font-mono">{item.from_email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-gray-800 dark:text-white max-w-xs truncate">{item.subject || 'Sem assunto'}</div>
                    </td>
                    <td className="p-4 text-gray-500 font-mono text-[11px]">
                      <div className="flex items-center gap-1">
                        <FiClock size={12} /> {formatDate(item.created_at)}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onOpenInbound(item); }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-[11px] transition-all shadow-sm"
                      >
                        Ver & Responder
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
};

export default EmailInboundTable;
