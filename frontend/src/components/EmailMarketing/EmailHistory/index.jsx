import React from 'react';
import { useEmailHistory } from './useEmailHistory';
import EmailHistoryHeader from './EmailHistoryHeader';
import EmailHistoryFilters from './EmailHistoryFilters';
import EmailHistoryTable, { StatusBadge, formatDate } from './EmailHistoryTable';
import DeleteDispatchModal from './DeleteDispatchModal';

export {
  useEmailHistory,
  EmailHistoryHeader,
  EmailHistoryFilters,
  EmailHistoryTable,
  DeleteDispatchModal,
  StatusBadge,
  formatDate
};

export default function EmailHistoryTab() {
  const {
    history,
    loading,
    fetchHistory,
    pageSize,
    setPageSize,
    currentPage,
    setCurrentPage,
    deleteTarget,
    setDeleteTarget,
    deleting,
    handleDeleteDispatch,
    filterSearch,
    setFilterSearch,
    filterStatus,
    setFilterStatus,
    filterDateFrom,
    setFilterDateFrom,
    filterDateTo,
    setFilterDateTo,
    filteredHistory,
    hasFilters,
    clearFilters,
    totalPages,
    startIndex,
    endIndex,
    currentHistory
  } = useEmailHistory();

  return (
    <div className="space-y-5">
      <EmailHistoryHeader
        pageSize={pageSize}
        setPageSize={setPageSize}
        setCurrentPage={setCurrentPage}
        fetchHistory={fetchHistory}
        loading={loading}
      />

      <EmailHistoryFilters
        filterSearch={filterSearch}
        setFilterSearch={setFilterSearch}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        filterDateFrom={filterDateFrom}
        setFilterDateFrom={setFilterDateFrom}
        filterDateTo={filterDateTo}
        setFilterDateTo={setFilterDateTo}
        hasFilters={hasFilters}
        clearFilters={clearFilters}
        filteredCount={filteredHistory.length}
        totalCount={history.length}
      />

      <EmailHistoryTable
        loading={loading}
        history={history}
        filteredHistory={filteredHistory}
        currentHistory={currentHistory}
        clearFilters={clearFilters}
        setDeleteTarget={setDeleteTarget}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalPages={totalPages}
        startIndex={startIndex}
        endIndex={endIndex}
      />

      <DeleteDispatchModal
        deleteTarget={deleteTarget}
        setDeleteTarget={setDeleteTarget}
        deleting={deleting}
        handleDeleteDispatch={handleDeleteDispatch}
      />
    </div>
  );
}
