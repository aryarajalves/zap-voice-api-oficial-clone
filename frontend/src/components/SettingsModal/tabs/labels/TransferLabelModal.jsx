import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { FiRepeat, FiArrowRight, FiCheck } from 'react-icons/fi';
import SearchableLabelSelect from './SearchableLabelSelect';

const TransferLabelModal = ({
    labelToTransfer,
    labels = [],
    onClose,
    onConfirm,
    loading = false
}) => {
    const [targetLabel, setTargetLabel] = useState('');
    const [isCustomTarget, setIsCustomTarget] = useState(false);
    const [customTargetName, setCustomTargetName] = useState('');
    const [action, setAction] = useState('move'); // 'move' ou 'copy'

    // Filtra as outras etiquetas disponíveis como destino (exclui a de origem)
    const availableTargets = labels.filter(
        (l) => l.name.toLowerCase() !== labelToTransfer?.name?.toLowerCase()
    );

    useEffect(() => {
        if (labelToTransfer) {
            if (availableTargets.length > 0) {
                setTargetLabel(availableTargets[0].name);
                setIsCustomTarget(false);
            } else {
                setIsCustomTarget(true);
                setTargetLabel('');
            }
            setCustomTargetName('');
            setAction('move');
        }
    }, [labelToTransfer]);

    if (!labelToTransfer) return null;

    const handleConfirmTransfer = () => {
        const finalTarget = isCustomTarget ? customTargetName.trim() : targetLabel.trim();
        if (!finalTarget) return;
        onConfirm(finalTarget, action);
    };

    const finalTargetValue = isCustomTarget ? customTargetName.trim() : targetLabel.trim();
    const isSaveDisabled = loading || !finalTargetValue || finalTargetValue.toLowerCase() === labelToTransfer.name.toLowerCase();

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-white dark:bg-[#1e293b] w-full max-w-md p-6 rounded-3xl shadow-2xl border border-gray-100 dark:border-white/5 animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Ícone e Título */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center shrink-0">
                        <FiRepeat size={20} />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                            Transferir Contatos de Marcador
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Transfira conversas de uma etiqueta para outra.
                        </p>
                    </div>
                </div>

                {/* Marcador de Origem */}
                <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 mb-4">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                        Marcador de Origem
                    </span>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span
                                className="w-3.5 h-3.5 rounded-full shrink-0"
                                style={{ backgroundColor: labelToTransfer.color }}
                            />
                            <span className="text-sm font-bold text-gray-800 dark:text-white">
                                {labelToTransfer.name}
                            </span>
                        </div>
                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full">
                            {labelToTransfer.usage_count === 1
                                ? '1 conversa'
                                : `${labelToTransfer.usage_count || 0} conversas`}
                        </span>
                    </div>
                </div>

                {/* Marcador de Destino */}
                <div className="space-y-2 mb-4">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                        Enviar para qual Marcador?
                    </label>

                    {!isCustomTarget && availableTargets.length > 0 ? (
                        <div className="space-y-2">
                            <SearchableLabelSelect
                                labels={availableTargets}
                                selectedLabel={targetLabel}
                                onSelect={(name) => setTargetLabel(name)}
                                onCreateNew={(initialTerm) => {
                                    setIsCustomTarget(true);
                                    setCustomTargetName(initialTerm || '');
                                }}
                            />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <input
                                type="text"
                                placeholder="Nome do novo marcador..."
                                value={customTargetName}
                                maxLength={20}
                                onChange={(e) => setCustomTargetName(e.target.value.slice(0, 20))}
                                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-white rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {availableTargets.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCustomTarget(false);
                                        setTargetLabel(availableTargets[0].name);
                                    }}
                                    className="text-[11px] text-blue-500 hover:underline font-semibold block"
                                >
                                    ← Escolher marcador existente
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Modo de Ação: Mover vs Copiar */}
                <div className="space-y-2 mb-6">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                        Ação com a Etiqueta de Origem:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => setAction('move')}
                            className={`p-2.5 rounded-xl border text-left transition-all ${
                                action === 'move'
                                    ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold'
                                    : 'border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 text-gray-600 dark:text-gray-400'
                            }`}
                        >
                            <div className="text-xs flex items-center gap-1.5 font-bold">
                                {action === 'move' && <FiCheck size={13} className="shrink-0" />}
                                Mover (Substituir)
                            </div>
                            <span className="text-[10px] block opacity-80 mt-1 leading-tight">
                                Remove "{labelToTransfer.name}" e adiciona a nova etiqueta.
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setAction('copy')}
                            className={`p-2.5 rounded-xl border text-left transition-all ${
                                action === 'copy'
                                    ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold'
                                    : 'border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 text-gray-600 dark:text-gray-400'
                            }`}
                        >
                            <div className="text-xs flex items-center gap-1.5 font-bold">
                                {action === 'copy' && <FiCheck size={13} className="shrink-0" />}
                                Copiar (Adicionar)
                            </div>
                            <span className="text-[10px] block opacity-80 mt-1 leading-tight">
                                Mantém "{labelToTransfer.name}" e adiciona a nova etiqueta.
                            </span>
                        </button>
                    </div>
                </div>

                {/* Botões de Ação */}
                <div className="flex gap-3 justify-end pt-2 border-t border-gray-100 dark:border-white/5">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="px-5 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-sm rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        id="btn-confirm-transfer"
                        onClick={handleConfirmTransfer}
                        disabled={isSaveDisabled}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 shadow-md hover:shadow-lg"
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Transferindo...
                            </>
                        ) : (
                            <>
                                <FiArrowRight size={15} />
                                Transferir Contatos
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default TransferLabelModal;
