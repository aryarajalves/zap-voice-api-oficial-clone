import React from 'react';

export default function MetaCostsCard({ metaData, loading }) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-6"></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="h-16 bg-gray-100 dark:bg-gray-700/50 rounded"></div>
          <div className="h-16 bg-gray-100 dark:bg-gray-700/50 rounded"></div>
          <div className="h-16 bg-gray-100 dark:bg-gray-700/50 rounded"></div>
        </div>
      </div>
    );
  }

  if (!metaData) return null;

  const { quota, costs, counts } = metaData;
  const percentUsed = quota?.percent_used || 0;

  // Cor da barra de progresso da franquia de serviço
  let progressColor = 'bg-emerald-500';
  if (percentUsed >= 100) {
    progressColor = 'bg-rose-500';
  } else if (percentUsed >= 80) {
    progressColor = 'bg-amber-500';
  }

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-700/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              Nova Política de Cobrança Meta (Vigência 01/10/2026)
            </h2>
            {metaData?.month && (
              <span className="text-xs px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold uppercase tracking-wider">
                {metaData.month}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Monitoramento em tempo real de mensagens de serviço, templates e franquia gratuita de 1.000 mensagens.
          </p>
        </div>

        {/* Fatura e Projeção */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs text-gray-500 dark:text-gray-400 block font-medium">Fatura Atual (Mês)</span>
            <span className="text-xl font-extrabold text-gray-900 dark:text-white">
              R$ {(costs?.total_cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block"></div>
          <div className="text-right bg-blue-50/80 dark:bg-blue-900/20 px-3 py-1.5 rounded-xl border border-blue-100 dark:border-blue-800/40">
            <span className="text-[11px] text-blue-600 dark:text-blue-400 block font-semibold">Projeção Fechamento</span>
            <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
              ~ R$ {(costs?.projected_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Franquia Mensal de Serviço */}
      <div className="bg-white dark:bg-gray-700/40 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              🎁 Franquia Gratuita de Serviço (SAC/Chat)
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-medium">
              1.000 grátis/mês
            </span>
          </div>
          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            {quota?.used || 0} de {quota?.total || 1000} ({percentUsed}%)
          </div>
        </div>

        {/* Track Bar */}
        <div className="w-full bg-gray-100 dark:bg-gray-600 h-2.5 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${progressColor}`}
            style={{ width: `${Math.min(100, percentUsed)}%` }}
          ></div>
        </div>

        {/* Status Text */}
        <div className="flex justify-between items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
          <span>
            {quota?.remaining > 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                Restam {quota.remaining} mensagens gratuitas neste mês.
              </span>
            ) : (
              <span className="text-rose-600 dark:text-rose-400 font-medium">
                Franquia atingida. {quota?.billable_service_count || 0} mensagens excedentes tarifadas a R$ 0,035/cada.
              </span>
            )}
          </span>
          <span className="text-gray-500 dark:text-gray-400">
            Economia da cota: R$ {(costs?.savings_quota || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Grid de Métricas por Categoria */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Marketing */}
        <div className="bg-white dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span className="font-semibold text-gray-700 dark:text-gray-300">📢 Marketing / Promocional</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-600">R$ 0,35 / msg</span>
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
              {(counts?.marketing_count || 0).toLocaleString('pt-BR')} <span className="text-xs font-normal text-gray-500">msgs</span>
            </div>
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-2 font-medium">
            Custo: <span className="font-bold text-gray-800 dark:text-gray-200">R$ {(costs?.marketing_cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Serviço / SAC */}
        <div className="bg-white dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span className="font-semibold text-gray-700 dark:text-gray-300">💬 Serviço / Atendimento</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-600">R$ 0,035 / msg</span>
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
              {(counts?.service_count || 0).toLocaleString('pt-BR')} <span className="text-xs font-normal text-gray-500">msgs</span>
            </div>
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-2 font-medium">
            Custo faturável: <span className="font-bold text-gray-800 dark:text-gray-200">R$ {(costs?.service_cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Utilidade */}
        <div className="bg-white dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span className="font-semibold text-gray-700 dark:text-gray-300">⚙️ Utilidade & Transacionais</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-600">R$ 0,035 / msg</span>
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
              {(counts?.utility_count || 0).toLocaleString('pt-BR')} <span className="text-xs font-normal text-gray-500">msgs</span>
            </div>
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-2 font-medium">
            Custo: <span className="font-bold text-gray-800 dark:text-gray-200">R$ {(costs?.utility_cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
