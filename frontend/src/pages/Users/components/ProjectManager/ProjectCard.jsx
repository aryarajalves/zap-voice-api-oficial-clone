import React from 'react';
import { FiFolder, FiUsers, FiEdit2, FiTrash2, FiCheck, FiX } from 'react-icons/fi';
import ProjectClientsAssociation from './ProjectClientsAssociation';

const ProjectCard = ({
    project,
    isExpanded,
    isEditing,
    editingName,
    setEditingName,
    onStartEdit,
    onCancelEdit,
    onSaveEdit,
    onConfirmDelete,
    onToggleExpand,
    isSuperAdmin,
    clients,
    selectedClientIds,
    onClientCheckboxChange,
    onSaveAssociations,
    savingAssociations,
    getClientProjectName
}) => {
    return (
        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-white/5 overflow-hidden transition-all shadow-sm">
            {/* Cabeçalho do Projeto */}
            <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/10">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FiFolder className="text-blue-500 shrink-0" size={20} />
                    {isEditing ? (
                        <div className="flex items-center gap-2 flex-1 max-w-md">
                            <input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-700 rounded bg-transparent text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                required
                            />
                            <button
                                onClick={() => onSaveEdit(project.id)}
                                className="p-1 bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 rounded transition-colors"
                            >
                                <FiCheck size={16} />
                            </button>
                            <button
                                onClick={onCancelEdit}
                                className="p-1 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded transition-colors"
                            >
                                <FiX size={16} />
                            </button>
                        </div>
                    ) : (
                        <div className="min-w-0">
                            <h4 className="font-bold text-gray-800 dark:text-white truncate">{project.name}</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-0.5">
                                <FiUsers size={12} /> {project.clients?.length || 0} número(s) associado(s)
                            </p>
                        </div>
                    )}
                </div>

                {/* Ações do Cabeçalho */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                        onClick={() => onToggleExpand(project)}
                        className="px-3 py-1.5 text-xs font-semibold bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
                    >
                        {isExpanded ? "Fechar Configuração" : "Gerenciar Vínculos"}
                    </button>

                    {isSuperAdmin && !isEditing && (
                        <>
                            <button
                                onClick={() => onStartEdit(project)}
                                title="Editar Nome"
                                className="p-2 text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
                            >
                                <FiEdit2 size={15} />
                            </button>
                            <button
                                onClick={() => onConfirmDelete(project)}
                                title="Excluir Projeto"
                                className="p-2 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
                            >
                                <FiTrash2 size={15} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Configuração de Vínculos (Expandido) */}
            {isExpanded && (
                <ProjectClientsAssociation
                    project={project}
                    clients={clients}
                    selectedClientIds={selectedClientIds}
                    onClientCheckboxChange={onClientCheckboxChange}
                    onSaveAssociations={onSaveAssociations}
                    savingAssociations={savingAssociations}
                    isSuperAdmin={isSuperAdmin}
                    getClientProjectName={getClientProjectName}
                />
            )}
        </div>
    );
};

export default ProjectCard;
