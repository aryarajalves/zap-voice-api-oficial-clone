import React from 'react';
import ReactFlow, { Background, Controls, Panel } from 'reactflow';
import { FiPlus } from 'react-icons/fi';
import 'reactflow/dist/style.css';
import { GlobalVarsContext, PortalContext } from './index';
import nodeTypes from './nodeTypes';
import { useFlowLogic } from './hooks/useFlowLogic';
import MetadataPanel from './Panels/MetadataPanel';
import ControlsPanel from './Panels/ControlsPanel';
import ContextMenu from './components/ContextMenu';
import ConfirmModal from '../ConfirmModal';

const FlowEditor = ({ funnelId, isFullScreen, toggleFullScreen, onBack, onSave, refreshKey }) => {
    const portalContainer = React.useContext(PortalContext);
    const {
        nodes, edges, saving, funnelName, setFunnelName,
        triggerPhrase, setTriggerPhrase, allowedPhones, setAllowedPhones,
        blockedPhones, setBlockedPhones, showRestrictions, setShowRestrictions,
        businessHoursStart, setBusinessHoursStart, businessHoursEnd, setBusinessHoursEnd,
        businessHoursDays, setBusinessHoursDays, showBusinessHours, setShowBusinessHours,
        globalVars, nodeToDelete, menu, setMenu, reactFlowWrapper,
        onNodesChange, onEdgesChange, onConnect, onConnectStart, onConnectEnd,
        onPaneContextMenu, onPaneClick, handleAddNode, handleSave, confirmDelete, cancelDelete
    } = useFlowLogic(funnelId, onSave, refreshKey);

    return (
        <GlobalVarsContext.Provider value={globalVars}>
            <div className="flex h-full w-full" ref={reactFlowWrapper}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onConnectStart={onConnectStart}
                    onConnectEnd={onConnectEnd}
                    nodeTypes={nodeTypes}
                    onPaneContextMenu={onPaneContextMenu}
                    onPaneClick={onPaneClick}
                    defaultEdgeOptions={{ animated: true, style: { strokeWidth: 2 } }}
                    connectionLineStyle={{ stroke: '#3b82f6', strokeWidth: 3 }}
                    proOptions={{ hideAttribution: true }}
                    fitView
                    fitViewOptions={{ padding: 0.2, includeHiddenNodes: true }}
                    minZoom={0.1}
                >
                    <Background color="#aaa" gap={20} />
                    <Controls fitViewOptions={{ padding: 0.2, includeHiddenNodes: true }} />

                    <MetadataPanel
                        funnelName={funnelName} setFunnelName={setFunnelName}
                        triggerPhrase={triggerPhrase} setTriggerPhrase={setTriggerPhrase}
                        showRestrictions={showRestrictions} setShowRestrictions={setShowRestrictions}
                        allowedPhones={allowedPhones} setAllowedPhones={setAllowedPhones}
                        blockedPhones={blockedPhones} setBlockedPhones={setBlockedPhones}
                        showBusinessHours={showBusinessHours} setShowBusinessHours={setShowBusinessHours}
                        businessHoursStart={businessHoursStart} setBusinessHoursStart={setBusinessHoursStart}
                        businessHoursEnd={businessHoursEnd} setBusinessHoursEnd={setBusinessHoursEnd}
                        businessHoursDays={businessHoursDays} setBusinessHoursDays={setBusinessHoursDays}
                    />

                    <ControlsPanel
                        onBack={onBack} isFullScreen={isFullScreen} toggleFullScreen={toggleFullScreen}
                        handleSave={handleSave} saving={saving}
                    />

                    {menu && <ContextMenu top={menu.top} left={menu.left} onClose={() => setMenu(null)} onAddNode={handleAddNode} />}

                    <Panel position="bottom-center" className="bg-white/80 dark:bg-gray-800/80 backdrop-blur px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm mb-4">
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium flex items-center gap-2">
                            <FiPlus /> Clique com o Botão Direito para adicionar novos nós
                        </span>
                    </Panel>

                    <ConfirmModal
                        isOpen={!!nodeToDelete}
                        onClose={cancelDelete}
                        onConfirm={confirmDelete}
                        title="Excluir Nó"
                        message="Tem certeza que deseja excluir este nó? Esta ação não pode ser desfeita."
                        confirmText="Excluir"
                        cancelText="Cancelar"
                        isDangerous={true}
                        container={portalContainer || document.body}
                    />
                </ReactFlow>
            </div>
        </GlobalVarsContext.Provider>
    );
};

export default FlowEditor;
