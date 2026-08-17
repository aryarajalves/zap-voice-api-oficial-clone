import React from 'react';

export default function UserClientsAccessSection({
  clients,
  userData,
  toggleClientAccess
}) {
  return (
    <div>
      <label className="block text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">
        Acesso aos Clientes
      </label>
      <div className="space-y-2 max-h-32 overflow-y-auto p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/30 custom-scrollbar">
        {clients.map(client => (
          <div key={client.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`client-${client.id}`}
              checked={userData.client_ids.includes(client.id)}
              onChange={() => toggleClientAccess(client.id)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor={`client-${client.id}`} className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer truncate">
              {client.name}
            </label>
          </div>
        ))}
        {clients.length === 0 && (
          <p className="text-[10px] text-gray-400 italic">Nenhum cliente cadastrado.</p>
        )}
      </div>
      <p className="mt-1 text-[10px] text-gray-400 italic">
        O usuário terá acesso e permissão para gerenciar os clientes marcados acima.
      </p>
    </div>
  );
}
