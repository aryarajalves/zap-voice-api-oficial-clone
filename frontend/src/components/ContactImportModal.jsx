import React from 'react';
import { FiX, FiUpload, FiCheckCircle, FiAlertCircle, FiSettings, FiArrowRight, FiArrowLeft, FiLoader } from 'react-icons/fi';
import { useContactImport } from './ContactImportModal/hooks/useContactImport';

function TagChipInput({ tags, setTags, placeholder }) {
  const [input, setInput] = React.useState('');

  const addTag = (val) => {
    const trimmed = val.trim().toLowerCase().replace(/\s+/g, '-');
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  };

  const handleBlur = () => {
    if (input.trim()) addTag(input);
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-1 p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg min-h-[34px] focus-within:ring-2 focus-within:ring-blue-500 transition-all cursor-text">
        {tags.map((tag, i) => (
          <span key={i} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded text-[10px] font-medium">
            {tag}
            <button
              type="button"
              onClick={() => setTags(tags.filter((_, idx) => idx !== i))}
              className="ml-0.5 hover:text-red-500 transition-colors leading-none text-[11px] font-bold"
            >
              &times;
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[80px] text-xs bg-transparent outline-none text-gray-800 dark:text-white placeholder:text-gray-400"
        />
      </div>
      <p className="text-[9px] text-gray-400">Enter ou vírgula para adicionar · Backspace para remover</p>
    </div>
  );
}

export default function ContactImportModal({ isOpen, onClose, onImportComplete }) {
  const {
    activeClient, step, setStep, loading, previewData, mapping, setMapping, importResult,
    fileInputRef, importSource, setImportSource, chatwootLabels, loadingLabels, selectedLabel, setSelectedLabel,
    importAllTags, setImportAllTags, customTag, setCustomTag,
    fixedTags, setFixedTags, fixedRemoveTags, setFixedRemoveTags,
    handleChatwootImport, handleFileChange, handleExecuteImport, reset
  } = useContactImport(onClose, onImportComplete);

  const [selectedTagsForModal, setSelectedTagsForModal] = React.useState(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFile = e.dataTransfer?.files?.[0];
    if (!droppedFile) return;
    // Simulate a synthetic event that handleFileChange expects
    handleFileChange({ target: { files: [droppedFile] } });
  };

  const isTagsColumn = (header) => {
    if (!header) return false;
    const hLower = header.toLowerCase();
    return hLower === mapping.tags?.toLowerCase() || 
           hLower === mapping.remove_tags?.toLowerCase() ||
           hLower.includes('tag') || 
           hLower.includes('etiqueta');
  };

  const parseCellTags = (cellValue) => {
    if (!cellValue) return [];
    let val = String(cellValue).trim();
    if (val.startsWith('[') && val.endsWith(']')) {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) {
          return parsed.map(t => String(t).trim()).filter(Boolean);
        }
      } catch (e) {}
    }
    const cleaned = val.replace(/[\[\]'"]/g, '');
    return cleaned.split(',').map(t => t.trim()).filter(Boolean);
  };

  if (!isOpen) return null;

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
                    {previewData.total_rows} contatos ({previewData.unique_rows} únicos) - {previewData.total_rows} linhas
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={() => { reset(); onClose(); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-400">
            <FiX size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(100vh-180px)]">
          {step === 1 && !importSource && (
            <div className="space-y-4 py-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                Escolha o método de importação de contatos desejado:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  onClick={() => setImportSource('file')}
                  className="border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/10 dark:hover:bg-blue-900/10 cursor-pointer transition-all group text-center"
                >
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
                    <FiUpload size={28} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 dark:text-gray-200">Importar via Arquivo</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Carregar planilha Excel (.xlsx) ou arquivo CSV</p>
                  </div>
                </div>

                <div 
                  onClick={() => setImportSource('chatwoot')}
                  className="border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/10 dark:hover:bg-blue-900/10 cursor-pointer transition-all group text-center"
                >
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full">
                    <FiSettings size={28} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 dark:text-gray-200">Importar do Chatwoot</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Importar contatos associados a uma etiqueta no Chatwoot</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 1 && importSource === 'file' && (
            <div className="space-y-6">
              <div
                onClick={() => fileInputRef.current.click()}
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all group ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 scale-[1.01]'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-900/10'
                }`}
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

          {step === 1 && importSource === 'chatwoot' && (
            <div className="space-y-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Etiqueta do Chatwoot <span className="text-red-500">*</span>
                </label>
                {loadingLabels ? (
                  <div className="flex items-center gap-2 py-2 text-xs text-gray-500">
                    <FiLoader className="animate-spin" /> Carregando etiquetas do Chatwoot...
                  </div>
                ) : (
                  <select 
                    value={selectedLabel}
                    onChange={(e) => setSelectedLabel(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-gray-800 dark:text-white"
                  >
                    <option value="">-- Selecione uma etiqueta --</option>
                    {chatwootLabels.map(lbl => (
                      <option key={lbl.id || lbl.title} value={lbl.title}>{lbl.title}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900/30 p-3.5 rounded-xl border border-gray-100 dark:border-gray-700/50">
                <input 
                  type="checkbox"
                  id="importAllTags"
                  checked={importAllTags}
                  onChange={(e) => setImportAllTags(e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-700 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <label htmlFor="importAllTags" className="text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                  Importar todas as etiquetas originais do contato no Chatwoot
                </label>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Adicionar etiqueta personalizada para todos os importados (Opcional)
                </label>
                <input 
                  type="text"
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  placeholder="ex: importado-chatwoot, leads-maio"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-gray-800 dark:text-white"
                />
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-xl p-4 flex gap-3 text-blue-700 dark:text-blue-400">
                <FiAlertCircle className="shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold">Aviso de Segundo Plano:</p>
                  <p>A importação iniciará em segundo plano. Os contatos serão criados ou atualizados e as etiquetas selecionadas serão aplicadas gradualmente.</p>
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

                    {/* Etiquetas a Adicionar */}
                    <div className="flex flex-col gap-1.5 pt-1 border-t border-gray-100 dark:border-gray-700">
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Etiquetas a Adicionar</label>
                      <div className="flex flex-col gap-1">
                        <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider">Via coluna CSV</p>
                        <select
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                          value={mapping.tags}
                          onChange={(e) => setMapping({ ...mapping, tags: e.target.value })}
                        >
                          <option value="">-- Ignorar --</option>
                          {previewData.headers.map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider">Ou digitar manualmente (para todos)</p>
                        <TagChipInput
                          tags={fixedTags}
                          setTags={setFixedTags}
                          placeholder="ex: lead, cliente-vip..."
                        />
                      </div>
                    </div>

                    {/* Etiquetas a Remover */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Etiquetas a Remover</label>
                      <div className="flex flex-col gap-1">
                        <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider">Via coluna CSV</p>
                        <select
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                          value={mapping.remove_tags}
                          onChange={(e) => setMapping({ ...mapping, remove_tags: e.target.value })}
                        >
                          <option value="">-- Ignorar --</option>
                          {previewData.headers.map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider">Ou digitar manualmente (para todos)</p>
                        <TagChipInput
                          tags={fixedRemoveTags}
                          setTags={setFixedRemoveTags}
                          placeholder="ex: prospecto, lista-fria..."
                        />
                      </div>
                    </div>
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
                            {row.map((cell, j) => {
                              const header = previewData.headers[j];
                              const isTagCol = isTagsColumn(header);
                              return (
                                <th key={j} className="px-2 py-1.5 font-normal text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                  {isTagCol ? (
                                    (() => {
                                      const tags = parseCellTags(cell);
                                      if (tags.length === 0) return <span className="text-gray-400">-</span>;
                                      const displayedTags = tags.slice(0, 3);
                                      const hasMore = tags.length > 3;
                                      return (
                                        <div className="flex flex-wrap gap-1 items-center max-w-[240px]">
                                          {displayedTags.map((tag, idx) => (
                                            <span key={idx} className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-[9px] font-medium border border-blue-100 dark:border-blue-800/30 whitespace-nowrap">
                                              {tag}
                                            </span>
                                          ))}
                                          {hasMore && (
                                            <button 
                                              onClick={() => {
                                                const nameColIdx = previewData.headers.findIndex(h => {
                                                  const hLower = h.toLowerCase();
                                                  return hLower === mapping.name?.toLowerCase() || hLower.includes('nome') || hLower.includes('name');
                                                });
                                                const contactName = nameColIdx !== -1 ? String(row[nameColIdx]) : `Contato #${i + 1}`;
                                                setSelectedTagsForModal({ tags, contactName });
                                              }}
                                              className="px-1.5 py-0.5 bg-gray-150 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded text-[9px] font-bold transition-all shadow-sm"
                                              title="Ver todas as etiquetas"
                                            >
                                              +{tags.length - 3}
                                            </button>
                                          )}
                                        </div>
                                      );
                                    })()
                                  ) : (
                                    String(cell)
                                  )}
                                </th>
                              );
                            })}
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
                <p className="text-gray-550 dark:text-gray-400">{importResult.message}</p>
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
            onClick={step === 1 ? (importSource ? () => { reset(); } : onClose) : step === 3 ? onClose : () => setStep(step - 1)}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-2 transition-colors"
          >
            {step === 1 ? (importSource ? <><FiArrowLeft /> Voltar</> : 'Cancelar') : step === 3 ? 'Fechar' : (
              <><FiArrowLeft /> Voltar</>
            )}
          </button>

          {step === 1 && importSource === 'chatwoot' && (
            <button 
              onClick={handleChatwootImport}
              disabled={loading || !selectedLabel}
              className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              {loading ? (
                <><FiLoader className="animate-spin" /> Importando...</>
              ) : (
                <><FiCheckCircle /> Iniciar Importação</>
              )}
            </button>
          )}

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

      {/* Modal para ver todas as etiquetas */}
      {selectedTagsForModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-200 p-6">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">
              Todas as etiquetas de: <span className="text-blue-500">{selectedTagsForModal.contactName}</span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Este contato possui {selectedTagsForModal.tags.length} etiquetas associadas:
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-[200px] overflow-y-auto p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-800">
              {selectedTagsForModal.tags.map((tag, idx) => (
                <span key={idx} className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-xs font-medium border border-blue-100 dark:border-blue-800/30">
                  {tag}
                </span>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setSelectedTagsForModal(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-lg transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
