import React from 'react';
import { FiX, FiCheckCircle, FiSidebar, FiSlash, FiLayers, FiFileText, FiRefreshCw, FiSearch, FiArchive } from 'react-icons/fi';
import { BsPinAngle, BsPinAngleFill, BsExclamationCircle, BsExclamationCircleFill, BsStars } from 'react-icons/bs';
import { getFirstName } from '../../../utils/nameFormatter';

export default function ActiveChatHeader({
    selectedConvo,
    setSelectedConvo,
    showRightSidebar,
    setShowRightSidebar,
    engine,
    handleTogglePin,
    handleToggleUrgent,
    handleUnblockContact,
    setShowFunnelModal,
    exportConversationToDoc,
    activeClientId,
    isOpenAiConfigured,
    isAnalyzingAi,
    handleAnalyzeSingleChatDoubts,
    isSearchMode,
    setIsSearchMode
}) {
    if (!selectedConvo) return null;

    const isWindowClosed = !engine.timeLeft24h || engine.timeLeft24h === 'Janela Fechada' || String(engine.timeLeft24h).toLowerCase().includes('fechada');

    return (
        <div className="p-4 border-b border-gray-200 dark:border-white/5 flex justify-between items-center bg-gray-50/20 dark:bg-[#111827]/20">
            <div>
                <h3 className="font-bold text-gray-800 dark:text-white text-base flex items-center gap-2">
                    {selectedConvo.contact_name ? getFirstName(selectedConvo.contact_name) : selectedConvo.phone}
                    <span className="text-xs font-semibold px-2 py-0.5 bg-gray-200/60 dark:bg-slate-800/80 text-gray-600 dark:text-gray-400 rounded-lg">
                        ID: {selectedConvo.id}
                    </span>
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        {selectedConvo.phone}
                    </span>
                    {!showRightSidebar && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5 border transition-colors ${
                            isWindowClosed
                                ? 'bg-red-500/15 text-red-500 dark:text-red-400 border-red-500/30'
                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                        }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isWindowClosed ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'}`} />
                            <span className={isWindowClosed ? 'text-red-500 dark:text-red-400' : ''}>
                                {isWindowClosed ? 'Janela 24h: Janela Fechada' : `Janela 24h: ${engine.timeLeft24h}`}
                            </span>
                        </span>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={handleTogglePin}
                    title={selectedConvo.pinned ? "Desafixar conversa" : "Fixar conversa"}
                    className={`p-2 rounded-xl border transition-all ${
                        selectedConvo.pinned
                            ? 'bg-blue-600 text-white border-transparent'
                            : 'bg-white dark:bg-[#1e293b] border-gray-200 dark:border-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                >
                    {selectedConvo.pinned ? <BsPinAngleFill size={16} /> : <BsPinAngle size={16} />}
                </button>

                <button
                    onClick={() => {
                        exportConversationToDoc(selectedConvo, engine.messages, activeClientId);
                    }}
                    title="Exportar Conversa (HTML / PDF)"
                    className="p-2 rounded-xl border bg-white dark:bg-[#1e293b] border-gray-200 dark:border-white/5 text-gray-600 dark:text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-800/30 transition-all flex items-center justify-center"
                >
                    <FiFileText size={16} />
                </button>

                {isOpenAiConfigured && (
                    <button
                        onClick={handleAnalyzeSingleChatDoubts}
                        disabled={isAnalyzingAi}
                        title="Analisar dúvidas não respondidas pelo agente nesta conversa (IA)"
                        className="px-3 py-1.5 rounded-xl border bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-300 hover:bg-purple-500/20 hover:border-purple-300 transition-all flex items-center gap-1.5 text-xs font-semibold shadow-sm cursor-pointer disabled:opacity-50"
                    >
                        {isAnalyzingAi ? <FiRefreshCw className="animate-spin" size={14} /> : <BsStars size={14} />}
                        <span>Dúvidas (IA)</span>
                    </button>
                )}

                <button
                    onClick={handleToggleUrgent}
                    title={selectedConvo.urgent ? "Remover urgência" : "Marcar como urgente"}
                    className={`p-2 rounded-xl border transition-all ${
                        selectedConvo.urgent
                            ? 'bg-red-600 text-white border-transparent'
                            : 'bg-white dark:bg-[#1e293b] border-gray-200 dark:border-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                >
                    {selectedConvo.urgent ? <BsExclamationCircleFill size={16} /> : <BsExclamationCircle size={16} />}
                </button>

                {engine.timeLeft24h !== 'Janela Fechada' && (
                    <button
                        onClick={() => setShowFunnelModal(true)}
                        title="Disparar Funil"
                        className="p-2 rounded-xl border bg-white dark:bg-[#1e293b] border-gray-200 dark:border-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                    >
                        <FiLayers size={16} />
                    </button>
                )}

                <button
                    onClick={() => {
                        if (selectedConvo.block_status === 'blocked' || selectedConvo.block_status === 'resting') {
                            handleUnblockContact();
                        } else {
                            engine.setIsBlockModalOpen(true);
                        }
                    }}
                    title={
                        selectedConvo.block_status === 'blocked'
                            ? 'Contato bloqueado permanentemente — clique para desbloquear'
                            : selectedConvo.block_status === 'resting'
                            ? 'Contato em repouso temporário — clique para remover do repouso'
                            : 'Bloquear ou colocar em repouso'
                    }
                    className={`p-2 rounded-xl border transition-all ${
                        selectedConvo.block_status === 'blocked'
                            ? 'bg-red-500/10 border-red-500/30 text-red-500'
                            : selectedConvo.block_status === 'resting'
                            ? 'bg-orange-500/10 border-orange-500/30 text-orange-500'
                            : 'bg-white dark:bg-[#1e293b] border-gray-200 dark:border-white/5 text-gray-600 dark:text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:border-orange-200 dark:hover:border-orange-800/30'
                    }`}
                >
                    <FiSlash size={16} />
                </button>

                <button
                    onClick={engine.handleToggleStatus}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                        selectedConvo.status === 'resolved'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : 'bg-blue-600 text-white border-transparent hover:bg-blue-700'
                    }`}
                >
                    <FiCheckCircle size={14} />
                    {selectedConvo.status === 'resolved' ? 'Resolvida' : 'Resolver'}
                </button>

                <button
                    onClick={() => engine.handleToggleArchive && engine.handleToggleArchive()}
                    title={selectedConvo.status === 'archived' ? "Desarquivar conversa" : "Arquivar conversa"}
                    className={`p-2 rounded-xl border transition-all ${
                        selectedConvo.status === 'archived'
                            ? 'bg-amber-500/20 text-amber-500 dark:text-amber-400 border-amber-500/40 shadow-sm'
                            : 'bg-white dark:bg-[#1e293b] border-gray-200 dark:border-white/5 text-gray-600 dark:text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-200 dark:hover:border-amber-800/30'
                    }`}
                >
                    <FiArchive size={16} />
                </button>

                <button
                    onClick={() => {
                        setShowRightSidebar(true);
                        if (setIsSearchMode) setIsSearchMode(prev => !prev);
                    }}
                    title="Pesquisar mensagens nesta conversa"
                    className={`p-2 rounded-xl border transition-all cursor-pointer ${
                        isSearchMode && showRightSidebar
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                            : 'bg-white dark:bg-[#1e293b] border-gray-200 dark:border-white/5 text-gray-600 dark:text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-200 dark:hover:border-emerald-800/30'
                    }`}
                >
                    <FiSearch size={16} />
                </button>

                <button
                    onClick={() => setShowRightSidebar(!showRightSidebar)}
                    title={showRightSidebar ? "Fechar detalhes" : "Abrir detalhes"}
                    className={`p-2 rounded-xl border transition-all ${
                        showRightSidebar
                            ? 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400'
                            : 'bg-white dark:bg-[#1e293b] border-gray-200 dark:border-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                >
                    <FiSidebar size={16} />
                </button>

                <button
                    onClick={() => setSelectedConvo(null)}
                    title="Fechar conversa"
                    aria-label="Fechar conversa"
                    className="p-2 rounded-xl border transition-all bg-white dark:bg-[#1e293b] border-gray-200 dark:border-white/5 text-gray-600 dark:text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-800/30 flex items-center justify-center"
                >
                    <FiX size={16} />
                </button>
            </div>
        </div>
    );
}
