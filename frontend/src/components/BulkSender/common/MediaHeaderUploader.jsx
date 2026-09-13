import React from 'react';
import {
  MediaUploadArea,
  SavedMediasList,
  DeleteMediaModal,
  MediaHeaderUploaderTitle,
  MediaModeTabs,
  MediaStatusIndicator,
  useMediaHeaderUpload
} from './MediaHeaderUploader/index';

/**
 * MediaHeaderUploader
 * Permite enviar um arquivo de mídia (vídeo, imagem ou documento) para o MinIO
 * via endpoint /upload e preenche automaticamente o campo HEADER_0 com a URL pública.
 * Também permite gerenciar, visualizar, renomear e deletar arquivos salvos.
 */
const MediaHeaderUploader = ({ format, templateParams, handleParamChange }) => {
  const {
    isUploading,
    uploadProgress,
    uploadedFile,
    setUploadedFile,
    pastMedias,
    currentPage,
    pageSize,
    totalPages,
    showPastSelector,
    setShowPastSelector,
    editingMediaId,
    setEditingMediaId,
    editingName,
    setEditingName,
    mediaToDelete,
    setMediaToDelete,
    currentUrl,
    mediaTypeLabel,
    mediaIcon,
    acceptAttr,
    fetchPastMedias,
    handlePageChange,
    handlePageSizeChange,
    startRename,
    saveRename,
    handleDeleteMedia,
    handleFileSelect,
    handleRemoveUpload
  } = useMediaHeaderUpload({ format, templateParams, handleParamChange });

  return (
    <div
      id="media-header-uploader"
      className="p-6 bg-amber-500/5 border border-amber-500/20 rounded-3xl space-y-4 relative"
    >
      {/* Título */}
      <MediaHeaderUploaderTitle
        mediaIcon={mediaIcon}
        mediaTypeLabel={mediaTypeLabel}
      />

      {/* Alternador de Modos */}
      <MediaModeTabs
        showPastSelector={showPastSelector}
        setShowPastSelector={setShowPastSelector}
        onSelectPastMedias={() => fetchPastMedias(1, pageSize)}
      />

      {/* Conteúdo: Mídias Salvas ou Área de Upload */}
      <div className="space-y-3">
        {showPastSelector ? (
          <SavedMediasList
            pastMedias={pastMedias}
            format={format}
            mediaTypeLabel={mediaTypeLabel}
            mediaIcon={mediaIcon}
            currentUrl={currentUrl}
            editingMediaId={editingMediaId}
            setEditingMediaId={setEditingMediaId}
            editingName={editingName}
            setEditingName={setEditingName}
            startRename={startRename}
            saveRename={saveRename}
            setMediaToDelete={setMediaToDelete}
            setUploadedFile={setUploadedFile}
            handleParamChange={handleParamChange}
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            handlePageSizeChange={handlePageSizeChange}
            handlePageChange={handlePageChange}
          />
        ) : (
          <MediaUploadArea
            uploadedFile={uploadedFile}
            format={format}
            mediaTypeLabel={mediaTypeLabel}
            acceptAttr={acceptAttr}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            handleRemoveUpload={handleRemoveUpload}
            handleFileSelect={handleFileSelect}
          />
        )}
      </div>

      {/* Indicadores de status */}
      <MediaStatusIndicator
        isUploading={isUploading}
        currentUrl={currentUrl}
        mediaTypeLabel={mediaTypeLabel}
      />

      {/* Modal de confirmação de exclusão */}
      <DeleteMediaModal
        mediaToDelete={mediaToDelete}
        onClose={() => setMediaToDelete(null)}
        onConfirm={handleDeleteMedia}
      />
    </div>
  );
};

export default MediaHeaderUploader;
