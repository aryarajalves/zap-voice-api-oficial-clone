import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { read, utils } from 'xlsx';
import { fetchWithAuth } from '../../../../AuthContext';
import { API_URL } from '../../../../config';
import { normalizePhone } from '../../../../utils/phoneFilters';

export const useFileImport = ({ setContacts, setWorkingMessage, setIsProcessing, setShowList, setIsValidated, fileVariables, activeClient, saveLeadsTags, loadFilters }) => {
    const [isReadingFile, setIsReadingFile] = useState(false);
    const [csvData, setCsvData] = useState({ headers: [], rows: [], nonEmptyIndices: [] });
    const [showColumnSelector, setShowColumnSelector] = useState(false);
    const [columnMapping, setColumnMapping] = useState({});
    const [nameColumn, setNameColumn] = useState('');
    const [emailColumn, setEmailColumn] = useState('');

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

                // Auto-mapping and guessing Name/Email
                const newColumnMapping = {};
                let guessedNameCol = '';
                let guessedEmailCol = '';

                headers.forEach((h, idx) => {
                    if (!h) return;
                    const lower = String(h).toLowerCase();
                    if (lower.includes('phone') || lower.includes('tel') || lower.includes('cel') || lower.includes('zap') || lower.includes('whats')) {
                        newColumnMapping[String(idx)] = 'phone';
                    } else if (lower.includes('tag') || lower.includes('etiqueta')) {
                        newColumnMapping[String(idx)] = 'tags';
                    } else if (lower.includes('nome') || lower.includes('name')) {
                        guessedNameCol = String(idx);
                    } else if (lower.includes('email') || lower.includes('mail')) {
                        guessedEmailCol = String(idx);
                    }
                });

                setColumnMapping(newColumnMapping);
                setNameColumn(guessedNameCol);
                setEmailColumn(guessedEmailCol);
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

    const confirmColumns = async (shouldSaveToLeads = true) => {
        const phoneIdx = Object.keys(columnMapping).find(k => columnMapping[k] === 'phone');
        if (phoneIdx === undefined) return toast.error("Selecione a coluna de TELEFONE");

        for (const [colIdxStr, mappingValue] of Object.entries(columnMapping)) {
            if (mappingValue && mappingValue !== 'ignore') {
                const colIdx = parseInt(colIdxStr, 10);
                const colName = csvData.headers?.[colIdx] || `Coluna ${colIdx + 1}`;
                const hasData = csvData.rows?.some(row => {
                    const cellVal = row?.[colIdx];
                    return cellVal !== undefined && cellVal !== null && String(cellVal).trim() !== '';
                });

                if (!hasData) {
                    return toast.error(`A coluna "${colName}" foi selecionada, mas não possui nenhuma informação no arquivo.`);
                }
            }
        }

        const tagsIdx = Object.keys(columnMapping).find(k => columnMapping[k] === 'tags');

        setWorkingMessage('Importando contatos e mapeando variáveis...');
        setIsProcessing(true);
        await new Promise(resolve => setTimeout(resolve, 800));

        const validRows = csvData.rows.filter(row => {
            const rawCell = String(row[parseInt(phoneIdx)] || '').trim();
            return rawCell.length > 0;
        });
        const totalRows = validRows.length;
        const seenInFile = new Set();
        const uniqueIncoming = [];
        let duplicatesInFile = 0;

        for (const row of validRows) {
            const rawCell = String(row[parseInt(phoneIdx)] || '').trim();
            const firstPart = rawCell.split(/[,;|]+/)[0].trim();
            const phone = normalizePhone(firstPart);
            if (!phone || phone.length < 8) continue;

            if (seenInFile.has(phone)) {
                duplicatesInFile++;
                continue;
            }
            seenInFile.add(phone);

            const variables = { ...fileVariables };
            Object.entries(columnMapping).forEach(([colIdx, varKey]) => {
                if (varKey === 'phone' || varKey === 'tags' || varKey === 'ignore') return;
                variables[varKey] = String(row[parseInt(colIdx)] ?? '');
            });

            // Extrair tags da linha da planilha se houver mapeamento
            let rowTags = '';
            if (tagsIdx !== undefined) {
                rowTags = String(row[parseInt(tagsIdx)] ?? '').trim();
            }

            // Extrair nome e e-mail se mapeados
            let contactName = '';
            if (nameColumn !== '') {
                contactName = String(row[parseInt(nameColumn)] ?? '').trim();
            }
            let contactEmail = '';
            if (emailColumn !== '') {
                contactEmail = String(row[parseInt(emailColumn)] ?? '').trim();
            }

            uniqueIncoming.push({
                phone,
                name: contactName || null,
                email: contactEmail || null,
                vars: variables,
                status: 'pending',
                window_open: false,
                rowTags
            });
        }

        // Salvar contatos importados automaticamente na base de leads/contatos do backend (apenas únicos)
        if (shouldSaveToLeads && activeClient && uniqueIncoming.length > 0) {
            setWorkingMessage('Salvando contatos no banco de dados...');
            try {
                const leadsPayload = uniqueIncoming.map(c => {
                    const finalTagsList = [];
                    if (saveLeadsTags) {
                        finalTagsList.push(...saveLeadsTags.split(',').map(t => t.trim()));
                    }
                    if (c.rowTags) {
                        finalTagsList.push(...c.rowTags.split(',').map(t => t.trim()));
                    }
                    const contactTags = Array.from(new Set(finalTagsList.filter(Boolean))).join(', ');

                    return {
                        phone: c.phone,
                        name: c.name || c.vars?.nome || c.vars?.name || null,
                        email: c.email || c.vars?.email || null,
                        tags: contactTags || null
                    };
                });

                const chunkSize = 500;
                let savedCount = 0;
                for (let i = 0; i < leadsPayload.length; i += chunkSize) {
                    const chunk = leadsPayload.slice(i, i + chunkSize);
                    const res = await fetchWithAuth(`${API_URL}/leads/bulk`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            leads: chunk,
                            tags: saveLeadsTags || null
                        })
                    }, activeClient.id);

                    if (res && res.ok) {
                        const resData = await res.json();
                        savedCount += resData.imported || chunk.length;
                    }
                }

                toast.success(`${savedCount} contatos salvos na base de dados!`);
                if (loadFilters) {
                    loadFilters();
                }
            } catch (error) {
                console.error("Erro ao salvar contatos no banco:", error);
                toast.error("Erro ao sincronizar contatos com o banco de dados.");
            }
        }

        setContacts(prev => {
            const existingPhones = new Set(prev.map(c => normalizePhone(c.phone)));
            const genuinelyNew = uniqueIncoming.filter(c => !existingPhones.has(c.phone));
            return [...prev, ...genuinelyNew];
        });

        setIsProcessing(false);
        setShowColumnSelector(false);
        setShowList(true);
        setIsValidated(false);

        if (duplicatesInFile > 0) {
            toast.success(
                `Lista carregada: ${totalRows} linhas processadas (${uniqueIncoming.length} contatos únicos, ${duplicatesInFile} duplicados descartados)`,
                { duration: 6000, id: 'bulk-list-loaded' }
            );
        } else {
            toast.success(`Lista carregada: ${uniqueIncoming.length} contatos únicos carregados com sucesso!`, { id: 'bulk-list-loaded' });
        }
    };

    return {
        isReadingFile,
        csvData,
        showColumnSelector, setShowColumnSelector,
        columnMapping, setColumnMapping,
        nameColumn, setNameColumn,
        emailColumn, setEmailColumn,
        handleFileUpload,
        confirmColumns
    };
};
