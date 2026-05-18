import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import DispatchHistoryModal from './DispatchHistoryModal';

// Mock values
const mockIntegration = {
  id: 1,
  name: 'Test Integration',
  platform: 'hotmart'
};

const mockDispatchHistory = [
  {
    id: 101,
    contact_name: 'John Doe',
    contact_phone: '5511999999999',
    status: 'completed',
    event_type: 'compra_aprovada',
    created_at: new Date().toISOString(),
    scheduled_time: new Date().toISOString(),
    template_name: 'test_template',
    total_sent: 1,
    total_delivered: 1,
    total_read: 1,
    total_clicks: 0,
    child_count: 0
  }
];

describe('DispatchHistoryModal Component', () => {
  it('não renderiza se isOpen for falso', () => {
    const { container } = render(
      <DispatchHistoryModal
        isOpen={false}
        onClose={() => {}}
        integration={mockIntegration}
        dispatchHistory={[]}
        loadingDispatchHistory={false}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza corretamente o histórico quando aberto', () => {
    render(
      <DispatchHistoryModal
        isOpen={true}
        onClose={() => {}}
        integration={mockIntegration}
        dispatchHistory={mockDispatchHistory}
        loadingDispatchHistory={false}
        dispatchSearch=""
        setDispatchSearch={() => {}}
        dispatchEventFilter=""
        setDispatchEventFilter={() => {}}
        dispatchTypeFilter=""
        setDispatchTypeFilter={() => {}}
        dispatchStartDate=""
        setDispatchStartDate={() => {}}
        dispatchEndDate=""
        setDispatchEndDate={() => {}}
        dispatchPage={1}
        setDispatchPage={() => {}}
        dispatchLimit={20}
        setDispatchLimit={() => {}}
        dispatchTotal={1}
        selectedDispatchIds={[]}
        setSelectedDispatchIds={() => {}}
        fetchDispatches={() => {}}
      />
    );

    // Destinatário
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('5511999999999')).toBeInTheDocument();
    // Evento
    expect(screen.getByText('COMPRA APROVADA')).toBeInTheDocument();
  });

  it('chama o handler handlePlayDispatch ao clicar no botão disparar', () => {
    const handlePlayDispatchMock = vi.fn();
    render(
      <DispatchHistoryModal
        isOpen={true}
        onClose={() => {}}
        integration={mockIntegration}
        dispatchHistory={mockDispatchHistory}
        loadingDispatchHistory={false}
        dispatchSearch=""
        setDispatchSearch={() => {}}
        dispatchEventFilter=""
        setDispatchEventFilter={() => {}}
        dispatchTypeFilter=""
        setDispatchTypeFilter={() => {}}
        dispatchStartDate=""
        setDispatchStartDate={() => {}}
        dispatchEndDate=""
        setDispatchEndDate={() => {}}
        dispatchPage={1}
        setDispatchPage={() => {}}
        dispatchLimit={20}
        setDispatchLimit={() => {}}
        dispatchTotal={1}
        selectedDispatchIds={[]}
        setSelectedDispatchIds={() => {}}
        handlePlayDispatch={handlePlayDispatchMock}
        isPlaying={{}}
        isCancelling={{}}
        fetchDispatches={() => {}}
      />
    );

    const playBtn = screen.getByTitle('Disparar Agora');
    expect(playBtn).toBeInTheDocument();
    fireEvent.click(playBtn);

    expect(handlePlayDispatchMock).toHaveBeenCalledWith(101);
  });
});
