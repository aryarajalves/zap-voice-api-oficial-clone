import React, { useState } from 'react';
import { FiZap, FiUser, FiCode, FiSliders, FiMessageSquare } from 'react-icons/fi';
import { EVENT_TYPES, PLATFORM_EVENT_TYPES } from '../../../constants';
import VariablesSection from '../VariablesSection';
import MappingItemHeader from './MappingItemHeader';
import MappingItemTabs from './MappingItemTabs';
import TriggerTabContent from './TriggerTabContent';
import ButtonsTabContent from './ButtonsTabContent';
import ContactTabContent from './ContactTabContent';
import AdvancedTabContent from './AdvancedTabContent';

export default function MappingItem({
  mapping,
  mIndex,
  isExpanded,
  toggleMapping,
  updateMapping,
  removeMapping,
  templates,
  funnels,
  chatwootLabels,
  updateVariable,
  addVariable,
  removeVariable,
  templateVars,
  customFieldsMapping,
  followupTemplateVars,
  addFollowupVariable,
  removeFollowupVariable,
  updateFollowupVariable,
  discoveredProducts,
  existingInternalTags,
  platform,
}) {
  const [activeTab, setActiveTab] = useState('disparo');
  const allowedEvents = platform && PLATFORM_EVENT_TYPES[platform]
    ? EVENT_TYPES.filter(e => PLATFORM_EVENT_TYPES[platform].includes(e.value))
    : null;

  const selectedTpl = templates.find(t => String(t.id) === String(mapping.template_id));
  const buttonsComponent = selectedTpl?.components?.find(c => c.type === 'BUTTONS');
  const templateButtons = buttonsComponent?.buttons?.map(b => b.text) || [];

  const tabs = [
    { id: 'disparo',   label: 'Disparo',   icon: FiZap },
    { 
      id: 'botoes', 
      label: 'Ação dos Botões', 
      icon: FiMessageSquare, 
      badge: templateButtons.length > 0 ? templateButtons.length : null 
    },
    { 
      id: 'variaveis', 
      label: 'Variáveis', 
      icon: FiCode, 
      badge: (templateVars || []).length > 0 ? (templateVars || []).length : null 
    },
    { id: 'contato',   label: 'Contato & Tags', icon: FiUser },
    { id: 'avancado',  label: 'Avançado',  icon: FiSliders },
  ];

  return (
    <div className="group bg-white dark:bg-[#1e293b]/40 rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden hover:border-blue-500/30 transition-all duration-300">
      <MappingItemHeader
        mapping={mapping}
        mIndex={mIndex}
        isExpanded={isExpanded}
        toggleMapping={toggleMapping}
        updateMapping={updateMapping}
        removeMapping={removeMapping}
        templates={templates}
      />

      {isExpanded && (
        <div className="animate-in slide-in-from-top-4 duration-300">
          <MappingItemTabs
            tabs={tabs}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />

          {activeTab === 'disparo' && (
            <TriggerTabContent
              mapping={mapping}
              mIndex={mIndex}
              updateMapping={updateMapping}
              templates={templates}
              funnels={funnels}
              discoveredProducts={discoveredProducts}
              platform={platform}
              allowedEvents={allowedEvents}
              selectedTpl={selectedTpl}
              templateButtons={templateButtons}
              onGoToButtonsTab={() => setActiveTab('botoes')}
            />
          )}

          {activeTab === 'botoes' && (
            <ButtonsTabContent
              templateButtons={templateButtons}
              mapping={mapping}
              mIndex={mIndex}
              updateMapping={updateMapping}
              funnels={funnels}
            />
          )}

          {activeTab === 'variaveis' && (
            <div className="p-5">
              <VariablesSection
                mapping={mapping}
                mIndex={mIndex}
                updateMapping={updateMapping}
                updateVariable={updateVariable}
                addVariable={addVariable}
                removeVariable={removeVariable}
                templateVars={templateVars}
                customFieldsMapping={customFieldsMapping}
                templates={templates}
              />
            </div>
          )}

          {activeTab === 'contato' && (
            <ContactTabContent
              mapping={mapping}
              mIndex={mIndex}
              updateMapping={updateMapping}
              chatwootLabels={chatwootLabels}
              existingInternalTags={existingInternalTags}
            />
          )}

          {activeTab === 'avancado' && (
            <AdvancedTabContent
              mapping={mapping}
              mIndex={mIndex}
              updateMapping={updateMapping}
              templates={templates}
              followupTemplateVars={followupTemplateVars}
              addFollowupVariable={addFollowupVariable}
              removeFollowupVariable={removeFollowupVariable}
              updateFollowupVariable={updateFollowupVariable}
              customFieldsMapping={customFieldsMapping}
            />
          )}
        </div>
      )}
    </div>
  );
}
