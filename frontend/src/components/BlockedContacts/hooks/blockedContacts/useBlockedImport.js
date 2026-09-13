import { useState } from 'react';
import { API_URL } from '../../../../config';
import { fetchWithAuth } from '../../../../AuthContext';
import { toast } from 'react-hot-toast';
import { read, utils } from 'xlsx';
import { mapCountryToCode } from '../../utils/blockedUtils';

/**
 * Hook para gerenciar importação via planilha (Excel/CSV) e mapeamento de colunas.
 */
export function useBlockedImport({
    activeClient,
    blockType,
    fetchBlockedContacts
}) {
    const [importData, setImportData] = useState({ headers: [], rows: [], nonEmptyIndices: [] });
    const [selectedPhoneCols, setSelectedPhoneCols] = useState([]);
    const [selectedNameCol, setSelectedNameCol] = useState(-1);
    const [importing, setImporting] = useState(false);
    const [showColumnSelector, setShowColumnSelector] = useState(false);
    const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
    const [importLabel, setImportLabel] = useState('Importando Contatos');
    const [showFullPreview, setShowFullPreview] = useState(false);
    const [isReadingFile, setIsReadingFile] = useState(false);
    const [phoneColSearch, setPhoneColSearch] = useState('');
    const [nameColSearch, setNameColSearch] = useState('');

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsReadingFile(true);
        const reader = new FileReader();
        const extension = file.name.split('.').pop().toLowerCase();

        if (extension === 'xlsx' || extension === 'xls') {
            reader.onload = (evt) => {
                try {
                    const data = evt.target.result;
                    const workbook = read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];
                    const rows = utils.sheet_to_json(sheet, { header: 1, defval: '' });

                    if (!rows || rows.length === 0) {
                        toast.error("Arquivo vazio.");
                        return;
                    }

                    const headers = (rows[0] || []).map(h => String(h || ''));
                    const dataRows = rows.slice(1);

                    const nonEmptyIndices = headers.reduce((acc, _, i) => {
                        const hasValue = dataRows.some(row => row[i] !== undefined && row[i] !== null && String(row[i]).trim() !== '');
                        if (hasValue) acc.push(i);
                        return acc;
                    }, []);

                    setImportData({ headers, rows: dataRows, nonEmptyIndices });
                    setShowColumnSelector(true);
                } catch (err) {
                    console.error(err);
                    toast.error("Erro ao ler arquivo Excel.");
                } finally {
                    setIsReadingFile(false);
                }
            };
            reader.readAsArrayBuffer(file);
        } else {
            reader.onload = (evt) => {
                try {
                    const text = evt.target.result;
                    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
                    if (lines.length === 0) {
                        toast.error("Arquivo vazio.");
                        return;
                    }

                    const firstLine = lines[0];
                    const delimiters = [',', ';', '\t'];
                    const delimiter = delimiters.sort((a, b) => firstLine.split(b).length - firstLine.split(a).length)[0];

                    const rows = lines.map(line => line.split(delimiter).map(cell => cell.replace(/^["']|["']$/g, '').trim()));
                    const headers = rows[0];
                    const dataRows = rows.slice(1);

                    const nonEmptyIndices = headers.reduce((acc, _, i) => {
                        const hasValue = dataRows.some(row => row[i] !== undefined && row[i] !== null && String(row[i]).trim() !== '');
                        if (hasValue) acc.push(i);
                        return acc;
                    }, []);

                    setImportData({ headers, rows: dataRows, nonEmptyIndices });
                    setShowColumnSelector(true);
                } catch (err) {
                    toast.error("Erro ao ler arquivo CSV.");
                } finally {
                    setIsReadingFile(false);
                }
            };
            reader.readAsText(file);
        }
        e.target.value = '';
    };

    const processMappedImport = async () => {
        if (selectedPhoneCols.length === 0) {
            toast.error("Selecione pelo menos uma coluna de Telefone.");
            return;
        }

        setImporting(true);
        let successCount = 0;
        let failCount = 0;
        let alreadyCount = 0;
        let ignoredCount = 0;

        const entries = importData.rows.map(row => {
            const rawPhone = selectedPhoneCols.map(idx => {
                const originalVal = String(row[idx] || '').trim();
                return mapCountryToCode(originalVal);
            }).join('');
            const phone = rawPhone.replace(/\D/g, '');

            if (!rawPhone || phone.length < 8) {
                ignoredCount++;
                return null;
            }

            const name = selectedNameCol !== -1 ? String(row[selectedNameCol] || '').trim() : '';
            return { phone, name };
        }).filter(Boolean);

        if (entries.length === 0) {
            toast.error("Nenhum número válido encontrado.");
            setImporting(false);
            return;
        }

        const isResting = blockType === 'resting';
        setImportLabel(isResting ? 'Colocando em Repouso' : 'Importando Contatos');
        setImportProgress({ current: 0, total: entries.length });

        const batchSize = 100;
        const bulkEndpoint = isResting ? `${API_URL}/resting/rest_bulk` : `${API_URL}/blocked/block_bulk`;
        for (let i = 0; i < entries.length; i += batchSize) {
            const batch = entries.slice(i, i + batchSize);
            try {
                const res = await fetchWithAuth(bulkEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contacts: batch.map(e => ({ ...e, reason: isResting ? 'Importação (Repouso)' : 'Importação' }))
                    })
                }, activeClient?.id);

                if (res && res.ok) {
                    const result = await res.json();
                    successCount += result.success_count;
                    alreadyCount += isResting ? result.already_resting_count : result.already_blocked_count;
                } else {
                    failCount += batch.length;
                }
            } catch (err) {
                failCount += batch.length;
            } finally {
                setImportProgress(prev => ({
                    ...prev,
                    current: Math.min(prev.current + batch.length, entries.length)
                }));
            }
        }

        toast.success(`${successCount} contatos processados!`);
        if (alreadyCount > 0) toast.success(`${alreadyCount} já estavam na lista.`);
        if (failCount > 0) toast.error(`${failCount} falhas.`);

        setShowColumnSelector(false);
        setImportData({ headers: [], rows: [], nonEmptyIndices: [] });
        setSelectedPhoneCols([]);
        setSelectedNameCol(-1);
        if (fetchBlockedContacts) fetchBlockedContacts();
        setImporting(false);
    };

    return {
        importData,
        setImportData,
        selectedPhoneCols,
        setSelectedPhoneCols,
        selectedNameCol,
        setSelectedNameCol,
        importing,
        setImporting,
        showColumnSelector,
        setShowColumnSelector,
        importProgress,
        setImportProgress,
        importLabel,
        setImportLabel,
        showFullPreview,
        setShowFullPreview,
        isReadingFile,
        setIsReadingFile,
        phoneColSearch,
        setPhoneColSearch,
        nameColSearch,
        setNameColSearch,
        handleFileUpload,
        processMappedImport
    };
}
