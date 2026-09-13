import React from 'react';
import { FiAlertCircle } from 'react-icons/fi';

export default function ExecutionParamsSection({
  numberOfContacts,
  setNumberOfContacts,
  delaySeconds,
  setDelaySeconds,
  concurrencyLimit,
  setConcurrencyLimit,
  ALL_ERRORS,
  selectedErrors,
  setSelectedErrors,
  setExplainError
}) {
  return (
    <>
      <div>
        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
          Quantidade de Contatos
        </label>
        <input
          type="number"
          min="1"
          max="20000"
          value={numberOfContacts}
          onChange={(e) => setNumberOfContacts(parseInt(e.target.value) || 1)}
          className="w-full bg-gray-900/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Delay (segundos)
          </label>
          <input
            type="number"
            min="0"
            value={delaySeconds}
            onChange={(e) => setDelaySeconds(parseInt(e.target.value) || 0)}
            className="w-full bg-gray-900/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Concorrência
          </label>
          <input
            type="number"
            min="1"
            max="100"
            value={concurrencyLimit}
            onChange={(e) => setConcurrencyLimit(parseInt(e.target.value) || 1)}
            className="w-full bg-gray-900/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all outline-none"
          />
        </div>
      </div>

      <div className="bg-amber-500/10 dark:bg-yellow-500/5 border border-amber-500/20 rounded-2xl p-4 mt-2 space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
          <FiAlertCircle className="shrink-0" /> Erros Simulados (Taxa de 10%)
        </span>
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          Selecione quais tipos de erro deseja que ocorram aleatoriamente durante o teste:
        </p>
        <div className="space-y-2.5 pt-1 border-l border-amber-500/20 pl-2">
          {ALL_ERRORS.map((errorReason) => {
            const isChecked = selectedErrors.includes(errorReason);
            return (
              <div key={errorReason} className="flex items-start justify-between gap-2 text-[11px] font-mono text-gray-650 dark:text-gray-400">
                <label className="flex items-start gap-2 cursor-pointer select-none flex-1">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {
                      if (isChecked) {
                        setSelectedErrors(prev => prev.filter(e => e !== errorReason));
                      } else {
                        setSelectedErrors(prev => [...prev, errorReason]);
                      }
                    }}
                    className="mt-0.5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500/20 w-3.5 h-3.5 bg-transparent transition-all"
                  />
                  <span className={isChecked ? "text-gray-800 dark:text-gray-200" : "text-gray-450 line-through"}>
                    {errorReason}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => setExplainError(errorReason)}
                  className="shrink-0 p-1 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10 dark:hover:bg-blue-500/5 rounded transition-all"
                  title="Explicar erro"
                >
                  <FiAlertCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
