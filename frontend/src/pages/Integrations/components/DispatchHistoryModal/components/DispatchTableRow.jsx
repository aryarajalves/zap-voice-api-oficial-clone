import React from 'react';
import { FiPlay, FiTrash2, FiCheck, FiInbox, FiEye, FiMousePointer, FiActivity, FiRefreshCw } from 'react-icons/fi';
import { getStatusBadge } from '../../../helpers';

const getFollowupConfig = (status, scheduledTime) => {
  const timeStr = scheduledTime 
    ? new Date(scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    : '';
  switch (status) {
    case 'completed':
      return {
        text: 'Follow-up Disparado',
        className: 'text-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/20 border border-emerald-500/20',
        icon: '✅'
      };
    case 'cancelled':
    case 'canceled':
      return {
        text: 'Follow-up Cancelado',
        className: 'text-gray-400 bg-white/5 hover:bg-white/[0.08] border border-white/10',
        icon: '🚫'
      };
    case 'failed':
      return {
        text: 'Follow-up Falhou',
        className: 'text-red-500 bg-red-500/5 hover:bg-red-500/20 border border-red-500/20',
        icon: '⚠️'
      };
    default:
      return {
        text: `Follow-up Ativo (${timeStr})`,
        className: 'text-orange-500 bg-orange-500/5 hover:bg-orange-500/20 border border-orange-500/20 animate-pulse',
        icon: '⏳'
      };
  }
};

const DispatchTableRow = ({
  item,
  selectedDispatchIds,
  handleToggleSelectDispatch,
  setSelectedDispatch,
  setIsPipelineModalOpen,
  handlePlayDispatch,
  isPlaying = {},
  setConfirmDeleteDispatch,
  isCancelling = {},
  fetchChildren
}) => {
  const isSelected = selectedDispatchIds.includes(item.id);

  return (
    <tr className={`group transition-all duration-300 ${isSelected ? 'bg-indigo-500/10' : 'bg-white/5 hover:bg-white/[0.08]'}`}>
      <td className="px-6 py-5 rounded-l-[1.5rem] first:border-l border-y border-white/5">
        <input
          type="checkbox"
          checked={isSelected}
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
            {item.funnel_id ? (
              <button
                type="button"
                onClick={() => { setSelectedDispatch(item); setIsPipelineModalOpen(true); }}
                className="p-2 bg-indigo-500/10 hover:bg-indigo-50 text-indigo-400 hover:text-white rounded-lg transition-all active:scale-95 flex items-center gap-1.5 font-black text-[9px] uppercase tracking-wider"
                title="Ver Pipeline"
              >
                <FiActivity size={14} /> <span>Pipeline</span>
              </button>
            ) : null}
            <button
              type="button"
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
              type="button"
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
            ) : (item.sent_as === 'FREE_MESSAGE' || item.meta_price_category === 'service' || item.is_free_message) ? (
              <span className="text-[10px] bg-emerald-500 text-black px-2 py-0.5 rounded-full font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20">GRÁTIS</span>
            ) : (item.sent_as === 'TEMPLATE' || item.meta_price_category) ? (
              <span className="text-[10px] bg-amber-500 text-black px-2 py-0.5 rounded-full font-black uppercase tracking-widest shadow-lg shadow-amber-500/20">PAGO</span>
            ) : (
              <span className="text-[10px] bg-indigo-500 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20">TEMPLATE</span>
            )}
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">
            {item.template_name ? `Template: ${item.template_name}` : (item.funnel_id ? `Funil: ${item.funnel_id}` : 'Ação Interna')}
          </div>
          <div className="flex items-center gap-1.5 mt-2 bg-white/5 border border-white/10 px-2 py-1.5 rounded-lg w-fit shadow-lg shadow-black/20">
            <span className="flex items-center gap-1 text-[11px] font-black text-emerald-500" title="Enviados">
              <FiCheck size={13} /> {item.total_sent || (item.status === 'completed' ? 1 : 0)}
            </span>
            <div className="w-[1px] h-3 bg-white/10 mx-0.5"></div>
            <span className="flex items-center gap-1 text-[11px] font-black text-blue-400" title="Entregues">
              <FiInbox size={13} /> {item.total_delivered || 0}
            </span>
            <div className="w-[1px] h-3 bg-white/10 mx-0.5"></div>
            <span className="flex items-center gap-1 text-[11px] font-black text-purple-400" title="Lidos">
              <FiEye size={13} /> {item.total_read || 0}
            </span>
            <div className="w-[1px] h-3 bg-white/10 mx-0.5"></div>
            <span className="flex items-center gap-1 text-[11px] font-black text-orange-400" title="Interações (Cliques)">
              <FiMousePointer size={13} /> {item.total_clicks || item.total_interactions || (item.is_interaction ? 1 : 0)}
            </span>
            {item.child_count > 0 && (
              <>
                <div className="w-[1px] h-3 bg-white/10 mx-0.5"></div>
                {(() => {
                  if (item.followup_status) {
                    const config = getFollowupConfig(item.followup_status, item.followup_scheduled_time);
                    return (
                      <button 
                        type="button"
                        onClick={() => fetchChildren(item)}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded transition cursor-pointer ${config.className}`}
                      >
                        <span className="text-sm">{config.icon}</span>
                        <span className="text-[9px] font-black uppercase tracking-tighter">{config.text}</span>
                      </button>
                    );
                  }
                  return (
                    <button 
                      type="button"
                      onClick={() => fetchChildren(item)}
                      className="flex items-center gap-1 hover:bg-orange-500/20 px-1.5 py-0.5 rounded transition cursor-pointer group/rocket text-orange-500"
                    >
                      <span className="text-sm">🔄</span>
                      <span className="text-[9px] font-black uppercase tracking-tighter">Funis Ativados</span>
                    </button>
                  );
                })()}
              </>
            )}
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
  );
};

export default DispatchTableRow;
