import React from 'react';

export default function TemplatePreviewSection({ previewText }) {
  if (!previewText) return null;

  return (
    <div className="bg-[#0a0f1d] border border-white/5 rounded-xl p-4">
      <div className="text-[10px] font-semibold text-gray-500 uppercase mb-2 tracking-wider">
        Pré-visualização
      </div>
      <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed font-mono">
        {previewText}
      </div>
    </div>
  );
}
