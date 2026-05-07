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

    const handleAction = async (modalConfig) => {
        const { type, id } = modalConfig;
        if (!type || !id) return;

        if (type === 'bulk_delete') {
            await handleBulkDeleteAction();
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
        let successCount = 0;
        let failCount = 0;

        for (const id of selectedIds) {
            try {
                const res = await fetchWithAuth(`${API_URL}/triggers/${id}`, { method: 'DELETE' }, activeClient?.id);
                if (res.ok) successCount++;
                else failCount++;
            } catch (e) {
                failCount++;
            }
        }

        if (successCount > 0) {
            toast.success(`${successCount} itens excluídos.`);
            setTriggers(prev => prev.filter(t => !selectedIds.includes(t.id)));
        }
        if (failCount > 0) toast.error(`${failCount} falhas na exclusão.`);

        setSelectedIds([]);
        fetchHistory();
        setModalConfig(prev => ({ ...prev, isOpen: false }));
    };

    const handleStartNow = async (id) => {
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

    const handleRetry = async (id) => {
        try {
            const res = await fetchWithAuth(`${API_URL}/triggers/${id}/retry`, { method: 'POST' }, activeClient?.id);
            if (res.ok) {
                toast.success("Reencontro iniciado com sucesso!");
                fetchHistory();
            } else {
                const data = await res.json();
                toast.error(data.detail || "Erro ao tentar reenviar");
            }
        } catch (e) {
            toast.error("Erro de conexão ao tentar reenviar");
        }
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
