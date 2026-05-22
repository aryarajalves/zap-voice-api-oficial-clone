import React, { useState } from 'react';
import { FiShield, FiUser, FiUserPlus, FiCheck, FiX, FiCopy, FiTrash2, FiClock } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

const InvitationTable = ({ invitations, clients, confirmDeleteInvitation }) => {
    const [copiedId, setCopiedId] = useState(null);

    const handleCopy = async (id, token) => {
        try {
            const absoluteLink = `${window.location.origin}/invite/${token}`;
            await navigator.clipboard.writeText(absoluteLink);
            setCopiedId(id);
            toast.success("Link do convite copiado!");
            setTimeout(() => setCopiedId(null), 2000);
        } catch (err) {
            toast.error("Erro ao copiar link.");
        }
    };

    const getClientNames = (clientIds) => {
        if (!clientIds || clientIds.length === 0) return 'Nenhum Acesso';
        return clientIds.map(id => {
            const client = clients.find(c => c.id === id);
            return client ? client.name : `Cliente #${id}`;
        }).join(', ');
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        try {
            const date = new Date(dateStr);
            return date.toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return dateStr;
        }
    };

    const getStatus = (invite) => {
        if (invite.is_used) {
            return {
                label: 'UTILIZADO',
                class: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800'
            };
        }
        if (invite.expires_at) {
            const expireDate = new Date(invite.expires_at);
            if (expireDate < new Date()) {
                return {
                    label: 'EXPIRADO',
                    class: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800'
                };
            }
        }
        return {
            label: 'PENDENTE',
            class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
        };
    };

    return (
        <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-sm border border-gray-200 dark:border-white/5 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cargo do Convidado</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Clientes Autorizados</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Criado Em</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Validade / Expiração</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {invitations.length > 0 ? invitations.map((invite) => {
                            const status = getStatus(invite);
                            return (
                                <tr key={invite.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors group">
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                            invite.role === 'super_admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800' :
                                            invite.role === 'admin' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800' :
                                            invite.role === 'premium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800' :
                                            'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 border border-gray-200 dark:border-gray-800'
                                        }`}>
                                            {invite.role === 'super_admin' ? <FiShield size={12} /> : invite.role === 'premium' ? <FiUserPlus size={12} /> : <FiUser size={12} />}
                                            {invite.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 max-w-[200px] truncate" title={getClientNames(invite.client_ids)}>
                                            {getClientNames(invite.client_ids)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                        {formatDate(invite.created_at)}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                        {invite.expires_at ? (
                                            <span className="flex items-center gap-1">
                                                <FiClock size={14} className="text-gray-400" />
                                                {formatDate(invite.expires_at)}
                                            </span>
                                        ) : (
                                            <span className="text-xs font-semibold text-green-600 dark:text-green-400">Sem Expiração</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${status.class}`}>
                                            {status.label}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleCopy(invite.id, invite.token)}
                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                                                title="Copiar Link de Convite"
                                            >
                                                {copiedId === invite.id ? <FiCheck className="text-green-500" size={18} /> : <FiCopy size={18} />}
                                            </button>
                                            <button
                                                onClick={() => confirmDeleteInvitation(invite)}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                title="Revogar Convite"
                                            >
                                                <FiTrash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        }) : (
                            <tr>
                                <td colSpan="6" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                    Nenhum convite criado encontrado.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default InvitationTable;
