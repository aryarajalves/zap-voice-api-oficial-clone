import React from 'react';
import { FiUser, FiTag, FiX } from 'react-icons/fi';
import { BsJournalText } from 'react-icons/bs';

export default function ChatContactSidebar({
    selectedConvo,
    timeLeft24h,
    isAssigning,
    availableAgents,
    handleAssignConversation,
    availableLabels,
    getLabelColor,
    handleRemoveTag,
    tagSearchQuery,
    setTagSearchQuery,
    isTagDropdownOpen,
    setIsTagDropdownOpen,
    handleAddTagWithName,
    privateNote,
    setPrivateNote,
    isSavingNote,
    handleSaveNote,
    getFirstName
}) {
    return (
        <div className="w-80 border-l border-gray-200 dark:border-white/5 p-6 flex flex-col h-full overflow-y-auto overflow-x-hidden bg-gray-50/50 dark:bg-[#111827]/40 space-y-6 shrink-0 animate-fade-in text-gray-800 dark:text-gray-100">
            {/* Perfil do Contato */}
            <div className="text-center space-y-2 pb-4 border-b border-gray-200 dark:border-white/5">
                <div className="w-16 h-16 bg-blue-600 rounded-full mx-auto flex items-center justify-center text-white text-xl font-bold">
                    {selectedConvo.contact_name ? selectedConvo.contact_name[0].toUpperCase() : 'C'}
                </div>
                <div>
                    <h4 className="font-bold text-gray-800 dark:text-white">
                        {selectedConvo.contact_name ? getFirstName(selectedConvo.contact_name) : 'Contato'}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{selectedConvo.phone}</p>
                    <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 mt-1">ID da Conversa: #{selectedConvo.id}</p>
                    <div className="flex justify-center pt-1.5">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 border transition-all ${
                            timeLeft24h === 'Janela Fechada'
                            ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                        }`}>
                            {timeLeft24h === 'Janela Fechada' ? '🔴 Janela Fechada' : `🟢 Janela 24h: ${timeLeft24h}`}
                        </span>
                    </div>
                </div>
            </div>

            {/* Atribuição de Atendente */}
            <div className="space-y-2 pb-4 border-b border-gray-200 dark:border-white/5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <FiUser size={14} />
                    <span>Atribuído a</span>
                </div>
                <select
                    value={selectedConvo.assigned_user_id || ''}
                    disabled={isAssigning}
                    onChange={(e) => handleAssignConversation(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-[#1e293b] text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-lg border border-gray-200 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                >
                    <option value="">Ninguém atribuído</option>
                    {availableAgents.map(agent => (
                        <option key={agent.id} value={agent.id}>{agent.full_name}</option>
                    ))}
                </select>
            </div>

            {/* Marcadores / Etiquetas */}
            <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <FiTag size={14} />
                    <span>Marcadores</span>
                </div>

                {/* Lista de etiquetas */}
                <div className="flex flex-wrap gap-1.5">
                    {(selectedConvo.labels || []).map((tag) => {
                        const labelColor = getLabelColor(tag);
                        return (
                            <span
                                key={tag}
                                style={{
                                    color: labelColor,
                                    borderColor: labelColor + '33',
                                    backgroundColor: labelColor + '15'
                                }}
                                className="text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 border font-semibold"
                            >
                                {tag}
                                <button
                                    onClick={() => handleRemoveTag(tag)}
                                    style={{ color: labelColor }}
                                    className="opacity-70 hover:opacity-100 hover:scale-110 transition-all"
                                >
                                    <FiX size={12} />
                                </button>
                            </span>
                        );
                    })}
                    {(selectedConvo.labels || []).length === 0 && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                            Nenhum marcador aplicado.
                        </span>
                    )}
                </div>

                {/* Dropdown com Busca / Filtro */}
                <div className="relative mt-2">
                    <div className="flex gap-1.5">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                placeholder="Pesquisar ou criar marcador..."
                                value={tagSearchQuery}
                                onChange={(e) => {
                                    setTagSearchQuery(e.target.value);
                                    setIsTagDropdownOpen(true);
                                }}
                                onFocus={() => setIsTagDropdownOpen(true)}
                                onBlur={() => {
                                    setTimeout(() => setIsTagDropdownOpen(false), 200);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (tagSearchQuery.trim()) {
                                            handleAddTagWithName(tagSearchQuery.trim());
                                        }
                                    }
                                }}
                                className="w-full px-3 py-1.5 bg-white dark:bg-[#1e293b] text-gray-700 dark:text-gray-300 text-xs rounded-lg border border-gray-200 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            {tagSearchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setTagSearchQuery('')}
                                    className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                >
                                    <FiX size={12} />
                                </button>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                if (tagSearchQuery.trim()) {
                                    handleAddTagWithName(tagSearchQuery.trim());
                                }
                            }}
                            disabled={!tagSearchQuery.trim()}
                            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm shrink-0"
                        >
                            Adicionar
                        </button>
                    </div>

                    {isTagDropdownOpen && (
                        <div className="absolute z-20 w-full mt-1 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-white/10 rounded-lg shadow-lg max-h-48 overflow-y-auto overflow-x-hidden py-1">
                            {(availableLabels || [])
                                .filter(label => 
                                    !(selectedConvo.labels || []).map(l => l.toLowerCase()).includes(label.toLowerCase()) &&
                                    label.toLowerCase().includes(tagSearchQuery.toLowerCase())
                                )
                                .map(label => {
                                    const labelColor = getLabelColor(label);
                                    return (
                                        <button
                                            key={label}
                                            type="button"
                                            onMouseDown={() => {
                                                handleAddTagWithName(label);
                                            }}
                                            className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium"
                                        >
                                            <span 
                                                className="w-2 h-2 rounded-full shrink-0" 
                                                style={{ backgroundColor: labelColor }}
                                            />
                                            <span className="truncate flex-1">{label}</span>
                                        </button>
                                    );
                                })
                            }

                            {tagSearchQuery.trim() && !(availableLabels || []).map(l => l.toLowerCase()).includes(tagSearchQuery.trim().toLowerCase()) && (
                                <button
                                    type="button"
                                    onMouseDown={() => {
                                        handleAddTagWithName(tagSearchQuery.trim());
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold border-t border-gray-100 dark:border-white/5 flex items-center gap-1.5"
                                >
                                    <span>+ Criar novo marcador:</span>
                                    <span className="italic pr-2 truncate">"{tagSearchQuery.trim()}"</span>
                                </button>
                            )}

                            {!tagSearchQuery.trim() && (availableLabels || []).filter(label => !(selectedConvo.labels || []).map(l => l.toLowerCase()).includes(label.toLowerCase())).length === 0 && (
                                <div className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500 italic text-center">
                                    Nenhum outro marcador disponível.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Notas Privadas */}
            <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-white/5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <BsJournalText size={14} />
                    <span>Anotação Privada</span>
                </div>
                <div className="space-y-2">
                    <textarea
                        value={privateNote}
                        onChange={(e) => setPrivateNote(e.target.value)}
                        placeholder="Escreva uma anotação sobre este contato que só você verá..."
                        className="w-full h-24 px-3 py-2 bg-white dark:bg-[#1e293b] text-gray-700 dark:text-gray-300 text-xs rounded-lg border border-gray-200 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-400 resize-none"
                    />
                    <button
                        onClick={handleSaveNote}
                        disabled={isSavingNote}
                        className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1"
                    >
                        {isSavingNote ? <FiX className="animate-spin" size={12} /> : null}
                        Salvar Anotação
                    </button>
                </div>
            </div>
        </div>
    );
}
