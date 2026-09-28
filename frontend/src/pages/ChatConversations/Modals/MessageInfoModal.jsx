import React, { useState } from 'react';
import { FiX, FiCheck, FiClock, FiInfo, FiCopy } from 'react-icons/fi';
import { IoCheckmarkDone } from 'react-icons/io5';
import toast from 'react-hot-toast';

export const formatDetailedDateTime = (timestamp) => {
  if (!timestamp) return null;
  try {
    let raw = timestamp;
    if (typeof raw === 'string' && /^\d+$/.test(raw.trim())) {
      raw = Number(raw.trim());
    }
    if (typeof raw === 'number') {
      if (raw < 1e11) {
        raw = raw * 1000;
      }
    }
    const d = new Date(raw);
    if (isNaN(d.getTime())) return null;

    const pad = (n) => String(n).padStart(2, '0');
    const day = pad(d.getDate());
    const month = pad(d.getMonth() + 1);
    const year = d.getFullYear();
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    const seconds = pad(d.getSeconds());

    return `${day}/${month}/${year} às ${hours}:${minutes}:${seconds}`;
  } catch {
    return null;
  }
};

export default function MessageInfoModal({ isOpen, onClose, msg, selectedConvo }) {
  if (!isOpen || !msg) return null;

  const status = msg.status || msg.meta_data?.status || 'sent';
  const isRead = status === 'read';
  const isDelivered = status === 'delivered' || isRead;

  const readAt = msg.read_at || msg.meta_data?.read_at;
  const deliveredAt = msg.delivered_at || msg.meta_data?.delivered_at;
  const sentAt = msg.sent_at || msg.meta_data?.sent_at || msg.timestamp;

  const formattedSentTime = formatDetailedDateTime(sentAt);
  const formattedReadTime = formatDetailedDateTime(readAt);
  const formattedDeliveredTime = formatDetailedDateTime(deliveredAt) || (isRead && formattedReadTime ? formattedReadTime : (isDelivered ? formattedSentTime : null));
  const effectiveReadTime = formattedReadTime || (isRead ? (formattedDeliveredTime || formattedSentTime) : null);
  const effectiveDeliveredTime = formattedDeliveredTime || (isDelivered ? (effectiveReadTime || formattedSentTime) : null);

  const handleCopyWamid = () => {
    if (msg.wa_message_id) {
      navigator.clipboard.writeText(msg.wa_message_id);
      toast.success('ID da mensagem copiado!');
    }
  };

  const recipientName = selectedConvo?.contact_name || selectedConvo?.phone || 'Contato';

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={(e) => e.stopPropagation()} // Impede fechamento ao clicar no backdrop (RULE[experiencia-usuario.md])
    >
      <div
        className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
              <IoCheckmarkDone size={18} className="text-[#53bdeb]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Dados da Mensagem
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Enviada para {recipientName}
              </p>
            </div>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="p-5 space-y-4">
          {/* Prévia da Mensagem */}
          <div className="bg-gray-50 dark:bg-[#0b1120] border border-gray-200 dark:border-white/5 rounded-xl p-3.5 text-xs text-gray-700 dark:text-gray-300 max-h-28 overflow-y-auto custom-scrollbar">
            <span className="block text-[9px] uppercase font-bold text-gray-400 tracking-wider mb-1">
              {msg.meta_data?.is_template ? `Template: ${msg.meta_data.template_name || 'WhatsApp'}` : 'Mensagem enviada:'}
            </span>
            <p className="line-clamp-3 leading-relaxed whitespace-pre-wrap">
              {msg.content || (msg.media_url ? '[Arquivo de Mídia]' : 'Mensagem do WhatsApp')}
            </p>
          </div>

          {/* Status Timeline */}
          <div className="space-y-3">
            {/* 1. Lida */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50/80 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <IoCheckmarkDone
                  size={16}
                  className={isRead ? 'text-[#53bdeb] drop-shadow-[0_0_4px_rgba(83,189,235,0.8)]' : 'text-gray-400 dark:text-gray-500'}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-800 dark:text-gray-100">
                    Lida
                  </span>
                  {isRead ? (
                    <span className="text-[10px] font-bold text-[#53bdeb] bg-[#53bdeb]/10 px-2 py-0.5 rounded-full">
                      Visualizada
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
                      Pendente
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  {isRead
                    ? (effectiveReadTime || 'Visualizada pelo contato')
                    : 'Ainda não visualizada pelo destinatário'}
                </p>
              </div>
            </div>

            {/* 2. Entregue */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50/80 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5">
              <div className="w-7 h-7 rounded-lg bg-gray-200 dark:bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                <IoCheckmarkDone
                  size={16}
                  className={isDelivered ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-800 dark:text-gray-100">
                    Entregue
                  </span>
                  {isDelivered && (
                    <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      No aparelho
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  {isDelivered
                    ? (effectiveDeliveredTime || 'Entregue no aparelho do contato')
                    : 'Aguardando entrega...'}
                </p>
              </div>
            </div>

            {/* 3. Enviada */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50/80 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5">
              <div className="w-7 h-7 rounded-lg bg-gray-200 dark:bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                <FiCheck size={14} className="text-gray-600 dark:text-gray-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-800 dark:text-gray-100">
                    Enviada
                  </span>
                  <span className="text-[10px] font-medium text-gray-400">
                    Meta Cloud API
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  {formattedSentTime || 'Enviada aos servidores'}
                </p>
              </div>
            </div>
          </div>

          {/* wamid */}
          {msg.wa_message_id && (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-100/50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 text-[10px] text-gray-500 dark:text-gray-400">
              <span className="truncate mr-2 font-mono">
                ID: {msg.wa_message_id}
              </span>
              <button
                type="button"
                onClick={handleCopyWamid}
                className="flex items-center gap-1 text-blue-500 hover:text-blue-400 font-bold shrink-0 cursor-pointer"
                title="Copiar ID da Mensagem"
              >
                <FiCopy size={11} /> Copiar
              </button>
            </div>
          )}
        </div>

        {/* Rodapé com 1 botão para fechar */}
        <div className="px-5 py-3.5 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
