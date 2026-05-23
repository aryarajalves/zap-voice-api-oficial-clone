import React, { useEffect, useMemo } from 'react';
import ReactFlow, { 
    Background, 
    Controls, 
    useReactFlow, 
    ReactFlowProvider 
} from 'reactflow';
import 'reactflow/dist/style.css';
import PipelineNode from './PipelineNode';

// Registramos nosso nó de exibição personalizado
const nodeTypes = {
    pipelineNode: PipelineNode
};

// Sub-componente interno que tem acesso ao contexto useReactFlow para câmera inteligente
const FlowCameraOrchestrator = ({ trigger, nodes, edges }) => {
    const { fitView, getNodes } = useReactFlow();
    const currentNodeId = trigger.current_node_id;

    // Foca e centraliza a visualização em tempo real com múltiplos disparos
    // para garantir o correto posicionamento após animações e renderizações de modal
    useEffect(() => {
        const focusOnActiveNode = () => {
            // Forçar o React Flow a recalcular suas dimensões internas
            window.dispatchEvent(new Event('resize'));

            const allNodes = getNodes();
            if (!allNodes || allNodes.length === 0) return;
            
            if (currentNodeId) {
                const activeNode = allNodes.find(n => n.id === currentNodeId);
                if (activeNode) {
                    // Centralizar a câmera no nó ativo
                    fitView({
                        nodes: [activeNode],
                        duration: 600,
                        padding: 0.4
                    });
                    return;
                }
            }
            
            // Caso contrário, ajusta a câmera para enquadrar todo o fluxo
            fitView({ padding: 0.25, duration: 400 });
        };

        // Agenda múltiplos disparos em momentos chaves:
        // 1. Imediato (100ms) para renderizações normais
        // 2. Fim da animação de abertura do modal (350ms)
        // 3. Estabilização total do layout (700ms)
        const t1 = setTimeout(focusOnActiveNode, 100);
        const t2 = setTimeout(focusOnActiveNode, 350);
        const t3 = setTimeout(focusOnActiveNode, 700);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
        };
    }, [currentNodeId, nodes.length, fitView, getNodes]);

    return (
        <div className="w-full h-full relative">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
                panOnDrag={true}
                zoomOnScroll={true}
                preventScrolling={false}
                proOptions={{ hideAttribution: true }}
                defaultEdgeOptions={{ style: { strokeWidth: 2 } }}
                minZoom={0.05}
                maxZoom={1.5}
            >
                <Background color="#94a3b8" opacity={0.15} gap={16} size={1.5} />
                <Controls showInteractive={false} position="bottom-right" className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-md" />
            </ReactFlow>
        </div>
    );
};

const PipelineFlowViewer = ({ trigger }) => {
    const rawHistory = useMemo(() => {
        return Array.isArray(trigger.execution_history) ? trigger.execution_history : [];
    }, [trigger.execution_history]);

    // 1. Extrair os passos do funil (nodes e edges)
    const funnelSteps = useMemo(() => {
        return trigger.funnel?.steps || {};
    }, [trigger.funnel]);

    const rawNodes = useMemo(() => {
        return Array.isArray(funnelSteps.nodes) ? funnelSteps.nodes : [];
    }, [funnelSteps.nodes]);

    const rawEdges = useMemo(() => {
        return Array.isArray(funnelSteps.edges) ? funnelSteps.edges : [];
    }, [funnelSteps.edges]);

    // 2. Mapear logs de execução e calcular contadores
    const { nodeStatuses, nodeStats } = useMemo(() => {
        const statuses = {};
        const stats = {};
        
        rawHistory.forEach(log => {
            const nodeId = log.node_id;
            if (!nodeId) return;

            // Registrar o último status de execução do nó
            statuses[nodeId] = log.status;

            // Calcular contadores agregados para disparos em massa
            if (!stats[nodeId]) {
                stats[nodeId] = { sent: 0, waiting: 0, failed: 0 };
            }
            if (log.status === 'completed') {
                stats[nodeId].sent++;
            } else if (log.status === 'waiting' || log.status === 'processing') {
                stats[nodeId].waiting++;
            } else if (log.status === 'failed') {
                stats[nodeId].failed++;
            }
        });

        return { nodeStatuses: statuses, nodeStats: stats };
    }, [rawHistory]);

    // 3. Processar os nós para exibição no React Flow
    const flowNodes = useMemo(() => {
        return rawNodes.map(node => {
            const nodeId = node.id;
            const status = nodeStatuses[nodeId] || 'pending';
            const isActive = nodeId === trigger.current_node_id;

            return {
                ...node,
                type: 'pipelineNode', // Converte para o nosso tipo customizado
                data: {
                    ...node.data,
                    type: node.type,  // Copia o tipo original do nó para renderização customizada
                    status,
                    isActive,
                    bulkStats: trigger.is_bulk ? nodeStats[nodeId] : null
                }
            };
        });
    }, [rawNodes, nodeStatuses, nodeStats, trigger.current_node_id, trigger.is_bulk]);

    // 4. Processar e colorir as conexões (edges) com efeitos neon
    const flowEdges = useMemo(() => {
        return rawEdges.map(edge => {
            const sourceStatus = nodeStatuses[edge.source];
            const targetStatus = nodeStatuses[edge.target];
            const isTargetActive = edge.target === trigger.current_node_id;

            let edgeStyle = {};
            let isAnimated = false;

            if (sourceStatus === 'completed' && targetStatus === 'completed') {
                // Caminho concluído: Linha verde neon espessa e animada
                edgeStyle = { stroke: '#10b981', strokeWidth: 3.5, filter: 'drop-shadow(0 0 2px rgba(16,185,129,0.3))' };
                isAnimated = true;
            } else if (isTargetActive || (sourceStatus === 'completed' && (targetStatus === 'waiting' || targetStatus === 'processing'))) {
                // Caminho ativo/em andamento: Linha azul neon pulsante e animada
                edgeStyle = { stroke: '#3b82f6', strokeWidth: 3.5, filter: 'drop-shadow(0 0 3px rgba(59,130,246,0.4))' };
                isAnimated = true;
            } else {
                // Caminho pendente/não percorrido: Linha cinza sutil sem animação
                edgeStyle = { stroke: '#94a3b8', strokeWidth: 1.5, opacity: 0.4 };
                isAnimated = false;
            }

            return {
                ...edge,
                animated: isAnimated,
                style: edgeStyle
            };
        });
    }, [rawEdges, nodeStatuses, trigger.current_node_id]);

    // 5. Caso não seja um funil válido, exibe tela de aviso amigável
    if (rawNodes.length === 0) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900/30 p-8 text-center">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h3 className="text-base font-black text-gray-800 dark:text-white uppercase tracking-wider mb-2">Visualização Indisponível</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm">
                    Este disparo não utiliza um funil estruturado do Flow Builder (ex: disparo direto de texto/template). Use a aba **"Linha do Tempo"** para ver os detalhes da execução.
                </p>
            </div>
        );
    }

    return (
        <div className="w-full h-full bg-slate-50 dark:bg-[#0b0f19] relative overflow-hidden transition-colors duration-200">
            <ReactFlowProvider>
                <FlowCameraOrchestrator 
                    trigger={trigger} 
                    nodes={flowNodes} 
                    edges={flowEdges} 
                />
            </ReactFlowProvider>
        </div>
    );
};

export default PipelineFlowViewer;
