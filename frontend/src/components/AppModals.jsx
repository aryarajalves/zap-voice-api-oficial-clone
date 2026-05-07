import React from 'react';
import ClientModal from './ClientModal';
import SettingsModal from './SettingsModal';
import GlobalsModal from './GlobalsModal';
import ChatwootLabelsModal from './ChatwootLabelsModal';
import TriggerFunnelModal from './TriggerFunnelModal';
import ConfirmModal from './ConfirmModal';
import { FunnelGuide, BlockedGuide, HistoryGuide, ScheduleGuide } from './GuideModals';

const AppModals = ({ logic }) => {
  return (
    <>
      <ClientModal 
        isOpen={logic.isClientModalOpen} 
        onClose={() => logic.setIsClientModalOpen(false)} 
      />
      
      <SettingsModal 
        isOpen={logic.isSettingsModalOpen} 
        onClose={() => logic.setIsSettingsModalOpen(false)} 
        onSaved={() => logic.setSettingsRefreshKey(prev => prev + 1)} 
      />
      
      <GlobalsModal 
        isOpen={logic.isGlobalsModalOpen} 
        onClose={() => logic.setIsGlobalsModalOpen(false)} 
      />
      
      <ChatwootLabelsModal 
        isOpen={logic.isLabelsModalOpen} 
        onClose={() => logic.setIsLabelsModalOpen(false)} 
      />
      
      <TriggerFunnelModal 
        isOpen={logic.isTriggerModalOpen} 
        onClose={() => { logic.setIsTriggerModalOpen(false); logic.setSelectedFunnel(null); }} 
        funnel={logic.selectedFunnel} 
        onTriggerSuccess={() => {
          logic.setTriggerHistoryRefreshKey(prev => prev + 1);
          logic.setCurrentView('history');
        }}
      />

      <ConfirmModal
        isOpen={logic.isDeleteModalOpen}
        onClose={() => logic.setIsDeleteModalOpen(false)}
        onConfirm={logic.handleDelete}
        title="Excluir Funil"
        message="Tem certeza que deseja excluir este funil? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        isDangerous={true}
      />

      <ConfirmModal
        isOpen={logic.isBulkDeleteModalOpen}
        onClose={() => logic.setIsBulkDeleteModalOpen(false)}
        onConfirm={logic.handleBulkDelete}
        title="Excluir Selecionados"
        message={`Tem certeza que deseja excluir ${logic.selectedFunnelIds.length} funis selecionados? Esta ação não pode ser desfeita.`}
        confirmText="Excluir Todos"
        isDangerous={true}
      />

      {/* Guia Modals */}
      <FunnelGuide 
        isOpen={logic.isFunnelGuideOpen} 
        onClose={() => logic.setIsFunnelGuideOpen(false)} 
      />
      
      <BlockedGuide 
        isOpen={logic.isBlockedGuideOpen} 
        onClose={() => logic.setIsBlockedGuideOpen(false)} 
      />
      
      <HistoryGuide 
        isOpen={logic.isHistoryGuideOpen} 
        onClose={() => logic.setIsHistoryGuideOpen(false)} 
      />
      
      <ScheduleGuide 
        isOpen={logic.isScheduleGuideOpen} 
        onClose={() => logic.setIsScheduleGuideOpen(false)} 
      />
    </>
  );
};

export default AppModals;
