import { useClient } from '../../../contexts/ClientContext';
import { useFlowCanvas } from './flowLogic/useFlowCanvas';
import { useFlowMetadata } from './flowLogic/useFlowMetadata';
import { useFlowStorage } from './flowLogic/useFlowStorage';

export const useFlowLogic = (funnelId, onSave, refreshKey) => {
    const { activeClient } = useClient();

    // 1. Sub-hook de Metadados e Gatilhos do Funil
    const metadata = useFlowMetadata();

    // 2. Sub-hook de Manipulação do Canvas e Nós do ReactFlow
    const canvas = useFlowCanvas();

    // 3. Sub-hook de Persistência e Carregamento
    const storage = useFlowStorage({
        funnelId,
        onSave,
        activeClient,
        nodes: canvas.nodes,
        setNodes: canvas.setNodes,
        edges: canvas.edges,
        setEdges: canvas.setEdges,
        metadata,
        nodeCallbacks: {
            updateNodeData: canvas.updateNodeData,
            handleDeleteRequest: canvas.handleDeleteRequest,
            setStartNode: canvas.setStartNode,
            handleDuplicateNode: canvas.handleDuplicateNode
        }
    });

    return {
        // Canvas & Nós
        nodes: canvas.nodes,
        setNodes: canvas.setNodes,
        edges: canvas.edges,
        setEdges: canvas.setEdges,
        nodeToDelete: canvas.nodeToDelete,
        menu: canvas.menu,
        setMenu: canvas.setMenu,
        reactFlowWrapper: canvas.reactFlowWrapper,
        onNodesChange: canvas.onNodesChange,
        onEdgesChange: canvas.onEdgesChange,
        onConnect: canvas.onConnect,
        onConnectStart: canvas.onConnectStart,
        onConnectEnd: canvas.onConnectEnd,
        onPaneContextMenu: canvas.onPaneContextMenu,
        onPaneClick: canvas.onPaneClick,
        handleAddNode: canvas.handleAddNode,
        confirmDelete: canvas.confirmDelete,
        cancelDelete: canvas.cancelDelete,

        // Metadados
        funnelName: metadata.funnelName,
        setFunnelName: metadata.setFunnelName,
        allowedPhones: metadata.allowedPhones,
        setAllowedPhones: metadata.setAllowedPhones,
        blockedPhones: metadata.blockedPhones,
        setBlockedPhones: metadata.setBlockedPhones,
        showRestrictions: metadata.showRestrictions,
        setShowRestrictions: metadata.setShowRestrictions,
        businessHoursStart: metadata.businessHoursStart,
        setBusinessHoursStart: metadata.setBusinessHoursStart,
        businessHoursEnd: metadata.businessHoursEnd,
        setBusinessHoursEnd: metadata.setBusinessHoursEnd,
        businessHoursDays: metadata.businessHoursDays,
        setBusinessHoursDays: metadata.setBusinessHoursDays,
        showBusinessHours: metadata.showBusinessHours,
        setShowBusinessHours: metadata.setShowBusinessHours,
        showKeywords: metadata.showKeywords,
        setShowKeywords: metadata.setShowKeywords,
        triggerPhrase: metadata.triggerPhrase,
        setTriggerPhrase: metadata.setTriggerPhrase,
        triggerMatchType: metadata.triggerMatchType,
        setTriggerMatchType: metadata.setTriggerMatchType,
        triggerLimitType: metadata.triggerLimitType,
        setTriggerLimitType: metadata.setTriggerLimitType,
        isTriggerActive: metadata.isTriggerActive,
        setIsTriggerActive: metadata.setIsTriggerActive,

        // Storage & Globais
        saving: storage.saving,
        globalVars: storage.globalVars,
        handleSave: storage.handleSave
    };
};
