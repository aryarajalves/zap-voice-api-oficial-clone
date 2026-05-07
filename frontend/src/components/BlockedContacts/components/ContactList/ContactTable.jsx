import React from 'react';
import { FiTrash2 } from 'react-icons/fi';

export default function ContactTable({ 
    contacts, 
    selectedIds, 
    toggleSelectRow, 
    toggleSelectAll, 
    isAllVisibleSelected,
    onUnblock 
}) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-white/5 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                    <tr>
                        <th className="px-6 py-4 font-bold w-10">
                            <input
                                type="checkbox"
                                onChange={(e) => toggleSelectAll(e.target.checked)}
                                checked={isAllVisibleSelected}
                                className="rounded border-white/10 text-red-600 focus:ring-red-500 bg-white/5"
                            />
                        </th>
                        <th className="px-6 py-4 font-bold">Telefone</th>
                        <th className="px-6 py-4 font-bold">Nome</th>
                        <th className="px-6 py-4 font-bold">Motivo</th>
                        <th className="px-6 py-4 font-bold">Data/Hora Bloqueio</th>
                        <th className="px-6 py-4 font-bold text-right">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {contacts.map((contact) => (
                        <tr 
                            key={contact.id} 
                            className={`hover:bg-white/5 transition-colors duration-200 ${selectedIds.has(contact.id) ? 'bg-red-500/10' : ''}`}
                        >
                            <td className="px-6 py-4">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.has(contact.id)}
                                    onChange={() => toggleSelectRow(contact.id)}
                                    className="rounded border-white/10 text-red-600 focus:ring-red-500 bg-white/5"
                                />
                            </td>
                            <td className="px-6 py-4 font-mono text-sm font-bold text-gray-900 dark:text-white">
                                {contact.phone}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                                {contact.name || '-'}
                            </td>
                            <td className="px-6 py-4 text-sm">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                                    contact.reason === 'Manual' 
                                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                                }`}>
                                    {contact.reason}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">
                                {new Date(contact.created_at).toLocaleString('pt-BR', {
                                    day: '2-digit', month: '2-digit', year: 'numeric',
                                    hour: '2-digit', minute: '2-digit'
                                })}
                            </td>
                            <td className="px-6 py-4 text-right">
                                <button
                                    onClick={() => onUnblock(contact.id)}
                                    className="text-red-400 hover:text-red-500 p-2 rounded-lg transition-all hover:bg-red-500/10"
                                    title="Desbloquear"
                                >
                                    <FiTrash2 size={18} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
