import React, { useEffect, useMemo, useRef } from 'react';
import ReactFlow, { 
    Background, 
    useReactFlow, 
    ReactFlowProvider 
} from 'reactflow';
import 'reactflow/dist/style.css';
import { FiPlus, FiMinus, FiMaximize } from 'react-icons/fi';
import PipelineNode from './PipelineNode';

// Registramos nosso nó de exibição personalizado
const nodeTypes = {
    pipelineNode: PipelineNode,
};

// Sub-componente interno que tem acesso ao contexto useReactFlow para câmera inteligente
const FlowCameraOrchestrator = ({ trigger, nodes, edges }) => {
    const { fitView, getNodes, zoomIn, zoomOut } = useReactFlow();
    const currentNodeId = trigger.current_node_id;
    const hasInitialFocused = useRef(false);

    // Foca e centraliza a visualização apenas na montagem inicial/abertura do modal
    // para permitir que o usuário controle a câmera e o zoom livremente depois
    useEffect(() => {
        if (hasInitialFocused.current) return;

        const focusOnActiveNode = () => {
            // Forçar o React Flow a recalcular suas dimensões internas
            window.dispatchEvent(new Event('resize'));

            const allNodes = getNodes();
            if (!allNodes || allNodes.length === 0) return;
            
            // Ajusta a câmera para enquadrar todo o fluxo (zoom mais proximo e centralizado)
            fitView({ padding: 0.15, maxZoom: 0.85, duration: 600 });
            hasInitialFocused.current = true;
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
        <div className="relative" style={{ width: '100%', height: '100%' }}>
            {/* Barra de controle de zoom premium (Glassmorphism) */}
            <div className="absolute top-4 right-4 z-20 flex gap-2 bg-[#0f172a]/80 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shadow-xl">
                <button 
                    onClick={() => zoomIn({ duration: 300 })}
                    className="w-9 h-9 bg-white/5 hover:bg-white/10 text-white rounded-xl flex items-center justify-center transition-all border border-white/5 active:scale-95 hover:text-blue-400"
                    title="Aumentar Zoom"
                >
                    <FiPlus size={16} />
                </button>
                <button 
                    onClick={() => zoomOut({ duration: 300 })}
                    className="w-9 h-9 bg-white/5 hover:bg-white/10 text-white rounded-xl flex items-center justify-center transition-all border border-white/5 active:scale-95 hover:text-blue-400"
                    title="Diminuir Zoom"
                >
                    <FiMinus size={16} />
                </button>
                <button 
                    onClick={() => fitView({ padding: 0.15, maxZoom: 0.85, duration: 400 })}
                    className="w-9 h-9 bg-white/5 hover:bg-white/10 text-white rounded-xl flex items-center justify-center transition-all border border-white/5 active:scale-95 hover:text-blue-400"
                    title="Centralizar Visualização"
                >
                    <FiMaximize size={16} />
                </button>
            </div>

            <ReactFlow
                style={{ width: '100%', height: '100%' }}
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={true}
                selectNodesOnDrag={false}
                panOnDrag={true}
                zoomOnScroll={true}
                preventScrolling={true}
                proOptions={{ hideAttribution: true }}
                defaultEdgeOptions={{ style: { strokeWidth: 2 } }}
                minZoom={0.05}
                maxZoom={3.0}
                fitView
                fitViewOptions={{ padding: 0.15, maxZoom: 0.85 }}
            >
                <Background color="#94a3b8" opacity={0.15} gap={16} size={1.5} />
                {/* Suprime o highlight azul de seleção do ReactFlow */}
                <style>{`.react-flow__node.selected > div { box-shadow: none !important; outline: none !important; }`}</style>
            </ReactFlow>
        </div>
    );
};

const PipelineFlowViewer = ({ trigger, onNodeStatClick }) => {
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

    // 2. Calcular a ordem topológica real dos nós usando BFS para detectar "já passou por aqui"
    const nodeOrderMap = useMemo(() => {
        const order = {};
        const adj = {};
        const inDegree = {};
        
        // Inicializar
        rawNodes.forEach(node => {
            adj[node.id] = [];
            inDegree[node.id] = 0;
        });
        
        // Construir adjacência e in-degree
        rawEdges.forEach(edge => {
            if (adj[edge.source] && adj[edge.target] !== undefined) {
                adj[edge.source].push(edge.target);
                inDegree[edge.target] = (inDegree[edge.target] || 0) + 1;
            }
        });
        
        // Encontrar nós iniciais
        let startNodes = rawNodes.filter(node => 
            node.type === 'start' || 
            node.data?.isStart === true
        ).map(n => n.id);
        
        if (startNodes.length === 0) {
            // Fallback para nós com in-degree 0
            startNodes = rawNodes.filter(node => (inDegree[node.id] || 0) === 0).map(n => n.id);
        }
        
        if (startNodes.length === 0 && rawNodes.length > 0) {
            // Fallback absoluto
            startNodes = [rawNodes[0].id];
        }
        
        // BFS para computar níveis reais
        const queue = startNodes.map(id => ({ id, level: 0 }));
        const visited = new Set();
        
        while (queue.length > 0) {
            const { id, level } = queue.shift();
            
            // Registra o maior nível alcançado para este nó
            order[id] = Math.max(order[id] || 0, level);
            
            // Para evitar loops infinitos em grafos cíclicos
            const visitKey = `${id}-${level}`;
            if (visited.has(visitKey)) continue;
            visited.add(visitKey);
            
            if (adj[id]) {
                adj[id].forEach(nextId => {
                    // Evita propagação excessiva em ciclos limitando a profundidade máxima ao número de nós
                    if (level < rawNodes.length) {
                        queue.push({ id: nextId, level: level + 1 });
                    }
                });
            }
        }
        
        // Para qualquer nó remanescente que não foi alcançado, define nível baseado no index arbitrário como fallback
        rawNodes.forEach((node, idx) => {
            if (order[node.id] === undefined) {
                order[node.id] = idx + 1000;
            }
        });
        
        return order;
    }, [rawNodes, rawEdges]);

    // 3. Mapear logs de execução e calcular contadores com lógica inteligente
    const { nodeStatuses, nodeStats } = useMemo(() => {
        const statuses = {};
        const stats = {};

        // Agrupar todos os logs por contato (o backend sempre enriquece com contact_phone,
        // tanto para bulk quanto para triggers individuais de funil)
        const logsByContact = {};

        rawHistory.forEach(log => {
            const nodeId = log.node_id;
            if (!nodeId) return;

            // Registrar o último status de execução do nó (para colorir bordas)
            statuses[nodeId] = log.status;

            if (!stats[nodeId]) {
                stats[nodeId] = { sent: 0, waiting: 0, suspended: 0, failed: 0, cancelled: 0 };
            }

            // Identificar o contato pelo telefone (sempre disponível após enriquecimento do backend)
            const phone = log.extra?.contact_phone || log.extra?.contact_name || '__single__';
            if (!logsByContact[phone]) logsByContact[phone] = [];
            logsByContact[phone].push({
                node_id: nodeId,
                status: log.status,
                nodeOrder: nodeOrderMap[nodeId] ?? 999
            });
        });

        // Classificação inteligente: para cada contato, detectar se já avançou além de um nó waiting
        Object.values(logsByContact).forEach(contactLogs => {
            // Ignorar nós virtuais (como 'DISCOVERY', 'INITIAL_SECURITY', 'FINISH') que têm order 999
            const realNodeLogs = contactLogs.filter(l => l.nodeOrder < 999);
            const maxNodeOrder = realNodeLogs.length > 0 ? Math.max(...realNodeLogs.map(l => l.nodeOrder)) : -1;

            contactLogs.forEach(log => {
                const nodeId = log.node_id;
                if (!stats[nodeId]) stats[nodeId] = { sent: 0, waiting: 0, suspended: 0, failed: 0, cancelled: 0 };

                const isWaiting = log.status === 'waiting' || log.status === 'processing';
                const isSuspended = log.status === 'suspended';
                // Se o contato tem um log em nó posterior = já passou por este nó
                const alreadyMoved = (isWaiting || isSuspended) && log.nodeOrder < maxNodeOrder;

                if (log.status === 'completed' || alreadyMoved) {
                    stats[nodeId].sent++;
                } else if (isWaiting) {
                    stats[nodeId].waiting++;
                } else if (isSuspended) {
                    stats[nodeId].suspended++;
                } else if (log.status === 'failed') {
                    stats[nodeId].failed++;
                } else if (log.status === 'cancelled') {
                    stats[nodeId].cancelled++;
                }
            });
        });

        return { nodeStatuses: statuses, nodeStats: stats };
    }, [rawHistory, nodeOrderMap]);

    // Encontrar o ID do nó inicial (tipo 'start', isStart, ou menor ordem topológica)
    const startNodeId = useMemo(() => {
        const explicit = rawNodes.find(n => n.type === 'start' || n.data?.isStart === true);
        if (explicit) return explicit.id;
        let minOrder = Infinity;
        let minId = null;
        rawNodes.forEach(n => {
            const o = nodeOrderMap[n.id] ?? Infinity;
            if (o < minOrder) { minOrder = o; minId = n.id; }
        });
        return minId;
    }, [rawNodes, nodeOrderMap]);

    // 3. Processar os nós para exibição no React Flow
    const flowNodes = useMemo(() => {
        const mappedNodes = rawNodes.map(node => {
            const nodeId = node.id;
            const status = nodeStatuses[nodeId] || 'pending';
            const isActive = nodeId === trigger.current_node_id;

            // Encontrar o log de execução mais recente para este nó
            const nodeLogs = rawHistory.filter(log => log.node_id === nodeId);
            const latestLog = nodeLogs.length > 0 ? nodeLogs[nodeLogs.length - 1] : null;
            const resolvedUrl = latestLog?.extra?.resolved_url;
            const resolvedPayload = latestLog?.extra?.resolved_payload;

            return {
                ...node,
                type: 'pipelineNode', // Converte para o nosso tipo customizado
                data: {
                    ...node.data,
                    type: node.type,  // Copia o tipo original do nó para renderização customizada
                    status,
                    isActive,
                    resolvedUrl,
                    resolvedPayload,
                    latestLogMessage: latestLog?.details,
                    bulkStats: nodeStats[nodeId] || null,
                    onStatClick: (clickedStatus) => {
                        if (onNodeStatClick) {
                            onNodeStatClick(nodeId, clickedStatus);
                        }
                    }
                }
            };
        });
        return mappedNodes;
    }, [rawNodes, nodeStatuses, nodeStats, trigger.current_node_id, trigger.is_bulk, onNodeStatClick, rawHistory, startNodeId]);

    // 4. Processar e colorir as conexões (edges) de forma estática e discreta
    const flowEdges = useMemo(() => {
        return rawEdges.map(edge => {
            const sourceStatus = nodeStatuses[edge.source];
            const targetStatus = nodeStatuses[edge.target];

            let edgeStyle = {};

            if (sourceStatus === 'completed' && targetStatus === 'completed') {
                // Caminho concluído: linha verde sutil e estática
                edgeStyle = { stroke: '#10b981', strokeWidth: 2, opacity: 0.7 };
            } else if (sourceStatus === 'completed') {
                // Saindo de um nó concluído: linha cinza um pouco mais visível
                edgeStyle = { stroke: '#64748b', strokeWidth: 1.5, opacity: 0.5 };
            } else {
                // Caminho pendente: linha cinza discreta
                edgeStyle = { stroke: '#94a3b8', strokeWidth: 1.5, opacity: 0.35 };
            }

            return {
                ...edge,
                animated: false, // Sem animação em nenhuma aresta
                style: edgeStyle
            };
        });
    }, [rawEdges, nodeStatuses]);

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
        <div className="bg-slate-50 dark:bg-[#0b0f19] relative overflow-hidden transition-colors duration-200" style={{ width: '100%', height: '350px', minHeight: '320px' }}>
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
