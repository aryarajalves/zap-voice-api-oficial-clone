import React from 'react';
import { useAppointments } from './hooks/useAppointments';
import AppointmentsHeader from './components/AppointmentsHeader';
import AppointmentsFilterBar from './components/AppointmentsFilterBar';
import AppointmentsTable from './components/AppointmentsTable';
import AppointmentsPagination from './components/AppointmentsPagination';

export { useAppointments } from './hooks/useAppointments';
export { getRemainingTime } from './utils/countdown';

export default function AppointmentsPage() {
  const {
    appointments,
    total,
    loading,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    page,
    setPage,
    limit,
    setLimit,
    now,
    retryingIds,
    handleRetryReminder,
    handleClearFilters,
    totalPages,
  } = useAppointments();

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-500 space-y-6">
      {/* Top Header Card */}
      <AppointmentsHeader total={total} />

      {/* Control Bar (Search, Status Filter, Date Filters) */}
      <AppointmentsFilterBar
        search={search}
        setSearch={setSearch}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        setPage={setPage}
        handleClearFilters={handleClearFilters}
      />

      {/* Appointments List/Table */}
      <div className="bg-white dark:bg-[#1e293b] rounded-3xl border border-gray-100 dark:border-white/5 overflow-hidden shadow-xl">
        <AppointmentsTable
          loading={loading}
          appointments={appointments}
          now={now}
          retryingIds={retryingIds}
          handleRetryReminder={handleRetryReminder}
        />

        {/* Pagination Footer */}
        <AppointmentsPagination
          loading={loading}
          total={total}
          page={page}
          setPage={setPage}
          limit={limit}
          setLimit={setLimit}
          totalPages={totalPages}
        />
      </div>
    </div>
  );
}
