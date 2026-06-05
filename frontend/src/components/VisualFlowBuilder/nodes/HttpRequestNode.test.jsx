import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReactFlowProvider } from 'reactflow';
import { vi } from 'vitest';
import HttpRequestNode from './HttpRequestNode';

describe('HttpRequestNode', () => {
    const mockOnChange = vi.fn();
    const mockData = {
        method: 'POST',
        url: 'https://api.test.com',
        headers: [
            { key: 'Content-Type', value: 'application/json' }
        ],
        payloadType: 'raw',
        payloadRaw: '{"key": "value"}',
        onChange: mockOnChange,
        isStart: false,
        onDelete: vi.fn(),
        onSetStart: vi.fn()
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('renderiza os campos corretamente', () => {
        render(
            <ReactFlowProvider>
                <HttpRequestNode id="node-http" data={mockData} />
            </ReactFlowProvider>
        );

        expect(screen.getByText('Requisição HTTP (Webhook)')).toBeInTheDocument();
        expect(screen.getByDisplayValue('POST (Enviar Dados)')).toBeInTheDocument();
        expect(screen.getByDisplayValue('https://api.test.com')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Content-Type')).toBeInTheDocument();
        expect(screen.getByDisplayValue('application/json')).toBeInTheDocument();
        expect(screen.getByDisplayValue('{"key": "value"}')).toBeInTheDocument();
    });

    test('chama onChange quando altera o método', () => {
        render(
            <ReactFlowProvider>
                <HttpRequestNode id="node-http" data={mockData} />
            </ReactFlowProvider>
        );

        fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'GET' } });
        expect(mockOnChange).toHaveBeenCalledWith('node-http', { method: 'GET' });
    });

    test('chama onChange quando altera a URL', () => {
        render(
            <ReactFlowProvider>
                <HttpRequestNode id="node-http" data={mockData} />
            </ReactFlowProvider>
        );

        fireEvent.change(screen.getByPlaceholderText('https://api.exemplo.com/webhook'), { target: { value: 'https://new-api.com' } });
        expect(mockOnChange).toHaveBeenCalledWith('node-http', { url: 'https://new-api.com' });
    });

    test('chama onChange ao adicionar um header', () => {
        render(
            <ReactFlowProvider>
                <HttpRequestNode id="node-http" data={mockData} />
            </ReactFlowProvider>
        );

        fireEvent.click(screen.getByText('Adicionar'));
        expect(mockOnChange).toHaveBeenCalledWith('node-http', {
            headers: [
                { key: 'Content-Type', value: 'application/json' },
                { key: '', value: '' }
            ]
        });
    });

    test('chama onChange ao editar ou remover um header', () => {
        render(
            <ReactFlowProvider>
                <HttpRequestNode id="node-http" data={mockData} />
            </ReactFlowProvider>
        );

        // Remover o primeiro header
        const trashButton = screen.getByTitle('Remover Header');
        fireEvent.click(trashButton);
        expect(mockOnChange).toHaveBeenCalledWith('node-http', { headers: [] });
    });
});
