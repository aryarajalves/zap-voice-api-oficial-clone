import React from 'react';

function StatCard({ title, value, sub, color = 'blue', icon }) {
  const colors = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700',
    amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700',
  };
  return (
    <div className={`rounded-xl border p-5 flex flex-col gap-1 ${colors[color]}`}>
      <div className="flex items-center gap-2 text-sm font-medium opacity-80 mb-1">
        <span>{icon}</span>
        {title}
      </div>
      <div className="text-3xl font-bold">{value}</div>
      {sub && <div className="text-xs opacity-70 mt-1">{sub}</div>}
    </div>
  );
}

export default function FinancialSummaryCards({ totals }) {
  if (!totals) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total Faturado"
        value={`R$ ${(totals.total_revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
        sub="Vendas aprovadas e pagas"
        color="green"
        icon="💰"
      />
      <StatCard
        title="Vendas Aprovadas"
        value={(totals.total_sales || 0).toLocaleString('pt-BR')}
        sub="Quantidade de conversões"
        color="blue"
        icon="✅"
      />
      <StatCard
        title="Reembolsos"
        value={(totals.total_refunds || 0).toLocaleString('pt-BR')}
        sub="Estornos efetuados"
        color="purple"
        icon="🔄"
      />
    </div>
  );
}
