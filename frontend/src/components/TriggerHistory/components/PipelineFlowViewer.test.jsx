import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import PipelineFlowViewer from './PipelineFlowViewer';
import PipelineNode from './PipelineNode';

const mockFitView = vi.fn();
const mockZoomIn = vi.fn();
const mockZoomOut = vi.fn();

// Mock do reactflow para evitar erros no JSDOM de dimensões/SVG
vi.mock('reactflow', async () => {
  const React = await import('react');
  return {
    __esModule: true,
    default: ({ nodes, edges, children }) => (
      <div data-testid="mock-reactflow" data-nodes={JSON.stringify(nodes)} data-edges={JSON.stringify(edges)}>
        {nodes.map(node => {
          const NodeComponent = node.type === 'pipelineNode' ? PipelineNode : () => null;
          return (
            <div key={node.id} data-testid={`node-wrapper-${node.id}`}>
              <NodeComponent id={node.id} data={node.data} />
            </div>
          );
        })}
        {edges.map(edge => (
          <div 
            key={edge.id} 
            data-testid={`edge-${edge.id}`} 
            data-animated={edge.animated ? 'true' : 'false'}
            data-style={JSON.stringify(edge.style)}
          />
        ))}
        {children}
      </div>
    ),
    Handle: ({ type, position }) => <div data-testid={`handle-${type}-${position}`} />,
    Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
    Background: () => <div data-testid="mock-background" />,
    Controls: () => <div data-testid="mock-controls" />,
    useReactFlow: () => ({
      fitView: mockFitView,
      zoomIn: mockZoomIn,
      zoomOut: mockZoomOut,
      getNodes: () => [],
    }),
    ReactFlowProvider: ({ children }) => <div data-testid="mock-provider">{children}</div>,
  };
});

describe('PipelineFlowViewer Component', () => {
  const mockTriggerWithFunnel = {
    id: 10,
    is_bulk: false,
    current_node_id: 'node-2',
    status: 'processing',
    execution_history: [
      { node_id: 'node-1', status: 'completed', timestamp: '2026-05-23T12:00:00Z' },
      { node_id: 'node-2', status: 'waiting', timestamp: '2026-05-23T12:01:00Z' }
    ],
    funnel: {
      steps: {
        nodes: [
          { id: 'node-1', type: 'messageNode', data: { label: 'Mensagem de Boas Vindas', content: 'Olá, seja bem-vindo!' } },
          { id: 'node-2', type: 'delayNode', data: { label: 'Aguardar Retorno', delay: 10 } },
          { id: 'node-3', type: 'audioNode', data: { label: 'Enviar Áudio', content: 'audio.ogg' } }
        ],
        edges: [
          { id: 'edge-1-2', source: 'node-1', target: 'node-2' },
          { id: 'edge-2-3', source: 'node-2', target: 'node-3' }
        ]
      }
    }
  };

  it('deve exibir mensagem amigável quando o funil não tem passos (nodes vazios)', () => {
    const triggerSemFunnel = {
      id: 11,
      is_bulk: false,
      execution_history: [],
      funnel: null
    };

    render(<PipelineFlowViewer trigger={triggerSemFunnel} />);
    
    expect(screen.getByText(/Visualização Indisponível/i)).toBeInTheDocument();
    expect(screen.getByText(/Este disparo não utiliza um funil estruturado/i)).toBeInTheDocument();
  });

  it('deve mapear corretamente o status dos nós a partir do histórico de execução', () => {
    render(<PipelineFlowViewer trigger={mockTriggerWithFunnel} />);

    // Node 1 deve estar "Concluído"
    const node1Wrapper = screen.getByTestId('node-wrapper-node-1');
    expect(node1Wrapper).toBeInTheDocument();
    expect(screen.getByText('Concluído')).toBeInTheDocument();

    // Node 2 deve estar "Aguardando"
    const node2Wrapper = screen.getByTestId('node-wrapper-node-2');
    expect(node2Wrapper).toBeInTheDocument();
    expect(screen.getByText('Aguardando')).toBeInTheDocument();

    // Node 3 deve estar "Pendente"
    const node3Wrapper = screen.getByTestId('node-wrapper-node-3');
    expect(node3Wrapper).toBeInTheDocument();
    expect(screen.getByText('Pendente')).toBeInTheDocument();
  });

  it('deve marcar o nó ativo baseado em current_node_id', () => {
    render(<PipelineFlowViewer trigger={mockTriggerWithFunnel} />);

    // Node 2 é o ativo no mock
    expect(screen.getByText('Contato ativo aqui')).toBeInTheDocument();
  });

  it('deve animar e colorir as conexões (edges) conforme o progresso do funil', () => {
    render(<PipelineFlowViewer trigger={mockTriggerWithFunnel} />);

    // Conexão entre node-1 e node-2 deve estar ativa/em progresso porque o target é o active node
    const edge1 = screen.getByTestId('edge-edge-1-2');
    expect(edge1).toHaveAttribute('data-animated', 'true');
    const style1 = JSON.parse(edge1.getAttribute('data-style'));
    expect(style1.stroke).toBe('#3b82f6'); // Azul neon para ativo/em andamento

    // Conexão entre node-2 e node-3 deve ser pendente
    const edge2 = screen.getByTestId('edge-edge-2-3');
    expect(edge2).toHaveAttribute('data-animated', 'false');
    const style2 = JSON.parse(edge2.getAttribute('data-style'));
    expect(style2.stroke).toBe('#94a3b8'); // Cinza
  });

  it('deve calcular e exibir estatísticas acumuladas de envio em massa quando is_bulk é true', () => {
    const bulkTrigger = {
      id: 12,
      is_bulk: true,
      execution_history: [
        { node_id: 'node-1', status: 'completed' },
        { node_id: 'node-1', status: 'completed' },
        { node_id: 'node-1', status: 'failed' },
        { node_id: 'node-2', status: 'waiting' }
      ],
      funnel: {
        steps: {
          nodes: [
            { id: 'node-1', type: 'messageNode', data: { label: 'Mensagem em Massa' } },
            { id: 'node-2', type: 'delayNode', data: { label: 'Delay em Massa' } }
          ],
          edges: []
        }
      }
    };

    render(<PipelineFlowViewer trigger={bulkTrigger} />);

    // Node 1 deve mostrar os contadores: Enviados: 2, Falhas: 1, Fila: 0
    const node1Wrapper = screen.getByTestId('node-wrapper-node-1');
    expect(node1Wrapper).toBeInTheDocument();

    const sentCount = node1Wrapper.querySelector('.text-green-500');
    const waitingCount = node1Wrapper.querySelector('.text-orange-500');
    const failedCount = node1Wrapper.querySelector('.text-red-500');

    expect(sentCount.textContent).toBe('2');
    expect(waitingCount.textContent).toBe('0');
    expect(failedCount.textContent).toBe('1');
    
    expect(screen.getAllByText('Enviados')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Fila')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Falhas')[0]).toBeInTheDocument();
  });

  it('deve renderizar os botões de zoom e centralização e chamar as respectivas funções de useReactFlow ao serem clicados', () => {
    render(<PipelineFlowViewer trigger={mockTriggerWithFunnel} />);

    const zoomInBtn = screen.getByTitle('Aumentar Zoom');
    const zoomOutBtn = screen.getByTitle('Diminuir Zoom');
    const fitViewBtn = screen.getByTitle('Centralizar Visualização');

    expect(zoomInBtn).toBeInTheDocument();
    expect(zoomOutBtn).toBeInTheDocument();
    expect(fitViewBtn).toBeInTheDocument();

    const { fireEvent } = require('@testing-library/react');
    fireEvent.click(zoomInBtn);
    expect(mockZoomIn).toHaveBeenCalledTimes(1);

    fireEvent.click(zoomOutBtn);
    expect(mockZoomOut).toHaveBeenCalledTimes(1);

    fireEvent.click(fitViewBtn);
    expect(mockFitView).toHaveBeenCalledTimes(1);
  });
});
