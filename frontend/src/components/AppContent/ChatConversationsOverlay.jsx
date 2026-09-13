import React from 'react';
import ChatConversations from '../../pages/ChatConversations';

export default function ChatConversationsOverlay({ logic }) {
  if (logic.currentView !== 'chat_conversations') return null;

  return (
    <div className="fixed inset-0 z-[100] w-full h-full flex flex-col bg-[#0f172a] animate-in fade-in duration-300">
      <ChatConversations
        onClose={() => {
          // vendedor vai para tela de boas-vindas; outros voltam ao bulk_sender
          logic.handleViewChange(logic.user?.role === 'vendedor' ? 'vendedor_home' : 'bulk_sender');
        }}
        onNavigate={(view) => {
          // webhook_integrations é mapeado para a view 'integrations' do sistema
          const viewMap = { webhook_integrations: 'integrations' };
          logic.handleViewChange(viewMap[view] || view);
        }}
      />
    </div>
  );
}
