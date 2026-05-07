import React from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiPlay, FiSearch, FiRefreshCw, FiChevronDown, FiTrash2, FiZap, FiCheck, FiInbox, FiEye, FiNavigation, FiMousePointer, FiActivity } from 'react-icons/fi';
import SearchableSelect from './SearchableSelect';
import { getStatusBadge } from '../helpers';

const DispatchHistoryModal = ({
  isOpen,
  onClose,
  integration,
  dispatchHistory,
  loadingDispatchHistory,
  dispatchSearch,
  setDispatchSearch,
  dispatchEventFilter,
  setDispatchEventFilter,
  dispatchTypeFilter,
  setDispatchTypeFilter,
  dispatchStartDate,
  setDispatchStartDate,
  dispatchEndDate,
  setDispatchEndDate,
  dispatchPage,
  setDispatchPage,
  dispatchLimit,
  setDispatchLimit,
  dispatchTotal,
  selectedDispatchIds,
  setSelectedDispatchIds,
  handleSelectAllDispatches,
  handleToggleSelectDispatch,
  handleBulkDispatchPlay,
  handleBulkDispatchDelete,
  handlePlayDispatch,
  handleCancelDispatch,
  handleBackfillCosts,
  isBackfillingCosts,
  isBulkPlayingDispatches,
  isPlaying,
  isCancelling,
  setSelectedDispatch,
  setIsPipelineModalOpen,
  fetchDispatches,
  setConfirmDeleteDispatch
}) => {
  if (!isOpen || !integration) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#1e293b] border border-white/5 rounded-[2.5rem] w-full max-w-6xl h-full max-h-[90vh] flex flex-col shadow-[0_0_100px_rgba(30,58,138,0.2)] overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-[#0f172a]/80 backdrop-blur">
          <div>
            <h3 className="text-2xl font-black text-white flex items-center gap-3 tracking-tight">
              <div className="p-2 bg-indigo-500/10 rounded-xl">
                <FiPlay className="text-indigo-400" />
              </div>
              Histórico de Disparos: {integration.name}
            </h3>
            <p className="text-gray-500 text-xs mt-1 font-medium bg-white/5 px-2 py-0.5 rounded-lg inline-block">Acompanhe a fila de execução de templates e funis</p>
          </div>
        </div>

        <div className="p-0 flex-1 overflow-hidden relative flex flex-col">
          {/* Barra de Filtros Persistente */}
          <div className="px-8 pt-8 pb-0 shrink-0">
            <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-4 items-end bg-white/[0.02] border border-white/5 p-6 rounded-3xl">
              <div className="md:col-span-1">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block px-1">Buscar</label>
                <div className="relative group">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-indigo-500 transition-colors" size={14} />
                  <input
                    type="text"
                    placeholder="Telefone ou nome..."
                    value={dispatchSearch}
                    onChange={(e) => setDispatchSearch(e.target.value)}
                    className="w-full bg-[#0b1120] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs font-bold text-white focus:ring-2 focus:ring-indigo-500/30 transition-all outline-none shadow-inner"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block px-1">Evento</label>
                <div className="relative">
                  <SearchableSelect
                    options={[
                      { value: "", label: "Todos os Eventos" },
                      ...[...new Set((dispatchHistory || []).map(item => item?.event_type))].filter(Boolean).sort().map(evt => ({
                        value: evt,
                        label: evt.toUpperCase().replace(/_/g, ' ')
                      }))
                    ]}
                    value={dispatchEventFilter}
                    onChange={(val) => {
                      setDispatchEventFilter(val);
                      setDispatchPage(1);
                    }}
                    placeholder="Todos os Eventos"
                    colorClass="focus-within:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block px-1">Tipo</label>
                <div className="relative">
                  <SearchableSelect
                    options={[
                      { value: "", label: "Todos" },
                      { value: "free", label: "Grátis" },
                      { value: "paid", label: "Pagos" },
                      { value: "cancelled", label: "Cancelados" }
                    ]}
                    value={dispatchTypeFilter}
                    onChange={(val) => {
                      setDispatchTypeFilter(val);
                      setDispatchPage(1);
                    }}
                    placeholder="Todos"
                    colorClass="focus-within:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="md:col-span-2 flex gap-3">
                <div className="flex-1">
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block px-1">Desde</label>
                  <input
                    type="date"
                    value={dispatchStartDate}
                    onChange={(e) => setDispatchStartDate(e.target.value)}
                    className="w-full bg-[#0b1120] border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:ring-2 focus:ring-indigo-500/30 transition-all outline-none [color-scheme:dark] shadow-inner"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block px-1">Até</label>
                  <input
                    type="date"
                    value={dispatchEndDate}
                    onChange={(e) => setDispatchEndDate(e.target.value)}
                    className="w-full bg-[#0b1120] border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:ring-2 focus:ring-indigo-500/30 transition-all outline-none [color-scheme:dark] shadow-inner"
                  />
                </div>
                <div className="flex items-end mb-0.5">
                  <button
                    onClick={() => {
                      setDispatchSearch('');
                      setDispatchEventFilter('');
                      setDispatchTypeFilter('');
                      setDispatchStartDate('');
                      setDispatchEndDate('');
                      setDispatchPage(1);
                      fetchDispatches(integration.id, 1, dispatchLimit, '', '', '', '', '');
                    }}
                    className="p-2.5 bg-white/5 hover:bg-orange-500/20 text-gray-400 hover:text-orange-500 rounded-xl transition-all border border-transparent hover:border-orange-500/20"
                    title="Limpar Filtros e Resetar"
                  >
                    <FiRefreshCw size={14} />
                  </button>
                </div>
              </div>

              <div className="md:col-span-5 flex justify-end">
                <button
                  onClick={handleBackfillCosts}
                  disabled={isBackfillingCosts}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 rounded-xl transition-all border border-amber-500/20 hover:border-amber-500/40 text-[10px] font-black tracking-widest uppercase disabled:opacity-50"
                  title="Calcular custos históricos para disparos que mostram 'R$ —'"
                >
                  {isBackfillingCosts ? <FiRefreshCw size={12} className="animate-spin" /> : <FiRefreshCw size={12} />}
                  {isBackfillingCosts ? 'Calculando...' : 'Calcular Custos'}
                </button>
              </div>
            </div>
          </div>

          {loadingDispatchHistory ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
              <p className="text-gray-500 font-bold tracking-widest text-xs">CARREGANDO FILA...</p>
            </div>
          ) : dispatchHistory.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
              <div className="p-6 bg-white/5 rounded-full mb-6">
                <FiZap size={48} className="text-gray-700" />
              </div>
              <h4 className="text-xl font-bold text-white mb-2">Nenhum disparo encontrado</h4>
              <p className="text-gray-500 max-w-md">Não há disparos para os filtros aplicados. Tente limpar os filtros ou selecionar outro período.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-auto px-8 pb-8 custom-scrollbar">
              <div className="pt-2">
                {/* Bulk Actions Bar */}
                {selectedDispatchIds.length > 0 && (
                  <div className="mb-4 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-500 text-white text-[10px] font-black px-2 py-1 rounded-lg">
                        {selectedDispatchIds.length} SELECIONADOS
                      </div>
                      <p className="text-xs text-indigo-300 font-medium">O que deseja fazer com estes disparos?</p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleBulkDispatchPlay}
                        disabled={isBulkPlayingDispatches}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all active:scale-95 disabled:opacity-50"
                      >
                        {isBulkPlayingDispatches ? <FiRefreshCw className="animate-spin" /> : <FiRefreshCw />}
                        Reprocessar Selecionados
                      </button>
                      <button
                        onClick={() => setConfirmDeleteDispatch({ isOpen: true, type: 'bulk', ids: selectedDispatchIds })}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all font-bold text-[10px] uppercase tracking-tighter"
                      >
                        <FiTrash2 size={12} /> Excluir ({selectedDispatchIds.length})
                      </button>
                      <button
                        onClick={() => setSelectedDispatchIds([])}
                        className="text-gray-500 hover:text-white text-[10px] font-black tracking-widest uppercase px-2"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
                <table className="w-full text-left border-separate border-spacing-y-3">
                  <thead>
                    <tr className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-4">
                      <th className="px-6 pb-2 w-10">
                        <input
                          type="checkbox"
                          onChange={(e) => handleSelectAllDispatches(e, Array.isArray(dispatchHistory) ? dispatchHistory : [])}
                          checked={selectedDispatchIds.length > 0 && Array.isArray(dispatchHistory) && selectedDispatchIds.length === dispatchHistory.length}
                          className="w-4 h-4 rounded border-white/20 bg-white/5 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                        />
                      </th>
                      <th className="px-6 pb-2">Destinatário</th>
                      <th className="px-6 pb-2">Status / Ações</th>
                      <th className="px-6 pb-2">Evento / Template</th>
                      <th className="px-6 pb-2 text-right">Execução / Timestamps</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.02]">
                    {(Array.isArray(dispatchHistory) ? dispatchHistory : []).map((item) => (
                      <tr key={item.id} className={`group transition-all duration-300 ${selectedDispatchIds.includes(item.id) ? 'bg-indigo-500/10' : 'bg-white/5 hover:bg-white/[0.08]'}`}>
                        <td className="px-6 py-5 rounded-l-[1.5rem] first:border-l border-y border-white/5">
                          <input
                            type="checkbox"
                            checked={selectedDispatchIds.includes(item.id)}
                            onChange={() => handleToggleSelectDispatch(item.id)}
                            className="w-4 h-4 rounded border-white/20 bg-white/5 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                          />
                        </td>


                        {/* 1. Destinatário */}
                        <td className="px-6 py-5 border-y border-white/5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 text-xs font-bold font-mono">
                              {item.contact_phone?.slice(-2) || '??'}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-gray-300 text-sm font-bold">{item.contact_name || 'Desconhecido'}</span>
                              <span className="text-gray-500 font-mono text-xs">{item.contact_phone}</span>
                            </div>
                          </div>
                        </td>

                        {/* 2. Status / Ações */}
                        <td className="px-6 py-5 border-y border-white/5">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              {getStatusBadge(item.status)}
                              <button
                                onClick={() => { setSelectedDispatch(item); setIsPipelineModalOpen(true); }}
                                className="p-2 bg-indigo-500/10 hover:bg-indigo-50 text-indigo-400 hover:text-white rounded-lg transition-all active:scale-95 flex items-center gap-1.5 font-black text-[9px] uppercase tracking-wider"
                                title="Ver Pipeline"
                              >
                                <FiActivity size={14} /> <span>Pipeline</span>
                              </button>
                              <button
                                onClick={() => handlePlayDispatch(item.id)}
                                disabled={isPlaying[item.id]}
                                className="p-2 bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-white rounded-lg transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 font-black text-[9px] uppercase tracking-wider"
                                title="Disparar Agora"
                              >
                                {isPlaying[item.id] ? <FiRefreshCw className="animate-spin" size={14} /> : <FiPlay size={14} fill="currentColor" />}
                                <span>Disparar</span>
                              </button>
                            </div>
                            <div className="flex justify-start">
                              <button
                                onClick={() => setConfirmDeleteDispatch({ isOpen: true, type: 'single', id: item.id })}
                                disabled={isCancelling[item.id]}
                                className="px-3 py-1 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 text-[9px] font-black uppercase"
                                title="Excluir Registro"
                              >
                                {isCancelling[item.id] ? <FiRefreshCw className="animate-spin" size={12} /> : <FiTrash2 size={12} />}
                                <span>Excluir</span>
                              </button>
                            </div>
                            {(item.status === 'cancelled' || item.status === 'failed') && item.failure_reason && (
                              <div className="text-[9px] text-red-500 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-lg mt-1 leading-tight max-w-[220px] break-words italic font-bold">
                                ⚠️  {item.failure_reason}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 3. Evento / Template */}
                        <td className="px-6 py-5 border-y border-white/5">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="text-white font-bold text-sm tracking-tight">{(item.event_type || 'disparo')?.toUpperCase().replace('_', ' ')}</span>
                              {item.status === 'cancelled' ? (
                                <span className="text-[10px] bg-gray-600 text-gray-300 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">Cancelado</span>
                              ) : item.sent_as === 'FREE_MESSAGE' ? (
                                <span className="text-[10px] bg-emerald-500 text-black px-2 py-0.5 rounded-full font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20">GRÁTIS</span>
                              ) : item.sent_as === 'TEMPLATE' ? (
                                <span className="text-[10px] bg-amber-500 text-black px-2 py-0.5 rounded-full font-black uppercase tracking-widest shadow-lg shadow-amber-500/20">PAGO</span>
                              ) : (
                                <span className="text-[10px] bg-indigo-500 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20">TEMPLATE</span>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-500 mt-0.5">
                              {item.template_name ? `Template: ${item.template_name}` : (item.funnel_id ? `Funil: ${item.funnel_id}` : 'Ação Interna')}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1 border-white/10">
                              <span className="flex items-center gap-0.5 text-[9px] font-bold text-emerald-500 px-1 rounded" title="Enviados">
                                <FiCheck size={10} /> {item.total_sent || (item.status === 'completed' ? 1 : 0)}
                              </span>
                              <span className="flex items-center gap-0.5 text-[9px] font-bold text-blue-400 px-1 rounded" title="Entregues">
                                <FiInbox size={10} /> {item.total_delivered || 0}
                              </span>
                              <span className="flex items-center gap-0.5 text-[9px] font-bold text-purple-400 px-1 rounded" title="Lidos">
                                <FiEye size={10} /> {item.total_read || 0}
                              </span>
                              <button 
                                onClick={() => { setSelectedDispatch(item); setIsPipelineModalOpen(true); }}
                                className="flex items-center gap-0.5 text-[9px] font-bold text-indigo-400 hover:text-white hover:bg-indigo-500/20 px-1 rounded transition-all group/rocket" 
                                title="Ver Pipeline do Funil"
                              >
                                <FiNavigation size={10} className="rotate-45 text-indigo-400 group-hover/rocket:text-white" /> {item.funnel_id ? 'Funil' : 'Log'}
                              </button>
                              <span className="flex items-center gap-0.5 text-[9px] font-bold text-orange-400 px-1 rounded" title="Interações (Cliques)">
                                <FiMousePointer size={10} /> {item.total_clicks || (item.is_interaction ? 1 : 0)}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 4. Execução / Timestamps */}
                        <td className="px-6 py-5 rounded-r-[1.5rem] last:border-r border-y border-white/5 text-right">
                          <div className="flex flex-col gap-1.5 items-end text-right">
                            <div className="flex items-center gap-1.5 opacity-60">
                              <span className="text-[9px] font-black uppercase text-gray-400 tracking-tighter">Chegou:</span>
                              <span className="text-gray-400 text-[11px] font-mono">{new Date(item.created_at).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-1.5 pt-1 border-t border-white/5">
                              <span className="text-[9px] font-black uppercase text-blue-500 tracking-tighter">Disparo:</span>
                              <span className="text-blue-300 text-[12px] font-bold font-mono">{new Date(item.scheduled_time).toLocaleString()}</span>
                            </div>
                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1 flex items-center gap-1.5">
                              <div className={`w-1.5 h-1.5 rounded-full ${new Date(item.scheduled_time) > new Date() ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`}></div>
                              {new Date(item.scheduled_time) > new Date() ? 'Aguardando Delay' : 'Processando'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination Controls */}
                <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-6 pb-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Mostrar:</span>
                      <select
                        value={dispatchLimit}
                        onChange={(e) => {
                          setDispatchLimit(Number(e.target.value));
                          setDispatchPage(1);
                        }}
                        className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-indigo-500/50 cursor-pointer"
                      >
                        <option value="20" className="bg-[#0b1120]">20</option>
                        <option value="50" className="bg-[#0b1120]">50</option>
                        <option value="100" className="bg-[#0b1120]">100</option>
                      </select>
                    </div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                      Total: <span className="text-white">{dispatchTotal}</span> registros
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setDispatchPage(prev => Math.max(1, prev - 1))}
                      disabled={dispatchPage === 1}
                      className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                    >
                      <FiChevronDown className="rotate-90" />
                    </button>

                    <div className="flex items-center gap-1">
                      {[...Array(Math.ceil(dispatchTotal / (dispatchLimit || 20)) || 0)].map((_, i) => {
                        const p = i + 1;
                        const totalPages = Math.ceil(dispatchTotal / (dispatchLimit || 20)) || 1;
                        if (
                          p === 1 ||
                          p === totalPages ||
                          (p >= dispatchPage - 2 && p <= dispatchPage + 2)
                        ) {
                          return (
                            <button
                              key={p}
                              onClick={() => setDispatchPage(p)}
                              className={`w-10 h-10 rounded-xl text-[11px] font-black transition-all active:scale-90 ${dispatchPage === p ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'}`}
                            >
                              {p}
                            </button>
                          );
                        }
                        if (p === dispatchPage - 3 || p === dispatchPage + 3) {
                          return <span key={p} className="text-gray-600">...</span>;
                        }
                        return null;
                      })}
                    </div>

                    <button
                      onClick={() => {
                        const totalPages = Math.ceil(dispatchTotal / (dispatchLimit || 20)) || 1;
                        setDispatchPage(prev => Math.max(1, Math.min(totalPages, prev + 1)));
                      }}
                      disabled={dispatchPage >= (Math.ceil(dispatchTotal / (dispatchLimit || 20)) || 1)}
                      className="p-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all disabled:opacity-20 disabled:cursor-not-allowed group/btn"
                    >
                      <FiChevronDown className="-rotate-90" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-white/5 bg-[#0f172a]/50 flex justify-between items-center px-12 shrink-0">
          <div className="text-xs text-gray-500 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            Monitoramento em tempo real ativo
          </div>
          <div className="flex items-center gap-6">
            <button
              onClick={() => fetchDispatches(integration.id, dispatchPage, dispatchLimit, dispatchSearch, dispatchEventFilter, dispatchStartDate, dispatchEndDate)}
              className="flex items-center gap-2 text-[10px] font-black text-white/40 hover:text-white tracking-widest uppercase transition-colors"
            >
              <FiRefreshCw size={12} /> Atualizar Fila
            </button>
            <button
              onClick={onClose}
              className="px-8 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black tracking-widest uppercase border border-white/10 transition-all active:scale-95"
            >
              Fechar Painel
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default DispatchHistoryModal;
