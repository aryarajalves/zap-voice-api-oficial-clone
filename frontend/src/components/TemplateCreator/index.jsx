import React from 'react';
import { Toaster } from 'react-hot-toast';
import { useTemplateCreator } from './hooks/useTemplateCreator';
import TemplateForm from './components/TemplateForm';
import TemplateList from './components/TemplateList';
import Modals from './components/Modals';
import TemplateGuide from './components/TemplateGuide';

const TemplateCreator = ({ onSuccess, refreshKey }) => {
    const logic = useTemplateCreator(onSuccess, refreshKey);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Toaster position="top-right" reverseOrder={false} />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <TemplateForm logic={logic} />
                <TemplateList logic={logic} />
            </div>

            <Modals logic={logic} />
            
            <TemplateGuide 
                isOpen={logic.isGuideOpen} 
                onClose={() => logic.setIsGuideOpen(false)} 
            />

            {/* Overlay de Carregamento Promitente */}
            {logic.loading && (
                <div className="fixed inset-0 z-[10000] bg-black/40 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4 border border-gray-100 dark:border-gray-700">
                        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <div className="text-center">
                            <h3 className="font-bold text-xl text-gray-800 dark:text-white">Enviando template na Meta...</h3>
                            <p className="text-sm text-gray-500 mt-1">Isso pode levar alguns segundos.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TemplateCreator;
