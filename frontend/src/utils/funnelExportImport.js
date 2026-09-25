import { toast } from 'react-hot-toast';
import { API_URL } from '../config';
import { fetchWithAuth } from '../AuthContext';

/**
 * Sanitiza o nome do funil para uso seguro como nome de arquivo.
 */
export const sanitizeFileName = (name) => {
    return (name || 'funil')
        .toLowerCase()
        .replace(/[^a-z0-9_\-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 50) || 'funil';
};

/**
 * Exporta um funil completo para download em formato JSON padronizado.
 * @param {Object} funnel Objeto contendo dados e etapas do funil
 */
export const exportFunnelAsJson = (funnel) => {
    if (!funnel) {
        toast.error("Nenhum funil selecionado para exportação.");
        return;
    }

    try {
        const exportData = {
            version: "1.0",
            type: "zapvoice_funnel",
            exported_at: new Date().toISOString(),
            funnel: {
                name: funnel.name || 'Funil Exportado',
                description: funnel.description || '',
                trigger_phrase: funnel.trigger_phrase || '',
                trigger_match_type: funnel.trigger_match_type || 'contains',
                trigger_limit_type: funnel.trigger_limit_type || 'none',
                is_trigger_active: funnel.is_trigger_active ?? true,
                allowed_phones: funnel.allowed_phones || '',
                blocked_phones: funnel.blocked_phones || '',
                business_hours_start: funnel.business_hours_start || '08:00',
                business_hours_end: funnel.business_hours_end || '18:00',
                business_hours_days: funnel.business_hours_days || [0, 1, 2, 3, 4],
                steps: funnel.steps || { nodes: [], edges: [] }
            }
        };

        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        const fileName = `funil_${sanitizeFileName(funnel.name)}.json`;
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success(`Funil "${funnel.name}" exportado com sucesso! 📥`);
    } catch (err) {
        console.error("Erro ao exportar funil:", err);
        toast.error("Falha ao exportar funil em formato JSON.");
    }
};

/**
 * Valida e normaliza o conteúdo JSON de um funil importado.
 * Suporta tanto JSON no padrão com envelope quanto exportação direta de dados.
 */
export const parseFunnelJson = (content) => {
    let parsed;
    try {
        parsed = typeof content === 'string' ? JSON.parse(content) : content;
    } catch (e) {
        throw new Error("Arquivo JSON corrompido ou inválido.");
    }

    // Suporte ao formato envelopado { version, type, funnel: { ... } }
    const funnelData = parsed.funnel || parsed;

    if (!funnelData || typeof funnelData !== 'object') {
        throw new Error("Formato do funil não reconhecido no arquivo JSON.");
    }

    if (!funnelData.name && !funnelData.steps) {
        throw new Error("O arquivo não contém etapas nem o nome do funil.");
    }

    return {
        name: funnelData.name?.trim() || 'Funil Importado',
        description: funnelData.description || 'Importado via arquivo JSON',
        trigger_phrase: funnelData.trigger_phrase || '',
        trigger_match_type: funnelData.trigger_match_type || 'contains',
        trigger_limit_type: funnelData.trigger_limit_type || 'none',
        is_trigger_active: funnelData.is_trigger_active ?? false,
        allowed_phones: funnelData.allowed_phones || '',
        blocked_phones: funnelData.blocked_phones || '',
        business_hours_start: funnelData.business_hours_start || '08:00',
        business_hours_end: funnelData.business_hours_end || '18:00',
        business_hours_days: funnelData.business_hours_days || [0, 1, 2, 3, 4],
        steps: funnelData.steps || { nodes: [], edges: [] }
    };
};

/**
 * Lê o arquivo JSON selecionado, valida sua estrutura e cadastra o funil no backend.
 */
export const importFunnelFromJson = async (file, activeClientId, existingFunnels = [], onSuccess) => {
    if (!file) return;

    const loadingToast = toast.loading("Lendo arquivo do funil... ⏳");

    try {
        const fileContent = await file.text();
        const payload = parseFunnelJson(fileContent);

        // Previne conflito com nomes existentes no cliente atual adicionando sufixo
        const existingNames = new Set((existingFunnels || []).map(f => f.name?.toLowerCase()));
        let finalName = payload.name;
        if (existingNames.has(finalName.toLowerCase())) {
            finalName = `${finalName} (Importado)`;
            let counter = 2;
            while (existingNames.has(finalName.toLowerCase())) {
                finalName = `${payload.name} (Importado ${counter})`;
                counter++;
            }
        }
        payload.name = finalName;

        // Requisição para criar o novo funil no backend
        const res = await fetchWithAuth(`${API_URL}/funnels`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }, activeClientId);

        toast.dismiss(loadingToast);

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || "Erro ao salvar funil importado no servidor.");
        }

        const createdFunnel = await res.json();
        toast.success(`Funil "${createdFunnel.name}" importado com sucesso! 🎉`);

        if (typeof onSuccess === 'function') {
            onSuccess(createdFunnel);
        }

        return createdFunnel;
    } catch (err) {
        console.error("Erro na importação do funil:", err);
        toast.dismiss(loadingToast);
        toast.error(err.message || "Falha ao importar funil.");
        throw err;
    }
};
