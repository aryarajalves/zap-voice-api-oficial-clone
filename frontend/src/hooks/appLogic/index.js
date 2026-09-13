import { useEffect } from 'react';
import { useAuth } from '../../AuthContext';
import { useClient } from '../../contexts/ClientContext';
import { useAppBranding } from './useAppBranding';
import { useAppNavigationModals } from './useAppNavigationModals';
import { useAppFunnels } from './useAppFunnels';

export function useAppLogic() {
  const { user, logout } = useAuth();
  const { activeClient } = useClient();

  const branding = useAppBranding(activeClient);
  const funnels = useAppFunnels(activeClient);
  const navModals = useAppNavigationModals(user, funnels.resetFunnelState);

  // Carregar funis e configurações quando activeClient mudar ou settingsRefreshKey for incrementado
  useEffect(() => {
    if (activeClient) {
      funnels.fetchFunnels();
      branding.fetchSettings();
    }
  }, [activeClient, navModals.settingsRefreshKey, funnels.fetchFunnels, branding.fetchSettings]);

  return {
    user,
    logout,
    activeClient,
    currentView: navModals.currentView,
    setCurrentView: navModals.setCurrentView,
    funnels: funnels.funnels,
    showBuilder: funnels.showBuilder,
    setShowBuilder: funnels.setShowBuilder,
    selectedFunnel: funnels.selectedFunnel,
    setSelectedFunnel: funnels.setSelectedFunnel,
    editingFunnel: funnels.editingFunnel,
    setEditingFunnel: funnels.setEditingFunnel,
    isDeleteModalOpen: funnels.isDeleteModalOpen,
    setIsDeleteModalOpen: funnels.setIsDeleteModalOpen,
    isBulkDeleteModalOpen: funnels.isBulkDeleteModalOpen,
    setIsBulkDeleteModalOpen: funnels.setIsBulkDeleteModalOpen,
    isSettingsModalOpen: navModals.isSettingsModalOpen,
    setIsSettingsModalOpen: navModals.setIsSettingsModalOpen,
    isClientModalOpen: navModals.isClientModalOpen,
    setIsClientModalOpen: navModals.setIsClientModalOpen,
    isGlobalsModalOpen: navModals.isGlobalsModalOpen,
    setIsGlobalsModalOpen: navModals.setIsGlobalsModalOpen,
    isLabelsModalOpen: navModals.isLabelsModalOpen,
    setIsLabelsModalOpen: navModals.setIsLabelsModalOpen,
    isFunnelGuideOpen: navModals.isFunnelGuideOpen,
    setIsFunnelGuideOpen: navModals.setIsFunnelGuideOpen,
    isScheduleGuideOpen: navModals.isScheduleGuideOpen,
    setIsScheduleGuideOpen: navModals.setIsScheduleGuideOpen,
    isHistoryGuideOpen: navModals.isHistoryGuideOpen,
    setIsHistoryGuideOpen: navModals.setIsHistoryGuideOpen,
    isBlockedGuideOpen: navModals.isBlockedGuideOpen,
    setIsBlockedGuideOpen: navModals.setIsBlockedGuideOpen,
    triggerHistoryRefreshKey: navModals.triggerHistoryRefreshKey,
    setTriggerHistoryRefreshKey: navModals.setTriggerHistoryRefreshKey,
    settingsRefreshKey: navModals.settingsRefreshKey,
    setSettingsRefreshKey: navModals.setSettingsRefreshKey,
    isTriggerModalOpen: navModals.isTriggerModalOpen,
    setIsTriggerModalOpen: navModals.setIsTriggerModalOpen,
    isTagModalOpen: funnels.isTagModalOpen,
    setIsTagModalOpen: funnels.setIsTagModalOpen,
    funnelForTag: funnels.funnelForTag,
    setFunnelForTag: funnels.setFunnelForTag,
    clientName: branding.clientName,
    appBranding: branding.appBranding,
    selectedFunnelIds: funnels.selectedFunnelIds,
    setSelectedFunnelIds: funnels.setSelectedFunnelIds,
    fetchFunnels: funnels.fetchFunnels,
    fetchSettings: branding.fetchSettings,
    isArchivedTab: funnels.isArchivedTab,
    setIsArchivedTab: funnels.setIsArchivedTab,
    itemsPerPage: funnels.itemsPerPage,
    setItemsPerPage: funnels.setItemsPerPage,
    currentPage: funnels.currentPage,
    setCurrentPage: funnels.setCurrentPage,
    handleArchiveFunnel: funnels.handleArchiveFunnel,
    handleTagFunnel: funnels.handleTagFunnel,
    handlePinFunnel: funnels.handlePinFunnel,
    handleCreateFunnel: funnels.handleCreateFunnel,
    handleEdit: funnels.handleEdit,
    confirmDelete: funnels.confirmDelete,
    handleDelete: funnels.handleDelete,
    toggleFunnelSelection: funnels.toggleFunnelSelection,
    handleBulkDelete: funnels.handleBulkDelete,
    toggleSelectAll: funnels.toggleSelectAll,
    handleViewChange: navModals.handleViewChange,
    handleBulkArchive: funnels.handleBulkArchive,
    handleBulkTagConfirm: funnels.handleBulkTagConfirm,
    handleDuplicateFunnel: funnels.handleDuplicateFunnel,
  };
}
