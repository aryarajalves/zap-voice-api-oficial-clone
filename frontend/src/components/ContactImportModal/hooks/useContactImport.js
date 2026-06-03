import { useState, useRef, useEffect } from 'react';
import { API_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';
import { useClient } from '../../../contexts/ClientContext';
import { toast } from 'react-hot-toast';

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

  const [importSource, setImportSource] = useState(null);
  const [chatwootLabels, setChatwootLabels] = useState([]);
  const [loadingLabels, setLoadingLabels] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState('');
  const [importAllTags, setImportAllTags] = useState(false);
  const [customTag, setCustomTag] = useState('');

  const fetchChatwootLabels = async () => {
    setLoadingLabels(true);
    try {
      const response = await fetchWithAuth(`${API_URL}/chatwoot/labels`, {}, activeClient?.id);
      if (response && response.ok) {
        const data = await response.json();
        setChatwootLabels(Array.isArray(data) ? data : []);
      } else {
        toast.error("Erro ao carregar etiquetas do Chatwoot.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar etiquetas.");
    } finally {
      setLoadingLabels(false);
    }
  };

  useEffect(() => {
    if (importSource === 'chatwoot') {
      fetchChatwootLabels();
    }
  }, [importSource]);

  const handleChatwootImport = async () => {
    if (!selectedLabel) {
      toast.error('Selecione uma etiqueta do Chatwoot.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetchWithAuth(`${API_URL}/leads/import/chatwoot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          label: selectedLabel,
          import_all_tags: importAllTags,
          custom_tag: customTag || null
        })
      }, activeClient?.id);

      if (response && response.ok) {
        const data = await response.json();
        if (data && data.status === 'success') {
          toast.success(data.message);
          onClose();
          onImportComplete();
        } else {
          toast.error(data?.detail || 'Erro ao iniciar importação.');
        }
      } else {
        let errorMsg = 'Erro ao iniciar importação.';
        try { const err = await response.json(); errorMsg = err?.detail || errorMsg; } catch (_) {}
        toast.error(errorMsg);
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao iniciar importação.');
    } finally {
      setLoading(false);
    }
  };

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
        toast.error('Erro ao ler arquivo.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao processar arquivo.');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!mapping.phone) {
      toast.error('A coluna de Telefone é obrigatória.');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mapping', JSON.stringify(mapping));

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
        setImportResult(result);
        setStep(3);
        onImportComplete();
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
    setImportSource(null);
    setSelectedLabel('');
    setImportAllTags(false);
    setCustomTag('');
  };

  return {
    activeClient, step, setStep, file, setFile, loading, setLoading,
    previewData, setPreviewData, mapping, setMapping, importResult, setImportResult,
    fileInputRef, importSource, setImportSource, chatwootLabels, setChatwootLabels,
    loadingLabels, setLoadingLabels, selectedLabel, setSelectedLabel,
    importAllTags, setImportAllTags, customTag, setCustomTag,
    fetchChatwootLabels, handleChatwootImport, handleFileChange, handleExecuteImport, reset
  };
}
