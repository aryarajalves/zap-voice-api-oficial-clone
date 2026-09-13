import React from 'react';
import StatCard from './StatCard';

export default function FinancialSummaryCards({ totals, freeRatio }) {
  if (!totals) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      <StatCard
        title="Total Disparado"
        value={totals.total_sent.toLocaleString('pt-BR')}
        sub={`${totals.total_triggers} disparo${totals.total_triggers !== 1 ? 's' : ''}`}
        color="blue"
        icon="📤"
      />
      <StatCard
        title="Templates Pagos"
        value={totals.paid_sent.toLocaleString('pt-BR')}
        sub={`${totals.paid_triggers} disparo${totals.paid_triggers !== 1 ? 's' : ''}`}
        color="red"
        icon="💳"
      />
      <StatCard
        title="Mensagens Gratuitas"
        value={totals.free_sent.toLocaleString('pt-BR')}
        sub={`${freeRatio}% do total · ${totals.free_triggers} disparo${totals.free_triggers !== 1 ? 's' : ''}`}
        color="green"
        icon="🎁"
      />
      <StatCard
        title="Custo Total"
        value={`R$ ${totals.total_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
        sub="Templates pagos na Meta"
        color="amber"
        icon="💰"
      />
      <StatCard
        title="Economia Estimada"
        value={`R$ ${totals.estimated_savings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
        sub="Enviando como msg de sessão"
        color="purple"
        icon="📈"
      />
    </div>
  );
}
