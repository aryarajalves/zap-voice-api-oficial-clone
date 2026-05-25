import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import PipelineNode from './PipelineNode';

// Mock do reactflow para evitar erros
vi.mock('reactflow', () => ({
  Handle: ({ type, position }) => <div data-testid={`handle-${type}-${position}`} />,
  Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' }
}));

describe('PipelineNode Component', () => {
  it('deve renderizar nó de mensagem corretamente', () => {
    const mockData = {
      type: 'messageNode',
      label: 'Enviar Texto Inicial',
      content: 'Olá! Como vai?',
      status: 'completed'
    };

    render(<PipelineNode id="node-1" data={mockData} />);

    expect(screen.getByText('Enviar Texto Inicial')).toBeInTheDocument();
    expect(screen.getByText('"Olá! Como vai?"')).toBeInTheDocument();
    expect(screen.getByText('Concluído')).toBeInTheDocument();
  });

  it('deve renderizar nó de delay fixo corretamente usando time e unit', () => {
    const mockData = {
      type: 'delayNode',
      label: 'Espera Fixa',
      time: 15,
      unit: 'seconds',
      status: 'pending'
    };

    render(<PipelineNode id="node-2" data={mockData} />);

    expect(screen.getByText('Espera Fixa')).toBeInTheDocument();
    expect(screen.getByText('Aguardar 15s')).toBeInTheDocument();
    expect(screen.getByText('⏱️ Aguardando 15 segundos')).toBeInTheDocument();
    expect(screen.getByText('Pendente')).toBeInTheDocument();
  });

  it('deve renderizar nó de delay aleatório corretamente usando minTime e maxTime', () => {
    const mockData = {
      type: 'delayNode',
      label: 'Espera Aleatória',
      useRandom: true,
      minTime: 5,
      maxTime: 20,
      unit: 'minutes',
      status: 'waiting'
    };

    render(<PipelineNode id="node-3" data={mockData} />);

    expect(screen.getByText('Espera Aleatória')).toBeInTheDocument();
    expect(screen.getByText('Aguardar 5s a 20s')).toBeInTheDocument();
    expect(screen.getByText('⏱️ Aguardando entre 5 e 20 minutos')).toBeInTheDocument();
    expect(screen.getByText('Aguardando')).toBeInTheDocument();
  });
});
