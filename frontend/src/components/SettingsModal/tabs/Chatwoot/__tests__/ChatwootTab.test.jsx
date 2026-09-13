import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ChatwootTab from '../../ChatwootTab';
import ChatwootApiConfigSection from '../ChatwootApiConfigSection';
import ChatwootAgentsSection from '../ChatwootAgentsSection';
import ChatwootWebhookSection from '../ChatwootWebhookSection';
import ChatwootLabelsSection from '../ChatwootLabelsSection';

vi.mock('react-hot-toast', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn()
    }
}));

import { toast } from 'react-hot-toast';

describe('ChatwootTab Modular Subcomponents', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        Object.assign(navigator, {
            clipboard: {
                writeText: vi.fn().mockResolvedValue(undefined)
            }
        });
    });

    const mockUserAdmin = { role: 'super_admin' };
    const mockFormData = {
        CHATWOOT_API_URL: 'https://chatwoot.teste.com/api/v1',
        CHATWOOT_ACCOUNT_ID: '1',
        CHATWOOT_SELECTED_INBOX_ID: '5',
        CHATWOOT_API_TOKEN: 'token_secret_123',
        WEBHOOK_BASE_URL: 'https://meuzapvoice.com'
    };

    describe('ChatwootApiConfigSection', () => {
        it('deve renderizar campos de configuração e status Conexão Pronta!', () => {
            render(
                <ChatwootApiConfigSection
                    user={mockUserAdmin}
                    formData={mockFormData}
                    handleChange={vi.fn()}
                    visibleFields={{}}
                    handleRevealSetting={vi.fn()}
                    fetchAgents={vi.fn()}
                    loadingAgents={false}
                />
            );

            expect(screen.getByText('Integração Chatwoot')).toBeDefined();
            expect(screen.getByDisplayValue('https://chatwoot.teste.com/api/v1')).toBeDefined();
            expect(screen.getByText('Conexão Pronta!')).toBeDefined();
        });

        it('deve exibir aviso de configurações incompletas quando faltar URL ou Token', () => {
            render(
                <ChatwootApiConfigSection
                    user={mockUserAdmin}
                    formData={{ CHATWOOT_API_URL: '', CHATWOOT_API_TOKEN: '' }}
                    handleChange={vi.fn()}
                    visibleFields={{}}
                    handleRevealSetting={vi.fn()}
                    fetchAgents={vi.fn()}
                    loadingAgents={false}
                />
            );

            expect(screen.getByText('Configurações do Chatwoot Incompletas')).toBeDefined();
        });
    });

    describe('ChatwootAgentsSection', () => {
        it('deve renderizar formulário de novo atendente e lista de agentes', () => {
            const agents = [
                { id: 1, name: 'Carlos Atendente', email: 'carlos@empresa.com', role: 'agent' },
                { id: 2, name: 'Admin Chefe', email: 'admin@empresa.com', role: 'administrator' }
            ];

            render(
                <ChatwootAgentsSection
                    user={mockUserAdmin}
                    formData={mockFormData}
                    newAgent={{ name: '', email: '', role: 'agent' }}
                    setNewAgent={vi.fn()}
                    handleAddAgent={vi.fn()}
                    isAddingAgent={false}
                    agents={agents}
                    loadingAgents={false}
                    setAgentToDelete={vi.fn()}
                />
            );

            expect(screen.getByText('Gerenciar Atendentes')).toBeDefined();
            expect(screen.getByText('Carlos Atendente')).toBeDefined();
            expect(screen.getByText('Admin Chefe')).toBeDefined();
            expect(screen.getByText('Adicionar Agente')).toBeDefined();
        });
    });

    describe('ChatwootWebhookSection', () => {
        it('deve exibir a URL do webhook e permitir copiar', () => {
            render(
                <ChatwootWebhookSection
                    user={mockUserAdmin}
                    activeClient={{ id: 42 }}
                    formData={mockFormData}
                />
            );

            expect(screen.getByText('Webhook de Eventos Chatwoot')).toBeDefined();
            expect(screen.getByText(/client_id=42/)).toBeDefined();

            const copyBtn = screen.getByTitle('Copiar URL');
            fireEvent.click(copyBtn);

            expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
                expect.stringContaining('https://meuzapvoice.com/api/webhooks/chatwoot_events?client_id=42')
            );
            expect(toast.success).toHaveBeenCalledWith('URL copiada!');
        });
    });

    describe('ChatwootLabelsSection', () => {
        it('deve renderizar formulário de etiquetas e listagem', () => {
            const labels = [
                { id: 10, title: 'Urgente', color: '#ff0000' },
                { id: 11, title: 'Dúvida', color: '#00ff00' }
            ];

            render(
                <ChatwootLabelsSection
                    user={mockUserAdmin}
                    formData={mockFormData}
                    fetchLabels={vi.fn()}
                    loadingLabels={false}
                    labelForm={{ title: '', color: '#3352f9' }}
                    setLabelForm={vi.fn()}
                    editingLabel={null}
                    setEditingLabel={vi.fn()}
                    isAddingLabel={false}
                    handleUpdateLabel={vi.fn()}
                    handleAddLabel={vi.fn()}
                    handleDeleteLabel={vi.fn()}
                    labels={labels}
                />
            );

            expect(screen.getByText('Gerenciar Etiquetas')).toBeDefined();
            expect(screen.getByText('Urgente')).toBeDefined();
            expect(screen.getByText('Dúvida')).toBeDefined();
        });
    });

    describe('ChatwootTab Orquestrador', () => {
        it('deve renderizar todos os blocos integrados', () => {
            render(
                <ChatwootTab
                    user={mockUserAdmin}
                    activeClient={{ id: 1 }}
                    formData={mockFormData}
                    handleChange={vi.fn()}
                    visibleFields={{}}
                    handleRevealSetting={vi.fn()}
                    agents={[]}
                    loadingAgents={false}
                    newAgent={{ name: '', email: '', role: 'agent' }}
                    setNewAgent={vi.fn()}
                    handleAddAgent={vi.fn()}
                    isAddingAgent={false}
                    setAgentToDelete={vi.fn()}
                    labels={[]}
                    loadingLabels={false}
                    labelForm={{ title: '', color: '#3352f9' }}
                    setLabelForm={vi.fn()}
                    editingLabel={null}
                    setEditingLabel={vi.fn()}
                    isAddingLabel={false}
                    handleUpdateLabel={vi.fn()}
                    handleAddLabel={vi.fn()}
                    handleDeleteLabel={vi.fn()}
                    fetchAgents={vi.fn()}
                    fetchLabels={vi.fn()}
                />
            );

            expect(screen.getByText('Integração Chatwoot')).toBeDefined();
            expect(screen.getByText('Gerenciar Atendentes')).toBeDefined();
            expect(screen.getByText('Webhook de Eventos Chatwoot')).toBeDefined();
            expect(screen.getByText('Gerenciar Etiquetas')).toBeDefined();
        });
    });
});
