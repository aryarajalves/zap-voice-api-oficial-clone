import React from 'react';
import { FiX, FiDatabase, FiTag } from 'react-icons/fi';

// Campos principais do contato que têm colunas dedicadas no banco
const MAIN_FIELD_LABELS = {
  email:          'E-mail',
  product_name:   'Produto',
  price:          'Valor',
  payment_method: 'Método de Pagamento',
  platform:       'Plataforma',
  last_event_type:'Último Evento',
};

// Campos que não devem aparecer (internos/meta)
const HIDDEN_VARIABLE_KEYS = new Set(['created_by_webhook', 'webhook_name']);

export default function CustomFieldsModal({ isOpen, onClose, lead }) {
  if (!isOpen || !lead) return null;

  // 1. Campos principais com valor
  const mainEntries = Object.entries(MAIN_FIELD_LABELS)
    .map(([key, label]) => ({ key, label, value: lead[key], isMain: true }))
    .filter(({ value }) => value !== null && value !== undefined && value !== '');

  // 2. Variáveis extras (exclui internas e as já mostradas)
  const variables = lead.variables || {};
  const extraEntries = Object.entries(variables)
    .filter(([key]) => !HIDDEN_VARIABLE_KEYS.has(key))
    .map(([key, value]) => ({ key, label: key, value, isMain: false }));

  const allEntries = [...mainEntries, ...extraEntries];

  // Info de origem (webhook_name / created_by_webhook)
  const webhookName = variables.webhook_name || lead.platform;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

      <div className="relative bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4 z-10">

        {/* Header */}
        <div className="flex justify-between items-start border-b border-gray-100 dark:border-gray-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-lg">
              <FiDatabase size={20} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                Dados Extraídos
              </h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                Lead: {lead.name || lead.phone}
                {webhookName && <span className="ml-2 text-blue-400">· via {webhookName}</span>}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Corpo */}
        <div className="max-h-[380px] overflow-y-auto custom-scrollbar pr-1 space-y-2.5">
          {allEntries.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-950/20 rounded-xl border border-gray-100 dark:border-gray-800">
              <FiTag size={36} className="mx-auto text-gray-300 dark:text-gray-700 mb-2" />
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                Nenhuma informação extraída para este contato ainda.
              </p>
            </div>
          ) : (
            <>
              {/* Campos principais */}
              {mainEntries.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Campos do Contato</p>
                  {mainEntries.map(({ key, label, value }) => (
                    <div
                      key={key}
                      className="flex justify-between items-center bg-blue-50/50 dark:bg-blue-950/10 p-3.5 rounded-xl border border-blue-100 dark:border-blue-900/20"
                    >
                      <span className="text-[10px] font-black text-blue-500 dark:text-blue-400 uppercase tracking-widest">
                        {label}
                      </span>
                      <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 break-all text-right max-w-[60%]">
                        {String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Variáveis extras */}
              {extraEntries.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1 mt-3">Campos Extras</p>
                  {extraEntries.map(({ key, value }) => (
                    <div
                      key={key}
                      className="flex justify-between items-center bg-gray-50 dark:bg-gray-950/20 p-3.5 rounded-xl border border-gray-100 dark:border-gray-800"
                    >
                      <span className="text-[10px] font-black text-rose-500 dark:text-rose-400 uppercase tracking-widest font-mono">
                        {key}
                      </span>
                      <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 break-all text-right max-w-[60%]">
                        {String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end mt-5 pt-3 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-gray-700 bg-gray-100 dark:bg-gray-800 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
