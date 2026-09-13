import React from 'react';
import { FiCalendar } from 'react-icons/fi';

const WEEK_DAYS = [
  { id: 0, label: 'Seg' },
  { id: 1, label: 'Ter' },
  { id: 2, label: 'Qua' },
  { id: 3, label: 'Qui' },
  { id: 4, label: 'Sex' },
  { id: 5, label: 'Sáb' },
  { id: 6, label: 'Dom' }
];

export default function FollowUpBusinessHours({
  mapping,
  mIndex,
  updateMapping
}) {
  if (!mapping.followup_business_hours_active) {
    return null;
  }

  const daysList = mapping.followup_business_hours_days || [0, 1, 2, 3, 4];

  const handleToggleDay = (dayId) => {
    let newDays;
    if (daysList.includes(dayId)) {
      newDays = daysList.filter(d => d !== dayId);
    } else {
      newDays = [...daysList, dayId].sort();
    }
    updateMapping(mIndex, 'followup_business_hours_days', newDays);
  };

  return (
    <div className="bg-indigo-500/[0.02] dark:bg-indigo-500/[0.03] border border-indigo-500/10 rounded-2xl p-5 space-y-4 animate-in slide-in-from-top-2 duration-300">
      <div className="flex justify-between items-center px-1">
        <h5 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2">
          <FiCalendar size={14} /> Definição do Horário Comercial do Follow-up
        </h5>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Dias da Semana */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1 block">
            Dias da Semana Permitidos
          </label>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {WEEK_DAYS.map((day) => {
              const isDayActive = daysList.includes(day.id);
              return (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => handleToggleDay(day.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    isDayActive 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' 
                      : 'bg-gray-50 dark:bg-[#0b1120] text-gray-400 border border-gray-100 dark:border-white/5 hover:border-indigo-500/20'
                  }`}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Intervalo de Horário */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1 block">
              Horário Inicial
            </label>
            <input
              type="time"
              value={mapping.followup_business_hours_start || '08:00'}
              onChange={(e) => updateMapping(mIndex, 'followup_business_hours_start', e.target.value)}
              className="w-full bg-gray-50 dark:bg-[#0b1120] border border-gray-100 dark:border-white/5 rounded-xl px-4 py-3 text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all outline-none shadow-inner font-mono"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1 block">
              Horário Final
            </label>
            <input
              type="time"
              value={mapping.followup_business_hours_end || '18:00'}
              onChange={(e) => updateMapping(mIndex, 'followup_business_hours_end', e.target.value)}
              className="w-full bg-gray-50 dark:bg-[#0b1120] border border-gray-100 dark:border-white/5 rounded-xl px-4 py-3 text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all outline-none shadow-inner font-mono"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
