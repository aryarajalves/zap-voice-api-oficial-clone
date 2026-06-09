import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import PipelineNode from './PipelineNode';

// Mock do reactflow para evitar erros
vi.mock('reactflow', () => ({
  Handle: ({ type, position }) => <div data-testid={`handle-${type}-${position}`} />,
  Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' }
}));

describe('PipelineNode Component', () => {
  it('deve renderizar nó de mensagem corretamente (sem badge de status)', () => {
    const mockData = {
      type: 'messageNode',
      label: 'Enviar Texto Inicial',
      content: 'Olá! Como vai?',
      status: 'completed'
    };

    render(<PipelineNode id="node-1" data={mockData} />);

    expect(screen.getByText('Enviar Texto Inicial')).toBeInTheDocument();
    expect(screen.getByText('"Olá! Como vai?"')).toBeInTheDocument();
    // Badge foi removido - não deve existir "Concluído", "Pendente" etc.
    expect(screen.queryByText('Concluído')).not.toBeInTheDocument();
    expect(screen.queryByText('Pendente')).not.toBeInTheDocument();
  });

  it('deve usar fallback de nome amigável se label for genérico ou Passo', () => {
    const mockData = {
      type: 'dateNode',
      label: 'Passo',
      status: 'completed'
    };

    render(<PipelineNode id="node-date" data={mockData} />);

    expect(screen.getAllByText('Agendamento Data').length).toBe(2);
  });

  it('deve renderizar nó de delay fixo corretamente usando time e unit (sem badge)', () => {
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
    // Badge "Pendente" foi removido
    expect(screen.queryByText('Pendente')).not.toBeInTheDocument();
  });

  it('deve renderizar nó de delay aleatório corretamente usando minTime e maxTime (sem badge)', () => {
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
    // Badge "Aguardando" foi removido
    expect(screen.queryByText('Aguardando')).not.toBeInTheDocument();
  });

  it('deve renderizar a legenda (caption) do nó de mídia quando definida', () => {
    const mockData = {
      type: 'mediaNode',
      label: 'Imagem com Legenda',
      mediaUrl: 'http://test.com/imagem.jpg',
      caption: 'Veja nossa promoção especial!',
      status: 'completed'
    };

    render(<PipelineNode id="node-media-cap" data={mockData} />);

    expect(screen.getByText(/Veja nossa promoção especial!/)).toBeInTheDocument();
  });

  it('deve chamar onStatClick com o status correto ao clicar nos contadores', () => {
    const onStatClick = vi.fn();
    const mockData = {
      type: 'mediaNode',
      label: 'Disparo em Massa',
      status: 'completed',
      bulkStats: { sent: 5, waiting: 2, suspended: 3, failed: 1 },
      onStatClick
    };

    render(<PipelineNode id="node-bulk" data={mockData} />);

    fireEvent.click(screen.getByTitle('Ver contatos enviados'));
    expect(onStatClick).toHaveBeenCalledWith('completed');

    fireEvent.click(screen.getByTitle('Ver contatos na fila'));
    expect(onStatClick).toHaveBeenCalledWith('waiting');

    fireEvent.click(screen.getByTitle('Ver contatos aguardando'));
    expect(onStatClick).toHaveBeenCalledWith('suspended');

    fireEvent.click(screen.getByTitle('Ver contatos com falhas'));
    expect(onStatClick).toHaveBeenCalledWith('failed');
  });

  it('deve renderizar o preview de vídeo corretamente quando a mídia for um vídeo', () => {
    const mockData = {
      type: 'mediaNode',
      label: 'Vídeo Demonstrativo',
      mediaUrl: 'http://test.com/video.mp4',
      caption: 'Assista a demonstração',
      status: 'completed'
    };

    render(<PipelineNode id="node-video" data={mockData} />);

    expect(screen.getByText('Vídeo Demonstrativo')).toBeInTheDocument();
    expect(screen.getByText('🎥 Vídeo')).toBeInTheDocument();
    expect(screen.getByText(/Assista a demonstração/)).toBeInTheDocument();
  });

  it('deve renderizar nó de requisição HTTP com payload configurado', () => {
    const mockData = {
      type: 'httpRequestNode',
      label: 'Enviar Webhook',
      method: 'POST',
      url: 'https://api.test.com/webhook',
      payload: '{"phone": "{{telefone}}"}'
    };

    render(<PipelineNode id="node-http-1" data={mockData} />);

    expect(screen.getByText('Enviar Webhook')).toBeInTheDocument();
    expect(screen.getByText('POST')).toBeInTheDocument();
    expect(screen.getByText('https://api.test.com/webhook')).toBeInTheDocument();
    expect(screen.getByText('Payload:')).toBeInTheDocument();
    expect(screen.getByText('{"phone": "{{telefone}}"}')).toBeInTheDocument();
  });

  it('deve renderizar nó de requisição HTTP com payload resolvido e url resolvida', () => {
    const mockData = {
      type: 'httpRequestNode',
      label: 'Enviar Webhook',
      method: 'POST',
      url: 'https://api.test.com/webhook',
      resolvedUrl: 'https://api.test.com/webhook?phone=5511999999999',
      resolvedPayload: '{"phone": "5511999999999"}',
      status: 'completed'
    };

    render(<PipelineNode id="node-http-2" data={mockData} />);

    expect(screen.getByText('Enviar Webhook')).toBeInTheDocument();
    expect(screen.getByText('POST')).toBeInTheDocument();
    expect(screen.getByText('https://api.test.com/webhook?phone=5511999999999')).toBeInTheDocument();
    expect(screen.getByText('Payload Enviado:')).toBeInTheDocument();
    expect(screen.getByText('{"phone": "5511999999999"}')).toBeInTheDocument();
  });

  it('deve renderizar nó de entrada de dados corretamente com fallback de nome amigável', () => {
    const mockData = {
      type: 'inputDataNode',
      label: 'Passo',
      varName: 'cpf_cliente',
      collectionType: 'traditional',
      latestLogMessage: 'Dado extraído com sucesso: cpf_cliente = 12345678900',
      status: 'processing'
    };

    render(<PipelineNode id="node-input" data={mockData} />);

    expect(screen.getAllByText('Entrada de Dados').length).toBe(2); // título do header e displayName
    expect(screen.getByText('cpf_cliente')).toBeInTheDocument();
    expect(screen.getByText('📋 Tradicional (Regex)')).toBeInTheDocument();
    expect(screen.getByText(/Dado extraído com sucesso: cpf_cliente = 12345678900/)).toBeInTheDocument();
  });

  it('deve renderizar nó de atualizar contato com nome customizado', () => {
    const mockData = {
      type: 'updateContactNode',
      label: 'Renomear Usuário',
      status: 'completed'
    };

    render(<PipelineNode id="node-update" data={mockData} />);

    expect(screen.getByText('Renomear Usuário')).toBeInTheDocument();
    expect(screen.getByText('Atualizar Contato')).toBeInTheDocument(); // título do header
  });

  it('deve renderizar o selo 🏁 INÍCIO se o nó for o de início do fluxo', () => {
    const mockData = {
      type: 'messageNode',
      label: 'Primeira Mensagem',
      isStart: true,
      status: 'completed'
    };

    render(<PipelineNode id="node-start" data={mockData} />);

    expect(screen.getByText('🏁 INÍCIO')).toBeInTheDocument();
  });
});
