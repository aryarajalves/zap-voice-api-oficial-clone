import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import BulkSendContactsModal from './BulkSendContactsModal';
import { fetchWithAuth } from '../../../AuthContext';

vi.mock('../../../AuthContext', () => ({
    fetchWithAuth: vi.fn()
}));

vi.mock('../../BulkSender/common/SearchableSelect', () => ({
    default: ({ options, value, onChange, placeholder }) => (
        <select
            data-testid="searchable-select"
            value={value}
            onChange={(e) => onChange(e.target.value)}
        >
            <option value="">{placeholder}</option>
            {options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
    )
}));

vi.mock('../../BulkSender/common/TemplatePreview', () => ({
    default: ({ template, params }) => (
        <div data-testid="template-preview">
            Preview: {template?.name} - {JSON.stringify(params)}
        </div>
    )
}));

vi.mock('../../BulkSender/common/MediaHeaderUploader', () => ({
    default: ({ format, templateParams, handleParamChange }) => (
        <div data-testid="media-uploader">
            Uploader: {format}
            <button onClick={() => handleParamChange('HEADER_0', 'https://mock.url/image.png')}>
                Upload Mock
            </button>
        </div>
    )
}));

describe('BulkSendContactsModal', () => {
    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        selectedPhones: ['5511999990035', '5511999990061'],
        clientId: 1,
        onSuccess: vi.fn()
    };

    const mockTemplates = [
        {
            name: 'welcome_message',
            language: 'pt_BR',
            components: [
                { type: 'HEADER', format: 'IMAGE' },
                { type: 'BODY', text: 'Olá {{1}}, bem-vindo!' },
                {
                    type: 'BUTTONS',
                    buttons: [
                        { type: 'QUICK_REPLY', text: 'Clique Aqui' }
                    ]
                }
            ]
        },
        {
            name: 'simple_text',
            language: 'pt_BR',
            components: [
                { type: 'BODY', text: 'Olá, tudo bem?' }
            ]
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        fetchWithAuth.mockImplementation(async (url) => {
            if (url.includes('/funnels')) {
                return { ok: true, json: async () => [{ id: 1, name: 'Funil Teste 1' }] };
            }
            if (url.includes('/templates')) {
                return { ok: true, json: async () => mockTemplates };
            }
            return { ok: true, json: async () => [] };
        });
    });

    it('renders correctly and loads templates', async () => {
        render(<BulkSendContactsModal {...defaultProps} />);

        expect(screen.getByText('Disparo em Massa')).toBeInTheDocument();
        expect(screen.getByText('Disparando para 2 contatos selecionados')).toBeInTheDocument();

        await waitFor(() => {
            expect(fetchWithAuth).toHaveBeenCalled();
        });
    });

    it('displays template variables and allows sending when form is filled', async () => {
        render(<BulkSendContactsModal {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getAllByTestId('searchable-select')[0]).toBeInTheDocument();
        });

        // Selecionar o template 'welcome_message'
        fireEvent.change(screen.getAllByTestId('searchable-select')[0], {
            target: { value: 'welcome_message' }
        });

        // Deve exibir o media uploader para o header e input para o body
        expect(screen.getByTestId('media-uploader')).toBeInTheDocument();
        expect(screen.getByText('Variável do Corpo {{1}}')).toBeInTheDocument();

        // Preencher variáveis
        fireEvent.click(screen.getByText('Upload Mock'));
        fireEvent.change(screen.getByPlaceholderText('Digite o valor para Variável do Corpo {{1}}'), {
            target: { value: 'Fulano' }
        });

        // Enviar disparo
        fetchWithAuth.mockImplementation(async (url) => {
            if (url.includes('/bulk-send/schedule')) return { ok: true };
            if (url.includes('/funnels')) return { ok: true, json: async () => [] };
            if (url.includes('/templates')) return { ok: true, json: async () => mockTemplates };
            return { ok: true };
        });
        
        fireEvent.click(screen.getByText('Enviar Disparo'));

        await waitFor(() => {
            expect(fetchWithAuth).toHaveBeenCalled();
        });
    });

    it('toggles scheduling and updates button text', async () => {
        render(<BulkSendContactsModal {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getAllByTestId('searchable-select')[0]).toBeInTheDocument();
        });

        // Selecionar o template 'welcome_message'
        fireEvent.change(screen.getAllByTestId('searchable-select')[0], {
            target: { value: 'welcome_message' }
        });

        // A princípio o botão deve ser 'Enviar Disparo'
        expect(screen.getByRole('button', { name: 'Enviar Disparo' })).toBeInTheDocument();

        // Clicar no checkbox de agendamento
        const checkbox = screen.getByLabelText('Agendar este disparo?');
        fireEvent.click(checkbox);

        // O botão deve mudar para 'Agendar Disparo'
        expect(screen.getByRole('button', { name: 'Agendar Disparo' })).toBeInTheDocument();
    });

    it('renders button actions section and allows choosing button type', async () => {
        render(<BulkSendContactsModal {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getAllByTestId('searchable-select')[0]).toBeInTheDocument();
        });

        // Selecionar o template 'welcome_message'
        fireEvent.change(screen.getAllByTestId('searchable-select')[0], {
            target: { value: 'welcome_message' }
        });

        // Deve mostrar a seção de ações de botões
        expect(screen.getByText('Ações dos Botões')).toBeInTheDocument();
        expect(screen.getByText('Botão: Clique Aqui')).toBeInTheDocument();

        // Deve ter o SearchableSelect para o Tipo de Ação
        const selects = screen.getAllByTestId('searchable-select');
        expect(selects.length).toBeGreaterThanOrEqual(2);
    });
});
