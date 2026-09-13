import React from 'react';
import { FiFolder } from 'react-icons/fi';
import ConfirmModal from '../../../components/ConfirmModal';
import {
    ProjectHeader,
    ProjectCard,
    useProjectManager
} from './ProjectManager/index';

const ProjectManager = ({ currentUser, clients = [], fetchClients }) => {
    const {
        projects,
        loading,
        newProjectName,
        setNewProjectName,
        isCreating,
        setIsCreating,
        editingProjectId,
        editingName,
        setEditingName,
        expandedProjectId,
        selectedClientIds,
        savingAssociations,
        projectToDelete,
        setProjectToDelete,
        isDeleteModalOpen,
        setIsDeleteModalOpen,
        isSuperAdmin,
        handleCreateProject,
        handleStartEdit,
        handleCancelEdit,
        handleSaveEdit,
        confirmDeleteProject,
        handleDeleteProject,
        handleToggleExpand,
        handleClientCheckboxChange,
        handleSaveAssociations,
        getClientProjectName
    } = useProjectManager({ currentUser, fetchClients });

    return (
        <div className="space-y-6">
            {/* Header / Ações de Criação */}
            <ProjectHeader
                isSuperAdmin={isSuperAdmin}
                isCreating={isCreating}
                setIsCreating={setIsCreating}
                newProjectName={newProjectName}
                setNewProjectName={setNewProjectName}
                onCreateProject={handleCreateProject}
            />

            {/* Listagem de Projetos */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : projects.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-white/5">
                    <FiFolder className="mx-auto text-gray-400 mb-3" size={40} />
                    <p className="text-gray-500 dark:text-gray-400">Nenhum projeto cadastrado.</p>
                    <p className="text-xs text-gray-400 mt-1">Crie um projeto acima para começar a agrupar seus números.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {projects.map((project) => (
                        <ProjectCard
                            key={project.id}
                            project={project}
                            isExpanded={expandedProjectId === project.id}
                            isEditing={editingProjectId === project.id}
                            editingName={editingName}
                            setEditingName={setEditingName}
                            onStartEdit={handleStartEdit}
                            onCancelEdit={handleCancelEdit}
                            onSaveEdit={handleSaveEdit}
                            onConfirmDelete={confirmDeleteProject}
                            onToggleExpand={handleToggleExpand}
                            isSuperAdmin={isSuperAdmin}
                            clients={clients}
                            selectedClientIds={selectedClientIds}
                            onClientCheckboxChange={handleClientCheckboxChange}
                            onSaveAssociations={handleSaveAssociations}
                            savingAssociations={savingAssociations}
                            getClientProjectName={getClientProjectName}
                        />
                    ))}
                </div>
            )}

            {/* ConfirmModal para Exclusão */}
            <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setProjectToDelete(null);
                }}
                onConfirm={handleDeleteProject}
                title="Confirmar Exclusão do Projeto?"
                message={`Você está prestes a remover o projeto "${projectToDelete?.name}". Todos os clientes associados perderão o vínculo com este projeto (porém NENHUM dado ou cliente será apagado). Esta ação é irreversível.`}
                confirmText="Sim, Excluir Projeto"
                isDangerous={true}
            />
        </div>
    );
};

export default ProjectManager;
