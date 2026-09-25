import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BussolaPdfPreviewModal from './components/BussolaPdfPreviewModal';
import TriggerTabContent from './components/MappingsConfig/MappingItem/TriggerTabContent';

// Mock do AuthContext e fetchWithAuth
vi.mock('../../AuthContext', () => ({
  fetchWithAuth: vi.fn().mockImplementation((url) => {
    if (url.includes('sample-data')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          lead_name: 'Aryaraj Alves Fernandes',
          birth_date: '15/08/1990 às 10:00',
          message_text: '*ÁREA:* Dinheiro\nTexto da mensagem de teste.'
        })
      });
    }
    if (url.includes('preview-pdf')) {
      return Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(new Blob(['%PDF-1.4 mock pdf content'], { type: 'application/pdf' }))
      });
    }
    if (url.includes('preview-cover')) {
      return Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(new Blob(['PNG mock image'], { type: 'image/png' }))
      });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  })
}));

// Mock do ClientContext
vi.mock('../../contexts/ClientContext', () => ({
  useClient: () => ({
    activeClient: { id: 14, name: 'Cliente Teste' }
  })
}));

// Mock do react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

describe('BussolaPdfPreviewModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.URL.createObjectURL = vi.fn(() => 'blob:http://localhost:5173/mock-pdf-blob');
    global.URL.revokeObjectURL = vi.fn();
  });

  it('não deve renderizar nada quando isOpen for false', () => {
    const { container } = render(
      <BussolaPdfPreviewModal isOpen={false} onClose={vi.fn()} integrationId="123" />
    );
    expect(container.firstChild).toBeNull();
  });

  it('deve renderizar título, nome de exibição do WhatsApp e abas de PDF e Capa Visual quando isOpen for true', async () => {
    render(
      <BussolaPdfPreviewModal isOpen={true} onClose={vi.fn()} integrationId="123" />
    );

    expect(screen.getByText(/Renderização do PDF • Bússola Astrológica/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nome do Lead/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Data de Nascimento/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Mensagem da Leitura/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('whatsapp-pdf-filename')).toHaveTextContent('✨ Leitura da Bússola - Aryaraj.pdf');
    });

    // Alternar para aba Capa Visual (Imagem)
    const coverTabBtn = screen.getByRole('button', { name: /Capa Visual \(Imagem\)/i });
    fireEvent.click(coverTabBtn);

    await waitFor(() => {
      expect(screen.getByAltText(/Capa Visual da Bússola/i)).toBeInTheDocument();
    });
  });

  it('deve chamar onClose ao clicar no botão fechar', () => {
    const handleClose = vi.fn();
    render(
      <BussolaPdfPreviewModal isOpen={true} onClose={handleClose} integrationId="123" />
    );

    const closeBtn = screen.getByTitle(/Fechar Visualizador/i);
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});

describe('Integração com TriggerTabContent', () => {
  const baseMapping = {
    event_type: 'leitura_concluida',
    template_id: '12345',
    funnel_id: null,
    delay_minutes: 0,
    variables_mapping: []
  };

  const templates = [
    { id: '12345', name: 'template_bussola', components: [] }
  ];

  it('deve exibir o card especial de Gerar PDF quando platform for bussola_quiz', () => {
    render(
      <TriggerTabContent
        mapping={baseMapping}
        mIndex={0}
        updateMapping={vi.fn()}
        templates={templates}
        funnels={[]}
        discoveredProducts={[]}
        platform="bussola_quiz"
        allowedEvents={[]}
        selectedTpl={templates[0]}
        templateButtons={[]}
        onGoToButtonsTab={vi.fn()}
      />
    );

    expect(screen.getByText(/Gerar PDF da Leitura Astrológica/i)).toBeInTheDocument();
    expect(screen.getByText(/Visualizar PDF/i)).toBeInTheDocument();
  });

  it('deve alternar a ativação do PDF ao clicar no toggle do gatilho', () => {
    const handleUpdateMapping = vi.fn();
    render(
      <TriggerTabContent
        mapping={baseMapping}
        mIndex={0}
        updateMapping={handleUpdateMapping}
        templates={templates}
        funnels={[]}
        discoveredProducts={[]}
        platform="bussola_quiz"
        allowedEvents={[]}
        selectedTpl={templates[0]}
        templateButtons={[]}
        onGoToButtonsTab={vi.fn()}
      />
    );

    // O toggle é um botão de switch com aria-label
    const toggleButton = screen.getByLabelText(/Alternar geração de PDF da Bússola/i);
    fireEvent.click(toggleButton);

    expect(handleUpdateMapping).toHaveBeenCalledWith(
      0,
      'variables_mapping',
      expect.arrayContaining([
        expect.objectContaining({
          type: 'header',
          value: 'bussola_pdf_auto',
          custom_value: 'bussola_pdf_auto'
        })
      ])
    );
  });
});
