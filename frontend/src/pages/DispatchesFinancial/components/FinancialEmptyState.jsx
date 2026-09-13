import React from 'react';

export default function FinancialEmptyState() {
  return (
    <div className="text-center py-16 text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="text-4xl mb-3">📊</div>
      <p className="font-medium">Nenhum disparo concluído encontrado.</p>
      <p className="text-sm mt-1">Os dados aparecem após os disparos serem concluídos.</p>
    </div>
  );
}
