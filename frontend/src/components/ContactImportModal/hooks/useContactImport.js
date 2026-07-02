import { useState, useRef } from 'react';
import { API_URL } from '../../../config';
import { useClient } from '../../../contexts/ClientContext';
import { toast } from 'react-hot-toast';

// Mapeamento de telefone pode ser:
// - uma string simples: nome da coluna com o telefone completo
// - um objeto { mode: 'composite', ddi_column, ddd_column, number_column, manual_ddi }:
//   quando o telefone está dividido em várias colunas (DDI/DDD/Número) na planilha.
// Retorna a mensagem de erro de validação, ou null se estiver válido.
export function getPhoneMappingError(phone) {
  if (!phone) return 'A coluna de Telefone é obrigatória.';
  if (typeof phone === 'object') {
    if (!phone.number_column) return 'Selecione a coluna do Número de telefone.';
    if (!phone.ddi_column && !phone.manual_ddi) {
      return 'Informe o DDI manualmente (ex: 55) ou selecione uma coluna de DDI.';
    }
  }
  return null;
}

export function useContactImport(onClose, onImportComplete) {
  const { activeClient } = useClient();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [mapping, setMapping] = useState({
    name: '',
    phone: '',
    email: '',
    tags: '',
    remove_tags: ''
  });
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  // Tags fixas digitadas manualmente no passo 2
  const [fixedTags, setFixedTags] = useState([]);
  const [fixedRemoveTags, setFixedRemoveTags] = useState([]);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const ext = selectedFile.name.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      toast.error('Formato não suportado. Use CSV ou Excel.');
      return;
    }

    setFile(selectedFile);
    setLoading(true);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch(`${API_URL}/leads/import/preview`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Client-ID': activeClient.id
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setPreviewData(data);

        // Auto-mapping suggestion
        const newMapping = { ...mapping };
        const lowerHeaders = data.headers.map(h => h.toLowerCase());
        
        const nameIdx = lowerHeaders.findIndex(h => h.includes('nome') || h.includes('name'));
        if (nameIdx !== -1) newMapping.name = data.headers[nameIdx];
        
        const phoneIdx = lowerHeaders.findIndex(h => h.includes('tel') || h.includes('phone') || h.includes('zap') || h.includes('cel'));
        if (phoneIdx !== -1) newMapping.phone = data.headers[phoneIdx];
        
        const emailIdx = lowerHeaders.findIndex(h => h.includes('email') || h.includes('mail'));
        if (emailIdx !== -1) newMapping.email = data.headers[emailIdx];

        const tagsIdx = lowerHeaders.findIndex(h => (h.includes('tag') || h.includes('etiqueta')) && !h.includes('remove') && !h.includes('limp'));
        if (tagsIdx !== -1) newMapping.tags = data.headers[tagsIdx];

        const removeTagsIdx = lowerHeaders.findIndex(h => h.includes('remove') || h.includes('limp') || h.includes('exclui'));
        if (removeTagsIdx !== -1) newMapping.remove_tags = data.headers[removeTagsIdx];

        setMapping(newMapping);
        setStep(2);
      } else {
        let detail = 'Erro ao ler arquivo.';
        try { const errBody = await response.json(); detail = errBody.detail || detail; } catch (_) {}
        toast.error(detail);
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao processar arquivo.');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteImport = async () => {
    const phoneError = getPhoneMappingError(mapping.phone);
    if (phoneError) {
      toast.error(phoneError);
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mapping', JSON.stringify(mapping));
    if (fixedTags.length > 0) formData.append('fixed_tags', fixedTags.join(','));
    if (fixedRemoveTags.length > 0) formData.append('fixed_remove_tags', fixedRemoveTags.join(','));

    try {
      const response = await fetch(`${API_URL}/leads/import/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Client-ID': activeClient.id
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        toast.success("Importação iniciada em segundo plano!");
        onClose();
        if (onImportComplete) {
          onImportComplete();
        }
        reset();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Erro na importação.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao executar importação.');
    } finally {
      setLoading(false);
    }
  };


  const reset = () => {
    setStep(1);
    setFile(null);
    setPreviewData(null);
    setImportResult(null);
    setMapping({ name: '', phone: '', email: '', tags: '', remove_tags: '' });
    setFixedTags([]);
    setFixedRemoveTags([]);
  };

  return {
    activeClient, step, setStep, file, setFile, loading, setLoading,
    previewData, setPreviewData, mapping, setMapping, importResult, setImportResult,
    fileInputRef,
    handleFileChange, handleExecuteImport, reset,
    fixedTags, setFixedTags, fixedRemoveTags, setFixedRemoveTags
  };
}
