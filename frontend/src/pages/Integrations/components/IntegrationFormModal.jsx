import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import MappingsConfig from './MappingsConfig/index';
import {
  IntegrationFormModalHeader,
  IntegrationFormModalFooter,
  IntegrationConfigTab,
  UpsellProductsConfig
} from './IntegrationFormModal/index';

const IntegrationFormModal = ({
  isOpen,
  onClose,
  formData,
  setFormData,
  isSaving,
  onSave,
  editingIntegration,
  templates,
  funnels,
  chatwootLabels,
  setIsMappingGuideOpen,
  existingInternalTags
}) => {
  const [activeTab, setActiveTab] = useState('config');

  if (!isOpen) return null;

  const mappingCount = (formData?.mappings || []).length;
  const upsellCount = (formData?.upsell_products || []).length;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-6 animate-in fade-in duration-500">
      <div className="bg-white dark:bg-[#1e293b] rounded-3xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-[0_0_100px_rgba(59,130,246,0.15)] overflow-hidden border border-gray-100 dark:border-white/5 animate-in zoom-in-95 duration-300">

        {/* Header do Modal com abas de navegação */}
        <IntegrationFormModalHeader
          editingIntegration={editingIntegration}
          platform={formData?.platform}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          mappingCount={mappingCount}
          upsellCount={upsellCount}
        />

        {/* Conteúdo com scroll da aba ativa */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar bg-gray-50/30 dark:bg-transparent">
          <form className="max-w-5xl mx-auto" onSubmit={(e) => e.preventDefault()}>

            {/* Aba: Configuração */}
            {activeTab === 'config' && (
              <IntegrationConfigTab
                formData={formData}
                setFormData={setFormData}
              />
            )}

            {/* Aba: Upsell */}
            {activeTab === 'upsell' && (
              <div className="bg-white dark:bg-[#0b1120] border border-gray-100 dark:border-white/5 rounded-2xl p-6 shadow-inner">
                <UpsellProductsConfig
                  upsellProducts={formData?.upsell_products || []}
                  discoveredProducts={formData?.discovered_products || []}
                  onChange={(list) => setFormData({ ...formData, upsell_products: list })}
                />
              </div>
            )}

            {/* Aba: Gatilhos */}
            {activeTab === 'gatilhos' && (
              <MappingsConfig
                formData={formData}
                setFormData={setFormData}
                templates={templates}
                funnels={funnels}
                chatwootLabels={chatwootLabels}
                setIsMappingGuideOpen={setIsMappingGuideOpen}
                discoveredProducts={formData?.discovered_products || []}
                existingInternalTags={existingInternalTags}
              />
            )}

          </form>
        </div>

        {/* Footer do Modal com navegação e ações */}
        <IntegrationFormModalFooter
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onClose={onClose}
          onSave={onSave}
          isSaving={isSaving}
        />

      </div>
    </div>,
    document.body
  );
};

export default IntegrationFormModal;
