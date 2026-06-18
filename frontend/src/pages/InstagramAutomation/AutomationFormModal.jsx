import { createPortal } from 'react-dom';
import { FiTrash2 } from 'react-icons/fi';
import PostSelectorModal from './PostSelectorModal';

export default function AutomationFormModal({
  isOpen,
  onClose,
  onSubmit,
  isSaving,
  editingId,
  // Form fields
  name, setName,
  selectedPostIds, setSelectedPostIds,
  triggerType, setTriggerType,
  keywords, setKeywords,
  actionType, setActionType,
  replyComments,
  funnelId, setFunnelId,
  isActive, setIsActive,
  // Handlers
  onAddReplyVariation,
  onRemoveReplyVariation,
  onReplyChange,
  // Posts
  isPostModalOpen, setIsPostModalOpen,
  instagramPosts, loadingPosts, postsError,
  funnels,
}) {
  if (!isOpen) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 99999, width: '100vw', height: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem', backgroundColor: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(4px)'
      }}
    >
      <div className="w-full max-w-xl bg-white dark:bg-[#1e293b] rounded-3xl shadow-2xl border border-gray-100 dark:border-white/5 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {editingId ? 'Editar Regra de Automação' : 'Nova Regra de Automação'}
          </h3>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div>
            <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Nome da Automação</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Campanha Desconto"
              className="w-full px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-transparent focus:border-pink-500 outline-none text-sm font-semibold transition-all text-gray-950 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Posts do Instagram</label>
            {postsError && <div className="text-xs text-red-500 py-1 mb-1">{postsError}</div>}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsPostModalOpen(true)}
                className="w-full text-left px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-transparent focus:border-pink-500 outline-none text-sm font-semibold transition-all text-gray-950 dark:text-white flex justify-between items-center hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <span>
                  {selectedPostIds.includes('all')
                    ? 'Todos os Posts (Qualquer Post)'
                    : selectedPostIds.length === 1 ? '1 post selecionado'
                    : `${selectedPostIds.length} posts selecionados`}
                </span>
                <span className="px-2.5 py-1 rounded bg-pink-500/10 text-pink-500 text-[10px] font-black uppercase tracking-wider">Selecionar</span>
              </button>

              <PostSelectorModal
                isOpen={isPostModalOpen}
                onClose={() => setIsPostModalOpen(false)}
                posts={instagramPosts}
                selectedIds={selectedPostIds}
                onSelect={setSelectedPostIds}
                loading={loadingPosts}
                error={postsError}
              />
            </div>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 block">Clique para ver e selecionar um ou múltiplos posts no grid do Instagram.</span>
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Tipo de Gatilho</label>
            <select
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-transparent focus:border-pink-500 outline-none text-sm font-semibold transition-all text-gray-950 dark:text-white"
            >
              <option value="keyword">Palavra-chave (Keyword)</option>
              <option value="any_comment">Qualquer comentário</option>
            </select>
          </div>

          {triggerType === 'keyword' && (
            <div>
              <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Palavras-chave Gatilho</label>
              <input
                type="text"
                required
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="Ex: quero, cupom, desconto"
                className="w-full px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-transparent focus:border-pink-500 outline-none text-sm font-semibold transition-all text-gray-950 dark:text-white"
              />
              <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 block">Separe múltiplas palavras-chave por vírgula.</span>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Ação ao Receber Comentário</label>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-transparent focus:border-pink-500 outline-none text-sm font-semibold transition-all text-gray-950 dark:text-white"
            >
              <option value="both">Responder Comentário e Enviar Mensagem Privada (DM)</option>
              <option value="reply_comment">Apenas responder comentário com mensagem pública</option>
              <option value="send_dm">Apenas enviar mensagem privada no Direct (DM)</option>
            </select>
          </div>

          {actionType !== 'send_dm' && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">Variações de Resposta (Comentários)</label>
                <button type="button" onClick={onAddReplyVariation} className="text-[9px] font-bold text-pink-500 hover:underline">
                  + Adicionar Variação
                </button>
              </div>
              {replyComments.map((reply, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <input
                    type="text"
                    required
                    value={reply}
                    onChange={(e) => onReplyChange(index, e.target.value)}
                    placeholder={`Resposta #${index + 1}`}
                    className="flex-1 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 border border-transparent focus:border-pink-500 outline-none text-sm font-semibold transition-all text-gray-950 dark:text-white"
                  />
                  {replyComments.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onRemoveReplyVariation(index)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
              <span className="text-[10px] text-gray-400 dark:text-gray-500 block">Use várias opções de frases diferentes para diminuir as chances de bloqueio do Instagram.</span>
            </div>
          )}

          {actionType !== 'reply_comment' && (
            <div>
              <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Funil do ZapVoice (Disparo no Direct)</label>
              <select
                value={funnelId}
                onChange={(e) => setFunnelId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-transparent focus:border-pink-500 outline-none text-sm font-semibold transition-all text-gray-950 dark:text-white"
              >
                <option value="">Nenhum - Enviar mensagem padrão</option>
                {funnels.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 block">A primeira mensagem de texto deste funil será enviada ao direct do usuário.</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-pink-600 rounded"
            />
            <label htmlFor="is_active" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Automação Ativa</label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-xs font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-850 transition-all uppercase tracking-wider"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-pink-600/10 uppercase tracking-wider"
            >
              {isSaving ? 'Salvando...' : 'Salvar Automação'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
