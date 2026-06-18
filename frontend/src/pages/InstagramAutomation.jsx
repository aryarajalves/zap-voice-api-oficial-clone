import { FiPlus, FiTrash2, FiEdit2, FiZap, FiSettings, FiCheckCircle, FiXCircle, FiList, FiClock } from 'react-icons/fi';
import { createPortal } from 'react-dom';
import { useClient } from '../contexts/ClientContext';
import ConfirmModal from '../components/ConfirmModal';
import InstagramLogsTab from './InstagramAutomation/InstagramLogsTab';
import InstagramSettingsModal from './InstagramAutomation/InstagramSettingsModal';
import AutomationFormModal from './InstagramAutomation/AutomationFormModal';
import useInstagramAutomation from './InstagramAutomation/useInstagramAutomation';

export default function InstagramAutomation() {
  const { activeClient } = useClient();
  const state = useInstagramAutomation(activeClient);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-700">
      {/* Banner */}
      <div className="bg-[#1e293b]/80 backdrop-blur-xl rounded-3xl p-6 border border-white/5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 bg-pink-500/10 rounded-2xl flex items-center justify-center text-pink-500 border border-pink-500/20 shadow-[0_0_15px_rgba(236,72,153,0.1)]">
            <FiZap size={24} fill="currentColor" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              Automação de Comentários (Instagram)
            </h2>
            <p className="text-gray-400 text-[11px] font-medium mt-0.5">
              Responda comentários automaticamente e envie mensagens privadas no Direct (DMs).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              state.setInstaAccessToken('');
              state.fetchSettings();
              state.setIsSettingsModalOpen(true);
            }}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-800/50 hover:bg-gray-800 text-gray-300 transition-all font-bold text-[10px] border border-white/5 uppercase tracking-widest"
          >
            <FiSettings size={14} /> Configurações
          </button>
          <button
            onClick={state.handleOpenNew}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white transition-all font-black text-[10px] shadow-lg shadow-pink-600/20 active:scale-95 uppercase tracking-widest"
          >
            <FiPlus size={14} /> Nova Regra
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100 dark:bg-[#1e293b]/40 rounded-2xl w-fit border border-gray-200/50 dark:border-white/5">
        <button
          onClick={() => state.setActiveTab('rules')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
            state.activeTab === 'rules'
              ? 'bg-white dark:bg-[#0f172a] text-pink-500 shadow-md shadow-black/5'
              : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          <FiList size={14} /> Regras de Automação
        </button>
        <button
          onClick={() => state.setActiveTab('logs')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
            state.activeTab === 'logs'
              ? 'bg-white dark:bg-[#0f172a] text-pink-500 shadow-md shadow-black/5'
              : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          <FiClock size={14} /> Histórico / Webhooks
        </button>
      </div>

      {state.activeTab === 'rules' ? (
        <div className="bg-white/50 dark:bg-[#1e293b]/40 rounded-2xl border border-gray-100 dark:border-white/5 backdrop-blur-xl shadow-xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800/50">
                <th className="px-6 py-4 text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Nome</th>
                <th className="px-6 py-4 text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Post ID</th>
                <th className="px-6 py-4 text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Trigger</th>
                <th className="px-6 py-4 text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Ações</th>
                <th className="px-6 py-4 text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] text-right">Opções</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {state.loading ? (
                <tr><td colSpan="5" className="px-6 py-10 text-center text-gray-500 italic">Carregando automações...</td></tr>
              ) : state.automations.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-10 text-center text-gray-500 italic">Nenhuma automação cadastrada.</td></tr>
              ) : state.automations.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.01] transition-all">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-950 dark:text-white">{item.name}</span>
                      {item.is_active ? (
                        <FiCheckCircle className="text-green-500" title="Ativo" />
                      ) : (
                        <FiXCircle className="text-red-500" title="Inativo" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-semibold">
                    {item.post_id === 'all'
                      ? 'Todos os Posts'
                      : item.post_id.split(',').length === 1
                      ? '1 Post específico'
                      : `${item.post_id.split(',').length} Posts específicos`}
                  </td>
                  <td className="px-6 py-4">
                    {item.trigger_type === 'keyword' ? (
                      <span className="px-2.5 py-1 rounded-lg bg-pink-100 dark:bg-pink-950/40 text-pink-700 dark:text-pink-400 text-xs font-bold">
                        Palavra-chave: {item.keywords}
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 text-xs font-bold">
                        Qualquer Comentário
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs font-semibold">
                    {item.action_type === 'both' && 'Responder e Enviar DM'}
                    {item.action_type === 'reply_comment' && 'Apenas Responder'}
                    {item.action_type === 'send_dm' && 'Apenas Enviar DM'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => state.handleOpenEdit(item)} className="p-1.5 text-gray-400 hover:text-blue-500 transition-all" title="Editar"><FiEdit2 size={15} /></button>
                      <button onClick={() => state.confirmDelete(item)} className="p-1.5 text-gray-400 hover:text-red-500 transition-all" title="Excluir"><FiTrash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <InstagramLogsTab
          logsData={state.logs}
          loading={state.logsLoading}
          onRefresh={() => {}}
          page={state.logsPage}
          totalPages={state.logsTotalPages}
          totalItems={state.logsTotalItems}
          onPageChange={state.setLogsPage}
          statusFilter={state.logsStatusFilter}
          onStatusFilterChange={(val) => {
            state.setLogsStatusFilter(val);
            state.setLogsPage(1);
          }}
        />
      )}

      {/* Modal Criar / Editar */}
      <AutomationFormModal
        isOpen={state.isModalOpen}
        onClose={() => state.setIsModalOpen(false)}
        onSubmit={state.handleSaveAutomation}
        isSaving={state.isSaving}
        editingId={state.editingId}
        name={state.name} setName={state.setName}
        selectedPostIds={state.selectedPostIds} setSelectedPostIds={state.setSelectedPostIds}
        triggerType={state.triggerType} setTriggerType={state.setTriggerType}
        keywords={state.keywords} setKeywords={state.setKeywords}
        actionType={state.actionType} setActionType={state.setActionType}
        replyComments={state.replyComments}
        funnelId={state.funnelId} setFunnelId={state.setFunnelId}
        isActive={state.isActive} setIsActive={state.setIsActive}
        onAddReplyVariation={state.handleAddReplyVariation}
        onRemoveReplyVariation={state.handleRemoveReplyVariation}
        onReplyChange={state.handleReplyChange}
        isPostModalOpen={state.isPostModalOpen} setIsPostModalOpen={state.setIsPostModalOpen}
        instagramPosts={state.instagramPosts} loadingPosts={state.loadingPosts} postsError={state.postsError}
        funnels={state.funnels}
      />

      {/* Confirm Delete Modal */}
      {state.deleteModalOpen && createPortal(
        <ConfirmModal
          isOpen={state.deleteModalOpen}
          title="Excluir Automação"
          message={`Deseja realmente apagar a regra de automação "${state.deleteTarget?.name}"? Esta ação não pode ser desfeita.`}
          confirmText="Apagar"
          isDangerous={true}
          onClose={() => state.setDeleteModalOpen(false)}
          onConfirm={state.handleDelete}
        />,
        document.body
      )}

      {/* Settings Modal */}
      <InstagramSettingsModal
        isOpen={state.isSettingsModalOpen}
        onClose={() => state.setIsSettingsModalOpen(false)}
        onSave={async () => { await state.handleSaveSettings(); state.setIsSettingsModalOpen(false); }}
        isSaving={state.isConfiguringSettings}
        instaAccountID={state.instaAccountID} setInstaAccountID={state.setInstaAccountID}
        instaAccessToken={state.instaAccessToken} setInstaAccessToken={state.setInstaAccessToken}
        setTokenRevelado={state.setTokenRevelado}
        tokenJaConfigurado={state.tokenJaConfigurado}
        showToken={state.showToken}
        revealingToken={state.revealingToken}
        onRevealToken={state.handleRevealToken}
        webhookBaseUrl={state.webhookBaseUrl}
        instaWebhookSlug={state.instaWebhookSlug} setInstaWebhookSlug={state.setInstaWebhookSlug}
      />
    </div>
  );
}
