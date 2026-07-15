import React, { useState, useEffect, useCallback } from 'react';
import { useClient } from '../../contexts/ClientContext';
import { fetchWithAuth } from '../../AuthContext';
import { API_URL } from '../../config';
import { toast } from 'react-hot-toast';
import { FiCalendar, FiSearch, FiExternalLink, FiClock, FiChevronLeft, FiChevronRight, FiFilter, FiUserPlus, FiCheck, FiZap } from 'react-icons/fi';

export default function AppointmentsPage() {
  const { activeClient } = useClient();
  const [appointments, setAppointments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '' | 'pending' | 'occurred'
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [now, setNow] = useState(new Date());

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch scheduled leads
  const fetchAppointments = useCallback(async () => {
    if (!activeClient?.id) return;
    setLoading(true);
    try {
      let url = `${API_URL}/leads?skip=${page * limit}&limit=${limit}&has_appointment=true`;
      if (debouncedSearch) {
        url += `&search=${encodeURIComponent(debouncedSearch)}`;
      }
      if (statusFilter) {
        url += `&appointment_status=${statusFilter}`;
      }
      if (dateFrom) {
        url += `&date_from=${dateFrom}`;
      }
      if (dateTo) {
        url += `&date_to=${dateTo}`;
      }
      const res = await fetchWithAuth(url, {}, activeClient.id);
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.items || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error("Erro ao carregar agendamentos:", err);
      toast.error("Erro ao carregar agendamentos.");
    } finally {
      setLoading(false);
    }
  }, [activeClient?.id, page, limit, debouncedSearch, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Real-time ticking for countdowns
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(0);
  };

  // Helper to format remaining time
  const getRemainingTime = (eventDateStr) => {
    if (!eventDateStr) return { text: 'Sem data', type: 'expired' };
    const eventDate = new Date(eventDateStr);
    const diffMs = eventDate - now;

    if (diffMs <= 0) {
      return { text: 'Realizado / Ocorrido', type: 'expired' };
    }

    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return { 
        text: `Falta(m) ${diffDays}d ${diffHours % 24}h ${diffMins % 60}m`, 
        type: 'future' 
      };
    }

    if (diffHours > 0) {
      return { 
        text: `Falta(m) ${diffHours}h ${diffMins % 60}m ${diffSecs % 60}s`, 
        type: 'warning' 
      };
    }

    return { 
      text: `Urgente! Falta(m) ${diffMins}m ${diffSecs % 60}s`, 
      type: 'danger' 
    };
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-500 space-y-6">
      {/* Top Header Card */}
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

      {/* Control Bar (Search, Status Filter, Date Filters) */}
      <div className="flex flex-col gap-4 bg-white dark:bg-[#1e293b] p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
        <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-white/5">
          <FiFilter className="text-blue-500" />
          <span className="text-xs uppercase tracking-wider font-bold text-gray-400">Filtros e Busca</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* Text Search */}
          <div className="md:col-span-4 space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500 ml-1">Pesquisar Contato</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                <FiSearch />
              </span>
              <input
                type="text"
                placeholder="Nome ou telefone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-white placeholder-gray-400 text-sm font-medium"
              />
            </div>
          </div>

          {/* Status Dropdown */}
          <div className="md:col-span-3 space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500 ml-1">Status Ocorrência</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
              className="w-full p-2.5 border border-gray-300 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-white text-sm font-medium"
            >
              <option value="" className="bg-white dark:bg-[#1e293b]">Todos os Agendamentos</option>
              <option value="pending" className="bg-white dark:bg-[#1e293b]">Pendentes / Não Ocorridos</option>
              <option value="occurred" className="bg-white dark:bg-[#1e293b]">Realizados / Ocorridos</option>
            </select>
          </div>

          {/* Date Range - From */}
          <div className="md:col-span-2 space-y-1.5 flex-1">
            <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500 ml-1">De (Criação)</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(0);
              }}
              className="w-full p-2.5 border border-gray-300 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-white text-sm font-medium"
            />
          </div>

          {/* Date Range - To */}
          <div className="md:col-span-2 space-y-1.5 flex-1">
            <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500 ml-1">Até (Criação)</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(0);
              }}
              className="w-full p-2.5 border border-gray-300 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-white text-sm font-medium"
            />
          </div>

          {/* Clear Filters Button */}
          <div className="md:col-span-1">
            <button
              onClick={handleClearFilters}
              className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold transition-all shadow border border-gray-200 dark:border-white/5 h-[42px] flex items-center justify-center cursor-pointer"
              title="Limpar Filtros"
            >
              Limpar
            </button>
          </div>
        </div>
      </div>

      {/* Appointments List/Table */}
      <div className="bg-white dark:bg-[#1e293b] rounded-3xl border border-gray-100 dark:border-white/5 overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex flex-col justify-center items-center py-20 space-y-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Buscando agendamentos...</p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <div className="inline-flex p-4 bg-gray-100 dark:bg-white/5 rounded-full text-gray-400">
              <FiCalendar size={32} />
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-base font-semibold">Nenhum agendamento ativo encontrado.</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Ajuste os filtros ou verifique se há contatos com dados de eventos.</p>
          </div>
        ) : (
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
                  const countdown = getRemainingTime(lead.event_datetime);
                  const eventTime = new Date(lead.event_datetime).toLocaleString('pt-BR');
                  const createdAtTime = new Date(lead.created_at).toLocaleString('pt-BR');
                  
                  // Label badge styling classes
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
                        <div className="flex items-center justify-center gap-3">
                          {lead.google_calendar_reminder_sent ? (
                            <>
                              {lead.reminder_dispatch_status === 'failed' ? (
                                <span 
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800/30 shadow-sm"
                                  title="O envio falhou no canal da Meta"
                                >
                                  Falhou
                                </span>
                              ) : lead.reminder_dispatch_interaction ? (
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
        )}

        {/* Pagination Footer */}
        {!loading && total > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-6 py-4 border-t border-gray-100 dark:border-white/5 bg-gray-50/30 dark:bg-white/[0.01]">
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <span className="text-xs text-gray-400">
                Página <span className="font-bold text-gray-700 dark:text-gray-300">{page + 1}</span> de <span className="font-bold text-gray-700 dark:text-gray-300">{totalPages || 1}</span> (Total: {total})
              </span>
              
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Exibir</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(0);
                  }}
                  className="p-1 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#1e293b] text-gray-700 dark:text-gray-300 text-xs font-semibold focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="200">200</option>
                </select>
                <span className="text-xs text-gray-400">contatos</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage(p => Math.max(0, p - 1))}
                className="p-2 border border-gray-300 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 text-gray-500 disabled:opacity-40 transition-all cursor-pointer"
              >
                <FiChevronLeft />
              </button>
              <button
                disabled={page >= totalPages - 1 || totalPages <= 1}
                onClick={() => setPage(p => p + 1)}
                className="p-2 border border-gray-300 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 text-gray-500 disabled:opacity-40 transition-all cursor-pointer"
              >
                <FiChevronRight />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
