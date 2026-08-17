import React from 'react';
import { FiClock, FiSend, FiCalendar } from 'react-icons/fi';

export default function EmailSchedulingSection({
  sendMode,
  setSendMode,
  scheduledAt,
  setScheduledAt
}) {
  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-gray-100 dark:border-gray-800 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <FiClock className="text-indigo-500" />
        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Quando enviar?</span>
      </div>

      {/* Toggle Imediato / Agendado */}
      <div className="flex gap-2">
        <button
          type="button"
          id="btn-send-immediate"
          onClick={() => setSendMode('immediate')}
          className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            sendMode === 'immediate'
              ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20'
              : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-400'
          }`}
        >
          <FiSend size={13} /> Enviar Agora
        </button>
        <button
          type="button"
          id="btn-send-scheduled"
          onClick={() => setSendMode('scheduled')}
          className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            sendMode === 'scheduled'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/20'
              : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-indigo-400'
          }`}
        >
          <FiCalendar size={13} /> Agendar Disparo
        </button>
      </div>

      {/* Seletor de data e hora (visível só no modo agendado) */}
      {sendMode === 'scheduled' && (
        <div className="mt-2 space-y-1.5 animate-fade-in">
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400">
            Data e Horário do Disparo
          </label>
          <input
            type="datetime-local"
            id="input-scheduled-at"
            value={scheduledAt}
            onChange={e => setScheduledAt(e.target.value)}
            min={(() => {
              const d = new Date(Date.now() + 60000);
              const pad = n => String(n).padStart(2, '0');
              return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
            })()}
            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 rounded-xl text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
          <p className="text-[11px] text-indigo-500 dark:text-indigo-400">
            O disparo será executado automaticamente no horário selecionado (UTC).
          </p>
        </div>
      )}
    </div>
  );
}
