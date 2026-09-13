import React from 'react';
import { FiUserPlus, FiUsers, FiLink, FiFolder } from 'react-icons/fi';

const UsersHeader = ({
    currentUser,
    activeTab,
    setActiveTab,
    onOpenCreateModal
}) => {
    return (
        <>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Gestão de Usuários</h2>
                {activeTab === 'users' && (
                    <button
                        onClick={onOpenCreateModal}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium w-full sm:w-auto justify-center"
                    >
                        <FiUserPlus /> Novo Usuário
                    </button>
                )}
            </div>

            {/* Abas Premium */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
                <button
                    onClick={() => setActiveTab('users')}
                    className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all ${
                        activeTab === 'users'
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                    <FiUsers size={16} /> Usuários Ativos
                </button>
                <button
                    onClick={() => setActiveTab('invitations')}
                    className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all ${
                        activeTab === 'invitations'
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                    <FiLink size={16} /> Links de Convite
                </button>
                {(currentUser?.role === 'super_admin' || currentUser?.role === 'admin') && (
                    <button
                        onClick={() => setActiveTab('projects')}
                        className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all ${
                            activeTab === 'projects'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    >
                        <FiFolder size={16} /> Projetos
                    </button>
                )}
            </div>
        </>
    );
};

export default UsersHeader;
