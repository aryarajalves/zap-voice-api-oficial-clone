import React, { useState, useRef, useEffect } from 'react';
import { FiX, FiUpload, FiCheckCircle, FiAlertCircle, FiSettings, FiArrowRight, FiArrowLeft, FiLoader } from 'react-icons/fi';
import { API_URL } from '../config';
import { fetchWithAuth } from '../AuthContext';
import { useClient } from '../contexts/ClientContext';
import { toast } from 'react-hot-toast';

export default function ContactImportModal({ isOpen, onClose, onImportComplete }) {
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

  useEffect(() => {
    if (isOpen) {
      reset();
    }
  }, [isOpen]);

  if (!isOpen) return null;

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
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
              <FiUpload size={18} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">Importar Contatos</h3>
              <div className="flex items-center gap-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">Passo {step} de 3</p>
                {previewData && step === 2 && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full font-bold border border-blue-100 dark:border-blue-800/30">
                    {previewData.total_rows} contatos ({previewData.unique_rows} únicos)
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-400">
            <FiX size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-6">
              <div 
                onClick={() => fileInputRef.current.click()}
                className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-10 flex flex-col items-center justify-center gap-4 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 cursor-pointer transition-all group"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept=".csv,.xlsx,.xls" 
                  className="hidden" 
                />
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-full text-gray-400 group-hover:text-blue-500 transition-colors">
                  {loading ? <FiLoader className="animate-spin" size={32} /> : <FiUpload size={32} />}
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-700 dark:text-gray-300">
                    {loading ? 'Processando arquivo...' : 'Clique para selecionar ou arraste o arquivo'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Suporta CSV e Excel (.xlsx, .xls)</p>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 rounded-xl p-4 flex gap-3 text-amber-700 dark:text-amber-400">
                <FiAlertCircle className="shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold">Importante:</p>
                  <p>O sistema usa o número de telefone como chave. Se o contato já existir, ele será atualizado.</p>
                </div>
              </div>
            </div>
          )}

          {step === 2 && previewData && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Campos do Sistema</h4>
                  
                  <div className="space-y-3">
                    {[
                      { key: 'name', label: 'Nome', required: false },
                      { key: 'phone', label: 'Telefone', required: true },
                      { key: 'email', label: 'Email', required: false },
                      { key: 'tags', label: 'Etiquetas a Adicionar', required: false },
                      { key: 'remove_tags', label: 'Etiquetas a Remover', required: false },
                    ].map(field => (
                      <div key={field.key} className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          {field.label} {field.required && <span className="text-red-500">*</span>}
                        </label>
                        <select 
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                          value={mapping[field.key]}
                          onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                        >
                          <option value="">-- Ignorar --</option>
                          {previewData.headers.map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Prévia dos Dados</h4>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 overflow-x-auto max-h-[280px]">
                    <table className="w-full text-[10px] text-left border-collapse">
                      <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800">
                        <tr>
                          {previewData.headers.map(h => (
                            <th key={h} className="px-2 py-1.5 font-bold border-b border-gray-200 dark:border-gray-700 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {previewData.preview_rows.map((row, i) => (
                          <tr key={i}>
                            {row.map((cell, j) => (
                              <th key={j} className="px-2 py-1.5 font-normal text-gray-600 dark:text-gray-400 whitespace-nowrap">{String(cell)}</th>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && importResult && (
            <div className="py-10 flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-2">
                <FiCheckCircle size={48} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Sucesso!</h3>
                <p className="text-gray-500 dark:text-gray-400">{importResult.message}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 w-full max-w-xs mt-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700">
                  <p className="text-[10px] uppercase font-bold text-gray-400">Importados</p>
                  <p className="text-2xl font-bold text-emerald-600">{importResult.imported}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700">
                  <p className="text-[10px] uppercase font-bold text-gray-400">Erros</p>
                  <p className="text-2xl font-bold text-red-500">{importResult.errors}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <button 
            onClick={step === 1 ? onClose : step === 3 ? onClose : () => setStep(step - 1)}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-2 transition-colors"
          >
            {step === 1 ? 'Cancelar' : step === 3 ? 'Fechar' : (
              <><FiArrowLeft /> Voltar</>
            )}
          </button>

          {step === 2 && (
            <button 
              onClick={handleExecuteImport}
              disabled={loading || !mapping.phone}
              className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
            >
              {loading ? (
                <><FiLoader className="animate-spin" /> Processando...</>
              ) : (
                <><FiCheckCircle /> Finalizar Importação</>
              )}
            </button>
          )}

          {step === 3 && (
            <button 
              onClick={onClose}
              className="px-6 py-2 bg-gray-800 dark:bg-gray-700 text-white rounded-xl text-sm font-bold hover:bg-gray-900 dark:hover:bg-gray-600 transition-all"
            >
              Concluído
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
