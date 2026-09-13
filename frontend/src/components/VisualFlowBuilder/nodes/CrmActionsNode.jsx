import React from 'react';
import { Handle, Position } from 'reactflow';
import { FiSliders } from 'react-icons/fi';
import NodeHeader from '../components/NodeHeader';
import {
    PlatformActionSelectors,
    ChatwootLabelAction,
    UpdateContactAction,
    LocalSegmentAction,
    DefaultActionInput,
    useCrmActions
} from './CrmActions';

const CrmActionsNode = ({ id, data }) => {
    const {
        platform,
        action,
        value,
        nameType,
        labels,
        setLabels,
        loadingLabels,
        isAddOpen,
        setIsAddOpen,
        isRemoveOpen,
        setIsRemoveOpen,
        addSearch,
        setAddSearch,
        removeSearch,
        setRemoveSearch,
        existingTags,
        showLocalSuggestions,
        setShowLocalSuggestions,
        addDropdownRef,
        removeDropdownRef,
        selectedAddLabels,
        selectedRemoveLabels,
        toggleAddLabel,
        toggleRemoveLabel,
        filteredAddLabels,
        filteredRemoveLabels,
        handlePlatformChange,
        handleActionChange
    } = useCrmActions(id, data);

    return (
        <div className="px-4 py-3 shadow-lg rounded-2xl bg-white dark:bg-gray-800 border-2 border-indigo-500 min-w-[280px] transition-all hover:shadow-2xl">
            <Handle type="target" position={Position.Left} className="w-3 h-3 bg-indigo-500" />

            <NodeHeader
                label="Ações de CRM"
                icon={FiSliders}
                colorClass="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400"
                onDelete={() => data.onDelete(id)}
                onDuplicate={() => data.onDuplicate(id)}
                isStart={data.isStart}
                onSetStart={() => data.onSetStart(id, 'crmActionsNode')}
            />

            <div className="space-y-3 mt-2 px-1">
                <PlatformActionSelectors
                    platform={platform}
                    action={action}
                    onPlatformChange={handlePlatformChange}
                    onActionChange={handleActionChange}
                />

                {/* VISÃO ESPECÍFICA: ETIQUETAR CHATWOOT */}
                {platform === 'chatwoot' && action === 'chatwoot_label' && (
                    <ChatwootLabelAction
                        labels={labels}
                        setLabels={setLabels}
                        loadingLabels={loadingLabels}
                        selectedAddLabels={selectedAddLabels}
                        selectedRemoveLabels={selectedRemoveLabels}
                        toggleAddLabel={toggleAddLabel}
                        toggleRemoveLabel={toggleRemoveLabel}
                        filteredAddLabels={filteredAddLabels}
                        filteredRemoveLabels={filteredRemoveLabels}
                        isAddOpen={isAddOpen}
                        setIsAddOpen={setIsAddOpen}
                        isRemoveOpen={isRemoveOpen}
                        setIsRemoveOpen={setIsRemoveOpen}
                        addSearch={addSearch}
                        setAddSearch={setAddSearch}
                        removeSearch={removeSearch}
                        setRemoveSearch={setRemoveSearch}
                        addDropdownRef={addDropdownRef}
                        removeDropdownRef={removeDropdownRef}
                    />
                )}

                {/* VISÃO ESPECÍFICA: ATUALIZAR CONTATO */}
                {platform === 'chatwoot' && action === 'update_contact' && (
                    <UpdateContactAction
                        id={id}
                        data={data}
                        nameType={nameType}
                    />
                )}

                {/* VISÃO ESPECÍFICA: SEGMENTAÇÃO LOCAL */}
                {platform === 'local' && (
                    <LocalSegmentAction
                        id={id}
                        data={data}
                        action={action}
                        value={value}
                        existingTags={existingTags}
                        showLocalSuggestions={showLocalSuggestions}
                        setShowLocalSuggestions={setShowLocalSuggestions}
                    />
                )}

                {/* INPUT PADRÃO PARA OUTRAS AÇÕES */}
                {action !== 'chatwoot_label' && action !== 'update_contact' && platform !== 'local' && (
                    <DefaultActionInput
                        id={id}
                        data={data}
                        action={action}
                        value={value}
                    />
                )}
            </div>

            <Handle type="source" position={Position.Right} id="default" className="w-3 h-3 bg-indigo-500" />
        </div>
    );
};

export default CrmActionsNode;
