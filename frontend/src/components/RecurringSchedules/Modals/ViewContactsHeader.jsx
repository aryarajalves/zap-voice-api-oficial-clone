import React from 'react';
import { FiUsers, FiRefreshCw, FiX } from 'react-icons/fi';

export const ViewContactsHeader = ({
    viewingContacts,
    onClose,
    onRefreshContacts,
    isRefreshing,
    onRefresh
}) => {
    return (
        <div className="p-8 border-b border-white/5 flex items-center justify-between">
            <div>
                <h3 className="text-2xl font-black text-white flex items-center gap-3">
                    <FiUsers className="text-blue-400" />
                    Público Alvo
                </h3>
                <p className="text-slate-400 text-xs mt-1">
                    {viewingContacts.mode === 'tag' 
                        ? `Contatos atuais com a etiqueta: ${viewingContacts.tag}` 
                        : 'Lista estática de destinatários'}
                </p>
            </div>
            <div className="flex items-center gap-2">
                {onRefreshContacts && (
                    <button 
                        type="button"
                        onClick={onRefresh}
                        disabled={isRefreshing}
                        className="p-3 hover:bg-white/5 rounded-2xl transition-colors flex items-center gap-2 text-slate-400 hover:text-white cursor-pointer"
                        title="Atualizar contatos da lista"
                    >
                        <FiRefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
                    </button>
                )}
                <button 
                    type="button"
                    onClick={onClose} 
                    className="p-3 hover:bg-white/5 rounded-2xl transition-colors cursor-pointer"
                    aria-label="Fechar"
                >
                    <FiX className="text-slate-400" />
                </button>
            </div>
        </div>
    );
};
