import React, { useMemo } from 'react';
import ConfirmModal from '../../components/ConfirmModal';
import { useLogViewerData } from './hooks/useLogViewerData';
import { QUICK_FILTERS } from './utils/logHelpers';

// Subcomponentes Modulares
import LoadingOverlay from './components/LoadingOverlay';
import LineDetailModal from './components/LineDetailModal';
import LogViewerControls from './components/LogViewerControls';
import LogViewerManualPaste from './components/LogViewerManualPaste';
import LogViewerFilters from './components/LogViewerFilters';
import LogViewerResults from './components/LogViewerResults';

export default function LogViewer() {
  const data = useLogViewerData();

  // Filtrar linhas
  const filtered = useMemo(() => {
    if (!data.parsed.length) return [];
    const activePatterns = data.activeQuickFilters
      .map(id => QUICK_FILTERS.find(f => f.id === id)?.pattern)
      .filter(Boolean);

    return data.parsed.filter(line => {
      if (data.filterTimeFrom && line.time && line.time < data.filterTimeFrom) return false;
      if (data.filterTimeTo   && line.time && line.time > data.filterTimeTo)   return false;
      if (data.filterLevels.length > 0) {
        const norm = line.level === 'WARN' ? 'WARNING' : line.level === 'FATAL' ? 'CRITICAL' : line.level;
        if (!data.filterLevels.includes(norm)) return false;
      }
      
      // Unir tags e termos de busca
      const inputTerms = data.filterText.toLowerCase().split(/[\s,]+/).filter(t => t.trim().length > 0);
      const tagTerms = data.filterTags.map(tag => tag.toLowerCase());
      const allTerms = [...new Set([...tagTerms, ...inputTerms])];
      
      if (allTerms.length > 0) {
        const matchAll = allTerms.every(term => line.rawLower.includes(term));
        if (!matchAll) return false;
      }
      if (activePatterns.length > 0 && !activePatterns.some(re => re.test(line.raw))) return false;
      return true;
    });
  }, [
    data.parsed,
    data.filterTimeFrom,
    data.filterTimeTo,
    data.filterLevels,
    data.filterText,
    data.filterTags,
    data.activeQuickFilters
  ]);

  return (
    <div className="space-y-4">
      {data.loading && (
        <LoadingOverlay
          stage={data.loadingStage}
          progress={data.parseProgress}
          total={data.parseTotal}
          current={data.parseCurrent}
        />
      )}

      {data.detailLine && (
        <LineDetailModal
          line={data.detailLine}
          onClose={() => data.setDetailLine(null)}
          onCopy={data.copyLine}
          onDelete={data.handleDeleteDetail}
        />
      )}

      <ConfirmModal
        isOpen={!!data.confirmState}
        onClose={data.closeConfirm}
        onConfirm={() => data.confirmState?.onConfirm?.()}
        title={data.confirmState?.title}
        message={data.confirmState?.message}
        confirmText={data.confirmState?.confirmText || 'Confirmar'}
        cancelText="Cancelar"
        isDangerous={data.confirmState?.isDangerous}
      />

      {/* Controles principais */}
      <LogViewerControls
        dateMenuRef={data.dateMenuRef}
        lineMenuRef={data.lineMenuRef}
        showDateMenu={data.showDateMenu}
        setShowDateMenu={data.setShowDateMenu}
        showLineMenu={data.showLineMenu}
        setShowLineMenu={data.setShowLineMenu}
        selectedDate={data.selectedDate}
        setSelectedDate={data.setSelectedDate}
        availableDates={data.availableDates}
        lineCount={data.lineCount}
        setLineCount={data.setLineCount}
        loading={data.loading}
        fetchLogs={data.fetchLogs}
        pasteMode={data.pasteMode}
        setPasteMode={data.setPasteMode}
        hasProcessed={data.hasProcessed}
        handleClear={data.handleClear}
        handleClearServer={data.handleClearServer}
        totalLines={data.totalLines}
      />

      {/* Paste manual */}
      <LogViewerManualPaste
        pasteMode={data.pasteMode}
        rawPaste={data.rawPaste}
        setRawPaste={data.setRawPaste}
        setHasProcessed={data.setHasProcessed}
        handleProcessPaste={data.handleProcessPaste}
      />

      {/* Filtros */}
      <LogViewerFilters
        hasProcessed={data.hasProcessed}
        activeQuickFilters={data.activeQuickFilters}
        setActiveQuickFilters={data.setActiveQuickFilters}
        toggleQuickFilter={data.toggleQuickFilter}
        filterTimeFrom={data.filterTimeFrom}
        setFilterTimeFrom={data.setFilterTimeFrom}
        filterTimeTo={data.filterTimeTo}
        setFilterTimeTo={data.setFilterTimeTo}
        filterText={data.filterText}
        setFilterText={data.setFilterText}
        filterTags={data.filterTags}
        setFilterTags={data.setFilterTags}
        filterLevels={data.filterLevels}
        setFilterLevels={data.setFilterLevels}
      />

      {/* Resultado */}
      <LogViewerResults
        hasProcessed={data.hasProcessed}
        parsed={data.parsed}
        filtered={filtered}
        selectedDate={data.selectedDate}
        activeQuickFilters={data.activeQuickFilters}
        selectedIdx={data.selectedIdx}
        toggleSelect={data.toggleSelect}
        clearSelection={data.clearSelection}
        setSelectedIdx={data.setSelectedIdx}
        deleteSelected={data.deleteSelected}
        deleting={data.deleting}
        truncated={data.truncated}
        totalLines={data.totalLines}
        filterTags={data.filterTags}
        filterText={data.filterText}
        setDetailLine={data.setDetailLine}
        currentPage={data.currentPage}
        totalPages={data.totalPages}
        goToPage={data.goToPage}
        loading={data.loading}
      />
    </div>
  );
}
