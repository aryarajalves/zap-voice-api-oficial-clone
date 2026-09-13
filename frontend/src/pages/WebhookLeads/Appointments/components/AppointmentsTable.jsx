import React from 'react';
import { FiCalendar, FiExternalLink, FiClock, FiUserPlus, FiCheck, FiZap, FiRotateCw } from 'react-icons/fi';
import { getRemainingTime } from '../utils/countdown';

export default function AppointmentsTable({
  loading,
  appointments,
  now,
  retryingIds,
  handleRetryReminder,
}) {
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-20 space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        <p className="text-sm text-gray-500 dark:text-gray-400">Buscando agendamentos...</p>
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="text-center py-20 space-y-3">
        <div className="inline-flex p-4 bg-gray-100 dark:bg-white/5 rounded-full text-gray-400">
          <FiCalendar size={32} />
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-base font-semibold">Nenhum agendamento ativo encontrado.</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">Ajuste os filtros ou verifique se há contatos com dados de eventos.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50/50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5">
            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Contato</th>
            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Telefone</th>
            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Data de Criação</th>
            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Horário do Evento</th>
            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Tempo Restante</th>
            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Google Agenda</th>
            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400 text-center">Status Lembrete</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
          {appointments.map((lead) => {
            const countdown = getRemainingTime(lead.event_datetime, now);
            const eventTime = new Date(lead.event_datetime).toLocaleString('pt-BR');
            const createdAtTime = new Date(lead.created_at).toLocaleString('pt-BR');

            let badgeClass = "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300";
            if (countdown.type === 'future') {
              badgeClass = "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400";
            } else if (countdown.type === 'warning') {
              badgeClass = "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400";
            } else if (countdown.type === 'danger') {
              badgeClass = "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 animate-pulse";
            }

            return (
              <tr key={lead.id} className="hover:bg-gray-50/30 dark:hover:bg-white/[0.01] transition-colors duration-150">
                <td className="px-6 py-4">
                  <div className="font-semibold text-gray-900 dark:text-white">{lead.name || 'Sem Nome'}</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">{lead.email || 'Sem Email'}</div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 font-mono">
                  {lead.phone}
                </td>
                <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 font-medium">
                  <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs">
                    <FiUserPlus className="text-indigo-400" />
                    {createdAtTime}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <FiClock className="text-blue-500" />
                    {eventTime}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${badgeClass}`}>
                    {countdown.text}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {lead.google_calendar_link ? (
                    <a
                      href={lead.google_calendar_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-bold transition-all"
                    >
                      Abrir Evento <FiExternalLink size={12} />
                    </a>
                  ) : (
                    <span className="text-xs text-gray-400 dark:text-gray-600 italic">Sem Link</span>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    {lead.reminder_dispatch_status === 'failed' ? (
                      <div className="flex flex-col items-center gap-1">
                        <span 
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800/30 shadow-sm cursor-help"
                          title={lead.reminder_dispatch_failure_reason || "O envio falhou no canal do WhatsApp."}
                        >
                          Falhou
                        </span>
                        {lead.reminder_dispatch_failure_reason && (
                          <span className="text-[9px] text-red-400 dark:text-red-500 max-w-[150px] truncate block" title={lead.reminder_dispatch_failure_reason}>
                            {lead.reminder_dispatch_failure_reason}
                          </span>
                        )}
                        <button
                          onClick={() => handleRetryReminder(lead.id)}
                          disabled={retryingIds[lead.id]}
                          className="mt-1 flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold rounded bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-800/50 transition-all border border-blue-500/20 active:scale-95 cursor-pointer shadow-sm"
                          title="Re-disparar este lembrete imediatamente"
                        >
                          <FiRotateCw size={9} className={retryingIds[lead.id] ? "animate-spin mr-0.5" : "mr-0.5"} />
                          {retryingIds[lead.id] ? "Enviando..." : "Re-disparar"}
                        </button>
                      </div>
                    ) : lead.google_calendar_reminder_sent ? (
                      <>
                        {lead.reminder_dispatch_interaction ? (
                          <span 
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800/30 shadow-sm"
                            title="O cliente clicou em algum botão ou respondeu à mensagem!"
                          >
                            <FiZap size={11} className="fill-current animate-bounce text-green-600 dark:text-green-400" /> Interagiu
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-lg border border-gray-200 dark:border-white/5">
                              {lead.reminder_dispatch_status === 'read' ? (
                                <span className="flex items-center mr-1">
                                  <FiCheck className="text-blue-500" size={14} />
                                  <FiCheck className="text-blue-500 -ml-2.5" size={14} />
                                </span>
                              ) : lead.reminder_dispatch_status === 'delivered' ? (
                                <span className="flex items-center mr-1">
                                  <FiCheck className="text-gray-400 dark:text-gray-500" size={14} />
                                  <FiCheck className="text-gray-400 dark:text-gray-500 -ml-2.5" size={14} />
                                </span>
                              ) : (
                                <span className="flex items-center mr-1">
                                  <FiCheck className="text-gray-400 dark:text-gray-500" size={14} />
                                </span>
                              )}
                              <span className="text-[10px] capitalize">
                                {lead.reminder_dispatch_status === 'read' ? 'Lido' : lead.reminder_dispatch_status === 'delivered' ? 'Entregue' : 'Disparado'}
                              </span>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800/30 shadow-sm">
                        Pendente
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
