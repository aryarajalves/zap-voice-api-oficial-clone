import { useRef, useCallback } from 'react';
import { useClient } from '../../../contexts/ClientContext';
import {
  useTemplateUIState,
  useTemplateFormData,
  useTemplateListState
} from './templateCreator';

export const useTemplateCreator = (onSuccess, refreshKey) => {
  const { activeClient } = useClient();

  const uiState = useTemplateUIState();

  const fetchTemplatesRef = useRef(null);
  const handleFetchTemplates = useCallback(() => {
    if (fetchTemplatesRef.current) {
      fetchTemplatesRef.current();
    }
  }, []);

  const formState = useTemplateFormData({
    activeClient,
    fetchTemplates: handleFetchTemplates,
    onSuccess
  });

  const listState = useTemplateListState({
    activeClient,
    refreshKey,
    editingId: formState.editingId,
    resetForm: formState.resetForm
  });

  fetchTemplatesRef.current = listState.fetchTemplates;

  return {
    activeClient,
    // UI State
    isBodyExpanded: uiState.isBodyExpanded,
    setIsBodyExpanded: uiState.setIsBodyExpanded,
    isGuideOpen: uiState.isGuideOpen,
    setIsGuideOpen: uiState.setIsGuideOpen,
    // Form & Media State
    loading: formState.loading,
    editingId: formState.editingId,
    buttonIndexToRemove: formState.buttonIndexToRemove,
    isRemoveButtonModalOpen: formState.isRemoveButtonModalOpen,
    setIsRemoveButtonModalOpen: formState.setIsRemoveButtonModalOpen,
    mediaUploading: formState.mediaUploading,
    mediaCache: formState.mediaCache,
    setMediaCache: formState.setMediaCache,
    fileInputRef: formState.fileInputRef,
    formData: formState.formData,
    setFormData: formState.setFormData,
    handleAddButton: formState.handleAddButton,
    removeButton: formState.removeButton,
    confirmRemoveButton: formState.confirmRemoveButton,
    updateButton: formState.updateButton,
    handleEdit: formState.handleEdit,
    resetForm: formState.resetForm,
    handleMediaUpload: formState.handleMediaUpload,
    handleSubmit: formState.handleSubmit,
    fixBodyTextForMeta: formState.fixBodyTextForMeta,
    // List & Filter State
    templates: listState.templates,
    setTemplates: listState.setTemplates,
    fetchingTemplates: listState.fetchingTemplates,
    templateToDelete: listState.templateToDelete,
    setTemplateToDelete: listState.setTemplateToDelete,
    isDeleteModalOpen: listState.isDeleteModalOpen,
    setIsDeleteModalOpen: listState.setIsDeleteModalOpen,
    templateSearch: listState.templateSearch,
    setTemplateSearch: listState.setTemplateSearch,
    templateCategoryFilter: listState.templateCategoryFilter,
    setTemplateCategoryFilter: listState.setTemplateCategoryFilter,
    templateStatusFilter: listState.templateStatusFilter,
    setTemplateStatusFilter: listState.setTemplateStatusFilter,
    openFilterDropdown: listState.openFilterDropdown,
    setOpenFilterDropdown: listState.setOpenFilterDropdown,
    fetchTemplates: listState.fetchTemplates,
    handleDeleteTemplate: listState.handleDeleteTemplate,
    updateTemplateTags: listState.updateTemplateTags,
    deleteTemplateTagGlobal: listState.deleteTemplateTagGlobal,
    archiveTemplate: listState.archiveTemplate,
    unarchiveTemplate: listState.unarchiveTemplate,
    handlePinTemplate: listState.handlePinTemplate
  };
};

export default useTemplateCreator;
