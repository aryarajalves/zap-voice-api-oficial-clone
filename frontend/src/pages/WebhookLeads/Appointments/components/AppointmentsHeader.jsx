import React from 'react';
import { FiCalendar } from 'react-icons/fi';

export default function AppointmentsHeader({ total }) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-blue-600/90 to-indigo-600/90 p-8 text-white shadow-xl">
      <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
      <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
            <FiCalendar /> Agenda Ativa
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight">Painel de Agendamentos</h2>
          <p className="text-blue-100 max-w-xl text-sm">
            Abaixo são listados os contatos que possuem eventos agendados no Google Agenda e o tempo estimado para a execução do lembrete automático.
          </p>
        </div>
        <div className="bg-white/10 rounded-2xl px-6 py-4 backdrop-blur-sm border border-white/10 self-stretch md:self-auto flex flex-col justify-center items-center">
          <span className="text-xs uppercase tracking-wider text-blue-200 font-bold">Total Agendados</span>
          <span className="text-4xl font-extrabold">{total}</span>
        </div>
      </div>
    </div>
  );
}
