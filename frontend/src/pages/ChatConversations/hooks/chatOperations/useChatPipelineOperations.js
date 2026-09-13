import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { fetchWithAuth } from '../../../../AuthContext';
import { API_URL } from '../../../../config';

export function useChatPipelineOperations({ selectedConvo, activeClient }) {
    const [pipelineTrigger, setPipelineTrigger] = useState(null);
    const [isLoadingPipeline, setIsLoadingPipeline] = useState(false);

    const handleOpenActiveFunnelPipeline = async () => {
        if (!selectedConvo?.active_funnel) return;
        const triggerId = selectedConvo.active_funnel.trigger_id;
        setIsLoadingPipeline(true);
        try {
            if (triggerId) {
                const res = await fetchWithAuth(`${API_URL}/triggers/${triggerId}`, {}, activeClient?.id);
                if (res.ok) {
                    const data = await res.json();
                    setPipelineTrigger(data);
                    return;
                }
            }

            const phoneDigits = (selectedConvo.phone || "").replace(/\D/g, '');
            const searchParam = phoneDigits.length >= 8 ? phoneDigits.slice(-8) : phoneDigits;
            const resSearch = await fetchWithAuth(`${API_URL}/triggers?search=${encodeURIComponent(searchParam)}&limit=10`, {}, activeClient?.id);
            if (resSearch.ok) {
                const listData = await resSearch.json();
                const triggers = listData.triggers || listData.items || listData || [];
                const activeTrig = Array.isArray(triggers) ? triggers.find(t => 
                    ['queued', 'processing', 'paused_waiting_delivery', 'suspended'].includes(t.status)
                ) || triggers[0] : null;

                if (activeTrig) {
                    const fullRes = await fetchWithAuth(`${API_URL}/triggers/${activeTrig.id}`, {}, activeClient?.id);
                    if (fullRes.ok) {
                        const fullData = await fullRes.json();
                        setPipelineTrigger(fullData);
                        return;
                    }
                    setPipelineTrigger(activeTrig);
                    return;
                }
            }
            toast.error("Não foi possível carregar o pipeline do funil ativo.");
        } catch (err) {
            console.error("Erro ao carregar pipeline:", err);
            toast.error("Erro de conexão ao carregar pipeline.");
        } finally {
            setIsLoadingPipeline(false);
        }
    };

    return {
        pipelineTrigger,
        setPipelineTrigger,
        isLoadingPipeline,
        handleOpenActiveFunnelPipeline
    };
}
