import React from 'react';
import { createPortal } from 'react-dom';
import { FiZap, FiX } from 'react-icons/fi';

const QuickMessageFormModal = ({
    isOpen,
    editingItem,
    formShortcut,
    setFormShortcut,
    formTitle,
    setFormTitle,
    formContent,
    setFormContent,
    isSaving,
    onInsertVariable,
    onSave,
    onClose
}) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#111827] text-gray-800 dark:text-gray-100 w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
                    <h4 className="text-sm font-bold flex items-center gap-2">
                        <FiZap className="text-emerald-500" />
                        <span>{editingItem ? 'Editar Mensagem Rápida' : 'Nova Mensagem Rápida'}</span>
                    </h4>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-white rounded-lg cursor-pointer"
                    >
                        <FiX size={18} />
                    </button>
                </div>

                <form onSubmit={onSave} className="p-5 space-y-4">
                    <div>
                        <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                            Atalho (Gatilho da Barra) *
                        </label>
                        <div className="relative flex items-center">
                            <span className="absolute left-3 font-mono font-bold text-emerald-500 text-sm">/</span>
                            <input
                                type="text"
                                value={formShortcut}
                                onChange={(e) => setFormShortcut(e.target.value.replace(/\s+/g, ''))}
                                placeholder="ex: pix, ola, horario, suporte"
                                required
                                className="w-full pl-7 pr-3 py-2 bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-mono text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                            />
                        </div>
                        <span className="text-[10px] text-gray-400 mt-0.5 block">Digite apenas a palavra-chave (sem espaços).</span>
                    </div>

                    <div>
                        <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                            Título da Mensagem *
                        </label>
                        <input
                            type="text"
                            value={formTitle}
                            onChange={(e) => setFormTitle(e.target.value)}
                            placeholder="ex: Chave PIX e Instruções"
                            required
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Conteúdo da Mensagem *
                            </label>
                            <div className="flex items-center gap-1 text-[10px]">
                                <span className="text-gray-400">Inserir tag:</span>
                                <button
                                    type="button"
                                    onClick={() => onInsertVariable('nome')}
                                    className="px-1.5 py-0.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded font-mono font-medium cursor-pointer"
                                >
                                    {'{nome}'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onInsertVariable('primeiro_nome')}
                                    className="px-1.5 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded font-mono font-medium cursor-pointer"
                                >
                                    {'{primeiro_nome}'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onInsertVariable('telefone')}
                                    className="px-1.5 py-0.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded font-mono font-medium cursor-pointer"
                                >
                                    {'{telefone}'}
                                </button>
                            </div>
                        </div>
                        <textarea
                            value={formContent}
                            onChange={(e) => setFormContent(e.target.value)}
                            rows={5}
                            placeholder="Digite o texto da mensagem que será inserido no chat..."
                            required
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none leading-relaxed"
                        />
                    </div>

                    <div className="pt-3 border-t border-gray-100 dark:border-white/10 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSaving}
                            className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-white rounded-xl transition cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
                        >
                            {isSaving ? 'Salvando...' : 'Salvar Mensagem'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default QuickMessageFormModal;
