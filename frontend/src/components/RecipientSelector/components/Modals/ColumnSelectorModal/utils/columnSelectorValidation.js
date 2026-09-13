import { toast } from 'react-hot-toast';

export const validateStep1 = (columnMapping, csvData) => {
    const phoneIdx = Object.keys(columnMapping).find(k => columnMapping[k] === 'phone');
    if (phoneIdx === undefined) {
        toast.error('Selecione a coluna de TELEFONE');
        return false;
    }

    for (const [colIdxStr, mappingValue] of Object.entries(columnMapping)) {
        if (mappingValue && mappingValue !== 'ignore') {
            const colIdx = parseInt(colIdxStr, 10);
            const colName = csvData?.headers?.[colIdx] || `Coluna ${colIdx + 1}`;
            const hasData = csvData?.rows?.some(row => {
                const cellVal = row?.[colIdx];
                return cellVal !== undefined && cellVal !== null && String(cellVal).trim() !== '';
            });

            if (!hasData) {
                toast.error(`A coluna "${colName}" foi selecionada, mas não possui nenhuma informação no arquivo.`);
                return false;
            }
        }
    }

    return true;
};

export const validateStep2 = (nameColumn, emailColumn, csvData) => {
    if (nameColumn !== '') {
        const colIdx = parseInt(nameColumn, 10);
        const colName = csvData?.headers?.[colIdx] || `Coluna ${colIdx + 1}`;
        const hasData = csvData?.rows?.some(row => {
            const cellVal = row?.[colIdx];
            return cellVal !== undefined && cellVal !== null && String(cellVal).trim() !== '';
        });
        if (!hasData) {
            toast.error(`A coluna "${colName}" selecionada para Nome não possui dados no arquivo.`);
            return false;
        }
    }

    if (emailColumn !== '') {
        const colIdx = parseInt(emailColumn, 10);
        const colName = csvData?.headers?.[colIdx] || `Coluna ${colIdx + 1}`;
        const hasData = csvData?.rows?.some(row => {
            const cellVal = row?.[colIdx];
            return cellVal !== undefined && cellVal !== null && String(cellVal).trim() !== '';
        });
        if (!hasData) {
            toast.error(`A coluna "${colName}" selecionada para E-mail não possui dados no arquivo.`);
            return false;
        }
    }

    return true;
};
