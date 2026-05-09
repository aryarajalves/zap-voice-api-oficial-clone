import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../../config';
import { fetchWithAuth } from '../../../../AuthContext';

export const useValidation = ({ contacts, setContacts, activeClient, selectedInbox, setIsValidated }) => {
    const [isValidating, setIsValidating] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });

    const startValidation = async () => {
        if (!activeClient) return toast.error("Selecione um cliente primeiro");
        if (contacts.length === 0) return toast.error("Adicione contatos primeiro");

        setIsValidating(true);
        setProgress({ current: 0, total: contacts.length });

        try {
            const phones = contacts.map(c => c.phone);
            const batchSize = 100;
            const updatedContacts = [...contacts];

            for (let i = 0; i < phones.length; i += batchSize) {
                const batch = phones.slice(i, i + batchSize);
                const res = await fetchWithAuth(`${API_URL}/chatwoot/validate-contacts`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        phones: batch,
                        wa_business_account_id: selectedInbox
                    })
                }, activeClient.id);

                if (res.ok) {
                    const results = await res.json();
                    batch.forEach(phone => {
                        const result = results[phone] || { exists: false, window_open: false, is_blocked: false };
                        const idx = updatedContacts.findIndex(c => c.phone === phone);
                        if (idx !== -1) {
                            updatedContacts[idx] = {
                                ...updatedContacts[idx],
                                status: result.exists ? 'verified' : 'not_found',
                                window_open: result.window_open,
                                is_blocked: result.is_blocked
                            };
                        }
                    });

                    if (i % 500 === 0 || i + batchSize >= phones.length) {
                        setContacts([...updatedContacts]);
                    }
                    setProgress(prev => ({ ...prev, current: Math.min(i + batch.length, phones.length) }));
                }
            }
            toast.success("Validação concluída!");
            setIsValidated(true);
        } catch (err) {
            console.error(err);
            toast.error("Erro na validação");
        } finally {
            setIsValidating(false);
        }
    };

    return {
        isValidating,
        progress,
        startValidation
    };
};
