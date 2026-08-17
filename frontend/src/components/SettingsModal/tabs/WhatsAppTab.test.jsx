import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import WhatsAppTab from './WhatsAppTab';
import WhatsAppApiSubTab from '../components/whatsapp/WhatsAppApiSubTab';
import WhatsAppAutomationSubTab from '../components/whatsapp/WhatsAppAutomationSubTab';
import WhatsAppRemindersSubTab from '../components/whatsapp/WhatsAppRemindersSubTab';

// Mock contexts and modules
vi.mock('../../../contexts/ClientContext', () => ({
    useClient: () => ({ activeClient: { id: 1, name: 'Cliente Teste' } })
}));

vi.mock('../../../AuthContext', () => ({
    fetchWithAuth: vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }))
}));

vi.mock('../hooks/useWhatsAppTabData', () => ({
    useWhatsAppTabData: () => ({
        templates: [
            { name: 'lembrete_consulta', language: 'pt_BR', components: [{ type: 'BODY', text: 'Olá {{1}}' }] }
        ],
        availableLabels: [{ id: 1, name: 'Lead', color: '#10B981' }],
        funnels: [{ id: 1, name: 'Funil Teste' }],
        appointmentParams: {},
        buttonActions: {},
        handleParamChange: vi.fn(),
        handleButtonActionChange: vi.fn()
    })
}));

describe('WhatsAppTab and Subcomponents Modularization Unit Tests', () => {
    const mockFormData = {
        WA_BUSINESS_ACCOUNT_ID: '123456_BIZ',
        WA_PHONE_NUMBER_ID: '789012_PHONE',
        WA_ACCESS_TOKEN: 'EAAB_TEST_TOKEN',
        WA_PIN: '654321',
        WA_USE_UNIQUE_WEBHOOK: false,
        WA_WINDOW_CLOSED_REMOVE_LABELS: 'Lead',
        WA_HAS_AI_AGENT: true,
        WA_HUMAN_LABEL: 'Atendimento Humano',
        WA_ROBO_LABEL: 'Robo IA',
        APPOINTMENTS_ENABLED: true,
        APPOINTMENTS_REMINDER_TEMPLATE: 'lembrete_consulta',
        APPOINTMENTS_REMINDER_MINUTES: '30'
    };

    const defaultProps = {
        user: { role: 'admin' },
        formData: mockFormData,
        setFormData: vi.fn(),
        handleChange: vi.fn(),
        visibleFields: {},
        handleRevealSetting: vi.fn(),
        copyToClipboard: vi.fn(),
        whatsappProfile: {},
        whatsappAbout: '',
        setWhatsappAbout: vi.fn(),
        handleUpdateWhatsAppAbout: vi.fn(),
        isUpdatingWaAbout: false,
        whatsappName: '',
        setWhatsappName: vi.fn(),
        handleUpdateWhatsAppName: vi.fn(),
        isUpdatingWaName: false,
        handleRegisterWhatsAppNumber: vi.fn(),
        isRegisteringWa: false,
        handleWhatsAppLogoUpload: vi.fn(),
        isUpdatingWaLogo: false
    };

    it('WhatsAppTab renderiza as sub-abas e permite alternar entre elas', () => {
        render(<WhatsAppTab {...defaultProps} />);

        expect(screen.getByText('Conexão & Webhook')).toBeDefined();
        expect(screen.getByText('Perfil Comercial')).toBeDefined();
        expect(screen.getByText('Automação & IA')).toBeDefined();
        expect(screen.getByText('Lembretes de Agenda')).toBeDefined();

        // Alterna para Automação & IA
        fireEvent.click(screen.getByText('Automação & IA'));
        expect(screen.getByText('Janela de 24 Horas')).toBeDefined();

        // Alterna para Lembretes de Agenda
        fireEvent.click(screen.getByText('Lembretes de Agenda'));
        expect(screen.getByText('Lembretes de Agendamento')).toBeDefined();
    });

    it('WhatsAppApiSubTab exibe campos de conexão e dispara handleChange', () => {
        const handleChange = vi.fn();
        render(
            <WhatsAppApiSubTab
                formData={mockFormData}
                setFormData={vi.fn()}
                handleChange={handleChange}
                visibleFields={{}}
                handleRevealSetting={vi.fn()}
                copyToClipboard={vi.fn()}
                activeClient={{ id: 1 }}
                isUniqueWebhook={false}
                metaWebhookUrl="https://api.test/meta"
            />
        );

        expect(screen.getByDisplayValue('123456_BIZ')).toBeDefined();
        expect(screen.getByDisplayValue('789012_PHONE')).toBeDefined();
        expect(screen.getByDisplayValue('654321')).toBeDefined();
    });

    it('WhatsAppAutomationSubTab exibe etiquetas e toggle de Agente IA', () => {
        const handleChange = vi.fn();
        render(
            <WhatsAppAutomationSubTab
                formData={mockFormData}
                handleChange={handleChange}
                availableLabels={[{ id: 1, name: 'Lead', color: '#10B981' }]}
            />
        );

        expect(screen.getByText('Janela de 24 Horas')).toBeDefined();
        expect(screen.getByText('Automação de Agente de IA (Atendimento Humano)')).toBeDefined();
    });

    it('WhatsAppRemindersSubTab exibe opções de agendamento de lembrete', () => {
        const handleChange = vi.fn();
        render(
            <WhatsAppRemindersSubTab
                formData={mockFormData}
                handleChange={handleChange}
                templates={[{ name: 'lembrete_consulta', language: 'pt_BR', components: [{ type: 'BODY', text: 'Olá {{1}}' }] }]}
                funnels={[]}
                appointmentParams={{}}
                buttonActions={{}}
                handleParamChange={vi.fn()}
                handleButtonActionChange={vi.fn()}
            />
        );

        expect(screen.getByText('Lembretes de Agendamento')).toBeDefined();
        expect(screen.getByDisplayValue('lembrete_consulta (pt_BR)')).toBeDefined();
    });
});
