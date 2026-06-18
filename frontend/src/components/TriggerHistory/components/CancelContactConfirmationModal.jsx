import React from 'react';
import { FiAlertCircle } from 'react-icons/fi';

const CancelContactConfirmationModal = ({ contact, onClose, onConfirm, isCancelling }) => {
    if (!contact) return null;

    return (
        <div className="fixed inset-0 z-[22000] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[2rem] shadow-2xl border border-gray-150 dark:border-white/5 overflow-hidden flex flex-col p-6 animate-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-4">
                        <FiAlertCircle size={32} />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Parar Funil?</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mt-2">
                        Tem certeza de que deseja parar a execução do funil para o contato <strong className="text-gray-800 dark:text-white">{contact.name || contact.phone}</strong>?
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-550 mt-1">
                        Esta ação cancelará o agendamento atual e interromperá as próximas etapas deste contato.
                    </p>
                </div>
                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onClose}
                        disabled={isCancelling}
                        className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 font-black rounded-xl transition-all uppercase tracking-widest text-xs"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isCancelling}
                        className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-red-600/20"
                    >
                        {isCancelling ? 'Parando...' : 'Confirmar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CancelContactConfirmationModal;
