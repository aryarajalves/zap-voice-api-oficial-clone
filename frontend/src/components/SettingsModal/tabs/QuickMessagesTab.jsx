import React from 'react';
import { FiPlus, FiSearch, FiZap } from 'react-icons/fi';
import {
    useQuickMessagesTab,
    QuickMessagesList,
    QuickMessageFormModal,
    QuickMessageDeleteModal
} from './QuickMessages';

const QuickMessagesTab = ({ user, activeClient }) => {
    const {
        search,
        setSearch,
        loadingList,
        page,
        setPage,
        totalPages,
        filteredMessages,
        paginatedMessages,
        isFormModalOpen,
        setIsFormModalOpen,
        editingItem,
        formShortcut,
        setFormShortcut,
        formTitle,
        setFormTitle,
        formContent,
        setFormContent,
        isSaving,
        handleOpenCreate,
        handleOpenEdit,
        handleInsertVariable,
        handleSave,
        itemToDelete,
        setItemToDelete,
        isDeleting,
        handleDelete
    } = useQuickMessagesTab({ user, activeClient });

    return (
        <div className="space-y-6">
            {/* Header com Info e Botão Novo */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-white/5">
                <div>
                    <h3 className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <FiZap className="text-amber-500" />
                        <span>Mensagens Rápidas</span>
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Cadastre mensagens padrão para disparar no chat digitando uma barra <span className="font-mono text-emerald-500 font-semibold bg-emerald-500/10 px-1 py-0.5 rounded">/</span> seguida do atalho.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleOpenCreate}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
                >
                    <FiPlus size={16} />
                    <span>Nova Mensagem</span>
                </button>
            </div>

            {/* Campo de Busca */}
            <div className="relative flex items-center">
                <FiSearch className="absolute left-3.5 text-gray-400" size={16} />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Pesquisar por atalho, título ou conteúdo..."
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                />
            </div>

            {/* Listagem com Scroll e Paginação */}
            <QuickMessagesList
                loadingList={loadingList}
                filteredMessages={filteredMessages}
                paginatedMessages={paginatedMessages}
                page={page}
                totalPages={totalPages}
                onEdit={handleOpenEdit}
                onDelete={setItemToDelete}
                onPageChange={setPage}
            />

            {/* Modal de Criação / Edição */}
            <QuickMessageFormModal
                isOpen={isFormModalOpen}
                editingItem={editingItem}
                formShortcut={formShortcut}
                setFormShortcut={setFormShortcut}
                formTitle={formTitle}
                setFormTitle={setFormTitle}
                formContent={formContent}
                setFormContent={setFormContent}
                isSaving={isSaving}
                onInsertVariable={handleInsertVariable}
                onSave={handleSave}
                onClose={() => setIsFormModalOpen(false)}
            />

            {/* Modal de Confirmação de Deleção */}
            <QuickMessageDeleteModal
                itemToDelete={itemToDelete}
                isDeleting={isDeleting}
                onConfirm={handleDelete}
                onClose={() => setItemToDelete(null)}
            />
        </div>
    );
};

export default QuickMessagesTab;
