import React from 'react';

export const getStatusBadge = (status) => {
  const map = {
    'pending': { color: 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/20', label: 'Pendente' },
    'queued': { color: 'bg-blue-500/20 text-blue-400 border border-blue-500/20', label: 'Na Fila' },
    'processing': { color: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20', label: 'Enviando...' },
    'completed': { color: 'bg-green-500/20 text-green-400 border border-green-500/20', label: 'Concluído' },
    'cancelled': { color: 'bg-gray-500/20 text-gray-400 border border-gray-500/20', label: 'Cancelado' },
    'failed': { color: 'bg-red-500/20 text-red-400 border border-red-500/20', label: 'Falhou' }
  };
  const s = map[status] || map['pending'];
  return <span className={`px-2.5 py-0.5 rounded-lg text-[10px] uppercase font-black tracking-wider ${s.color}`}>{s.label}</span>;
};
