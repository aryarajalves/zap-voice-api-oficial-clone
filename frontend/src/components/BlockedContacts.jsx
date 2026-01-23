import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import { fetchWithAuth } from '../AuthContext';
import { useClient } from '../contexts/ClientContext';
import { toast } from 'react-hot-toast';
import { FiTrash2, FiPlus, FiSlash, FiSearch } from 'react-icons/fi';
import ConfirmModal from './ConfirmModal';

export default function BlockedContacts() {
    const { activeClient } = useClient();
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [manualInput, setManualInput] = useState('');
    const [adding, setAdding] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [bulkDeleting, setBulkDeleting] = useState(false);

    // Configuração do Modal de Confirmação
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        isDangerous: false,
        confirmText: 'Confirmar'
    });

    useEffect(() => {
        if (activeClient) {
            fetchBlockedContacts();
        }
    }, [activeClient]);

    const fetchBlockedContacts = async () => {
        setLoading(true);
        try {
            const res = await fetchWithAuth(`${API_URL}/blocked/`, {}, activeClient?.id);
            if (res.ok) {
                const data = await res.json();
                setContacts(data);
                setSelectedIds(new Set()); // Reset selection on refresh
            }
        } catch (err) {
            console.error("Erro ao buscar bloqueados:", err);
            toast.error("Erro ao carregar lista de bloqueios");
        } finally {
            setLoading(false);
        }
    };

    const cleanNumbers = (text) => {
        if (!text) return [];
        return text
            .split(/[\n,; ]+/)
            .map(s => s.replace(/\D/g, ''))
            .filter(s => s.length >= 8);
    };

    const handleBlock = async (e) => {
        e.preventDefault();
        const numbers = cleanNumbers(manualInput);
        if (numbers.length === 0) {
            toast.error("Insira pelo menos um número válido.");
            return;
        }

        setAdding(true);
        let successCount = 0;
        let failCount = 0;

        await Promise.all(numbers.map(async (phone) => {
            try {
                const res = await fetchWithAuth(`${API_URL}/blocked/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone: phone, reason: 'Manual' })
                }, activeClient?.id);

                if (res.ok) {
                    successCount++;
                } else {
                    const data = await res.json();
                    if (res.status !== 400 || !data.detail?.includes("já está bloqueado")) {
                        failCount++;
                    }
                }
            } catch (err) {
                failCount++;
            }
        }));

        if (successCount > 0) {
            toast.success(`${successCount} contatos bloqueados com sucesso!`);
            setManualInput('');
            fetchBlockedContacts();
        }

        if (failCount > 0) {
            toast.error(`${failCount} falhas.`);
        } else if (successCount === 0 && numbers.length > 0) {
            toast.success("Todos os números já estavam bloqueados.");
            setManualInput('');
        }

        setAdding(false);
    };

    const performUnblock = async (id, refresh = true) => {
        try {
            const res = await fetchWithAuth(`${API_URL}/blocked/${id}`, {
                method: 'DELETE'
            }, activeClient?.id);

            if (res.ok) {
                if (refresh) {
                    setContacts(prev => prev.filter(c => c.id !== id));
                    setSelectedIds(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(id);
                        return newSet;
                    });
                }
                return true;
            } else {
                throw new Error("Erro ao desbloquear");
            }
        } catch (err) {
            console.error(err);
            return false;
        }
    };

    const confirmUnblockSingle = (contactId) => {
        const contact = contacts.find(c => c.id === contactId);
        setConfirmModal({
            isOpen: true,
            title: 'Desbloquear Contato',
            message: `Tem certeza que deseja remover o bloqueio do número ${contact?.phone}?`,
            confirmText: 'Desbloquear',
            isDangerous: true,
            onConfirm: async () => {
                const success = await performUnblock(contactId);
                if (success) toast.success("Contato desbloqueado.");
                else toast.error("Erro ao desbloquear.");
            }
        });
    };

    // Filter Logic
    const filteredContacts = React.useMemo(() => {
        if (!searchTerm) return contacts;

        const cleanSearch = searchTerm.trim();

        // Helper to get last 8 digits
        const getLast8 = (num) => {
            const cleaned = num.replace(/\D/g, '');
            return cleaned.length >= 8 ? cleaned.slice(-8) : cleaned;
        };

        // Check if input looks like a list (has commas, newlines, or spaces)
        if (/[\n, ]/.test(cleanSearch)) {
            const searchNumbers = cleanNumbers(cleanSearch);
            if (searchNumbers.length > 0) {
                const searchSuffixes = searchNumbers.map(n => getLast8(n));

                // Return contacts that match ANY of the search suffixes (strict if 8 digits)
                return contacts.filter(c => {
                    const contactSuffix = getLast8(c.phone);
                    return searchSuffixes.some(suffix => {
                        if (suffix.length === 8) {
                            return contactSuffix.endsWith(suffix);
                        }
                        return c.phone.includes(suffix);
                    });
                });
            }
        }

        // Standard single term search
        return contacts.filter(c => {
            // Check content text (reason)
            if (c.reason?.toLowerCase().includes(cleanSearch.toLowerCase())) return true;

            const singleSuffix = getLast8(cleanSearch);
            const contactSuffix = getLast8(c.phone);

            // If user typed at least 8 digits, match strictly on suffix
            if (singleSuffix.length === 8) {
                return contactSuffix.endsWith(singleSuffix);
            }

            // Otherwise partial match
            return c.phone.includes(singleSuffix) || c.phone.includes(cleanSearch);
        });
    }, [contacts, searchTerm]);

    // Selection Logic
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const allIds = filteredContacts.map(c => c.id);
            setSelectedIds(new Set(allIds));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelectRow = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleBulkDelete = () => {
        if (selectedIds.size === 0) return;

        setConfirmModal({
            isOpen: true,
            title: 'Desbloqueio em Massa',
            message: `Tem certeza que deseja desbloquear ${selectedIds.size} contatos selecionados?`,
            confirmText: `Desbloquear ${selectedIds.size}`,
            isDangerous: true,
            onConfirm: async () => {
                setBulkDeleting(true);
                let successCount = 0;

                // Convert input to array for concurrent processing
                const idsToDelete = Array.from(selectedIds);

                await Promise.all(idsToDelete.map(async (id) => {
                    const success = await performUnblock(id, false);
                    if (success) successCount++;
                }));

                toast.success(`${successCount} contatos desbloqueados.`);
                fetchBlockedContacts();
                setBulkDeleting(false);
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-200">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-4">
                    <FiSlash className="text-red-500" />
                    Gerenciar Bloqueios
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    Adicione contatos que <strong>NUNCA</strong> devem receber mensagens.
                </p>

                <form onSubmit={handleBlock} className="flex flex-col gap-4">
                    <div className="flex-1 w-full">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Adicionar Números para Bloqueio (Lista Manual)
                        </label>
                        <textarea
                            value={manualInput}
                            onChange={(e) => setManualInput(e.target.value)}
                            placeholder="Cole os números aqui (um por linha ou separados por vírgula)..."
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none h-32 resize-none font-mono text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Formatos aceitos: 5511999999999, (11) 99999-9999, etc.
                        </p>
                    </div>
                    <div>
                        <button
                            type="submit"
                            disabled={adding || !manualInput}
                            className="px-6 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {adding ? <span className="animate-pulse">Processando...</span> : (
                                <>
                                    <FiPlus /> Bloquear {cleanNumbers(manualInput).length > 0 ? cleanNumbers(manualInput).length : ''} Contatos
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors duration-200">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center flex-wrap gap-4">
                    <h3 className="font-bold text-gray-700 dark:text-white">Lista de Contatos Bloqueados ({contacts.length})</h3>

                    <div className="flex gap-4 items-center">
                        {selectedIds.size > 0 && (
                            <button
                                onClick={handleBulkDelete}
                                disabled={bulkDeleting}
                                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-bold hover:bg-red-200 transition flex items-center gap-2"
                            >
                                <FiTrash2 /> Excluir {selectedIds.size} selecionados
                            </button>
                        )}

                        <div className="relative">
                            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar telefone (pode colar lista)..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64 transition-all focus:w-80 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-gray-500">Carregando...</div>
                ) : filteredContacts.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                        {searchTerm ? 'Nenhum resultado encontrado.' : 'Nenhum contato bloqueado.'}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-3 font-medium w-10">
                                        <input
                                            type="checkbox"
                                            onChange={handleSelectAll}
                                            checked={filteredContacts.length > 0 && selectedIds.size === filteredContacts.length}
                                            className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                                        />
                                    </th>
                                    <th className="px-6 py-3 font-medium">Telefone</th>
                                    <th className="px-6 py-3 font-medium">Motivo</th>
                                    <th className="px-6 py-3 font-medium">Data Bloqueio</th>
                                    <th className="px-6 py-3 font-medium text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {filteredContacts.map((contact) => (
                                    <tr key={contact.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${selectedIds.has(contact.id) ? 'bg-red-50/30 dark:bg-red-900/20' : ''}`}>
                                        <td className="px-6 py-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(contact.id)}
                                                onChange={() => handleSelectRow(contact.id)}
                                                className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                                            />
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                            {contact.phone}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                            {contact.reason}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(contact.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => confirmUnblockSingle(contact.id)}
                                                className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
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
                )}
            </div>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText={confirmModal.confirmText}
                isDangerous={confirmModal.isDangerous}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
            />
        </div >
    );
}
