import React from 'react';
import { FiSlash, FiUnlock, FiAlertTriangle, FiRefreshCw, FiX } from 'react-icons/fi';

const BlockContactConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  mode = 'block', // 'block' | 'unblock' | 'bulk_block'
  item = null,
  count = 0,
  isLoading = false
}) => {
  if (!isOpen) return null;

  const isUnblock = mode === 'unblock';
  const isBulk = mode === 'bulk_block';

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className={`relative w-full max-w-md bg-[#161c28] border ${isUnblock ? 'border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.15)]' : 'border-rose-500/20 shadow-[0_0_50px_rgba(244,63,94,0.15)]'} rounded-3xl p-6 overflow-hidden animate-in zoom-in-95 duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow de fundo */}
        <div 
          className={`absolute -top-24 -left-24 w-48 h-48 rounded-full blur-3xl pointer-events-none ${isUnblock ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`} 
        />
        <div 
          className={`absolute -bottom-24 -right-24 w-48 h-48 rounded-full blur-3xl pointer-events-none ${isUnblock ? 'bg-teal-500/10' : 'bg-red-500/10'}`} 
        />

        {/* Ícone no Topo */}
        <div className="flex flex-col items-center text-center mb-5 relative z-10">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 border ${
            isUnblock 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.25)]' 
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-[0_0_25px_rgba(244,63,94,0.25)]'
          }`}>
            {isUnblock ? <FiUnlock size={26} /> : <FiSlash size={26} />}
          </div>

          <h3 className="text-lg font-black text-white tracking-tight">
            {isUnblock 
              ? 'Desbloquear Contato?' 
              : isBulk 
                ? `Bloquear ${count} Contatos?` 
                : 'Bloquear Contato na Blacklist?'}
          </h3>

          <p className="text-xs text-gray-400 mt-1 max-w-sm">
            {isUnblock
              ? 'O contato será removido da Blacklist e voltará a estar liberado para receber disparos.'
              : isBulk
                ? `Os ${count} contatos selecionados serão adicionados à Blacklist e não receberão novos disparos.`
                : 'Este contato não receberá mais mensagens, funis ou disparos de webhooks nesta conta.'}
          </p>
        </div>

        {/* Detalhes do Contato */}
        {!isBulk && item && (
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 mb-5 space-y-2 relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">Contato:</span>
              <span className="text-xs font-bold text-gray-200">{item.contact_name || 'Desconhecido'}</span>
            </div>
            <div className="flex items-center justify-between border-t border-white/[0.04] pt-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">Telefone:</span>
              <span className="text-xs font-mono font-bold text-blue-400">{item.contact_phone || 'Sem telefone'}</span>
            </div>
            {!isUnblock && item.failure_reason && (
              <div className="border-t border-white/[0.04] pt-2">
                <span className="text-[9px] font-black uppercase tracking-wider text-red-400/80 block mb-1">Motivo do Erro:</span>
                <p className="text-[10px] text-red-300/90 font-mono bg-red-500/10 border border-red-500/20 rounded-lg p-2 leading-tight break-words">
                  {item.failure_reason}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Informação explicativa */}
        <div className={`p-3 rounded-xl border text-[11px] leading-relaxed mb-6 flex items-start gap-2 relative z-10 ${
          isUnblock 
            ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300' 
            : 'bg-rose-500/5 border-rose-500/20 text-rose-300'
        }`}>
          <FiAlertTriangle size={15} className="shrink-0 mt-0.5" />
          <span>
            {isUnblock
              ? 'Ao confirmar, o número poderá voltar a receber qualquer disparo ou funil ativo imediatamente.'
              : 'O bloqueio é imediato. Futuros webhooks ou tentativas manuais de disparo para este número serão cancelados automaticamente.'}
          </span>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center gap-3 relative z-10">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
              isUnblock
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/20'
                : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-500/20'
            }`}
          >
            {isLoading ? (
              <>
                <FiRefreshCw className="animate-spin" size={13} />
                <span>Processando...</span>
              </>
            ) : isUnblock ? (
              <>
                <FiUnlock size={13} />
                <span>Desbloquear</span>
              </>
            ) : (
              <>
                <FiSlash size={13} />
                <span>{isBulk ? 'Bloquear Todos' : 'Sim, Bloquear'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BlockContactConfirmModal;
