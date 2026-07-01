import React from 'react';
import TriggerTableRow from './TriggerTableRow';

const TriggerTable = ({
    triggers, loading, triggerType, selectedIds, handleSelectAll,
    handleSelectOne, handleViewContacts, fetchChildren, fetchErrors,
    handleViewPipeline, handleEditParams, handleStartNow, handleCancel,
    handleRetry, handleDelete, handleSyncStats, user, confirmBulkDelete, onManualInteraction,
    handleTogglePin, showOnlyPinned, folders, moveTriggerToFolder
}) => {
    const raw = Array.isArray(triggers) ? triggers : [];
    // Fixados sobem ao topo; se showOnlyPinned, mostra só os fixados
    const sorted = [
        ...raw.filter(t => t.is_pinned),
        ...raw.filter(t => !t.is_pinned),
    ];
    const displayTriggers = showOnlyPinned ? sorted.filter(t => t.is_pinned) : sorted;

    if (loading && displayTriggers.length === 0) {
        return <div className="p-8 text-center text-gray-400 animate-pulse">Carregando histórico...</div>;
    }

    if (displayTriggers.length === 0) {
        return <div className="p-8 text-center text-gray-400">Nenhum disparo registrado.</div>;
    }

    return (
        <div className="overflow-x-auto">
            {selectedIds.length > 0 && user?.role === 'super_admin' && (
                <div className="p-2 bg-red-50 dark:bg-red-900/10 flex justify-end px-4">
                    <button
                        onClick={confirmBulkDelete}
                        className="flex items-center gap-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-3 py-1 rounded-full text-sm font-semibold hover:bg-red-200 dark:hover:bg-red-900/50 transition shadow-sm"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Excluir ({selectedIds.length})
                    </button>
                </div>
            )}
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        <th className="p-4 w-8">
                            <input
                                type="checkbox"
                                onChange={handleSelectAll}
                                checked={displayTriggers.length > 0 && selectedIds.length === displayTriggers.length}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                        </th>
                        <th className="p-4 font-semibold">Processamento</th>
                        <th className="p-4 font-semibold">Funil</th>
                        <th className="p-4 font-semibold text-center">Status</th>
                        <th className="p-4 font-semibold text-right">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                    {displayTriggers.map((trigger) => (
                        <TriggerTableRow
                            key={trigger.id || Math.random()}
                            trigger={trigger}
                            selectedIds={selectedIds}
                            handleSelectOne={handleSelectOne}
                            handleViewContacts={handleViewContacts}
                            fetchChildren={fetchChildren}
                            fetchErrors={fetchErrors}
                            handleViewPipeline={handleViewPipeline}
                            handleEditParams={handleEditParams}
                            handleStartNow={handleStartNow}
                            handleCancel={handleCancel}
                            handleRetry={handleRetry}
                            handleDelete={handleDelete}
                            handleSyncStats={handleSyncStats}
                            user={user}
                            onManualInteraction={onManualInteraction}
                            handleTogglePin={handleTogglePin}
                            folders={folders}
                            moveTriggerToFolder={moveTriggerToFolder}
                        />

                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default TriggerTable;
