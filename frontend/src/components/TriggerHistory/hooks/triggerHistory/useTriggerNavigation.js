import { toast } from 'react-hot-toast';
import { API_URL } from '../../../../config';
import { fetchWithAuth } from '../../../../AuthContext';
import { fetchErrorsHelper, fetchChildrenHelper } from '../../utils/triggerHistoryUtils';

export function useTriggerNavigation({
    activeClient,
    setMonitoringTrigger,
    setErrorModal,
    setChildrenModal,
    setEditParamsModal
}) {
    const fetchErrors = async (triggerId) => {
        await fetchErrorsHelper(triggerId, activeClient?.id, setErrorModal);
    };

    const fetchChildren = async (trigger, filterType = 'all', silent = false) => {
        await fetchChildrenHelper(trigger, activeClient?.id, setChildrenModal, filterType, silent);
    };

    const handleViewPipeline = async (triggerId) => {
        if (!triggerId) return;
        try {
            const res = await fetchWithAuth(`${API_URL}/triggers/${triggerId}`, {}, activeClient?.id);
            if (res.ok) {
                const data = await res.json();
                setMonitoringTrigger(data);
            } else {
                toast.error("Erro ao carregar pipeline");
            }
        } catch (e) {
            toast.error("Erro ao conectar ao servidor");
        }
    };

    const handleEditParams = (trigger) => {
        let formattedDate = '';
        if (trigger.scheduled_time) {
            let d = new Date(trigger.scheduled_time);
            if (trigger.scheduled_time.indexOf('Z') === -1 && trigger.scheduled_time.indexOf('+') === -1 && trigger.scheduled_time.slice(19).indexOf('-') === -1) {
                d = new Date(trigger.scheduled_time + 'Z');
            }
            const offset = d.getTimezoneOffset() * 60000;
            const localDate = new Date(d.getTime() - offset);
            formattedDate = localDate.toISOString().slice(0, 16);
        }

        setEditParamsModal({
            isOpen: true,
            id: trigger.id,
            delay: trigger.delay_seconds || 5,
            concurrency: trigger.concurrency_limit || 1,
            contacts: trigger.contacts_list || [],
            scheduledTime: formattedDate
        });
    };

    return {
        fetchErrors,
        fetchChildren,
        handleViewPipeline,
        handleEditParams
    };
}
