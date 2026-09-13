import React from 'react';
import { useFollowUpOptions } from './hooks/useFollowUpOptions';
import FollowUpToggle from './components/FollowUpToggle';
import FollowUpBasicSettings from './components/FollowUpBasicSettings';
import FollowUpBusinessHours from './components/FollowUpBusinessHours';
import FollowUpTemplateVariables from './components/FollowUpTemplateVariables';
import FollowUpManualVariables from './components/FollowUpManualVariables';

const FollowUpSection = ({
  mapping = {},
  mIndex,
  updateMapping,
  templates = [],
  followupTemplateVars = [],
  addFollowupVariable,
  removeFollowupVariable,
  updateFollowupVariable,
  customFieldsMapping = {}
}) => {
  const {
    isActive,
    needsConfig,
    dynamicBodyOptions,
    dynamicHeaderOptions
  } = useFollowUpOptions({
    mapping,
    templates,
    followupTemplateVars,
    customFieldsMapping
  });

  return (
    <div className="pt-6 border-t border-gray-50 dark:border-slate-800 space-y-4">
      {/* Switch Principal */}
      <FollowUpToggle
        isActive={isActive}
        onToggle={(checked) => updateMapping(mIndex, 'followup_active', checked)}
      />

      {/* Configurações Adicionais do Follow-up (Só exibe se ativado) */}
      {isActive && (
        <div className="p-5 bg-gray-50/50 dark:bg-white/[0.01] border border-gray-100 dark:border-white/5 rounded-2xl space-y-6 animate-in slide-in-from-top-3 duration-500">
          {/* Template, Tempo de Espera e Flag de Horário Comercial */}
          <FollowUpBasicSettings
            mapping={mapping}
            mIndex={mIndex}
            updateMapping={updateMapping}
            templates={templates}
          />

          {/* Definição Detalhada do Horário Comercial */}
          <FollowUpBusinessHours
            mapping={mapping}
            mIndex={mIndex}
            updateMapping={updateMapping}
          />

          {/* Variáveis Detectadas do Template */}
          <FollowUpTemplateVariables
            mapping={mapping}
            mIndex={mIndex}
            updateMapping={updateMapping}
            followupTemplateVars={followupTemplateVars}
            dynamicBodyOptions={dynamicBodyOptions}
            dynamicHeaderOptions={dynamicHeaderOptions}
            updateFollowupVariable={updateFollowupVariable}
          />

          {/* Variáveis Manuais / Cabeçalho */}
          <FollowUpManualVariables
            mapping={mapping}
            mIndex={mIndex}
            needsConfig={needsConfig}
            followupTemplateVars={followupTemplateVars}
            dynamicBodyOptions={dynamicBodyOptions}
            dynamicHeaderOptions={dynamicHeaderOptions}
            addFollowupVariable={addFollowupVariable}
            updateFollowupVariable={updateFollowupVariable}
            removeFollowupVariable={removeFollowupVariable}
          />
        </div>
      )}
    </div>
  );
};

export default FollowUpSection;
