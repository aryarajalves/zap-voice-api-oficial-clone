import React, { useState } from 'react';
import { FiUpload, FiLoader, FiAlertCircle } from 'react-icons/fi';

export default function ImportStep1Upload({
  fileInputRef,
  handleFileChange,
  loading
}) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFile = e.dataTransfer?.files?.[0];
    if (!droppedFile) return;
    handleFileChange({ target: { files: [droppedFile] } });
  };

  return (
    <div className="space-y-6">
      <div
        onClick={() => fileInputRef.current?.click()}
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
  );
}
