import React from 'react';

/**
 * Shown instead of a page when pages_status[key].built === false.
 * Displays the page name, a progress bar, and the completion percentage.
 */
const PageUnderConstruction = ({ pageName = 'Esta página', percentage = 0 }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] select-none">
            {/* Blurred decorative background blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-400 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-400 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 text-center space-y-6 p-10 max-w-sm">
                {/* Icon */}
                <div className="w-20 h-20 mx-auto rounded-3xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center shadow-inner">
                    <span className="text-4xl">🚧</span>
                </div>

                {/* Text */}
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{pageName}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                        Esta página ainda está sendo configurada pela equipe.
                        <br />
                        Em breve estará disponível para você!
                    </p>
                </div>

                {/* Progress */}
                <div className="w-full space-y-2">
                    <div className="flex items-center justify-between text-sm font-bold">
                        <span className="text-gray-500 dark:text-gray-400">Progresso</span>
                        <span className="text-blue-600 dark:text-blue-400">{percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 shadow-inner">
                        <div
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 shadow-sm"
                            style={{ width: `${Math.max(percentage, 2)}%` }}
                        />
                    </div>
                    {percentage > 0 && percentage < 100 && (
                        <p className="text-[11px] text-gray-400 italic">
                            {percentage < 30 ? 'Iniciando configurações...' :
                             percentage < 60 ? 'Configurando recursos...' :
                             percentage < 90 ? 'Quase pronto...' :
                             'Toques finais...'}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PageUnderConstruction;
