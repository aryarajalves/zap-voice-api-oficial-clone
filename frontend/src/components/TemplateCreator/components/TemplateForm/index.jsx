import React from 'react';
import { FiLayout, FiBookOpen, FiCheckCircle } from 'react-icons/fi';
import BasicInfo from './BasicInfo';
import HeaderSection from './HeaderSection';
import BodySection from './BodySection';
import FooterSection from './FooterSection';
import ButtonsSection from './ButtonsSection';

const TemplateForm = ({ logic }) => {
    const { formData, editingId, loading, handleSubmit, setIsGuideOpen, resetForm } = logic;

    return (
        <div id="templateForm" className="lg:col-span-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700 transition-all duration-300">
            <div className="flex items-center justify-between mb-8 border-b border-gray-100 dark:border-gray-700 pb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <FiLayout size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                            {editingId ? 'Editar Template' : 'Criar Novo Template'}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Desenvolva templates de mensagens para a API Oficial do WhatsApp</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setIsGuideOpen(true)}
                        className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-700/50 px-3 py-1.5 rounded-xl transition-all hover:scale-105 shadow-sm"
                        title="Abrir guia de criação de templates"
                    >
                        <FiBookOpen size={14} />
                        Guia
                    </button>
                    {editingId && (
                        <button
                            onClick={resetForm}
                            className="text-xs font-bold text-red-500 hover:underline px-3 py-1 bg-red-50 dark:bg-red-900/20 rounded-lg"
                        >
                            Cancelar Edição
                        </button>
                    )}
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                <BasicInfo logic={logic} />
                <HeaderSection logic={logic} />
                <BodySection logic={logic} />
                <FooterSection logic={logic} />
                <ButtonsSection logic={logic} />

                <div className="flex justify-end gap-4 pt-6 border-t border-gray-100 dark:border-gray-700">
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:scale-100"
                    >
                        {loading ? 'Processando...' : <><FiCheckCircle /> {editingId ? 'Salvar Alterações' : 'Enviar para Aprovação'}</>}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default TemplateForm;
