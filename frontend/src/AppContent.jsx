import React from 'react';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import AppModals from './components/AppModals';
import { useAppLogic } from './hooks/useAppLogic';
import {
  AppContentHeader,
  AppContentViewRouter,
  ChatConversationsOverlay,
  NoActiveClientScreen,
} from './components/AppContent';

export default function AppContent() {
  const logic = useAppLogic();

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#0f172a] dark:text-gray-100 overflow-hidden">
      <Toaster
        position="top-right"
        reverseOrder={false}
        containerStyle={{ zIndex: 99999999 }}
        toastOptions={{ style: { zIndex: 99999999 } }}
      />

      <AppModals logic={logic} />

      <Sidebar
        activeView={logic.currentView}
        onViewChange={logic.handleViewChange}
        onLogout={logic.logout}
        onSettings={() => {
          window.dispatchEvent(new CustomEvent('close-all-dropdowns'));
          logic.setIsSettingsModalOpen(true);
        }}
        user={logic.user}
        clientName={logic.clientName}
        onClientCreate={() => {
          window.dispatchEvent(new CustomEvent('close-all-dropdowns'));
          logic.setIsClientModalOpen(true);
        }}
        appBranding={logic.appBranding}
      />

      <main className="flex-1 overflow-y-auto">
        {!logic.activeClient ? (
          <NoActiveClientScreen />
        ) : (
          <>
            <AppContentHeader logic={logic} />
            <AppContentViewRouter logic={logic} />
          </>
        )}
      </main>

      <ChatConversationsOverlay logic={logic} />
    </div>
  );
}
