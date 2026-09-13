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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <BulkTagModalHeader selectedCount={selectedCount} />

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

        {/* Rodapé com botões de ação */}
        <BulkTagModalFooter
          onClose={onClose}
          onApply={onApply}
          selectedTags={selectedTags}
          targetCategory={targetCategory}
          isApplying={isApplying}
        />
      </div>
    </div>
  );
}
