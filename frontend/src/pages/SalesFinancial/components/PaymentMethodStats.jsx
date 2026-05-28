import React from 'react';

export default function PaymentMethodStats({ transactions }) {
  // Normalize payment method names
  const normalizeMethod = (method) => {
    if (!method) return 'Outros';
    const m = method.toLowerCase().trim();
    if (m.includes('pix')) return 'Pix';
    if (m.includes('boleto') || m.includes('billet')) return 'Boleto';
    if (m.includes('cart') || m.includes('credit') || m.includes('débito') || m.includes('debit')) return 'Cartão de Crédito';
    return 'Outros';
  };

  // Group and calculate statistics
  const statsMap = {
    'Pix': { count: 0, revenue: 0.0, color: 'bg-emerald-500', textClass: 'text-emerald-500' },
    'Cartão de Crédito': { count: 0, revenue: 0.0, color: 'bg-blue-500', textClass: 'text-blue-500' },
    'Boleto': { count: 0, revenue: 0.0, color: 'bg-amber-500', textClass: 'text-amber-500' },
    'Outros': { count: 0, revenue: 0.0, color: 'bg-gray-500', textClass: 'text-gray-500' }
  };

  let totalCount = 0;
  let totalRevenue = 0;

  transactions.forEach(tx => {
    // Only count for revenue if the sale/event is approved/paid
    const isApproved = tx.event_type === 'compra_aprovada';
    const normalized = normalizeMethod(tx.payment_method);
    
    statsMap[normalized].count += 1;
    if (isApproved) {
      statsMap[normalized].revenue += tx.price || 0;
    }
    
    totalCount += 1;
    if (isApproved) {
      totalRevenue += tx.price || 0;
    }
  });

  const sortedStats = Object.keys(statsMap).map(key => {
    const count = statsMap[key].count;
    const revenue = statsMap[key].revenue;
    const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;
    return {
      name: key,
      count,
      revenue,
      percentage,
      color: statsMap[key].color,
      textClass: statsMap[key].textClass
    };
  }).sort((a, b) => b.count - a.count);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col justify-between h-full">
      <div>
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
            Vendas por Forma de Pagamento
          </h3>
        </div>
        <div className="p-6 space-y-5">
          {totalCount > 0 ? (
            sortedStats.map(stat => (
              <div key={stat.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-gray-700 dark:text-gray-300">{stat.name}</span>
                  <div className="space-x-1.5 text-right">
                    <span className="text-gray-400 dark:text-gray-500">{stat.count} {stat.count === 1 ? 'venda' : 'vendas'}</span>
                    <span className={stat.textClass}>({stat.percentage.toFixed(1)}%)</span>
                  </div>
                </div>
                {/* Progress bar container */}
                <div className="w-full bg-gray-100 dark:bg-gray-700/50 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`${stat.color} h-full rounded-full transition-all duration-500`}
                    style={{ width: `${stat.percentage}%` }}
                  />
                </div>
                {stat.revenue > 0 && (
                  <div className="text-[10px] text-right font-medium text-gray-500 dark:text-gray-400">
                    Faturamento BRL: <span className="font-bold text-gray-700 dark:text-gray-300">R$ {stat.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-xs italic text-gray-400 dark:text-gray-500">
              Nenhuma venda registrada no período selecionado.
            </div>
          )}
        </div>
      </div>
      {totalCount > 0 && (
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 text-xs flex justify-between font-bold text-gray-700 dark:text-gray-300">
          <span>Total Geral:</span>
          <span>{totalCount} {totalCount === 1 ? 'Transação' : 'Transações'}</span>
        </div>
      )}
    </div>
  );
}
