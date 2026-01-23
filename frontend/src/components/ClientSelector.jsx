import React, { useState } from 'react';
import { FiChevronDown, FiPlus, FiTrash2 } from 'react-icons/fi';
import { useClient } from '../contexts/ClientContext';

export default function ClientSelector({ onCreateClick }) {
    const { clients, activeClient, switchClient, deleteClient, loading } = useClient();
    const [isOpen, setIsOpen] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    if (loading) {
        return (
            <div className="px-4 py-3 border-b border-gray-100">
                <div className="animate-pulse flex items-center gap-2">
                    <div className="flex-1 h-8 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <label className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                Cliente Ativo
            </label>

            {/* Dropdown Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 transition-colors"
            >
                <span className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                    {activeClient?.name || 'Sem cliente selecionado'}
                </span>
                <FiChevronDown className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute left-4 right-4 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 overflow-hidden">
                        <div className="max-h-60 overflow-y-auto">
                            {clients.map((client) => (
                                <div
                                    key={client.id}
                                    className={`flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${activeClient?.id === client.id ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                >
                                    <button
                                        onClick={() => {
                                            switchClient(client.id);
                                            setIsOpen(false);
                                        }}
                                        className={`flex-1 text-left transition-colors ${activeClient?.id === client.id ? 'font-semibold text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-200'}`}
                                    >
                                        {client.name}
                                    </button>

                                    {clients.length > 1 && (
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                if (window.confirm(`Tem certeza que deseja excluir "${client.name}"?`)) {
                                                    setDeletingId(client.id);
                                                    try {
                                                        await deleteClient(client.id);
                                                        setIsOpen(false);
                                                    } catch (err) {
                                                        // Error already handled by deleteClient
                                                    } finally {
                                                        setDeletingId(null);
                                                    }
                                                }
                                            }}
                                            disabled={deletingId === client.id}
                                            className="ml-2 p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors disabled:opacity-50"
                                            title="Excluir cliente"
                                        >
                                            <FiTrash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Create New Client Button */}
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                onCreateClick();
                            }}
                            className="w-full flex items-center gap-2 px-4 py-3 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors border-t border-gray-200 dark:border-gray-700 font-medium"
                        >
                            <FiPlus size={18} />
                            Criar Novo Cliente
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
