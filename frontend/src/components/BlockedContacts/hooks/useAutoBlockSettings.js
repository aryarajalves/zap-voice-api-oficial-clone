import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';
import { useClient } from '../../../contexts/ClientContext';
import { toast } from 'react-hot-toast';

export function useAutoBlockSettings() {
    const { activeClient } = useClient();
    const [keywords, setKeywords] = useState([]);
    const [newKeyword, setNewKeyword] = useState('');
    const [savingKeywords, setSavingKeywords] = useState(false);
    const [funnels, setFunnels] = useState([]);
    const [autoBlockFunnelId, setAutoBlockFunnelId] = useState('');

    const fetchKeywords = useCallback(async () => {
        if (!activeClient) return;
        try {
            const res = await fetchWithAuth(`${API_URL}/settings/`, {}, activeClient?.id);
            if (res && res.ok) {
                const data = await res.json();
                const kwStr = data.AUTO_BLOCK_KEYWORDS || "bloquear,parar,sair,cancelar,não quero,nao quero,stop,unsubscribe,opt-out,descadastrar";
                setKeywords(kwStr.split(',').map(k => k.trim()).filter(Boolean));
                
                setAutoBlockFunnelId(data.AUTO_BLOCK_FUNNEL_ID || '');
            }
        } catch (err) {
            console.error("Erro ao buscar gatilhos:", err);
        }
    }, [activeClient]);

    const fetchFunnels = useCallback(async () => {
        if (!activeClient) return;
        try {
            const res = await fetchWithAuth(`${API_URL}/funnels`, {}, activeClient?.id);
            if (res && res.ok) {
                const data = await res.json();
                setFunnels(data || []);
            }
        } catch (err) {
            console.error("Erro ao buscar funis:", err);
        }
    }, [activeClient]);

    useEffect(() => {
        fetchKeywords();
        fetchFunnels();
    }, [fetchKeywords, fetchFunnels]);

    const persistSettings = async (updates) => {
        if (!activeClient) return false;
        try {
            const res = await fetchWithAuth(`${API_URL}/settings/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    settings: updates
                })
            }, activeClient?.id);
            return res && res.ok;
        } catch (err) {
            console.error(err);
            return false;
        }
    };

    const addKeyword = async (e) => {
        if (e) e.preventDefault();
        const val = newKeyword.trim().toLowerCase();
        if (!val) return;

        if (keywords.includes(val)) {
            toast.error("Este gatilho já está na lista.");
            setNewKeyword('');
            return;
        }

        const newList = [...keywords, val];
        setKeywords(newList);
        setNewKeyword('');

        const success = await persistSettings({
            AUTO_BLOCK_KEYWORDS: newList.join(',')
        });
        if (success) {
            toast.success(`"${val}" adicionado e salvo com sucesso!`);
        } else {
            toast.error(`"${val}" adicionado, mas houve erro ao salvar no banco.`);
        }
    };

    const removeKeyword = async (kw) => {
        const newList = keywords.filter(k => k !== kw);
        setKeywords(newList);

        const success = await persistSettings({
            AUTO_BLOCK_KEYWORDS: newList.join(',')
        });
        if (success) {
            toast.success("Gatilho removido.");
        } else {
            toast.error("Erro ao remover no banco.");
        }
    };

    const saveAutoBlockConfigs = async (funnelId, label) => {
        setSavingKeywords(true);
        const success = await persistSettings({
            AUTO_BLOCK_FUNNEL_ID: funnelId,
            AUTO_BLOCK_LABEL: label
        });
        if (success) {
            toast.success("Ações de auto-bloqueio salvas com sucesso!");
        } else {
            toast.error("Erro ao salvar ações de auto-bloqueio.");
        }
        setSavingKeywords(false);
    };

    return {
        keywords, newKeyword, setNewKeyword, savingKeywords,
        funnels, autoBlockFunnelId, setAutoBlockFunnelId,
        addKeyword, removeKeyword, saveAutoBlockConfigs
    };
}
