import React, { useState, useEffect } from 'react';
import { FiClock, FiCheckCircle, FiXCircle, FiTag, FiRefreshCw } from 'react-icons/fi';
import { API_URL } from '../../config';

import { useClient } from '../../contexts/ClientContext';

export default function EmailHistoryTab() {
  const { activeClient } = useClient();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Client-ID': activeClient?.id ? String(activeClient.id) : ''
    };
  };

  useEffect(() => {
    fetchHistory();
  }, [activeClient]);

  const fetchHistory = async () => {
    if (!activeClient) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/email/history`, { headers: getHeaders() });

      if (res.ok) {
        const data = await res.json();
        setHistory(data || []);
      }
    } catch (err) {
      console.error("Erro ao carregar histórico de e-mails:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <FiClock className="text-blue-500" /> Histórico de Disparos de E-mail
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Auditoria completa dos envios de e-mail marketing realizados.
          </p>
        </div>
        <button
          onClick={fetchHistory}
          className="p-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl transition-all"
          title="Atualizar"
        >
          <FiRefreshCw className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-400">Carregando histórico...</div>
      ) : history.length === 0 ? (
        <div className="bg-white dark:bg-slate-800/80 p-8 rounded-2xl border border-gray-100 dark:border-white/10 text-center space-y-3">
          <FiClock size={40} className="mx-auto text-gray-400" />
          <h3 className="font-bold text-gray-700 dark:text-gray-200">Nenhum disparo de e-mail realizado ainda</h3>
          <p className="text-xs text-gray-500">Realize um disparo na aba "Disparo em Massa" para visualizar o histórico aqui.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800/80 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-white/10 shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-50 dark:bg-slate-900/60 text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-4">Campanha</th>
                  <th className="px-6 py-4">Etiqueta</th>
                  <th className="px-6 py-4">Contatos</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {history.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/30 transition-all">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-800 dark:text-white">{item.title}</div>
                      <div className="text-xs text-gray-500 truncate max-w-xs">📌 {item.subject}</div>
                    </td>
                    <td className="px-6 py-4">
                      {item.tag_name ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded-lg">
                          <FiTag size={12} /> {item.tag_name}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Todos</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 text-xs">
                        <span className="font-semibold text-gray-700 dark:text-gray-300">🚀 {item.total_contacts}</span>
                        <span className="text-green-600 dark:text-green-400 font-semibold">✅ {item.total_sent}</span>
                        {item.total_failed > 0 && (
                          <span className="text-red-500 font-semibold">❌ {item.total_failed}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {item.status === 'completed' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-bold rounded-full">
                          <FiCheckCircle /> Concluído
                        </span>
                      ) : item.status === 'completed_with_errors' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-xs font-bold rounded-full">
                          <FiCheckCircle /> Concluído com falhas
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-500/10 text-red-500 text-xs font-bold rounded-full">
                          <FiXCircle /> Falhou
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {item.created_at ? new Date(item.created_at).toLocaleString('pt-BR') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
