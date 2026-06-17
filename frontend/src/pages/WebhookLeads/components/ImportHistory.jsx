import React, { useEffect, useState } from 'react';
import { FiClock, FiFileText, FiCheckCircle, FiAlertTriangle, FiLoader, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { API_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';

export default function ImportHistory({ activeClient, refreshTrigger }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const fetchHistory = async () => {
    if (!activeClient?.id) return;
    try {
      const response = await fetchWithAuth(`${API_URL}/leads/import/history?limit=99999`, {}, activeClient.id);
      if (response && response.ok) {
        const data = await response.json();
        const items = Array.isArray(data) ? data : (data?.items || []);
        setHistory(items);
      }
    } catch (err) {
      console.error("Erro ao buscar histórico de importação:", err);
    }
  };


  // Carregar histórico inicialmente e no refreshTrigger
  useEffect(() => {
    fetchHistory();
  }, [activeClient, refreshTrigger]);

  // Polling a cada 4 segundos se houver alguma importação em andamento (pending/processing)
  useEffect(() => {
    const hasActiveImport = history.some(item => item.status === 'pending' || item.status === 'processing');
    if (!hasActiveImport) return;

    const interval = setInterval(() => {
      fetchHistory();
    }, 4000);

    return () => clearInterval(interval);
  }, [history]);

  if (!activeClient || history.length === 0) return null;

  return (
    <div className="mb-6 bg-white/5 dark:bg-gray-800/40 backdrop-blur-md border border-gray-100 dark:border-gray-700/60 rounded-2xl overflow-hidden transition-all duration-300">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between text-gray-800 dark:text-gray-100 font-bold hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
            <FiClock size={16} />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-bold">Histórico de Listas Carregadas</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Acompanhe as importações de contatos em segundo plano</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {history.some(item => item.status === 'pending' || item.status === 'processing') && (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
          )}
          <span className="text-xs font-semibold px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300">
            {history.length}
          </span>
          {isOpen ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
        </div>
      </button>

      {isOpen && (
        <div className="px-6 pb-6 pt-2 border-t border-gray-100 dark:border-gray-700/40 divide-y divide-gray-100 dark:divide-gray-700/30 max-h-[350px] overflow-y-auto">
          {history.map((item) => {
            const total = item.total_rows || 0;
            const processed = (item.imported_rows || 0) + (item.error_rows || 0);
            const percentage = total > 0 ? Math.min(Math.round((processed / total) * 100), 100) : 0;
            const dateStr = new Date(item.created_at).toLocaleString('pt-BR');

            return (
              <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 bg-gray-50 dark:bg-gray-900/40 border border-gray-150 dark:border-gray-700 rounded-xl text-gray-500 shrink-0">
                    <FiFileText size={18} />
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{item.filename}</p>
                      <span className="text-[10px] text-gray-400 font-medium">{dateStr}</span>
                    </div>

                    {/* Barra de Progresso */}
                    {(item.status === 'processing' || item.status === 'pending' || item.status === 'completed') && total > 0 && (
                      <div className="space-y-1.5 max-w-md">
                        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 rounded-full ${
                              item.status === 'completed' ? 'bg-emerald-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                          <span>{percentage}% Processado</span>
                          <span>•</span>
                          <span>{processed} de {total} contatos</span>
                          {item.error_rows > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-red-500">{item.error_rows} erros</span>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {item.status === 'failed' && (
                      <p className="text-[10px] text-red-500 font-semibold flex items-center gap-1">
                        <FiAlertTriangle size={12} /> {item.error_message || 'Erro inesperado no processamento.'}
                      </p>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {item.status === 'pending' && (
                    <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800/30 rounded-lg text-[10px] font-bold flex items-center gap-1.5">
                      <FiLoader className="animate-spin" size={12} /> Aguardando
                    </span>
                  )}
                  {item.status === 'processing' && (
                    <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/30 rounded-lg text-[10px] font-bold flex items-center gap-1.5">
                      <FiLoader className="animate-spin" size={12} /> Processando
                    </span>
                  )}
                  {item.status === 'completed' && (
                    <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/30 rounded-lg text-[10px] font-bold flex items-center gap-1.5">
                      <FiCheckCircle size={12} /> Concluído ({item.imported_rows})
                    </span>
                  )}
                  {item.status === 'failed' && (
                    <span className="px-2.5 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800/30 rounded-lg text-[10px] font-bold flex items-center gap-1.5">
                      <FiAlertTriangle size={12} /> Falhou
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
