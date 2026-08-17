import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiPlus, FiFileText } from 'react-icons/fi';
import { useClient } from '../../contexts/ClientContext';
import EmailButtonModal from './EmailButtonModal';

// Hooks Customizados
import { useEmailTemplates } from './hooks/useEmailTemplates';
import { useEmailEditorActions } from './hooks/useEmailEditorActions';

// Subcomponentes Modulares
import EmailTemplateCard from './components/EmailTemplateCard';
import EmailTemplateEditModal from './components/EmailTemplateEditModal';
import EmailFullscreenEditorModal from './components/EmailFullscreenEditorModal';
import EmailMediaInsertModal from './components/EmailMediaInsertModal';
import EmailDeleteConfirmModal from './components/EmailDeleteConfirmModal';

export default function EmailTemplatesTab() {
  const { activeClient } = useClient();
  const [isFullscreenEditorOpen, setIsFullscreenEditorOpen] = useState(false);
  const [viewMode, setViewMode] = useState('visual'); // 'visual' | 'code'

  const templatesManager = useEmailTemplates({ activeClient });

  const editorActions = useEmailEditorActions({
    formData: templatesManager.formData,
    setFormData: templatesManager.setFormData,
    activeClient,
    setViewMode
  });

  const handleOpenCreateModal = () => {
    setIsFullscreenEditorOpen(false);
    setViewMode('visual');
    editorActions.setSlashActive(false);
    editorActions.setShowVarDropdown(false);
    editorActions.setIsMediaModalOpen(false);
    editorActions.setIsButtonModalOpen(false);
    templatesManager.handleOpenModal(null);
  };

  const handleOpenEditModal = (tmpl) => {
    setIsFullscreenEditorOpen(false);
    setViewMode('visual');
    editorActions.setSlashActive(false);
    editorActions.setShowVarDropdown(false);
    editorActions.setIsMediaModalOpen(false);
    editorActions.setIsButtonModalOpen(false);
    templatesManager.handleOpenModal(tmpl);
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <FiFileText className="text-blue-500" /> Templates de E-mail
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Crie e gerencie os modelos de e-mail marketing utilizados nos disparos em massa.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-blue-500/20 flex items-center gap-2"
        >
          <FiPlus /> Novo Template
        </button>
      </div>

      {/* Grid de Templates */}
      {templatesManager.loading ? (
        <div className="p-8 text-center text-gray-400">Carregando templates...</div>
      ) : templatesManager.templates.length === 0 ? (
        <div className="bg-white dark:bg-slate-800/80 p-8 rounded-2xl border border-gray-100 dark:border-white/10 text-center space-y-3">
          <FiFileText size={40} className="mx-auto text-gray-400" />
          <h3 className="font-bold text-gray-700 dark:text-gray-200">Nenhum template cadastrado</h3>
          <p className="text-xs text-gray-500">Clique em "Novo Template" acima para criar seu primeiro modelo de e-mail.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templatesManager.templates.map(tmpl => (
            <EmailTemplateCard
              key={tmpl.id}
              template={tmpl}
              onEdit={handleOpenEditModal}
              onDelete={templatesManager.openDeleteModal}
            />
          ))}
        </div>
      )}

      {/* Modal Padrão de Criação / Edição */}
      <EmailTemplateEditModal
        isOpen={templatesManager.isModalOpen}
        onClose={() => templatesManager.setIsModalOpen(false)}
        editingTemplate={templatesManager.editingTemplate}
        formData={templatesManager.formData}
        setFormData={templatesManager.setFormData}
        handleSave={templatesManager.handleSave}
        onOpenFullscreen={() => setIsFullscreenEditorOpen(true)}
        editorActions={editorActions}
      />

      {/* Popup em Tela Cheia (100% da Tela) */}
      <EmailFullscreenEditorModal
        isOpen={isFullscreenEditorOpen}
        onClose={() => setIsFullscreenEditorOpen(false)}
        viewMode={viewMode}
        setViewMode={setViewMode}
        formData={templatesManager.formData}
        handleSave={async (e) => {
          const success = await templatesManager.handleSave(e);
          if (success) setIsFullscreenEditorOpen(false);
        }}
        editorActions={editorActions}
      />

      {/* Modal de Inserção de Botão CTA */}
      <EmailButtonModal
        isOpen={editorActions.isButtonModalOpen}
        onClose={() => editorActions.setIsButtonModalOpen(false)}
        onInsert={(buttonHtml) => {
          editorActions.insertTextAtCursor('body_html', buttonHtml);
          setViewMode('visual');
          toast.success("Botão CTA inserido com sucesso!");
        }}
      />

      {/* Modal de Inserção de Mídia */}
      <EmailMediaInsertModal
        isOpen={editorActions.isMediaModalOpen}
        onClose={() => editorActions.setIsMediaModalOpen(false)}
        mediaType={editorActions.mediaType}
        uploadLoading={editorActions.uploadLoading}
        mediaUrlInput={editorActions.mediaUrlInput}
        setMediaUrlInput={editorActions.setMediaUrlInput}
        mediaLinkText={editorActions.mediaLinkText}
        setMediaLinkText={editorActions.setMediaLinkText}
        fileInputRef={editorActions.fileInputRef}
        handleFileUpload={editorActions.handleFileUpload}
        handleInsertUrl={editorActions.handleInsertUrl}
      />

      {/* Modal de Confirmação de Exclusão */}
      <EmailDeleteConfirmModal
        isOpen={templatesManager.isDeleteModalOpen}
        onClose={() => templatesManager.setIsDeleteModalOpen(false)}
        template={templatesManager.templateToDelete}
        onConfirm={templatesManager.confirmDeleteTemplate}
        loading={templatesManager.deleteLoading}
      />
    </div>
  );
}
