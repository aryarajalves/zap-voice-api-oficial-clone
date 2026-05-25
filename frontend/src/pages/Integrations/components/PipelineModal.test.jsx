import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import PipelineModal from './PipelineModal';

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  dispatch: {
    id: 1,
    contact_name: 'Aryaraj Fernandes',
    contact_phone: '558596123586',
    event_type: 'compra_aprovada',
    status: 'processing',
    scheduled_time: new Date().toISOString(),
    pipeline_steps: [
      {
        name: 'Passo 1',
        status: 'completed',
        timestamp: new Date().toISOString(),
        description: 'Descrição do passo 1',
        metadata: {
          account_id: 1,
          contact_id: '12345',
          conversation_id: 534
        }
      }
    ]
  }
};

describe('PipelineModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não renderiza nada se isOpen=false', () => {
    render(<PipelineModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Monitor de Pipeline')).not.toBeInTheDocument();
  });

  it('renderiza o monitor de pipeline e as informações do dispatch se isOpen=true', () => {
    render(<PipelineModal {...defaultProps} />);
    expect(screen.getByText('Monitor de Pipeline')).toBeInTheDocument();
    expect(screen.getByText(/Aryaraj Fernandes/i)).toBeInTheDocument();
    expect(screen.getByText(/compra_aprovada/i)).toBeInTheDocument();
  });

  it('exibe metadados de account_id e conversation_id mas oculta contact_id', () => {
    render(<PipelineModal {...defaultProps} />);
    
    // account_id vira 'account id' e conversation_id vira 'conversation id'
    expect(screen.getByText(/account id/i)).toBeInTheDocument();
    expect(screen.getByText(/conversation id/i)).toBeInTheDocument();
    
    // contact_id vira 'contact id' e não deve estar visível
    expect(screen.queryByText(/contact id/i)).not.toBeInTheDocument();
    expect(screen.queryByText('12345')).not.toBeInTheDocument();
  });
});
