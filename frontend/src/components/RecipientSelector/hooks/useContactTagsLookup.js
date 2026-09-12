import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';
import { useClient } from '../../../contexts/ClientContext';

/**
 * Hook para consultar se os contatos da lista estão cadastrados na aba de Contatos
 * (tabela webhook_leads) e carregar suas respectivas etiquetas.
 */
export function useContactTagsLookup({ contacts = [], activeClient: propClient } = {}) {
    let clientFromContext = null;
    try {
        const clientCtx = useClient();
        clientFromContext = clientCtx?.activeClient;
    } catch {
        // Contexto pode não estar disponível em testes isolados
    }
    const activeClient = propClient || clientFromContext;

    const [showContactTags, setShowContactTags] = useState(false);
    const [isLoadingTags, setIsLoadingTags] = useState(false);
    const [contactsTagsMap, setContactsTagsMap] = useState({});


    const fetchTagsForContacts = useCallback(async (contactsList = contacts) => {
        if (!activeClient?.id) {
            toast.error("Selecione um cliente ativo primeiro");
            return;
        }

        const phones = contactsList.map(c => c.phone).filter(Boolean);
        if (phones.length === 0) return;

        setIsLoadingTags(true);
        try {
            // Divide em lotes de até 500 para alta performance
            const batchSize = 500;
            const newMap = {};

            for (let i = 0; i < phones.length; i += batchSize) {
                const batch = phones.slice(i, i + batchSize);
                const res = await fetchWithAuth(`${API_URL}/leads/contacts-tags-info`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phones: batch })
                }, activeClient.id);

                if (res.ok) {
                    const data = await res.json();
                    Object.assign(newMap, data);
                }
            }

            setContactsTagsMap(prev => ({ ...prev, ...newMap }));
            const countRegistered = Object.values(newMap).filter(v => v.is_registered).length;
            toast.success(`Consulta concluída: ${countRegistered} contato(s) cadastrado(s) na aba Contatos!`);
        } catch (error) {
            console.error("Erro ao consultar etiquetas na aba de contatos:", error);
            toast.error("Erro ao consultar etiquetas na aba de contatos");
        } finally {
            setIsLoadingTags(false);
        }
    }, [contacts, activeClient]);

    const toggleShowContactTags = useCallback(async () => {
        const nextState = !showContactTags;
        setShowContactTags(nextState);

        // Se estiver ativando e ainda não tiver consultado, busca automaticamente
        if (nextState && Object.keys(contactsTagsMap).length === 0 && contacts.length > 0) {
            await fetchTagsForContacts(contacts);
        }
    }, [showContactTags, contactsTagsMap, contacts, fetchTagsForContacts]);

    return {
        showContactTags,
        setShowContactTags,
        isLoadingTags,
        contactsTagsMap,
        fetchTagsForContacts,
        toggleShowContactTags
    };
}
