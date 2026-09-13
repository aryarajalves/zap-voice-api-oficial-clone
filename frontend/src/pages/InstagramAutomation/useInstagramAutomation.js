import {
  useInstagramSettings,
  useInstagramPosts,
  useInstagramLogs,
  useInstagramAutomations
} from './hooks';

export default function useInstagramAutomation(activeClient) {
  const settings = useInstagramSettings(activeClient, (forceHasToken) => {
    posts.fetchInstagramPosts(forceHasToken);
  });

  const posts = useInstagramPosts(activeClient, settings.tokenJaConfigurado);
  const logs = useInstagramLogs(activeClient);
  const automations = useInstagramAutomations(activeClient, () => {
    posts.fetchInstagramPosts();
  });

  return {
    // Lists
    automations: automations.automations,
    funnels: automations.funnels,
    loading: automations.loading,

    // Modal state
    isModalOpen: automations.isModalOpen,
    setIsModalOpen: automations.setIsModalOpen,
    isPostModalOpen: automations.isPostModalOpen,
    setIsPostModalOpen: automations.setIsPostModalOpen,
    isDeleting: automations.isDeleting,
    isSaving: automations.isSaving,

    // Tabs & Logs
    activeTab: logs.activeTab,
    setActiveTab: logs.setActiveTab,
    logs: logs.logs,
    logsLoading: logs.logsLoading,
    logsPage: logs.logsPage,
    setLogsPage: logs.setLogsPage,
    logsTotalPages: logs.logsTotalPages,
    logsTotalItems: logs.logsTotalItems,
    logsStatusFilter: logs.logsStatusFilter,
    setLogsStatusFilter: logs.setLogsStatusFilter,

    // Form
    editingId: automations.editingId,
    name: automations.name,
    setName: automations.setName,
    triggerType: automations.triggerType,
    setTriggerType: automations.setTriggerType,
    keywords: automations.keywords,
    setKeywords: automations.setKeywords,
    actionType: automations.actionType,
    setActionType: automations.setActionType,
    replyComments: automations.replyComments,
    funnelId: automations.funnelId,
    setFunnelId: automations.setFunnelId,
    isActive: automations.isActive,
    setIsActive: automations.setIsActive,
    selectedPostIds: automations.selectedPostIds,
    setSelectedPostIds: automations.setSelectedPostIds,

    // Settings
    instaAccountID: settings.instaAccountID,
    setInstaAccountID: settings.setInstaAccountID,
    instaAccessToken: settings.instaAccessToken,
    setInstaAccessToken: settings.setInstaAccessToken,
    isConfiguringSettings: settings.isConfiguringSettings,
    isSettingsModalOpen: settings.isSettingsModalOpen,
    setIsSettingsModalOpen: settings.setIsSettingsModalOpen,
    tokenJaConfigurado: settings.tokenJaConfigurado,
    showToken: settings.showToken,
    revealingToken: settings.revealingToken,
    tokenRevelado: settings.tokenRevelado,
    webhookBaseUrl: settings.webhookBaseUrl,
    instaWebhookSlug: settings.instaWebhookSlug,
    setInstaWebhookSlug: settings.setInstaWebhookSlug,
    setTokenRevelado: settings.setTokenRevelado,

    // Delete
    deleteModalOpen: automations.deleteModalOpen,
    setDeleteModalOpen: automations.setDeleteModalOpen,
    deleteTarget: automations.deleteTarget,

    // Posts
    instagramPosts: posts.instagramPosts,
    loadingPosts: posts.loadingPosts,
    postsError: posts.postsError,

    // Handlers
    handleOpenNew: automations.handleOpenNew,
    handleOpenEdit: automations.handleOpenEdit,
    handleAddReplyVariation: automations.handleAddReplyVariation,
    handleRemoveReplyVariation: automations.handleRemoveReplyVariation,
    handleReplyChange: automations.handleReplyChange,
    handleSaveAutomation: automations.handleSaveAutomation,
    handleSaveSettings: settings.handleSaveSettings,
    handleRevealToken: settings.handleRevealToken,
    confirmDelete: automations.confirmDelete,
    handleDelete: automations.handleDelete,
    fetchSettings: settings.fetchSettings,
  };
}
