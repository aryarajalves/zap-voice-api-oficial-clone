import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../config';
import { fetchWithAuth } from '../AuthContext';
import { useAuth } from '../AuthContext';
import { useClient } from '../contexts/ClientContext';

export function useAppLogic() {
    const { user, logout } = useAuth();
    const { activeClient } = useClient();

    // View State
    const [currentView, setCurrentView] = useState(localStorage.getItem('currentView') || 'bulk_sender');

    // Funnel States
    const [funnels, setFunnels] = useState([]);
    const [showBuilder, setShowBuilder] = useState(false);
    const [selectedFunnel, setSelectedFunnel] = useState(null);
    const [editingFunnel, setEditingFunnel] = useState(null);

    // Modal States
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [funnelToDelete, setFunnelToDelete] = useState(null);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [selectedFunnelIds, setSelectedFunnelIds] = useState([]);
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
    const [isGlobalsModalOpen, setIsGlobalsModalOpen] = useState(false);
    const [isLabelsModalOpen, setIsLabelsModalOpen] = useState(false);
    
    // Guide States
    const [isFunnelGuideOpen, setIsFunnelGuideOpen] = useState(false);
    const [isScheduleGuideOpen, setIsScheduleGuideOpen] = useState(false);
    const [isHistoryGuideOpen, setIsHistoryGuideOpen] = useState(false);
    const [isBlockedGuideOpen, setIsBlockedGuideOpen] = useState(false);

    // Refresh Keys
    const [triggerHistoryRefreshKey, setTriggerHistoryRefreshKey] = useState(0);
    const [settingsRefreshKey, setSettingsRefreshKey] = useState(0);
    const [isTriggerModalOpen, setIsTriggerModalOpen] = useState(false);

    // Branding State
    const [clientName, setClientName] = useState('');
    const [appBranding, setAppBranding] = useState({ name: 'ZapVoice', logo: null, logoSize: 'medium' });

    const fetchSettings = useCallback(async () => {
        if (!activeClient) return;
        try {
            const res = await fetchWithAuth(`${API_URL}/settings/`, {}, activeClient.id);
            if (res.ok) {
                const data = await res.json();
                if (data.CLIENT_NAME) {
                    setClientName(data.CLIENT_NAME);
                }
                setAppBranding({
                    name: data.APP_NAME || 'ZapVoice',
                    logo: data.APP_LOGO || null,
                    logoSize: data.APP_LOGO_SIZE || 'medium'
                });
            }
        } catch (err) {
            console.error("Erro ao buscar configurações:", err);
        }
    }, [activeClient]);

    const fetchFunnels = useCallback(async () => {
        if (!activeClient) return;
        try {
            const res = await fetchWithAuth(`${API_URL}/funnels`, {}, activeClient.id);
            const data = await res.json();
            if (Array.isArray(data)) {
                setFunnels(data);
            } else {
                console.error("Formato inesperado de funis:", data);
                setFunnels([]);
            }
        } catch (err) {
            console.error("Erro ao buscar funis:", err);
            toast.error("Erro ao carregar funis.");
        }
    }, [activeClient]);

    useEffect(() => {
        if (activeClient) {
            fetchFunnels();
            fetchSettings();
        }
    }, [activeClient, settingsRefreshKey, fetchFunnels, fetchSettings]);

    useEffect(() => {
        if (appBranding.name) {
            document.title = `${appBranding.name} - Chatwoot Automation`;
        }
    }, [appBranding]);

    useEffect(() => {
        localStorage.setItem('currentView', currentView);
    }, [currentView]);

    useEffect(() => {
        if (user && user.role === 'user') {
            const allowedViews = ['history', 'schedules'];
            if (!allowedViews.includes(currentView)) {
                setCurrentView('history');
            }
        }
    }, [user, currentView]);

    const handleCreateFunnel = async () => {
        const loadingToast = toast.loading("Criando novo funil...");
        try {
            const res = await fetchWithAuth(`${API_URL}/funnels`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: `Novo Funil ${new Date().toLocaleString()}`,
                    description: "Criado via Visual Builder",
                    steps: []
                })
            }, activeClient?.id);

            if (res.ok) {
                const newFunnel = await res.json();
                setEditingFunnel(newFunnel);
                setShowBuilder(true);
                toast.dismiss(loadingToast);
                toast.success("Funil criado! Pode editar.");
            } else {
                throw new Error("Erro ao criar funil inicial");
            }
        } catch (e) {
            console.error(e);
            toast.dismiss(loadingToast);
            toast.error("Erro ao iniciar novo funil");
        }
    };

    const handleEdit = (funnel, e) => {
        if (e) e.stopPropagation();
        setEditingFunnel(funnel);
        setShowBuilder(true);
        setSelectedFunnel(null);
    };

    const confirmDelete = (funnelId, e) => {
        if (e) e.stopPropagation();
        setFunnelToDelete(funnelId);
        setIsDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        if (!funnelToDelete) return;
        const loadingToast = toast.loading("Excluindo funil...");
        try {
            const res = await fetchWithAuth(`${API_URL}/funnels/${funnelToDelete}`, {
                method: 'DELETE'
            }, activeClient?.id);
            if (res.ok) {
                fetchFunnels();
                if (selectedFunnel?.id === funnelToDelete) setSelectedFunnel(null);
                if (editingFunnel?.id === funnelToDelete) {
                    setEditingFunnel(null);
                    setShowBuilder(false);
                }
                setIsDeleteModalOpen(false);
                toast.dismiss(loadingToast);
                toast.success("Funil excluído.");
            } else {
                throw new Error("Erro ao excluir");
            }
        } catch (err) {
            console.error("Erro ao excluir funil:", err);
            toast.dismiss(loadingToast);
            toast.error("Erro ao excluir funil.");
        }
    };

    const toggleFunnelSelection = (funnelId, e) => {
        if (e) e.stopPropagation();
        setSelectedFunnelIds(prev =>
            prev.includes(funnelId)
                ? prev.filter(id => id !== funnelId)
                : [...prev, funnelId]
        );
    };

    const handleBulkDelete = async () => {
        if (selectedFunnelIds.length === 0) return;
        const loadingToast = toast.loading(`Excluindo ${selectedFunnelIds.length} funis...`);
        try {
            const res = await fetchWithAuth(`${API_URL}/funnels/bulk`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ funnel_ids: selectedFunnelIds }),
            }, activeClient?.id);

            if (res.ok) {
                fetchFunnels();
                const deletedIds = new Set(selectedFunnelIds);
                if (selectedFunnel && deletedIds.has(selectedFunnel.id)) setSelectedFunnel(null);
                if (editingFunnel && deletedIds.has(editingFunnel.id)) {
                    setEditingFunnel(null);
                    setShowBuilder(false);
                }
                setSelectedFunnelIds([]);
                setIsBulkDeleteModalOpen(false);
                toast.dismiss(loadingToast);
                toast.success("Funis excluídos com sucesso.");
            } else {
                throw new Error("Erro ao excluir funis");
            }
        } catch (err) {
            console.error("Erro ao excluir funis:", err);
            toast.dismiss(loadingToast);
            toast.error("Erro ao excluir funis.");
        }
    };

    const toggleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedFunnelIds(funnels.map(f => f.id));
        } else {
            setSelectedFunnelIds([]);
        }
    };

    const handleViewChange = (view) => {
        setCurrentView(view);
        setShowBuilder(false);
        setEditingFunnel(null);
    };

    return {
        user, logout, activeClient,
        currentView, setCurrentView,
        funnels, showBuilder, setShowBuilder,
        selectedFunnel, setSelectedFunnel,
        editingFunnel, setEditingFunnel,
        isDeleteModalOpen, setIsDeleteModalOpen,
        isBulkDeleteModalOpen, setIsBulkDeleteModalOpen,
        isSettingsModalOpen, setIsSettingsModalOpen,
        isClientModalOpen, setIsClientModalOpen,
        isGlobalsModalOpen, setIsGlobalsModalOpen,
        isLabelsModalOpen, setIsLabelsModalOpen,
        isFunnelGuideOpen, setIsFunnelGuideOpen,
        isScheduleGuideOpen, setIsScheduleGuideOpen,
        isHistoryGuideOpen, setIsHistoryGuideOpen,
        isBlockedGuideOpen, setIsBlockedGuideOpen,
        triggerHistoryRefreshKey, setTriggerHistoryRefreshKey,
        settingsRefreshKey, setSettingsRefreshKey,
        isTriggerModalOpen, setIsTriggerModalOpen,
        clientName, appBranding,
        selectedFunnelIds, setSelectedFunnelIds,
        fetchFunnels, fetchSettings,
        handleCreateFunnel, handleEdit, confirmDelete, handleDelete,
        toggleFunnelSelection, handleBulkDelete, toggleSelectAll, handleViewChange
    };
}
