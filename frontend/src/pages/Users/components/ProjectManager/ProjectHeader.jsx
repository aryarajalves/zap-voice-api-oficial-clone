import React from 'react';
import { FiFolder, FiPlus, FiX, FiCheck } from 'react-icons/fi';

const ProjectHeader = ({
    isSuperAdmin,
    isCreating,
    setIsCreating,
    newProjectName,
    setNewProjectName,
    onCreateProject
}) => {
    return (
        <>
            {/* Header / Ações de Criação */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50 dark:bg-gray-900/30 p-4 rounded-xl border border-gray-200 dark:border-white/5">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg">
                        <FiFolder size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 dark:text-white">Projetos Compartilhados</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Agrupe diferentes números de WhatsApp para compartilhar o mesmo banco de contatos (leads).
                        </p>
                    </div>
                </div>

                {isSuperAdmin && (
                    <button
                        onClick={() => setIsCreating(!isCreating)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium w-full sm:w-auto justify-center"
                    >
                        {isCreating ? <FiX /> : <FiPlus />}
                        {isCreating ? "Cancelar" : "Novo Projeto"}
                    </button>
                )}
            </div>

            {/* Form de Criação */}
            {isCreating && isSuperAdmin && (
                <form onSubmit={onCreateProject} className="flex gap-2 max-w-md bg-white dark:bg-[#1e293b] p-4 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm">
                    <input
                        type="text"
                        placeholder="Nome do Projeto (Ex: Operação Principal)"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white"
                        required
                    />
                    <button
                        type="submit"
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium text-sm rounded-lg transition-colors flex items-center gap-1"
                    >
                        <FiCheck /> Criar
                    </button>
                </form>
            )}
        </>
    );
};

export default ProjectHeader;
