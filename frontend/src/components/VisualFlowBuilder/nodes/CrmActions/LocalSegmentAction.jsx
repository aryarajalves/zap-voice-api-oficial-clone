import React from 'react';
import { FiPlus } from 'react-icons/fi';

const LocalSegmentAction = ({
    id,
    data,
    action,
    value,
    existingTags,
    showLocalSuggestions,
    setShowLocalSuggestions
}) => {
    if (action === 'block' || action === 'unblock') {
        return (
            <div className="pt-1 border-t border-gray-100 dark:border-gray-700/50">
                <p className="text-[10px] text-gray-400 italic bg-gray-50 dark:bg-gray-900/50 p-2 rounded border border-dashed border-gray-200 dark:border-gray-700">
                    {action === 'block'
                        ? "O número do contato será inserido na Blacklist local do ZapVoice, interrompendo réguas futuras."
                        : "O contato voltará a estar elegível para disparos de novos funis e fluxos no sistema."
                    }
                </p>
            </div>
        );
    }

    if (action === 'add_tag' || action === 'remove_tag') {
        return (
            <div className="flex flex-col gap-1 relative pt-1 border-t border-gray-100 dark:border-gray-700/50">
                <label className="text-[10px] font-bold text-gray-400 uppercase block">Nome da Tag Local</label>
                <input
                    type="text"
                    placeholder="Buscar ou criar tag..."
                    className="nodrag nopan w-full text-xs p-2 border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none border-gray-300 dark:border-gray-700"
                    value={value}
                    onChange={(e) => {
                        data.onChange(id, { value: e.target.value, tagName: e.target.value });
                        setShowLocalSuggestions(true);
                    }}
                    onFocus={() => setShowLocalSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowLocalSuggestions(false), 250)}
                />

                {/* Caixa de Sugestões de Tags */}
                {showLocalSuggestions && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-[50] max-h-[160px] overflow-y-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl nodrag nopan nowheel premium-scrollbar p-1">
                        {existingTags
                            .filter(t => t.toLowerCase().includes((value || '').toLowerCase()))
                            .map((tag) => (
                                <button
                                    key={tag}
                                    type="button"
                                    onClick={() => {
                                        data.onChange(id, { value: tag, tagName: tag });
                                        setShowLocalSuggestions(false);
                                    }}
                                    className="w-full text-left text-xs px-2.5 py-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-gray-700 dark:text-gray-200 rounded-md transition cursor-pointer font-medium"
                                >
                                    🏷️ {tag}
                                </button>
                            ))}

                        {value.trim() !== '' && !existingTags.some(t => t.toLowerCase() === value.trim().toLowerCase()) && (
                            <button
                                type="button"
                                onClick={() => {
                                    data.onChange(id, { value: value.trim(), tagName: value.trim() });
                                    setShowLocalSuggestions(false);
                                }}
                                className="w-full text-left text-xs px-2.5 py-1.5 hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400 border-t border-dashed border-gray-100 dark:border-gray-800 rounded-md transition cursor-pointer font-bold flex items-center gap-1.5"
                            >
                                <FiPlus size={12} /> Criar tag "{value.trim()}"
                            </button>
                        )}
                    </div>
                )}
            </div>
        );
    }

    return null;
};

export default LocalSegmentAction;
