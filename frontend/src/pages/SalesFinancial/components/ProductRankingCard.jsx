import React from 'react';

export default function ProductRankingCard({ topProducts = [] }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col justify-between">
      <div>
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
            Ranking de Produtos
          </h3>
        </div>
        {topProducts.length > 0 ? (
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {topProducts.slice(0, 10).map((product, idx) => (
              <div key={idx} className="px-6 py-3.5 flex items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                <div className="min-w-0">
                  <p className="font-medium text-sm text-gray-800 dark:text-gray-200 truncate">
                    {idx + 1}. {product.product_name}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {product.sales_count} venda{product.sales_count !== 1 ? 's' : ''}
                  </p>
                </div>
                <span className="text-sm font-semibold text-green-600 dark:text-green-400 whitespace-nowrap">
                  R$ {(product.total_revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">
            Nenhum produto vendido no período.
          </div>
        )}
      </div>
    </div>
  );
}
