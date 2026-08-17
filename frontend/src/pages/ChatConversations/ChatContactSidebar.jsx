import React from 'react';
import { FiUser, FiMaximize2, FiRefreshCw, FiTrash2, FiSearch } from 'react-icons/fi';
import { BsJournalText } from 'react-icons/bs';
import ContactProfileCard from './components/ChatContactSidebar/ContactProfileCard';
import ContactTagsSection from './components/ChatContactSidebar/ContactTagsSection';
import ContactMediaSection from './components/ChatContactSidebar/ContactMediaSection';
import ConversationMediaModal from './components/ChatContactSidebar/ConversationMediaModal';
import MaximizedNoteModal from './components/ChatContactSidebar/MaximizedNoteModal';
import NewTagModal from './components/ChatContactSidebar/NewTagModal';
import MessageSearchSidebar from './components/ChatContactSidebar/MessageSearchSidebar';
import ShareContactModal from './components/ShareContactModal';
import MentionTextarea from './components/MentionTextarea';
import { renderConvoMentions } from './utils/convoMentionUtils';

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
    onOpenClearModal,
    mediaData,
    isLoadingMedia,
    isMediaModalOpen,
    setIsMediaModalOpen,
    getFirstName,
    activeClientId,
    conversations = [],
    openConversationById,
    isSearchMode = false,
    setIsSearchMode,
    onSelectMessage
}) {
    const [isMaximizedOpen, setIsMaximizedOpen] = React.useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = React.useState(false);
    const [newTagModalData, setNewTagModalData] = React.useState(null);

    React.useEffect(() => {
        if (isMaximizedOpen || newTagModalData?.isOpen || isMediaModalOpen || isShareModalOpen) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalOverflow;
            };
        }
    }, [isMaximizedOpen, newTagModalData?.isOpen, isMediaModalOpen, isShareModalOpen]);

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

    // Se estiver no modo de busca de mensagens, exibe o painel de pesquisa estilo WhatsApp
    if (isSearchMode) {
        return (
            <div className="w-80 h-full shrink-0">
                <MessageSearchSidebar
                    convoId={selectedConvo.id}
                    activeClientId={activeClientId}
                    onClose={() => setIsSearchMode && setIsSearchMode(false)}
                    onSelectMessage={onSelectMessage}
                />
            </div>
        );
    }

    return (
        <div className="w-80 border-l border-gray-200 dark:border-white/5 p-6 flex flex-col h-full overflow-y-auto overflow-x-hidden bg-gray-50/50 dark:bg-[#111827]/40 space-y-6 shrink-0 animate-fade-in text-gray-800 dark:text-gray-100">
            {/* Perfil do Contato & Janela 24h */}
            <ContactProfileCard
                selectedConvo={selectedConvo}
                setSelectedConvo={setSelectedConvo}
                timeLeft24h={timeLeft24h}
                handleClose24hWindow={handleClose24hWindow}
                getFirstName={getFirstName}
                onShareContact={() => setIsShareModalOpen(true)}
            />

            {/* Botão de Atalho para Pesquisar Mensagens (Estilo WhatsApp) */}
            <button
                type="button"
                onClick={() => setIsSearchMode && setIsSearchMode(true)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#1e293b] hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/5 transition-all text-xs font-semibold text-gray-700 dark:text-gray-200 shadow-sm cursor-pointer group"
            >
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                        <FiSearch size={15} />
                    </div>
                    <span>Pesquisar mensagens</span>
                </div>
                <span className="text-[10px] text-gray-400 font-mono">Buscar</span>
            </button>

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
                    {(availableAgents || []).map((ag) => (
                        <option key={ag.id} value={ag.id}>
                            {ag.full_name || ag.email}
                        </option>
                    ))}
                </select>
            </div>

            {/* Marcadores / Etiquetas */}
            <ContactTagsSection
                labels={selectedConvo.labels || []}
                availableLabels={availableLabels}
                getLabelColor={getLabelColor}
                handleRemoveTag={handleRemoveTag}
                tagSearchQuery={tagSearchQuery}
                setTagSearchQuery={setTagSearchQuery}
                isTagDropdownOpen={isTagDropdownOpen}
                setIsTagDropdownOpen={setIsTagDropdownOpen}
                handleTagSubmit={handleTagSubmit}
            />

            {/* Mídia, links e docs */}
            <ContactMediaSection
                mediaData={mediaData}
                isLoadingMedia={isLoadingMedia}
                onOpenMediaModal={() => setIsMediaModalOpen(true)}
                activeClientId={activeClientId}
            />

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
                        className="p-1 rounded text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all flex items-center gap-1 text-[10px] font-semibold tracking-normal lowercase cursor-pointer"
                        title="Maximizar tela para digitar anotação com mais espaço"
                    >
                        <FiMaximize2 size={12} />
                        <span>maximizar</span>
                    </button>
                </div>
                <div className="space-y-2">
                    <MentionTextarea
                        value={privateNote}
                        onChange={(e) => setPrivateNote(e.target.value)}
                        placeholder="Escreva uma anotação... Digite @ para vincular uma conversa"
                        className="w-full h-24 px-3 py-2 bg-white dark:bg-[#1e293b] text-gray-700 dark:text-gray-300 text-xs rounded-lg border border-gray-200 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-400 resize-none font-sans"
                        conversations={conversations}
                        activeClientId={activeClientId}
                        rows={3}
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

            {/* Botão Limpar Conversa */}
            <div className="pt-1">
                <button
                    type="button"
                    onClick={onOpenClearModal}
                    className="w-full py-2 px-3 rounded-xl border border-red-500/20 hover:border-red-500/40 bg-red-500/5 hover:bg-red-500/10 text-red-500 dark:text-red-400 text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                    <FiTrash2 size={14} />
                    <span>Limpar Conversa</span>
                </button>
            </div>

            {/* Modal de Maximizar Anotação Privada */}
            <MaximizedNoteModal
                isOpen={isMaximizedOpen}
                onClose={() => setIsMaximizedOpen(false)}
                contactName={selectedConvo.contact_name}
                phone={selectedConvo.phone}
                privateNote={privateNote}
                setPrivateNote={setPrivateNote}
                isSavingNote={isSavingNote}
                handleSaveNote={handleSaveNote}
                conversations={conversations}
                openConversationById={openConversationById}
                activeClientId={activeClientId}
            />

            {/* Modal de Mídia, Links e Docs */}
            <ConversationMediaModal
                isOpen={isMediaModalOpen}
                onClose={() => setIsMediaModalOpen(false)}
                contactName={selectedConvo.contact_name}
                mediaData={mediaData}
                isLoading={isLoadingMedia}
                activeClientId={activeClientId}
            />

            {/* Modal de Compartilhar Contato */}
            <ShareContactModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                contactToShare={selectedConvo}
                conversations={conversations}
                activeClientId={activeClientId}
            />

            {/* Modal de Nova Tag */}
            {newTagModalData?.isOpen && (
                <NewTagModal
                    isOpen={newTagModalData.isOpen}
                    onClose={() => setNewTagModalData(null)}
                    tagName={newTagModalData.name}
                    initialColor={newTagModalData.color}
                    onSave={(color) => {
                        handleAddTagWithName(newTagModalData.name, color);
                        setNewTagModalData(null);
                    }}
                />
            )}
        </div>
    );
}
