import React from 'react';
import ConfirmModal from '../ConfirmModal';
import { useTriggerHistory } from './hooks/useTriggerHistory';
import TriggerFilters, { Pagination } from './components/TriggerFilters';
import TriggerTable from './components/TriggerTable';
import AutomationPipelineModal from './components/AutomationPipelineModal';
import ContactsModal from './components/ContactsModal';
import EditParamsModal from './components/EditParamsModal';
import ErrorReportModal from './components/ErrorReportModal';
import ChildrenFunnelsModal from './components/ChildrenFunnelsModal';
import BulkSummaryBar from './components/BulkSummaryBar';

const TriggerHistoryOrchestrator = ({ refreshKey, onNavigateToBulk, triggerType: initialTriggerTypeProp = 'all' }) => {
    const {
        user, activeClient, triggers, loading, monitoringTrigger, setMonitoringTrigger,
        modalConfig, setModalConfig, contactsModal, setContactsModal, contactsFilter, setContactsFilter,
        contactsTypeFilter, setContactsTypeFilter, loadingContacts, editParamsModal, setEditParamsModal,
        errorModal, setErrorModal, childrenModal, setChildrenModal, selectedIds, setSelectedIds,
        filterName, setFilterName, dateRange, setDateRange, filterStatus, setFilterStatus,
        triggerType: currentTriggerType, setTriggerType, customStart, setCustomStart, customEnd, setCustomEnd,
        itemsPerPage, setItemsPerPage, page, setPage, totalPages, totalItems, fetchHistory,
        handleDelete, handleCancel, handleAction, handleBulkDeleteAction, handleStartNow,
        handleRetry, fetchErrors, fetchChildren, handleViewPipeline, handleSelectAll, handleSelectOne,
        handleViewContacts, handleEditParams
    } = useTriggerHistory(refreshKey, initialTriggerTypeProp);

    const handleActionWrapper = () => {
        if (modalConfig.type === 'bulk_delete') {
            handleBulkDeleteAction();
        } else {
            handleAction(modalConfig);
        }
    };

    const confirmBulkDelete = () => {
        setModalConfig({
            isOpen: true,
            type: 'bulk_delete',
            id: 'bulk',
            title: 'Excluir em Massa',
            message: `Tem certeza que deseja excluir os ${selectedIds.length} registros selecionados?`,
            confirmText: 'Sim, Excluir Todos',
            isDangerous: true
        });
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mt-8 transition-colors duration-200">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest ml-2">Filtrar por:</label>
                    <div className="relative group">
                        <select
                            value={currentTriggerType}
                            onChange={(e) => setTriggerType(e.target.value)}
                            className="appearance-none pl-10 pr-10 py-2.5 bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/10 rounded-xl text-sm font-bold text-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer hover:border-blue-500/50 min-w-[220px]"
                        >
                            <option value="all">📋 Tudo</option>
                            <option value="single">🚀 Histórico de Funis</option>
                            <option value="bulk">📤 Disparos em Massa</option>
                        </select>
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none">
                            {currentTriggerType === 'all' && <svg size={16} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>}
                            {currentTriggerType === 'single' && <svg size={16} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>}
                            {currentTriggerType === 'bulk' && <svg size={16} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>}
                        </div>
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover:text-blue-500 transition-colors">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 9l6 6 6-6"/></svg>
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={handleActionWrapper}
                title={modalConfig.title}
                message={modalConfig.message}
                confirmText={modalConfig.confirmText}
                isDangerous={modalConfig.isDangerous}
            />

            <EditParamsModal 
                editParamsModal={editParamsModal} 
                setEditParamsModal={setEditParamsModal} 
                activeClient={activeClient} 
                fetchHistory={fetchHistory} 
            />

            <ContactsModal 
                contactsModal={contactsModal} 
                setContactsModal={setContactsModal} 
                contactsFilter={contactsFilter} 
                setContactsFilter={setContactsFilter}
                contactsTypeFilter={contactsTypeFilter}
                setContactsTypeFilter={setContactsTypeFilter}
                loadingContacts={loadingContacts}
            />

            <ErrorReportModal 
                errorModal={errorModal} 
                setErrorModal={setErrorModal} 
            />

            <ChildrenFunnelsModal 
                childrenModal={childrenModal} 
                setChildrenModal={setChildrenModal} 
                setMonitoringTrigger={setMonitoringTrigger} 
            />

            <TriggerFilters 
                filterName={filterName} setFilterName={setFilterName}
                dateRange={dateRange} setDateRange={setDateRange}
                filterStatus={filterStatus} setFilterStatus={setFilterStatus}
                triggerType={currentTriggerType} setTriggerType={setTriggerType}
                customStart={customStart} setCustomStart={setCustomStart}
                customEnd={customEnd} setCustomEnd={setCustomEnd}
                itemsPerPage={itemsPerPage} setItemsPerPage={setItemsPerPage}
                fetchHistory={fetchHistory} onNavigateToBulk={onNavigateToBulk}
                setPage={setPage}
            />

            <TriggerTable 
                triggers={triggers} loading={loading} triggerType={currentTriggerType}
                selectedIds={selectedIds} handleSelectAll={handleSelectAll}
                handleSelectOne={handleSelectOne} handleViewContacts={handleViewContacts}
                fetchChildren={fetchChildren} fetchErrors={fetchErrors}
                handleViewPipeline={handleViewPipeline} handleEditParams={handleEditParams}
                handleStartNow={handleStartNow} handleCancel={handleCancel}
                handleRetry={handleRetry} handleDelete={handleDelete}
                user={user} confirmBulkDelete={confirmBulkDelete}
            />

            <Pagination 
                page={page} totalPages={totalPages} 
                totalItems={totalItems} setPage={setPage} 
            />

            <BulkSummaryBar 
                selectedIds={selectedIds} 
                setSelectedIds={setSelectedIds} 
                triggers={triggers} 
            />

            {monitoringTrigger && (
                <AutomationPipelineModal 
                    trigger={monitoringTrigger} 
                    onClose={() => setMonitoringTrigger(null)} 
                    onStop={handleCancel}
                    onDelete={handleDelete}
                />
            )}
        </div>
    );
};

export default TriggerHistoryOrchestrator;
