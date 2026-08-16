import React from 'react';
import { createPortal } from 'react-dom';
import { FiUser, FiTag, FiX, FiMaximize2, FiRefreshCw } from 'react-icons/fi';
import { BsJournalText } from 'react-icons/bs';

export default function ChatContactSidebar({
    selectedConvo,
    setSelectedConvo,
    timeLeft24h,
    handleClose24hWindow,
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
    const [isMaximizedOpen, setIsMaximizedOpen] = React.useState(false);
    const [newTagModalData, setNewTagModalData] = React.useState(null);

    React.useEffect(() => {
        if (isMaximizedOpen || newTagModalData?.isOpen) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalOverflow;
            };
        }
    }, [isMaximizedOpen, newTagModalData?.isOpen]);

    const handleTagSubmit = (rawName) => {
        if (!rawName || !rawName.trim()) return;
        const cleanName = rawName.trim().slice(0, 20);
        const existsInAvailable = (availableLabels || []).some(l => l.toLowerCase() === cleanName.toLowerCase());
        if (existsInAvailable) {
            handleAddTagWithName(cleanName);
        } else {
            setNewTagModalData({ isOpen: true, name: cleanName, color: '#3B82F6' });
        }
    };

    return (
        <div className="w-80 border-l border-gray-200 dark:border-white/5 p-6 flex flex-col h-full overflow-y-auto overflow-x-hidden bg-gray-50/50 dark:bg-[#111827]/40 space-y-6 shrink-0 animate-fade-in text-gray-800 dark:text-gray-100">
            {/* Perfil do Contato */}
            <div className="text-center space-y-2 pb-4 border-b border-gray-200 dark:border-white/5">
                <div className="w-16 h-16 bg-blue-600 rounded-full mx-auto flex items-center justify-center text-white text-xl font-bold">
                    {getFirstName(selectedConvo.contact_name || selectedConvo.phone || 'C')[0]}
                </div>
                <div className="font-bold text-gray-800 dark:text-gray-100 text-sm break-words">
                    {selectedConvo.contact_name || 'Sem Nome'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                    {selectedConvo.phone}
                </div>
                <div className="text-[11px] text-gray-400">
                    ID da Conversa: #{selectedConvo.id}
                </div>
                <div className="flex flex-col items-center gap-1.5 mt-1">
                    {(() => {
                        const isWindowClosed = !timeLeft24h || timeLeft24h === 'Janela Fechada' || String(timeLeft24h).toLowerCase().includes('fechada');
                        return (
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                                isWindowClosed
                                    ? 'bg-red-500/15 text-red-500 dark:text-red-400 border-red-500/30'
                                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            }`}>
                                <span className={`w-2 h-2 rounded-full ${isWindowClosed ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'}`} />
                                <span className={isWindowClosed ? 'text-red-500 dark:text-red-400' : ''}>
                                    {isWindowClosed ? 'Janela 24h: Janela Fechada' : `Janela 24h: ${timeLeft24h}`}
                                </span>
                            </div>
                        );
                    })()}
                    {(!timeLeft24h || timeLeft24h !== 'Janela Fechada' && !String(timeLeft24h).toLowerCase().includes('fechada')) && handleClose24hWindow && (
                        <button
                            type="button"
                            onClick={() => handleClose24hWindow(selectedConvo, setSelectedConvo)}
                            className="text-[10px] text-red-500 hover:text-red-600 hover:underline flex items-center gap-1 font-medium transition cursor-pointer mt-0.5"
                            title="Encerrar a janela de 24h deste contato para realizar testes"
                        >
                            🚫 Encerrar Janela 24h (Teste)
                        </button>
                    )}
                </div>
            </div>

            {/* Atribuído A */}
            <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <FiUser size={14} />
                    <span>Atribuído A</span>
                </label>
                <select
                    value={selectedConvo.assigned_to || ''}
                    disabled={isAssigning}
                    onChange={(e) => handleAssignConversation(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-[#1e293b] text-gray-700 dark:text-gray-300 text-xs rounded-xl border border-gray-200 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                    <option value="">Ninguém atribuído</option>
                    {availableAgents.map((ag) => (
                        <option key={ag.id} value={ag.id}>
                            {ag.full_name || ag.email}
                        </option>
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
                                className="text-xs px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 border font-semibold break-words max-w-full leading-tight"
                            >
                                <span className="break-words font-semibold">
                                    {tag} <span className="text-[10px] opacity-70 font-normal">({tag.length})</span>
                                </span>
                                <button
                                    onClick={() => handleRemoveTag(tag)}
                                    style={{ color: labelColor }}
                                    className="opacity-70 hover:opacity-100 hover:scale-110 transition-all shrink-0"
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
                                maxLength={20}
                                placeholder="Pesquisar ou criar marcador..."
                                value={tagSearchQuery}
                                onChange={(e) => {
                                    setTagSearchQuery(e.target.value.slice(0, 20));
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
                                            handleTagSubmit(tagSearchQuery);
                                        }
                                    }
                                }}
                                className="w-full px-3 py-1.5 bg-white dark:bg-[#1e293b] text-gray-700 dark:text-gray-300 text-xs rounded-lg border border-gray-200 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
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
                            onMouseDown={(e) => {
                                e.preventDefault();
                                if (tagSearchQuery.trim()) {
                                    handleTagSubmit(tagSearchQuery);
                                }
                            }}
                            disabled={!tagSearchQuery.trim()}
                            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm shrink-0 cursor-pointer"
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
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                handleTagSubmit(label);
                                            }}
                                            className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium cursor-pointer"
                                        >
                                            <span 
                                                className="w-2 h-2 rounded-full shrink-0" 
                                                style={{ backgroundColor: labelColor }}
                                            />
                                            <span className="break-words flex-1">
                                                {label} <span className="text-[10px] opacity-60 font-normal">({label.length})</span>
                                            </span>
                                        </button>
                                    );
                                })
                            }

                            {tagSearchQuery.trim() && !(availableLabels || []).map(l => l.toLowerCase()).includes(tagSearchQuery.trim().toLowerCase()) && (
                                <button
                                    type="button"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        handleTagSubmit(tagSearchQuery);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold border-t border-gray-100 dark:border-white/5 flex items-center gap-1.5 cursor-pointer"
                                >
                                    <span>+ Criar novo marcador:</span>
                                    <span className="italic pr-2 break-all">"{tagSearchQuery.trim().slice(0, 20)}" ({tagSearchQuery.trim().slice(0, 20).length}/20)</span>
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
                <div className="flex items-center justify-between text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                        <BsJournalText size={14} />
                        <span>Anotação Privada</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsMaximizedOpen(true)}
                        className="p-1 rounded text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all flex items-center gap-1 text-[10px] font-semibold tracking-normal lowercase"
                        title="Maximizar tela para digitar anotação com mais espaço"
                    >
                        <FiMaximize2 size={12} />
                        <span>maximizar</span>
                    </button>
                </div>
                <div className="space-y-2">
                    <textarea
                        value={privateNote}
                        onChange={(e) => setPrivateNote(e.target.value)}
                        placeholder="Escreva uma anotação sobre este contato que só você verá..."
                        className="w-full h-24 px-3 py-2 bg-white dark:bg-[#1e293b] text-gray-700 dark:text-gray-300 text-xs rounded-lg border border-gray-200 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-400 resize-none font-sans"
                    />
                    <button
                        onClick={handleSaveNote}
                        disabled={isSavingNote || !privateNote || !privateNote.trim()}
                        className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                    >
                        {isSavingNote ? <FiRefreshCw className="animate-spin" size={12} /> : null}
                        Salvar Anotação
                    </button>
                </div>
            </div>

            {/* Modal de Maximizar Anotação Privada */}
            {isMaximizedOpen && createPortal(
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-md z-[99999] flex items-center justify-center p-4"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div
                        className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header do Modal */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0f172a]/60">
                            <div className="flex items-center gap-2 font-bold text-gray-800 dark:text-white text-sm">
                                <BsJournalText className="text-amber-500" size={18} />
                                <span>Anotação Privada — {selectedConvo.contact_name || selectedConvo.phone}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsMaximizedOpen(false)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition"
                                title="Fechar modal"
                            >
                                <FiX size={18} />
                            </button>
                        </div>

                        {/* Corpo do Modal com Textarea Ampliado */}
                        <div className="p-6 space-y-3">
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Digite os detalhes da anotação privada abaixo:
                            </label>
                            <textarea
                                value={privateNote}
                                onChange={(e) => setPrivateNote(e.target.value)}
                                placeholder="Escreva detalhes importantes sobre este cliente, instruções para a IA, regras de atendimento ou anotações internas..."
                                className="w-full h-72 px-4 py-3 bg-gray-50 dark:bg-black/30 text-gray-800 dark:text-gray-100 text-xs rounded-xl border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 font-sans resize-y leading-relaxed"
                                autoFocus
                            />
                            <div className="flex justify-between items-center text-[11px] text-gray-400 font-medium">
                                <span>{privateNote ? privateNote.length : 0} caracteres digitados</span>
                                <span>🔒 Visível apenas para a sua equipe</span>
                            </div>
                        </div>

                        {/* Rodapé do Modal */}
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0f172a]/60">
                            <button
                                type="button"
                                onClick={() => setIsMaximizedOpen(false)}
                                className="px-4 py-2 rounded-xl border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-white/5 transition"
                            >
                                Fechar
                            </button>
                            <button
                                type="button"
                                disabled={isSavingNote || !privateNote || !privateNote.trim()}
                                onClick={async () => {
                                    if (!privateNote || !privateNote.trim()) return;
                                    await handleSaveNote();
                                    setIsMaximizedOpen(false);
                                }}
                                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold transition-all flex items-center gap-2 shadow-md hover:shadow-blue-500/20 disabled:cursor-not-allowed"
                            >
                                {isSavingNote ? <FiRefreshCw className="animate-spin" size={14} /> : null}
                                <span>Salvar Anotação</span>
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            {/* Modal de Escolha de Cor para Novo Marcador */}
            {newTagModalData && newTagModalData.isOpen && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div
                        className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0f172a]/60">
                            <div className="flex items-center gap-2 font-bold text-gray-800 dark:text-gray-100 text-sm">
                                <FiTag className="text-blue-500" size={18} />
                                <span>Escolher Cor para Novo Marcador</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setNewTagModalData(null)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition"
                            >
                                <FiX size={18} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 font-sans">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
                                    Nome da Etiqueta (Máx. 20 caracteres)
                                </label>
                                <input
                                    type="text"
                                    maxLength={20}
                                    value={newTagModalData.name}
                                    onChange={(e) => setNewTagModalData(prev => ({ ...prev, name: e.target.value.slice(0, 20) }))}
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-black/30 text-gray-800 dark:text-gray-100 text-xs rounded-xl border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                                />
                                <span className="text-[10px] text-gray-400 mt-1 block text-right">
                                    {newTagModalData.name ? newTagModalData.name.length : 0}/20 caracteres
                                </span>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
                                    Selecione a Cor da Etiqueta
                                </label>
                                <div className="flex flex-wrap gap-2 items-center">
                                    {[
                                        { name: 'Vermelho', value: '#EF4444' },
                                        { name: 'Azul', value: '#3B82F6' },
                                        { name: 'Verde', value: '#10B981' },
                                        { name: 'Amarelo', value: '#F59E0B' },
                                        { name: 'Roxo', value: '#8B5CF6' },
                                        { name: 'Ciano', value: '#06B6D4' },
                                        { name: 'Rosa', value: '#EC4899' },
                                        { name: 'Cinza', value: '#6B7280' }
                                    ].map((preset) => (
                                        <button
                                            key={preset.value}
                                            type="button"
                                            onClick={() => setNewTagModalData(prev => ({ ...prev, color: preset.value }))}
                                            title={preset.name}
                                            className={`w-8 h-8 rounded-full border-2 transition-all relative ${
                                                newTagModalData.color === preset.value
                                                    ? 'border-blue-500 scale-110 shadow-md'
                                                    : 'border-transparent opacity-80 hover:opacity-100 hover:scale-105'
                                            }`}
                                            style={{ backgroundColor: preset.value }}
                                        >
                                            {newTagModalData.color === preset.value && (
                                                <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">✓</span>
                                            )}
                                        </button>
                                    ))}
                                    <div className="relative w-8 h-8 rounded-full overflow-hidden border border-gray-300 dark:border-white/20 hover:scale-105 transition-all">
                                        <input
                                            type="color"
                                            value={newTagModalData.color}
                                            onChange={(e) => setNewTagModalData(prev => ({ ...prev, color: e.target.value }))}
                                            className="absolute -inset-1 cursor-pointer w-12 h-12 p-0 border-0"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                                    Pré-visualização:
                                </label>
                                <span
                                    style={{
                                        color: newTagModalData.color,
                                        borderColor: newTagModalData.color + '33',
                                        backgroundColor: newTagModalData.color + '15'
                                    }}
                                    className="text-xs px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 border font-semibold break-words max-w-full"
                                >
                                    {newTagModalData.name || 'Nova Etiqueta'}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0f172a]/60">
                            <button
                                type="button"
                                onClick={() => setNewTagModalData(null)}
                                className="px-4 py-2 rounded-xl border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-white/5 transition"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                disabled={!newTagModalData.name || !newTagModalData.name.trim()}
                                onClick={async () => {
                                    const finalName = newTagModalData.name.trim().slice(0, 20);
                                    if (!finalName) return;
                                    await handleAddTagWithName(finalName, newTagModalData.color);
                                    setNewTagModalData(null);
                                }}
                                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold transition-all shadow-md"
                            >
                                Criar e Aplicar Marcador
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
