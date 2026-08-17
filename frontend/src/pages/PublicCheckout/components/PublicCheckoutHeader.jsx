import React from 'react';

export default function PublicCheckoutHeader({ pageConfig }) {
  return (
    <div className="text-center space-y-3">
      {pageConfig?.badge_text && (
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-950/60 border border-blue-500/30 text-blue-400 text-xs font-semibold shadow-lg shadow-blue-500/10">
          <span>{pageConfig.badge_text}</span>
        </div>
      )}

      {/* Título Principal */}
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
        {pageConfig?.title || 'Aplicação Mentoria'}
      </h1>

      {/* Descrição / Subtítulo */}
      {pageConfig?.description && (
        <p className="text-gray-400 text-sm max-w-xs mx-auto leading-relaxed">
          {pageConfig.description}
        </p>
      )}
    </div>
  );
}
