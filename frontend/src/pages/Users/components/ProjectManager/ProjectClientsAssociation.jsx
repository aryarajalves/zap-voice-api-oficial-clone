import React from 'react';
import { FiInfo, FiCheck } from 'react-icons/fi';

const ProjectClientsAssociation = ({
    project,
    clients,
    selectedClientIds,
    onClientCheckboxChange,
    onSaveAssociations,
    savingAssociations,
    isSuperAdmin,
    getClientProjectName
}) => {
    return (
        <div className="p-5 bg-white dark:bg-[#1e293b] border-t border-gray-100 dark:border-gray-800 space-y-4">
            <div className="flex items-start gap-2 p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 rounded-lg text-xs text-blue-700 dark:text-blue-300">
                <FiInfo className="shrink-0 mt-0.5" size={14} />
                <span>
                    Marque os números (clientes) que você deseja agrupar no projeto <strong>{project.name}</strong>. 
                    Eles compartilharão o mesmo banco de leads automaticamente. Números marcados aqui que estavam em outros projetos serão movidos.
                </span>
            </div>

            {clients.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum cliente disponível para vincular.</p>
            ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                    {clients.map((client) => {
                        const otherProjName = getClientProjectName(client, project.id);
                        const isChecked = selectedClientIds.includes(client.id);

                        return (
                            <label
                                key={client.id}
                                className={`flex items-center justify-between p-3 rounded-lg border text-sm cursor-pointer transition-all ${
                                    isChecked
                                        ? 'bg-blue-500/5 border-blue-500/30 text-gray-800 dark:text-white'
                                        : 'bg-transparent border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 text-gray-600 dark:text-gray-300'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        disabled={!isSuperAdmin}
                                        onChange={() => onClientCheckboxChange(client.id)}
                                        className="rounded text-blue-600 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 h-4 w-4"
                                    />
                                    <div className="flex flex-col">
                                        <span className="font-medium">{client.name}</span>
                                        {client.whatsapp_number && (
                                            <span className="text-xs text-gray-400">{client.whatsapp_number}</span>
                                        )}
                                    </div>
                                </div>

                                {otherProjName && (
                                    <span className="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded font-semibold">
                                        Em: {otherProjName}
                                    </span>
                                )}
                            </label>
                        );
                    })}
                </div>
            )}

            {isSuperAdmin && (
                <div className="flex justify-end pt-2">
                    <button
                        onClick={() => onSaveAssociations(project.id)}
                        disabled={savingAssociations}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium text-sm rounded-lg transition-all flex items-center gap-2 shadow-sm"
                    >
                        {savingAssociations ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                            <FiCheck />
                        )}
                        Salvar Vínculos
                    </button>
                </div>
            )}
        </div>
    );
};

export default ProjectClientsAssociation;
