import React from 'react';

export default function ScheduleSection({ isScheduleEnabled, setIsScheduleEnabled, scheduledTime, setScheduledTime }) {
  return (
    <div className="space-y-4 border-t border-slate-800/60 pt-4">
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          className="rounded border-slate-850 text-blue-600 focus:ring-blue-500/20 w-4 h-4 bg-black/40 transition-all cursor-pointer"
          checked={isScheduleEnabled}
          onChange={(e) => {
            setIsScheduleEnabled(e.target.checked);
            if (!e.target.checked) setScheduledTime('');
          }}
        />
        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
          Agendar este disparo?
        </span>
      </label>

      {isScheduleEnabled && (
        <div className="space-y-2 animated-fade-in">
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
            Data e Hora do Disparo
          </label>
          <input
            type="datetime-local"
            className="w-full p-3 bg-black/40 border border-slate-800 rounded-2xl focus:border-blue-500/50 outline-none text-white text-xs font-bold transition-all shadow-inner"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
