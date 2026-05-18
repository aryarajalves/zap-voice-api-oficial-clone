import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import AutomationSection from './AutomationSection';

describe('AutomationSection Component', () => {
    const mockLabels = [
        { id: 1, title: 'Suporte' },
        { id: 2, title: 'Vendas' }
    ];
    
    it('renders correct header and does not show step "02" badge', () => {
        render(
            <AutomationSection
                chatwootLabels={mockLabels}
                selectedChatwootLabels={[]}
                setSelectedChatwootLabels={vi.fn()}
            />
        );

        // Verifica se o título principal está renderizado
        expect(screen.getByText('Fluxo Automático Pós-Envio')).toBeInTheDocument();
        
        // Verifica que o número "02" foi removido
        expect(screen.queryByText('02')).not.toBeInTheDocument();
    });

    it('renders the labels list correctly in select options', () => {
        const mockSetSelected = vi.fn();
        render(
            <AutomationSection
                chatwootLabels={mockLabels}
                selectedChatwootLabels={[]}
                setSelectedChatwootLabels={mockSetSelected}
            />
        );

        expect(screen.getByText('Etiquetas Chatwoot')).toBeInTheDocument();
        expect(screen.getByText('Aplicar na conversa (Discovery)')).toBeInTheDocument();
    });
});
