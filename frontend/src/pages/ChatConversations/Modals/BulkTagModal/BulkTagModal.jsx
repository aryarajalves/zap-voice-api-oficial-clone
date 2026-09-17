import React from 'react';
import { useBulkTagModal } from './hooks/useBulkTagModal';
import BulkTagModalHeader from './components/BulkTagModalHeader';
import BulkTagCategorySelector from './components/BulkTagCategorySelector';
import BulkTagSelectedList from './components/BulkTagSelectedList';
import BulkTagSearchInput from './components/BulkTagSearchInput';
import BulkTagAvailableList from './components/BulkTagAvailableList';
import BulkTagModalFooter from './components/BulkTagModalFooter';

export default function BulkTagModal({
  isOpen,
  onClose,
  chatLabels = [],
  contactLabels = [],
  availableLabels = [],
  availableLabelsDetails = [],
  getLabelColor,
  selectedBulkTag,
  setSelectedBulkTag,
  customBulkTag,
  setCustomBulkTag,
  onApply,
  isApplying,
  selectedCount,
  loadAvailableLabels
}) {
  const {
    targetCategory,
    searchTerm,
    setSearchTerm,
    selectedTags,
    searchInputRef,
    filteredLabels,
    isExactMatch,
    resolveColor,
    handleToggleTag,
    handleCreateCustomTag,
    handleRemoveTag,
    handleClearAllTags,
    handleSwitchCategory,
    handleKeyDown
  } = useBulkTagModal({
    isOpen,
    onClose,
    chatLabels,
    contactLabels,
    availableLabels,
    availableLabelsDetails,
    getLabelColor,
    selectedBulkTag,
    setSelectedBulkTag,
    customBulkTag,
    setCustomBulkTag,
    onApply,
    loadAvailableLabels
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[85vh] overflow-hidden my-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Fixo */}
        <div className="px-6 py-4 border-b border-slate-800/80 shrink-0">
          <BulkTagModalHeader selectedCount={selectedCount} />
        </div>

        {/* Corpo com Rolagem Interna */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
          {/* Seletor de Categoria: Chat vs Contatos */}
          <BulkTagCategorySelector
            targetCategory={targetCategory}
            onSwitchCategory={handleSwitchCategory}
          />

          {/* Tags Selecionadas */}
          <BulkTagSelectedList
            selectedTags={selectedTags}
            targetCategory={targetCategory}
            resolveColor={resolveColor}
            handleRemoveTag={handleRemoveTag}
            handleClearAllTags={handleClearAllTags}
          />

          {/* Campo de Pesquisa / Criação */}
          <BulkTagSearchInput
            targetCategory={targetCategory}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            searchInputRef={searchInputRef}
            onKeyDown={handleKeyDown}
          />

          {/* Lista de Etiquetas Disponíveis */}
          <BulkTagAvailableList
            filteredLabels={filteredLabels}
            searchTerm={searchTerm}
            isExactMatch={isExactMatch}
            targetCategory={targetCategory}
            selectedTags={selectedTags}
            resolveColor={resolveColor}
            handleCreateCustomTag={handleCreateCustomTag}
            handleToggleTag={handleToggleTag}
          />
        </div>

        {/* Rodapé com botões de ação fixo */}
        <div className="px-6 py-4 bg-slate-950/40 border-t border-slate-800/80 shrink-0">
          <BulkTagModalFooter
            onClose={onClose}
            onApply={onApply}
            selectedTags={selectedTags}
            targetCategory={targetCategory}
            isApplying={isApplying}
          />
        </div>
      </div>
    </div>
  );
}
