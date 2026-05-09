import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { read, utils } from 'xlsx';

export const useFileImport = ({ setContacts, setWorkingMessage, setIsProcessing, setShowList, setIsValidated, fileVariables }) => {
    const [isReadingFile, setIsReadingFile] = useState(false);
    const [csvData, setCsvData] = useState({ headers: [], rows: [], nonEmptyIndices: [] });
    const [showColumnSelector, setShowColumnSelector] = useState(false);
    const [columnMapping, setColumnMapping] = useState({});

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsReadingFile(true);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = utils.sheet_to_json(ws, { header: 1 });

                if (data.length < 1) {
                    toast.error("Arquivo vazio");
                    setIsReadingFile(false);
                    return;
                }

                const headers = data[0];
                const rows = data.slice(1);
                const nonEmptyIndices = [];
                headers.forEach((h, idx) => {
                    if (h || rows.some(r => r[idx])) {
                        nonEmptyIndices.push(idx);
                    }
                });

                setCsvData({ headers, rows, nonEmptyIndices });
                setShowColumnSelector(true);
            } catch (err) {
                console.error(err);
                toast.error("Erro ao ler arquivo");
            } finally {
                setIsReadingFile(false);
            }
        };
        reader.readAsBinaryString(file);
    };

    const confirmColumns = async () => {
        const phoneIdx = Object.keys(columnMapping).find(k => columnMapping[k] === 'phone');
        if (phoneIdx === undefined) return toast.error("Selecione a coluna de TELEFONE");

        setWorkingMessage('Importando contatos e mapeando variáveis...');
        setIsProcessing(true);
        await new Promise(resolve => setTimeout(resolve, 800));

        const incoming = csvData.rows.map(row => {
            const rawCell = String(row[parseInt(phoneIdx)] || '');
            const firstPart = rawCell.split(/[,;|\s]+/)[0];
            let phone = firstPart.replace(/\D/g, '');
            if (phone.length === 0) return null;
            if (phone.length === 11 && phone.startsWith('0')) phone = phone.substring(1);

            const variables = { ...fileVariables };
            Object.entries(columnMapping).forEach(([colIdx, varKey]) => {
                if (varKey === 'phone' || varKey === 'ignore') return;
                variables[varKey] = String(row[parseInt(colIdx)] ?? '');
            });

            return { phone, vars: variables, status: 'pending', window_open: false };
        }).filter(c => c !== null);

        setContacts(prev => {
            const existingPhones = new Set(prev.map(c => c.phone));
            const seenInBatch = new Set();

            const uniqueIncoming = incoming.filter(c => {
                if (existingPhones.has(c.phone) || seenInBatch.has(c.phone)) return false;
                seenInBatch.add(c.phone);
                return true;
            });

            const duplicatesCount = incoming.length - uniqueIncoming.length;
            if (duplicatesCount > 0) {
                toast(`${duplicatesCount} duplicados ignorados no arquivo.`, {
                    icon: 'ℹ️',
                    id: 'duplicates-file-ignored'
                });
            }

            return [...prev, ...uniqueIncoming];
        });

        setIsProcessing(false);
        setShowColumnSelector(false);
        setShowList(true);
        setIsValidated(false);
        toast.success(`Contatos carregados com sucesso!`);
    };

    return {
        isReadingFile,
        csvData,
        showColumnSelector, setShowColumnSelector,
        columnMapping, setColumnMapping,
        handleFileUpload,
        confirmColumns
    };
};
