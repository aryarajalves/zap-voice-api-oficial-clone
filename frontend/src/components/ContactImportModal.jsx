import React, { useState } from 'react';
import { FiX, FiUpload, FiCheckCircle, FiArrowLeft, FiLoader } from 'react-icons/fi';
import { useContactImport, getPhoneMappingError } from './ContactImportModal/hooks/useContactImport';

// Subcomponentes Modulares
import ImportStep1Upload from './ContactImportModal/components/ImportStep1Upload';
import ImportStep2Mapping from './ContactImportModal/components/ImportStep2Mapping';
import ImportStep3Success from './ContactImportModal/components/ImportStep3Success';
import PhonePreviewModal from './ContactImportModal/components/PhonePreviewModal';
import MaximizedDataPreviewModal from './ContactImportModal/components/MaximizedDataPreviewModal';
import TagsPreviewModal from './ContactImportModal/components/TagsPreviewModal';

export default function ContactImportModal({ isOpen, onClose, onImportComplete }) {
  const {
    activeClient, step, setStep, loading, previewData, mapping, setMapping, importResult,
    fileInputRef, file,
    fixedTags, setFixedTags, fixedRemoveTags, setFixedRemoveTags,
    handleFileChange, handleExecuteImport, reset
  } = useContactImport(onClose, onImportComplete);

  const [selectedTagsForModal, setSelectedTagsForModal] = useState(null);
  const [isPreviewMaximized, setIsPreviewMaximized] = useState(false);
  const [isPhonePreviewMaximized, setIsPhonePreviewMaximized] = useState(false);

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
      } catch {}
    }
    const cleaned = val.replace(/[\[\]'"]/g, '');
    return cleaned.split(',').map(t => t.trim()).filter(Boolean);
  };

  const renderPreviewTable = (compact) => {
    if (!previewData) return null;
    const textSize = compact ? 'text-[10px]' : 'text-xs';
    const cellPad = compact ? 'px-2 py-1.5' : 'px-3 py-2.5';
    return (
      <table className={`w-full ${textSize} text-left border-collapse`}>
        <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800">
          <tr>
            {previewData.headers.map(h => (
              <th key={h} className={`${cellPad} font-bold border-b border-gray-200 dark:border-gray-700 whitespace-nowrap`}>{h}</th>
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
                  <th key={j} className={`${cellPad} font-normal text-gray-600 dark:text-gray-400 whitespace-nowrap`}>
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
                                type="button"
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
    );
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
          <button type="button" onClick={() => { reset(); onClose(); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-400">
            <FiX size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(100vh-180px)]">
          {step === 1 && (
            <ImportStep1Upload
              fileInputRef={fileInputRef}
              handleFileChange={handleFileChange}
              loading={loading}
            />
          )}

          {step === 2 && previewData && (
            <ImportStep2Mapping
              previewData={previewData}
              mapping={mapping}
              setMapping={setMapping}
              fixedTags={fixedTags}
              setFixedTags={setFixedTags}
              fixedRemoveTags={fixedRemoveTags}
              setFixedRemoveTags={setFixedRemoveTags}
              renderPreviewTable={renderPreviewTable}
              setIsPreviewMaximized={setIsPreviewMaximized}
              setIsPhonePreviewMaximized={setIsPhonePreviewMaximized}
            />
          )}

          {step === 3 && importResult && (
            <ImportStep3Success
              importResult={importResult}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <button
            type="button"
            onClick={step === 1 ? onClose : step === 3 ? onClose : () => setStep(step - 1)}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-2 transition-colors"
          >
            {step === 1 ? 'Cancelar' : step === 3 ? 'Fechar' : (
              <><FiArrowLeft /> Voltar</>
            )}
          </button>

          {step === 2 && (
            <button 
              type="button"
              onClick={handleExecuteImport}
              disabled={loading || !!getPhoneMappingError(mapping.phone)}
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
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-800 dark:bg-gray-700 text-white rounded-xl text-sm font-bold hover:bg-gray-900 dark:hover:bg-gray-600 transition-all"
            >
              Concluído
            </button>
          )}
        </div>
      </div>

      {/* Modais de Prévia Auxiliares */}
      <MaximizedDataPreviewModal
        isOpen={isPreviewMaximized}
        onClose={() => setIsPreviewMaximized(false)}
        previewData={previewData}
        renderPreviewTable={renderPreviewTable}
      />

      <PhonePreviewModal
        isOpen={isPhonePreviewMaximized}
        onClose={() => setIsPhonePreviewMaximized(false)}
        file={file}
        mapping={mapping}
        activeClient={activeClient}
      />

      <TagsPreviewModal
        selectedTagsForModal={selectedTagsForModal}
        onClose={() => setSelectedTagsForModal(null)}
      />
    </div>
  );
}
