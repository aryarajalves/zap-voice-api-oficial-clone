import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { read, utils } from 'xlsx';
import { fetchWithAuth } from '../../../../AuthContext';
import { API_URL } from '../../../../config';

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

        const tagsIdx = Object.keys(columnMapping).find(k => columnMapping[k] === 'tags');

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

            return { phone, name: contactName || null, email: contactEmail || null, vars: variables, status: 'pending', window_open: false, rowTags };
        }).filter(c => c !== null);

        // Salvar contatos importados automaticamente na base de leads/contatos do backend
        if (shouldSaveToLeads && activeClient && incoming.length > 0) {
            setWorkingMessage('Salvando contatos no banco de dados...');
            try {
                // Se o usuário selecionou uma tag manual geral, a usamos. Caso contrário, usamos a tag por linha ou nenhuma.
                // Criamos conjuntos de tags para cada contato
                const leadsPayload = incoming.map(c => {
                    const finalTagsList = [];
                    if (saveLeadsTags) {
                        finalTagsList.push(...saveLeadsTags.split(',').map(t => t.trim()));
                    }
                    if (c.rowTags) {
                        finalTagsList.push(...c.rowTags.split(',').map(t => t.trim()));
                    }
                    // Junta em uma string separada por virgulas
                    const contactTags = Array.from(new Set(finalTagsList.filter(Boolean))).join(', ');

                    return {
                        phone: c.phone,
                        name: c.name || c.vars?.nome || c.vars?.name || null,
                        email: c.email || c.vars?.email || null,
                        tags: contactTags || null
                    };
                });

                // Envia em lotes de até 500 para evitar payload excessivo
                const chunkSize = 500;
                let savedCount = 0;
                for (let i = 0; i < leadsPayload.length; i += chunkSize) {
                    const chunk = leadsPayload.slice(i, i + chunkSize);
                    // Para fins de compatibilidade, o endpoint /leads/bulk aceita { leads, tags }
                    // Mas como cada contato pode ter tags diferentes (da coluna), criaremos uma rota ou chamaremos múltiplas vezes.
                    // Para mantermos simplicidade e performance, vamos adaptar o payload ou enviar individualmente/em blocos.
                    // No backend, a rota routers/leads.py bulk_create_leads aceita request.leads e request.tags.
                    // Se passarmos as tags em request.tags, elas se aplicam a todos. Mas a rota upsert_webhook_lead aceita também tags individuais.
                    // Como a rota /leads/bulk aceita tags globais no request.tags, podemos passar request.tags e no backend, se o item tiver suas próprias tags,
                    // podemos adaptar no backend ou enviar blocos agrupados.
                    // Mas repare que o endpoint `/leads/bulk` do backend recebe no corpo:
                    // class BulkCreateLeadsRequest(BaseModel):
                    //     leads: List[LeadBatchItem]
                    //     tags: Optional[str] = None
                    // Onde LeadBatchItem tem apenas phone, name, email.
                    // Para suportar tags por linha, vamos atualizar o backend (LeadBatchItem) adicionando `tags: Optional[str] = None`
                    // para que cada contato da lista possa trazer suas próprias etiquetas!
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
                    icon: 'ℹ',
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
        nameColumn, setNameColumn,
        emailColumn, setEmailColumn,
        handleFileUpload,
        confirmColumns
    };
};
