import { useState } from 'react';
import { API_URL } from '../../../../config';
import { fetchWithAuth } from '../../../../AuthContext';
import { toast } from 'react-hot-toast';
import { parseManualEntry } from '../../utils/blockedUtils';

/**
 * Hook para gerenciar inserção manual de contatos na lista de bloqueio ou repouso.
 */
export function useBlockedManual({
    activeClient,
    blockType,
    fetchBlockedContacts,
    setIsWorking,
    setWorkingMessage
}) {
    const [manualInput, setManualInput] = useState('');
    const [adding, setAdding] = useState(false);

    const handleBlockManual = async (e) => {
        if (e) e.preventDefault();
        const entries = parseManualEntry(manualInput);
        if (entries.length === 0) {
            toast.error("Insira pelo menos um número válido.");
            return;
        }

        const isResting = blockType === 'resting';
        if (setWorkingMessage) {
            setWorkingMessage(isResting ? `Repousando ${entries.length} contatos...` : `Bloqueando ${entries.length} contatos...`);
        }
        if (setIsWorking) setIsWorking(true);
        setAdding(true);
        let successCount = 0;
        let failCount = 0;

        const manualEndpoint = isResting ? `${API_URL}/resting/` : `${API_URL}/blocked/`;
        await Promise.all(entries.map(async (entry) => {
            try {
                const res = await fetchWithAuth(manualEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone: entry.phone, name: entry.name, reason: isResting ? 'Repouso Manual' : 'Manual' })
                }, activeClient?.id);

                if (res && res.ok) {
                    successCount++;
                } else {
                    const data = await res.json();
                    const errMsg = isResting ? "já está em repouso" : "já está bloqueado";
                    if (res.status !== 400 || !data.detail?.includes(errMsg)) {
                        failCount++;
                    }
                }
            } catch (err) {
                failCount++;
            }
        }));

        if (successCount > 0) {
            toast.success(isResting ? `${successCount} contatos em repouso por 24h!` : `${successCount} contatos bloqueados!`);
            setManualInput('');
            if (fetchBlockedContacts) fetchBlockedContacts();
        } else if (entries.length > 0) {
            toast.success(isResting ? "Todos os números já estavam em repouso." : "Todos os números já estavam bloqueados.");
            setManualInput('');
        }

        if (failCount > 0) toast.error(`${failCount} falhas.`);
        setAdding(false);
        if (setIsWorking) setIsWorking(false);
    };

    const add55ToManualInput = () => {
        const lines = manualInput.split(/[\n,;]+/).map(l => {
            let p = l.trim().replace(/\D/g, '');
            if (p.length > 0 && !p.startsWith('55')) {
                return '55' + p;
            }
            return p;
        }).filter(l => l.length > 0);
        setManualInput(lines.join('\n'));
        toast.success("DDI 55 adicionado!");
    };

    return {
        manualInput,
        setManualInput,
        adding,
        handleBlockManual,
        add55ToManualInput
    };
}
