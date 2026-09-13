import React from 'react';
import TemplatePreview from '../../../BulkSender/common/TemplatePreview';

export default function TemplatePreviewSection({ selectedTemplate, templateParams }) {
  return (
    <div className="flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-slate-800/60 pt-6 md:pt-0 md:pl-6">
      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4 w-full text-left">
        Visualização do Template
      </label>
      {selectedTemplate ? (
        <TemplatePreview template={selectedTemplate} params={templateParams} />
      ) : (
        <div className="flex flex-col items-center justify-center text-center p-8 bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl w-full h-[300px]">
          <span className="text-4xl mb-3">📱</span>
          <p className="text-xs font-black text-slate-500 uppercase tracking-widest">
            Selecione um template para visualizar a prévia
          </p>
        </div>
      )}
    </div>
  );
}
