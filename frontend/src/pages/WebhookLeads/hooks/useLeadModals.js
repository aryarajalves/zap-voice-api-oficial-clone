import { useState } from 'react';

export function useLeadModals() {
  // Modal de Exclusão
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modais de Criação, Edição e Importação
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [leadToEdit, setLeadToEdit] = useState(null);

  // Modal de Exportação
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [exportError, setExportError] = useState(null);

  // Modal de Limpeza de Tags
  const [isCleaningTags, setIsCleaningTags] = useState(false);
  const [isCleanConfirmOpen, setIsCleanConfirmOpen] = useState(false);

  // Modal de Etiquetar em Massa
  const [isBulkTagModalOpen, setIsBulkTagModalOpen] = useState(false);
  const [isBulkTagging, setIsBulkTagging] = useState(false);

  // Modal de Bloqueio / Repouso
  const [blockTarget, setBlockTarget] = useState(null);
  const [isBlocking, setIsBlocking] = useState(false);

  const handleOpenBlockModal = (target) => setBlockTarget(target);
  const closeBlockModal = () => setBlockTarget(null);

  const handleCloseExportModal = () => {
    if (isExporting) return;
    setIsExportModalOpen(false);
    setExportStatus('loading');
    setExportError(null);
  };

  return {
    // Deleção
    isDeleteModalOpen, setIsDeleteModalOpen,
    leadToDelete, setLeadToDelete,
    isDeleting, setIsDeleting,

    // Criação, Edição, Importação
    isImportModalOpen, setIsImportModalOpen,
    isCreateModalOpen, setIsCreateModalOpen,
    isEditModalOpen, setIsEditModalOpen,
    leadToEdit, setLeadToEdit,

    // Exportação
    isExportModalOpen, setIsExportModalOpen,
    isExporting, setIsExporting,
    exportStatus, setExportStatus,
    exportError, setExportError,
    handleCloseExportModal,

    // Limpeza de Tags
    isCleaningTags, setIsCleaningTags,
    isCleanConfirmOpen, setIsCleanConfirmOpen,

    // Etiquetagem em Massa
    isBulkTagModalOpen, setIsBulkTagModalOpen,
    isBulkTagging, setIsBulkTagging,

    // Bloqueio / Repouso
    blockTarget, setBlockTarget,
    isBlocking, setIsBlocking,
    handleOpenBlockModal,
    closeBlockModal,
  };
}
