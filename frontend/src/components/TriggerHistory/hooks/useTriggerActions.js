import { toast } from 'react-hot-toast';
import { API_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';

export const useTriggerActions = ({ activeClient, setTriggers, fetchHistory, setModalConfig, setSelectedIds, setMonitoringTrigger, selectedIds }) => {
    
    const handleDelete = (id) => {
        setModalConfig({
            isOpen: true,
            type: 'delete',
            id,
            title: 'Excluir Histórico',
            message: 'Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.',
            confirmText: 'Excluir',
            isDangerous: true
        });
    };

    const handleCancel = (id) => {
        setModalConfig({
            isOpen: true,
            type: 'cancel',
            id,
            title: 'Cancelar Envio',
            message: 'Tem certeza que deseja interromper este envio em andamento?',
            confirmText: 'Sim, Cancelar',
            isDangerous: true
        });
    };

    const executeStartNow = async (id) => {
        try {
            const res = await fetchWithAuth(`${API_URL}/triggers/${id}/start-now`, { method: 'POST' }, activeClient?.id);
            if (res.ok) {
                toast.success("Disparo iniciado com sucesso!");
                fetchHistory();
            } else {
                const data = await res.json();
                toast.error(data.detail || "Erro ao iniciar");
            }
        } catch (e) {
            toast.error("Erro de conexão");
        }
    };

    const executeRetry = async (id) => {
        const loadingToast = toast.loading('Preparando reenvio...');
        try {
            const res = await fetchWithAuth(`${API_URL}/triggers/${id}/retry`, { method: 'POST' }, activeClient?.id);
            if (res.ok) {
                toast.success("Reenvio iniciado com sucesso!", { 
                    id: loadingToast,
                    icon: '🚀',
                    duration: 4000
                });
                fetchHistory();
            } else {
                const data = await res.json().catch(() => ({}));
                toast.error(data.detail || "Erro ao tentar reenviar", { id: loadingToast });
            }
        } catch (e) {
            toast.error("Erro de conexão ao tentar reenviar", { id: loadingToast });
        }
    };

    const handleAction = async (modalConfig) => {
        const { type, id } = modalConfig;
        if (!type || !id) return;

        if (type === 'bulk_delete') {
            await handleBulkDeleteAction();
            return;
        }

        if (type === 'start_now') {
            await executeStartNow(id);
            setModalConfig(prev => ({ ...prev, isOpen: false }));
            return;
        }

        if (type === 'retry') {
            await executeRetry(id);
            setModalConfig(prev => ({ ...prev, isOpen: false }));
            return;
        }

        const url = type === 'delete'
            ? `${API_URL}/triggers/${id}`
            : `${API_URL}/triggers/${id}/cancel`;

        const method = type === 'delete' ? 'DELETE' : 'POST';

        try {
            const res = await fetchWithAuth(url, { method }, activeClient?.id);
            if (res.ok) {
                toast.success(type === 'delete' ? "Histórico excluído" : "Envio cancelado");
                if (type === 'delete') {
                    setMonitoringTrigger(null);
                    setTriggers(prev => prev.filter(t => t.id !== id));
                }
                fetchHistory(); 
            } else {
                const data = await res.json().catch(() => ({}));
                toast.error(data.detail || "Erro na operação");
            }
        } catch (e) {
            toast.error("Erro na operação");
        }
        setModalConfig(prev => ({ ...prev, isOpen: false }));
    };

    const handleBulkDeleteAction = async () => {
        try {
            const res = await fetchWithAuth(`${API_URL}/triggers/bulk-delete`, { 
                method: 'POST',
                body: JSON.stringify({ ids: selectedIds })
            }, activeClient?.id);

            if (res.ok) {
                const data = await res.json();
                toast.success(`${data.deleted_count || selectedIds.length} itens excluídos com sucesso.`);
                // Atualizar lista localmente
                setTriggers(prev => prev.filter(t => !selectedIds.includes(t.id)));
                setSelectedIds([]);
            } else {
                const errorData = await res.json().catch(() => ({}));
                toast.error(errorData.detail || "Erro na exclusão em massa.");
            }
        } catch (e) {
            console.error("Bulk delete error:", e);
            toast.error("Erro de conexão ao tentar excluir itens.");
        }

        fetchHistory();
        setModalConfig(prev => ({ ...prev, isOpen: false }));
    };

    const handleStartNow = (id) => {
        setModalConfig({
            isOpen: true,
            type: 'start_now',
            id,
            title: 'Iniciar Disparo',
            message: 'Tem certeza que deseja iniciar este disparo imediatamente?',
            confirmText: 'Sim, Iniciar',
            isDangerous: false
        });
    };

    const handleRetry = (id) => {
        setModalConfig({
            isOpen: true,
            type: 'retry',
            id,
            title: 'Repetir Falhas',
            message: 'Tem certeza que deseja reenviar apenas as mensagens que falharam neste lote?',
            confirmText: 'Sim, Reenviar',
            isDangerous: false
        });
    };

    return {
        handleDelete,
        handleCancel,
        handleAction,
        handleBulkDeleteAction,
        handleStartNow,
        handleRetry
    };
};
