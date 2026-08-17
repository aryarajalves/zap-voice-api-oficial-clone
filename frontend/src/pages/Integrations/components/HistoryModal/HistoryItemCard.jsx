import React, { useState, useEffect, useMemo } from 'react';
import { FiZap, FiRefreshCw, FiSettings, FiXCircle, FiAlertTriangle } from 'react-icons/fi';
import { translateError, getFlatKeys } from './utils/HistoryHelpers';

// Subcomponentes Modulares
import HistoryItemHeader from './components/HistoryItemHeader';
import HistoryPayloadViewer from './components/HistoryPayloadViewer';
import HistoryMappingEditor from './components/HistoryMappingEditor';
import HistoryExtractedData from './components/HistoryExtractedData';

const HistoryItemCard = ({
  item,
  selectedHistoryIds,
  handleToggleSelect,
  handleResendWebhook,
  isResending,
  setConfirmDeleteHistory,
  setEditJsonModal,
  setMaximizedJson,
  handleSyncHistory,
  isSyncing,
  integration,
  handleUpdateCustomFieldsMapping
}) => {
  const [showMappingEditor, setShowMappingEditor] = useState(false);
  const [mappingFields, setMappingFields] = useState(() => {
    const custom = integration?.custom_fields_mapping || {};
    return {
      name: custom.name || '',
      phone: custom.phone || '',
      email: custom.email || '',
      product_name: custom.product_name || '',
      price: custom.price || '',
      payment_method: custom.payment_method || '',
    };
  });

  useEffect(() => {
    if (integration?.custom_fields_mapping) {
      setMappingFields({
        name: integration.custom_fields_mapping.name || '',
        phone: integration.custom_fields_mapping.phone || '',
        email: integration.custom_fields_mapping.email || '',
        product_name: integration.custom_fields_mapping.product_name || '',
        price: integration.custom_fields_mapping.price || '',
        payment_method: integration.custom_fields_mapping.payment_method || '',
      });
    }
  }, [integration]);

  const payloadKeys = useMemo(() => getFlatKeys(item?.payload), [item?.payload]);

  const handleOpenMapping = () => {
    const custom = integration?.custom_fields_mapping || {};
    setMappingFields({
      name: custom.name || '',
      phone: custom.phone || '',
      email: custom.email || '',
      product_name: custom.product_name || '',
      price: custom.price || '',
      payment_method: custom.payment_method || '',
    });
    setShowMappingEditor(prev => !prev);
  };

  return (
    <div className="group relative border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden bg-white dark:bg-[#1e293b]/40 hover:scale-[1.015] transition-all duration-300 hover:border-blue-500/50 dark:hover:border-blue-600/50 hover:shadow-2xl dark:hover:shadow-blue-900/10">
      {/* Header Superior */}
      <HistoryItemHeader
        item={item}
        selectedHistoryIds={selectedHistoryIds}
        handleToggleSelect={handleToggleSelect}
        handleResendWebhook={handleResendWebhook}
        isResending={isResending}
        setConfirmDeleteHistory={setConfirmDeleteHistory}
      />

      {/* Conteúdo Principal */}
      <div className="p-6 overflow-hidden">
        {/* Visualizador de Payload */}
        <HistoryPayloadViewer
          item={item}
          setEditJsonModal={setEditJsonModal}
          setMaximizedJson={setMaximizedJson}
        />

        {/* Painel de Dados Extraídos */}
        {item.processed_data && (
          <div className="mt-5 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-2xl border border-blue-100/50 dark:border-blue-800/20 shadow-sm relative overflow-hidden group/data">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] dark:opacity-[0.05] pointer-events-none group-hover/data:scale-110 transition-transform duration-700">
              <FiZap size={120} className="text-blue-600" />
            </div>

            {/* Toolbar do Mapeamento / Sincronização */}
            <div className="text-[10px] text-blue-600 dark:text-blue-400 font-black uppercase mb-4 flex items-center justify-between tracking-widest relative z-10">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
                Dados extraídos pelo Sistema
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenMapping}
                  className="text-[10px] bg-white dark:bg-[#1e293b] border border-blue-200 dark:border-blue-800/50 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all flex items-center gap-1.5 active:scale-95"
                  title="Configurar mapeamento de campos personalizado"
                >
                  <FiSettings size={10} />
                  Mapear Campos
                </button>
                <button
                  type="button"
                  onClick={() => handleSyncHistory(item.id)}
                  disabled={isSyncing[item.id]}
                  className="text-[10px] bg-white dark:bg-[#1e293b] border border-blue-200 dark:border-blue-800/50 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                  title="Re-processar extração com as regras atuais"
                >
                  <FiRefreshCw size={10} className={isSyncing[item.id] ? 'animate-spin' : ''} />
                  {isSyncing[item.id] ? 'Sincronizando...' : 'Sincronizar Dados'}
                </button>
              </div>
            </div>

            {/* Painel Expansível de Mapeamento Manual */}
            {showMappingEditor && (
              <HistoryMappingEditor
                mappingFields={mappingFields}
                setMappingFields={setMappingFields}
                setShowMappingEditor={setShowMappingEditor}
                integration={integration}
                handleUpdateCustomFieldsMapping={handleUpdateCustomFieldsMapping}
                payloadKeys={payloadKeys}
              />
            )}

            {/* Dados Estruturados */}
            <HistoryExtractedData
              item={item}
              integration={integration}
            />
          </div>
        )}

        {/* Mensagem de Erro / Alerta */}
        {item.error_message && (
          item.status === 'skipped' ? (
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-400/5 rounded-xl border border-amber-100 dark:border-amber-400/20 text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-2">
              <FiAlertTriangle size={14} /> <strong>Alerta:</strong> {translateError(item.error_message)}
            </div>
          ) : (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-400/5 rounded-xl border border-red-100 dark:border-red-400/20 text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-2">
              <FiXCircle size={14} /> <strong>Erro:</strong> {translateError(item.error_message)}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default HistoryItemCard;
