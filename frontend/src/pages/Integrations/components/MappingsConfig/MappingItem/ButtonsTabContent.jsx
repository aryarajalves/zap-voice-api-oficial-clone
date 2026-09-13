import React from 'react';
import { FiMessageSquare } from 'react-icons/fi';
import ButtonActionsSection from '../../../../../components/BulkSender/steps/ButtonActionsSection';

export default function ButtonsTabContent({
  templateButtons,
  mapping,
  mIndex,
  updateMapping,
  funnels,
}) {
  return (
    <div className="p-6">
      {templateButtons.length > 0 ? (
        <div className="space-y-4">
          <div className="bg-blue-500/5 border border-blue-500/20 p-3.5 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-blue-300">Ações Interativas dos Botões</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Defina o que o sistema deve fazer quando o lead clicar em cada botão deste template.</p>
            </div>
            <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-400">
              {templateButtons.length} Botão(ões)
            </span>
          </div>

          <ButtonActionsSection
            templateButtons={templateButtons}
            buttonActions={mapping.button_actions || {}}
            setButtonActions={(newActions) => {
              const updated = typeof newActions === 'function' ? newActions(mapping.button_actions || {}) : newActions;
              updateMapping(mIndex, 'button_actions', updated);
            }}
            funnels={funnels || []}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-gray-50/50 dark:bg-white/[0.02] rounded-2xl border border-gray-100 dark:border-white/5">
          <FiMessageSquare size={36} className="text-gray-400 dark:text-gray-600 mb-3 opacity-60" />
          <h4 className="text-sm font-bold text-gray-300">Sem botões interativos</h4>
          <p className="text-xs text-gray-500 max-w-sm mt-1">
            O template selecionado atualmente não possui botões. Para configurar ações de clique, escolha um template com botões de resposta rápida.
          </p>
        </div>
      )}
    </div>
  );
}
