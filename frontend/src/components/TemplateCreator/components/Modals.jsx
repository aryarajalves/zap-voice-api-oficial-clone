import React from 'react';
import { FiFileText, FiMinimize } from 'react-icons/fi';
import ConfirmModal from '../../ConfirmModal';

const Modals = ({ logic }) => {
    const { 
        isDeleteModalOpen, setIsDeleteModalOpen, handleDeleteTemplate, templateToDelete,
        isRemoveButtonModalOpen, setIsRemoveButtonModalOpen, confirmRemoveButton, buttonIndexToRemove, formData,
        isBodyExpanded, setIsBodyExpanded, setFormData
    } = logic;

    return (
        <>
            <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteTemplate}
                title="Excluir Template"
                message={`Tem certeza que deseja excluir o template "${templateToDelete}" da sua conta do WhatsApp? Esta ação não pode ser desfeita e ele será removido da Meta.`}
                confirmText="Excluir Permanentemente"
                isDangerous={true}
            />

            <ConfirmModal
                isOpen={isRemoveButtonModalOpen}
                onClose={() => setIsRemoveButtonModalOpen(false)}
                onConfirm={confirmRemoveButton}
                title="Remover Botão"
                message={`Deseja realmente remover o botão "${formData.buttons[buttonIndexToRemove]?.text || 'sem texto'}"?`}
                confirmText="Excluir Botão"
                isDangerous={true}
            />

            {/* Modal Expansível para o Corpo da Mensagem */}
            {isBodyExpanded && (
                <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-5xl h-full max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl">
                                    <FiFileText size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-xl text-gray-800 dark:text-white">Corpo da Mensagem</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Edição em tela cheia para melhor visualização</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsBodyExpanded(false)}
                                className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl transition-all text-gray-500 hover:text-gray-800 dark:hover:text-white border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
                            >
                                <FiMinimize size={24} />
                            </button>
                        </div>
                        <div className="p-6 flex-1 bg-white dark:bg-gray-800">
                            <textarea
                                className="w-full h-full text-lg p-6 bg-gray-50/50 dark:bg-gray-900/30 text-gray-900 dark:text-gray-100 rounded-2xl border border-gray-200 dark:border-gray-700 focus:ring-4 focus:ring-blue-500/10 outline-none resize-none font-sans leading-relaxed shadow-inner"
                                value={formData.body_text}
                                onChange={(e) => setFormData({ ...formData, body_text: e.target.value })}
                                placeholder="Escreva sua mensagem aqui..."
                                autoFocus
                            />
                        </div>
                        <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/20">
                            <div className="text-xs text-gray-400 font-medium">
                                Use <b>{"{{1}}"}</b>, <b>{"{{2}}"}</b> para variáveis
                            </div>
                            <button
                                onClick={() => setIsBodyExpanded(false)}
                                className="px-10 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all font-bold text-base shadow-lg shadow-blue-500/20 active:scale-95"
                            >
                                Concluir Edição
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Modals;
