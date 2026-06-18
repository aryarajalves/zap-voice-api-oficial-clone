import { fetchWithAuth } from '../../../AuthContext';
import { API_URL } from '../../../config';
import { toast } from 'react-hot-toast';

export const handleWebSocketMessage = (payload, activeClient, setTriggers, setChildrenModal) => {
    if (payload.event === "bulk_progress") {
        setTriggers(prev => prev.map(t => {
            if (t.id === payload.data.trigger_id) {
                const d = payload.data;
                return {
                    ...t,
                    status: d.status !== undefined ? d.status : t.status,
                    total_sent: d.sent !== undefined ? d.sent : (d.total_sent !== undefined ? d.total_sent : t.total_sent),
                    total_failed: d.failed !== undefined ? d.failed : (d.total_failed !== undefined ? d.total_failed : t.total_failed),
                    total_contacts: d.total_contacts !== undefined ? d.total_contacts : (d.total !== undefined ? d.total : t.total_contacts),
                    total_delivered: d.delivered !== undefined ? d.delivered : (d.total_delivered !== undefined ? d.total_delivered : t.total_delivered),
                    total_read: d.read !== undefined ? d.read : (d.total_read !== undefined ? d.total_read : t.total_read),
                    total_interactions: d.interactions !== undefined ? d.interactions : (d.total_interactions !== undefined ? d.total_interactions : t.total_interactions),
                    total_blocked: d.blocked !== undefined ? d.blocked : (d.total_blocked !== undefined ? d.total_blocked : t.total_blocked),
                    total_cost: d.cost !== undefined ? d.cost : (d.total_cost !== undefined ? d.total_cost : t.total_cost),
                    total_memory_sent: d.memory_sent !== undefined ? d.memory_sent : (d.total_memory_sent !== undefined ? d.total_memory_sent : t.total_memory_sent),
                    total_paid_templates: d.total_paid_templates !== undefined ? d.total_paid_templates : t.total_paid_templates,
                    queue_count: d.queue_count !== undefined ? d.queue_count : t.queue_count,
                };
            }
            return t;
        }));
    } else if (payload.event === "trigger_deleted") {
        if (payload.data.client_id === activeClient?.id) {
            setTriggers(prev => prev.filter(t => t.id !== payload.data.trigger_id));
        }
    } else if (payload.event === "trigger_updated" || payload.event === "trigger_progress") {
        const triggerData = payload.data?.id ? payload.data : null;
        const triggerId = triggerData ? triggerData.id : payload.data.trigger_id;
        const triggerStatus = triggerData ? triggerData.status : payload.data.status;
        
        if (payload.data.client_id === activeClient?.id || (!payload.data.client_id && activeClient)) {
            setTriggers(prev => prev.map(t => {
                if (t.id === triggerId) {
                    if (triggerData) {
                        return {
                            ...t,
                            status: triggerStatus,
                            total_sent: triggerData.total_sent !== undefined ? triggerData.total_sent : t.total_sent,
                            total_delivered: triggerData.total_delivered !== undefined ? triggerData.total_delivered : t.total_delivered,
                            total_read: triggerData.total_read !== undefined ? triggerData.total_read : t.total_read,
                            total_failed: triggerData.total_failed !== undefined ? triggerData.total_failed : t.total_failed,
                            updated_at: triggerData.updated_at || t.updated_at
                        };
                    }
                    return { ...t, status: triggerStatus };
                }
                return t;
            }));
            setChildrenModal(prev => {
                if (!prev.isOpen || !prev.children) return prev;
                return {
                    ...prev,
                    children: prev.children.map(child => {
                        if (child.id === triggerId) {
                            if (triggerData) {
                                return {
                                    ...child,
                                    status: triggerStatus,
                                    total_sent: triggerData.total_sent !== undefined ? triggerData.total_sent : child.total_sent,
                                    total_delivered: triggerData.total_delivered !== undefined ? triggerData.total_delivered : child.total_delivered,
                                    total_read: triggerData.total_read !== undefined ? triggerData.total_read : child.read || child.total_read,
                                    total_failed: triggerData.total_failed !== undefined ? triggerData.total_failed : child.total_failed,
                                    updated_at: triggerData.updated_at || child.updated_at
                                };
                            }
                            return { ...child, status: triggerStatus };
                        }
                        return child;
                    })
                };
            });
        }
    }
};

export const fetchErrorsHelper = async (triggerId, activeClientId, setErrorModal) => {
    setErrorModal({ isOpen: true, triggerId, errors: [], isLoading: true });
    try {
        const res = await fetchWithAuth(`${API_URL}/triggers/${triggerId}/failures`, {}, activeClientId);
        if (res.ok) {
            const data = await res.json();
            setErrorModal(prev => ({ ...prev, errors: data, isLoading: false }));
        } else {
            toast.error("Erro ao buscar relatório de falhas");
            setErrorModal(prev => ({ ...prev, isLoading: false }));
        }
    } catch (e) {
        toast.error("Erro de conexão");
        setErrorModal(prev => ({ ...prev, isLoading: false }));
    }
};

export const fetchChildrenHelper = async (trigger, activeClientId, setChildrenModal, filterType = 'all', silent = false) => {
    if (!silent) {
        setChildrenModal(prev => ({ 
            ...prev,
            isOpen: true, 
            triggerId: trigger.id, 
            triggerName: trigger.template_name || trigger.funnel?.name || 'Disparo', 
            children: prev.isOpen ? prev.children : [], 
            isLoading: true,
            filterType
        }));
    }
    try {
        const res = await fetchWithAuth(`${API_URL}/triggers/${trigger.id}/children`, {}, activeClientId);
        if (res.ok) {
            const data = await res.json();
            setChildrenModal(prev => ({ ...prev, children: data, isLoading: false }));
        } else {
            if (!silent) {
                const errorData = await res.json().catch(() => ({}));
                toast.error(`Erro ${res.status}: ${errorData.detail || "Falha ao buscar funis iniciados"}`);
            }
            setChildrenModal(prev => ({ ...prev, isLoading: false }));
        }
    } catch (err) {
        if (!silent) {
            toast.error("Erro de conexão ao buscar funis iniciados");
        }
        setChildrenModal(prev => ({ ...prev, isLoading: false }));
    }
};
