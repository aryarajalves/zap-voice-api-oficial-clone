import { useState, useEffect } from 'react';

export function useAppNavigationModals(user, onResetFunnelState) {
  // View State
  const [currentView, setCurrentView] = useState(localStorage.getItem('currentView') || 'bulk_sender');

  // Modal States
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isGlobalsModalOpen, setIsGlobalsModalOpen] = useState(false);
  const [isLabelsModalOpen, setIsLabelsModalOpen] = useState(false);
  const [isTriggerModalOpen, setIsTriggerModalOpen] = useState(false);

  // Guide States
  const [isFunnelGuideOpen, setIsFunnelGuideOpen] = useState(false);
  const [isScheduleGuideOpen, setIsScheduleGuideOpen] = useState(false);
  const [isHistoryGuideOpen, setIsHistoryGuideOpen] = useState(false);
  const [isBlockedGuideOpen, setIsBlockedGuideOpen] = useState(false);

  // Refresh Keys
  const [triggerHistoryRefreshKey, setTriggerHistoryRefreshKey] = useState(0);
  const [settingsRefreshKey, setSettingsRefreshKey] = useState(0);

  useEffect(() => {
    localStorage.setItem('currentView', currentView);
  }, [currentView]);

  useEffect(() => {
    const handleOpenSettings = () => {
      setIsSettingsModalOpen(true);
    };
    window.addEventListener('open-settings', handleOpenSettings);
    return () => window.removeEventListener('open-settings', handleOpenSettings);
  }, []);

  useEffect(() => {
    if (user && user.role === 'vendedor') {
      // vendedor_home é a tela de boas-vindas após fechar o chat
      const allowedVendedorViews = ['chat_conversations', 'vendedor_home'];
      if (!allowedVendedorViews.includes(currentView)) {
        setCurrentView('chat_conversations');
      }
    } else if (user && user.role === 'user') {
      const allowedViews = ['history', 'schedules'];
      if (!allowedViews.includes(currentView)) {
        setCurrentView('history');
      }
    }
  }, [user, currentView]);

  const handleViewChange = (view) => {
    setCurrentView(view);
    if (onResetFunnelState) {
      onResetFunnelState();
    }
  };

  return {
    currentView,
    setCurrentView,
    handleViewChange,
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    isClientModalOpen,
    setIsClientModalOpen,
    isGlobalsModalOpen,
    setIsGlobalsModalOpen,
    isLabelsModalOpen,
    setIsLabelsModalOpen,
    isTriggerModalOpen,
    setIsTriggerModalOpen,
    isFunnelGuideOpen,
    setIsFunnelGuideOpen,
    isScheduleGuideOpen,
    setIsScheduleGuideOpen,
    isHistoryGuideOpen,
    setIsHistoryGuideOpen,
    isBlockedGuideOpen,
    setIsBlockedGuideOpen,
    triggerHistoryRefreshKey,
    setTriggerHistoryRefreshKey,
    settingsRefreshKey,
    setSettingsRefreshKey,
  };
}
