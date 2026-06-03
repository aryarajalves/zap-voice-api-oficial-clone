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
    Handle: ({ type, position, id }) => <div data-testid={`handle-${type}-${position}`} data-handleid={id} />,
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
      { node_id: 'node-1', status: 'completed', timestamp: '2026-05-23T12:00:00Z', extra: { contact_phone: '+5511999999999', contact_name: 'Contato ZapVoice' } },
      { node_id: 'node-2', status: 'waiting',   timestamp: '2026-05-23T12:01:00Z', extra: { contact_phone: '+5511999999999', contact_name: 'Contato ZapVoice' } }
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

    // Todos os nós devem estar presentes no DOM
    const node1Wrapper = screen.getByTestId('node-wrapper-node-1');
    expect(node1Wrapper).toBeInTheDocument();
    expect(screen.getByText('Mensagem de Boas Vindas')).toBeInTheDocument();

    const node2Wrapper = screen.getByTestId('node-wrapper-node-2');
    expect(node2Wrapper).toBeInTheDocument();
    expect(screen.getByText('Aguardar Retorno')).toBeInTheDocument();

    const node3Wrapper = screen.getByTestId('node-wrapper-node-3');
    expect(node3Wrapper).toBeInTheDocument();
    expect(screen.getByText('Enviar Áudio')).toBeInTheDocument();

    // Badge de status foi removido - não deve existir
    expect(screen.queryByText('Concluído')).not.toBeInTheDocument();
    expect(screen.queryByText('Aguardando')).not.toBeInTheDocument();
    expect(screen.queryByText('Pendente')).not.toBeInTheDocument();
  });

  it('deve marcar o nó ativo baseado em current_node_id', () => {
    render(<PipelineFlowViewer trigger={mockTriggerWithFunnel} />);

    // Node 2 é o ativo no mock
    expect(screen.getByText('Contato ativo aqui')).toBeInTheDocument();
  });

  it('deve colorir as conexões (edges) de forma estática conforme o progresso do funil', () => {
    render(<PipelineFlowViewer trigger={mockTriggerWithFunnel} />);

    // Conexão entre node-1 (completed) e node-2 (waiting): deve ser cinza mais visível pois sai de nó concluído
    const edge1 = screen.getByTestId('edge-edge-1-2');
    expect(edge1).toHaveAttribute('data-animated', 'false'); // Sem animação
    const style1 = JSON.parse(edge1.getAttribute('data-style'));
    expect(style1.stroke).toBe('#64748b'); // Cinza médio para saída de nó concluído

    // Conexão entre node-2 (waiting) e node-3 (pending): deve ser cinza claro
    const edge2 = screen.getByTestId('edge-edge-2-3');
    expect(edge2).toHaveAttribute('data-animated', 'false'); // Sem animação
    const style2 = JSON.parse(edge2.getAttribute('data-style'));
    expect(style2.stroke).toBe('#94a3b8'); // Cinza claro para pendente
  });
  it('deve exibir contadores mesmo para trigger não-bulk (funil individual) — contato na fila do delay', () => {
    // Simula um trigger individual com contato aguardando no delay
    const singleTrigger = {
      id: 99,
      is_bulk: false,
      current_node_id: 'node-2',
      status: 'queued',
      execution_history: [
        { node_id: 'node-1', status: 'completed', extra: { contact_phone: '+5511000000000', contact_name: 'João' } },
        { node_id: 'node-2', status: 'waiting',   extra: { contact_phone: '+5511000000000', contact_name: 'João' } }
      ],
      funnel: {
        steps: {
          nodes: [
            { id: 'node-1', type: 'messageNode', data: { label: 'Mensagem', content: 'Olá!' } },
            { id: 'node-2', type: 'delayNode',   data: { label: 'Delay 45s' } }
          ],
          edges: [{ id: 'e1', source: 'node-1', target: 'node-2' }]
        }
      }
    };

    render(<PipelineFlowViewer trigger={singleTrigger} />);

    // Node-1 (mensagem) deve mostrar 1 Enviado (completou)
    const node1Wrapper = screen.getByTestId('node-wrapper-node-1');
    const { within } = require('@testing-library/react');
    const node1SentBtn = within(node1Wrapper).getByTitle('Ver contatos enviados');
    expect(node1SentBtn.querySelector('.text-green-500').textContent).toBe('1');

    // Node-2 (delay) deve mostrar 0 Enviados e 1 na Fila
    const node2Wrapper = screen.getByTestId('node-wrapper-node-2');
    const node2SentBtn  = within(node2Wrapper).getByTitle('Ver contatos enviados');
    const node2QueueBtn = within(node2Wrapper).getByTitle('Ver contatos na fila');
    expect(node2SentBtn.querySelector('.text-green-500').textContent).toBe('0');
    expect(node2QueueBtn.querySelector('.text-orange-500').textContent).toBe('1');
  });


  it('deve calcular e exibir estatísticas acumuladas de envio em massa quando is_bulk é true', () => {
    const bulkTrigger = {
      id: 12,
      is_bulk: true,
      execution_history: [
        { node_id: 'node-1', status: 'completed', extra: { contact_phone: '+5511111111111' } },
        { node_id: 'node-1', status: 'completed', extra: { contact_phone: '+5522222222222' } },
        { node_id: 'node-1', status: 'failed',    extra: { contact_phone: '+5533333333333' } },
        { node_id: 'node-2', status: 'waiting',   extra: { contact_phone: '+5544444444444' } }
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
    
    expect(screen.getAllByText('Aprovados')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Fila')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Falhas')[0]).toBeInTheDocument();
  });


  it('deve contar contato como "Enviado" no nó de delay quando ele já avançou para um nó posterior (lógica smart)', () => {
    // Cenário: contato ficou "waiting" no delay mas JÁ avançou para o nó de mídia
    const bulkTriggerSmart = {
      id: 13,
      is_bulk: true,
      execution_history: [
        // Contato A: estava waiting no delay, mas já tem log no nó de mídia posterior
        { node_id: 'node-delay', status: 'waiting',   extra: { contact_phone: '+5511111111111' } },
        { node_id: 'node-media', status: 'completed', extra: { contact_phone: '+5511111111111' } },
        // Contato B: ainda está realmente esperando no delay
        { node_id: 'node-delay', status: 'waiting',   extra: { contact_phone: '+5522222222222' } },
      ],
      funnel: {
        steps: {
          nodes: [
            { id: 'node-delay', type: 'delayNode',  data: { label: 'Delay' } },
            { id: 'node-media', type: 'mediaNode',  data: { label: 'Mídia' } }
          ],
          edges: [{ id: 'e1', source: 'node-delay', target: 'node-media' }]
        }
      }
    };

    render(<PipelineFlowViewer trigger={bulkTriggerSmart} />);

    const delayWrapper = screen.getByTestId('node-wrapper-node-delay');
    // Usar title para pegar os botões certos e verificar o texto dos spans de contagem
    const { within } = require('@testing-library/react');
    const sentBtn  = within(delayWrapper).getByTitle('Ver contatos enviados');
    const queueBtn = within(delayWrapper).getByTitle('Ver contatos na fila');

    // Contato A deve aparecer como "Enviado" no delay (já avançou), Contato B como "Fila"
    expect(sentBtn.querySelector('.text-green-500').textContent).toBe('1');
    expect(queueBtn.querySelector('.text-orange-500').textContent).toBe('1');
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

  it('deve renderizar os handles divididos e o limite de atraso em um nó de agendamento de data se enableLateBypass for true', () => {
    const triggerDateBypass = {
      id: 15,
      is_bulk: false,
      execution_history: [],
      funnel: {
        steps: {
          nodes: [
            { 
              id: 'node-date', 
              type: 'dateNode', 
              data: { 
                label: 'Agendamento com Atraso', 
                mode: 'time', 
                timeValue: '10:00',
                enableLateBypass: true,
                maxDelayValue: 5,
                maxDelayUnit: 'minutes'
              } 
            }
          ],
          edges: []
        }
      }
    };

    render(<PipelineFlowViewer trigger={triggerDateBypass} />);

    // Deve mostrar o texto do limite de atraso
    expect(screen.getByText(/Limite Atraso/i)).toBeInTheDocument();
    expect(screen.getByText(/5 Minutos/i)).toBeInTheDocument();

    const handles = screen.getAllByTestId('handle-source-bottom');
    expect(handles.length).toBe(2);

    const handleIds = handles.map(h => h.getAttribute('data-handleid'));
    expect(handleIds).toContain('default');
    expect(handleIds).toContain('late');
  });
});

