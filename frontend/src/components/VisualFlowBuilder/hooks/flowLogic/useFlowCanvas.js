import { useState, useCallback, useRef } from 'react';
import { applyNodeChanges, applyEdgeChanges, addEdge, useReactFlow } from 'reactflow';
import { toast } from 'react-hot-toast';
import { createNodeDefaultData } from './nodeDefaults';

export const useFlowCanvas = () => {
    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);
    const [nodeToDelete, setNodeToDelete] = useState(null);
    const [menu, setMenu] = useState(null);

    const reactFlowWrapper = useRef(null);
    const { project } = useReactFlow();
    const connectingNodeId = useRef(null);
    const connectingHandleId = useRef(null);

    const updateNodeData = useCallback((id, newData) => {
        setNodes((nds) => nds.map((node) => {
            if (node.id === id) {
                return { ...node, data: { ...node.data, ...newData } };
            }
            return node;
        }));
    }, []);

    const setStartNode = useCallback((id) => {
        setNodes((nds) => nds.map((node) => ({
            ...node,
            data: {
                ...node.data,
                isStart: node.id === id
            }
        })));

        setEdges((eds) => eds.filter(e => e.target !== id));
        toast.success("Nó inicial atualizado! 🏁");
    }, []);

    const handleDeleteRequest = useCallback((id) => {
        setNodeToDelete(id);
    }, []);

    const confirmDelete = useCallback(() => {
        if (!nodeToDelete) return;
        const id = nodeToDelete;
        setNodes((nds) => nds.filter((n) => n.id !== id));
        setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
        setNodeToDelete(null);
        toast.success("Nó removido com sucesso!");
    }, [nodeToDelete]);

    const cancelDelete = useCallback(() => {
        setNodeToDelete(null);
    }, []);

    const handleDuplicateNode = useCallback((id) => {
        setNodes((nds) => {
            const sourceNode = nds.find(n => n.id === id);
            if (!sourceNode) return nds;

            // Criar novas coordenadas levemente deslocadas para o nó duplicado
            const newPosition = {
                x: sourceNode.position.x + 35,
                y: sourceNode.position.y + 35
            };

            // Copia todos os dados do nó, exceto isStart
            const sourceData = sourceNode.data || {};
            const duplicatedData = {
                ...sourceData,
                isStart: false,
                onChange: updateNodeData,
                onDelete: handleDeleteRequest,
                onSetStart: setStartNode,
                onDuplicate: handleDuplicateNode
            };

            const newNode = {
                id: `node_${Date.now()}`,
                type: sourceNode.type,
                position: newPosition,
                data: duplicatedData
            };

            return nds.concat(newNode);
        });
        toast.success("Nó duplicado com sucesso! 👥");
    }, [updateNodeData, handleDeleteRequest, setStartNode]);

    const onPaneContextMenu = useCallback(
        (event) => {
            event.preventDefault();
            const pane = reactFlowWrapper.current?.getBoundingClientRect();
            if (!pane) return;

            let top = event.clientY - pane.top;
            let left = event.clientX - pane.left;

            const menuWidth = 220;
            const menuHeight = 350;

            if (left + menuWidth > pane.width) left -= menuWidth;
            if (top + menuHeight > pane.height) top -= menuHeight;

            left = Math.max(10, left);
            top = Math.max(10, top);

            setMenu({ top, left });
        },
        []
    );

    const onPaneClick = useCallback(() => {
        setMenu(null);
        connectingNodeId.current = null;
    }, []);

    const handleAddNode = useCallback((type) => {
        if (!menu) return;

        const position = project({
            x: menu.left,
            y: menu.top,
        });

        const defaultData = createNodeDefaultData(type, {
            onChange: updateNodeData,
            onDelete: handleDeleteRequest,
            onSetStart: setStartNode,
            onDuplicate: handleDuplicateNode
        });

        setNodes((nds) => {
            const hasStartNode = nds.some(n => n.data?.isStart);

            if (!hasStartNode) {
                defaultData.isStart = true;
            }

            const newNode = {
                id: `node_${Date.now()}`,
                type,
                position,
                data: defaultData
            };

            const newNodes = nds.concat(newNode);

            if (menu.sourceNodeId) {
                setEdges((eds) => {
                    const filtered = eds.filter(e =>
                        !(e.source === menu.sourceNodeId && e.sourceHandle === menu.sourceHandleId)
                    );
                    return addEdge({
                        id: `e${menu.sourceNodeId}-${newNode.id}`,
                        source: menu.sourceNodeId,
                        sourceHandle: menu.sourceHandleId,
                        target: newNode.id,
                        animated: true
                    }, filtered);
                });
            }

            return newNodes;
        });

        setMenu(null);
        connectingNodeId.current = null;
    }, [menu, project, updateNodeData, handleDeleteRequest, setStartNode, handleDuplicateNode]);

    const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
    const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);

    const onConnect = useCallback((params) => {
        setEdges((eds) => {
            const filteredEdges = eds.filter(e =>
                !(e.source === params.source && e.sourceHandle === params.sourceHandle)
            );
            return addEdge({ ...params, animated: true }, filteredEdges);
        });
    }, []);

    const onConnectStart = useCallback((_, { nodeId, handleId }) => {
        connectingNodeId.current = nodeId;
        connectingHandleId.current = handleId;
    }, []);

    const onConnectEnd = useCallback(() => {
        connectingNodeId.current = null;
        connectingHandleId.current = null;
    }, []);

    return {
        nodes, setNodes,
        edges, setEdges,
        nodeToDelete,
        menu, setMenu,
        reactFlowWrapper,
        updateNodeData,
        setStartNode,
        handleDeleteRequest,
        confirmDelete,
        cancelDelete,
        handleDuplicateNode,
        handleAddNode,
        onNodesChange,
        onEdgesChange,
        onConnect,
        onConnectStart,
        onConnectEnd,
        onPaneContextMenu,
        onPaneClick
    };
};
