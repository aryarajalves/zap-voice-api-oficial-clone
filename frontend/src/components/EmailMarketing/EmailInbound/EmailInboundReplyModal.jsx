import React from 'react';
import { createPortal } from 'react-dom';
import { FiMail, FiX, FiSend } from 'react-icons/fi';
import { formatDate } from './constants';

const EmailInboundReplyModal = ({
  selectedInbound,
  onClose,
  replySubject,
  setReplySubject,
  replyBody,
  onBodyChange,
  replyBodyRef,
  onSendReply,
  replyLoading,
  slashActive,
  filteredSlashVars,
  insertVariableCode
}) => {
  if (!selectedInbound) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99990] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-3xl w-full border border-gray-100 dark:border-white/10 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h3 className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <FiMail className="text-blue-500" /> Resposta de {selectedInbound.from_name || selectedInbound.from_email}
            </h3>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              De: {selectedInbound.from_email} | Recebido em: {formatDate(selectedInbound.created_at)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Mensagem Recebida do Lead */}
        <div className="bg-gray-50 dark:bg-slate-900/80 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
          <div className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center justify-between">
            <span>📌 Assunto: {selectedInbound.subject}</span>
            <span className="text-[10px] text-blue-500 font-mono uppercase">Via {selectedInbound.provider}</span>
          </div>
          <div className="text-xs text-gray-800 dark:text-gray-200 font-mono whitespace-pre-wrap leading-relaxed pt-2 border-t border-gray-200 dark:border-gray-800">
            {selectedInbound.body_text || selectedInbound.body_html?.replace(/<[^>]*>?/gm, '')}
          </div>
        </div>

        {/* Formulário de Réplica para o Lead */}
        <form onSubmit={onSendReply} className="space-y-3 pt-2">
          <h4 className="text-xs font-bold text-gray-800 dark:text-white flex items-center gap-1.5">
            <FiSend className="text-blue-500" /> Enviar Resposta para {selectedInbound.from_email}
          </h4>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
              Assunto da Réplica *
            </label>
            <input
              type="text"
              required
              value={replySubject}
              onChange={e => setReplySubject(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-gray-700 rounded-xl text-xs text-gray-800 dark:text-white"
            />
          </div>

          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300">
                Mensagem de Resposta (HTML / Texto) *
              </label>
              <span className="text-[10px] text-gray-400">Digite <kbd className="px-1 bg-gray-200 dark:bg-gray-700 rounded font-mono font-bold">/</kbd> para variáveis</span>
            </div>

            <textarea
              ref={replyBodyRef}
              rows={6}
              required
              value={replyBody}
              onChange={onBodyChange}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-gray-700 rounded-xl text-xs text-gray-800 dark:text-white font-mono leading-relaxed resize-y"
            />

            {/* Popover Autocomplete Slash Command */}
            {slashActive && filteredSlashVars.length > 0 && (
              <div className="absolute left-3 bottom-10 w-64 bg-white dark:bg-slate-800 border border-blue-500/40 rounded-xl shadow-2xl z-[999999] overflow-hidden">
                <div className="p-1.5 bg-blue-600 text-white text-[10px] font-bold uppercase">Variáveis do Contato</div>
                <div className="max-h-40 overflow-y-auto p-1">
                  {filteredSlashVars.map(v => (
                    <button
                      key={v.code}
                      type="button"
                      onClick={() => insertVariableCode(v.code)}
                      className="w-full text-left p-1.5 rounded hover:bg-blue-500/10 text-xs font-mono text-blue-600 dark:text-blue-400 block"
                    >
                      {v.code} - <span className="text-gray-500 text-[10px] font-sans">{v.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={replyLoading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 disabled:opacity-50"
            >
              <FiSend size={14} /> {replyLoading ? 'Enviando Réplica...' : 'Enviar Resposta'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default EmailInboundReplyModal;
