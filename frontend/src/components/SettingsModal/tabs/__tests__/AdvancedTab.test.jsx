import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import AdvancedTab from '../AdvancedTab';
import ManyChatTokensSection from '../AdvancedTab/ManyChatTokensSection';
import MemoryWebhookSection from '../AdvancedTab/MemoryWebhookSection';
import ChatMessagesWebhookSection from '../AdvancedTab/ChatMessagesWebhookSection';

describe('AdvancedTab and Submodules', () => {
  const defaultUser = { role: 'admin' };
  const defaultFormData = {
    MANYCHAT_API_KEYS: JSON.stringify([{ id: '1', name: 'Conta Principal', key: 'token-123' }]),
    AGENT_MEMORY_WEBHOOK_URL: 'https://webhook.site/memory',
    CHAT_MESSAGES_WEBHOOK_URL: 'https://webhook.site/chat'
  };

  it('renderiza os componentes para usuário admin', () => {
    render(
      <AdvancedTab
        user={defaultUser}
        formData={defaultFormData}
        handleChange={vi.fn()}
        visibleFields={{}}
        handleRevealSetting={vi.fn()}
        showMemoryLogsTable={false}
        setShowMemoryLogsTable={vi.fn()}
        loadingMemoryLogs={false}
        fetchMemoryLogs={vi.fn()}
        setMemoryLogsPage={vi.fn()}
        memoryLogs={[]}
        memoryLogsPage={0}
        memoryLogsLimit={20}
        memoryLogsTotal={0}
        setMemoryLogsLimit={vi.fn()}
        showChatLogsTable={false}
        setShowChatLogsTable={vi.fn()}
        loadingChatLogs={false}
        fetchChatLogs={vi.fn()}
        setChatLogsPage={vi.fn()}
        chatLogs={[]}
        chatLogsPage={0}
        chatLogsLimit={20}
        chatLogsTotal={0}
        setChatLogsLimit={vi.fn()}
      />
    );

    expect(screen.getByText('Integração ManyChat')).toBeDefined();
    expect(screen.getByText('Webhook de Memória do Agente')).toBeDefined();
    expect(screen.getByText('Webhook de Integração de Mensagens (AgentFlow)')).toBeDefined();
  });

  it('não renderiza as seções restritas se o usuário for membro comum', () => {
    render(
      <AdvancedTab
        user={{ role: 'agent' }}
        formData={defaultFormData}
        handleChange={vi.fn()}
        visibleFields={{}}
        showMemoryLogsTable={false}
        setShowMemoryLogsTable={vi.fn()}
        showChatLogsTable={false}
        setShowChatLogsTable={vi.fn()}
      />
    );

    expect(screen.queryByText('Integração ManyChat')).toBeNull();
  });

  describe('ManyChatTokensSection', () => {
    it('permite adicionar novo token', () => {
      const handleChange = vi.fn();
      render(
        <ManyChatTokensSection
          formData={defaultFormData}
          handleChange={handleChange}
          visibleFields={{}}
        />
      );

      const addButton = screen.getByText('Adicionar Token');
      fireEvent.click(addButton);

      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe('MemoryWebhookSection', () => {
    it('chama handleTestWebhook ao clicar em testar', () => {
      const handleTest = vi.fn();
      render(
        <MemoryWebhookSection
          formData={defaultFormData}
          handleChange={vi.fn()}
          testingWebhook={false}
          handleTestWebhook={handleTest}
          setShowMemoryLogsTable={vi.fn()}
          setMemoryLogsPage={vi.fn()}
          fetchMemoryLogs={vi.fn()}
        />
      );

      const testButton = screen.getByText('Testar');
      fireEvent.click(testButton);

      expect(handleTest).toHaveBeenCalled();
    });
  });

  describe('ChatMessagesWebhookSection', () => {
    it('chama handleTestChatWebhook ao clicar em testar', () => {
      const handleTest = vi.fn();
      render(
        <ChatMessagesWebhookSection
          formData={defaultFormData}
          handleChange={vi.fn()}
          testingChatWebhook={false}
          handleTestChatWebhook={handleTest}
          setShowChatLogsTable={vi.fn()}
          setChatLogsPage={vi.fn()}
          fetchChatLogs={vi.fn()}
        />
      );

      const testButton = screen.getByText('Testar');
      fireEvent.click(testButton);

      expect(handleTest).toHaveBeenCalled();
    });
  });
});
