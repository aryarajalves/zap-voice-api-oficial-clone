import React from 'react';
import { FiMaximize2 } from 'react-icons/fi';
import ColumnCombobox from './ColumnCombobox';
import TagChipInput from './TagChipInput';

export {
  COUNTRY_TO_DDI_MAP,
  VALID_BRAZIL_DDDS,
  INTERNATIONAL_DDI_INFO,
  digitsOnly,
  parseDdiVal,
  detectPhoneOrigin,
  decomposeAndBuildPhone
} from '../phoneUtils';

import { decomposeAndBuildPhone } from '../phoneUtils';


export default function ImportStep2Mapping({
  previewData,
  mapping,
  setMapping,
  fixedTags,
  setFixedTags,
  fixedRemoveTags,
  setFixedRemoveTags,
  availableTags = [],
  renderPreviewTable,
  setIsPreviewMaximized,
  setIsPhonePreviewMaximized
}) {
  const isPhoneComposite = mapping.phone && typeof mapping.phone === 'object';

  const switchPhoneMode = (composite) => {
    if (composite) {
      setMapping({ ...mapping, phone: { mode: 'composite', ddi_column: '', ddd_column: '', number_column: '', manual_ddi: '' } });
    } else {
      setMapping({ ...mapping, phone: '' });
    }
  };

  const updatePhoneComposite = (field, value) => {
    setMapping({ ...mapping, phone: { ...mapping.phone, [field]: value } });
  };

  const getPhonePreviewSamples = () => {
    if (!previewData || !isPhoneComposite) return [];
    const { ddi_column, ddd_column, number_column, manual_ddi } = mapping.phone;
    if (!number_column) return [];
    const ddiIdx = ddi_column ? previewData.headers.indexOf(ddi_column) : -1;
    const dddIdx = ddd_column ? previewData.headers.indexOf(ddd_column) : -1;
    const numIdx = previewData.headers.indexOf(number_column);
    if (numIdx === -1) return [];
    return previewData.preview_rows.slice(0, 3).map(row => {
      const dddVal = dddIdx !== -1 ? row[dddIdx] : '';
      const numVal = row[numIdx];
      const rawDdiVal = ddiIdx !== -1 ? row[ddiIdx] : '';
      return decomposeAndBuildPhone(dddVal, numVal, rawDdiVal, manual_ddi);
    });
  };

  const renderSimpleField = (field) => (
    <div key={field.key} className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-1">
        {field.label} {field.required && <span className="text-red-500">*</span>}
      </label>
      <ColumnCombobox
        headers={previewData.headers}
        value={mapping[field.key]}
        onChange={(val) => setMapping({ ...mapping, [field.key]: val })}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Campos do Sistema</h4>
          
          <div className="space-y-3">
            {renderSimpleField({ key: 'name', label: 'Nome', required: false })}

            {/* Telefone: coluna única ou composto */}
            <div className="flex flex-col gap-1.5 pt-1 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  Telefone <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => switchPhoneMode(!isPhoneComposite)}
                  className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
                >
                  {isPhoneComposite ? 'Usar uma única coluna' : 'Dividido em várias colunas?'}
                </button>
              </div>

              {!isPhoneComposite ? (
                <ColumnCombobox
                  headers={previewData.headers}
                  value={mapping.phone}
                  onChange={(val) => setMapping({ ...mapping, phone: val })}
                />
              ) : (
                <div className="space-y-2 p-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider">Coluna DDI</p>
                      <ColumnCombobox
                        headers={previewData.headers}
                        value={mapping.phone.ddi_column || ''}
                        onChange={(val) => updatePhoneComposite('ddi_column', val)}
                        emptyLabel="-- Nenhuma --"
                        small
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider">Coluna DDD</p>
                      <ColumnCombobox
                        headers={previewData.headers}
                        value={mapping.phone.ddd_column || ''}
                        onChange={(val) => updatePhoneComposite('ddd_column', val)}
                        emptyLabel="-- Nenhuma --"
                        small
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider">Coluna Número <span className="text-red-500">*</span></p>
                    <ColumnCombobox
                      headers={previewData.headers}
                      value={mapping.phone.number_column || ''}
                      onChange={(val) => updatePhoneComposite('number_column', val)}
                      emptyLabel="-- Selecione --"
                      small
                    />
                  </div>

                  {!mapping.phone.ddi_column && (
                    <div className="flex flex-col gap-1">
                      <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider">
                        DDI manual (sem coluna) <span className="text-red-500">*</span>
                      </p>
                      <input
                        type="text"
                        placeholder="Ex: 55"
                        maxLength={4}
                        value={mapping.phone.manual_ddi || ''}
                        onChange={(e) => updatePhoneComposite('manual_ddi', e.target.value.replace(/\D/g, ''))}
                        className="w-full px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-[11px] outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                      />
                    </div>
                  )}

                  <p className="text-[9px] text-gray-400 leading-relaxed">
                    As colunas selecionadas serão unidas (DDI + DDD + Número) para formar o telefone completo.
                  </p>

                  {mapping.phone.number_column && (
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-lg space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[9px] text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider">Prévia do número montado</p>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-2 text-[8px] font-semibold">
                            <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-sm bg-purple-400"></span>DDI</span>
                            <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-sm bg-blue-400"></span>DDD</span>
                            <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-sm bg-emerald-400"></span>Número</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsPhonePreviewMaximized(true)}
                            title="Ver todos os números montados"
                            className="p-1 text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                          >
                            <FiMaximize2 size={11} />
                          </button>
                        </div>
                      </div>
                      {getPhonePreviewSamples().length === 0 ? (
                        <p className="text-xs text-gray-400 italic">Sem dados para pré-visualizar.</p>
                      ) : getPhonePreviewSamples().map((p, i) => {
                        const fullLength = p.ddi.length + p.ddd.length + p.number.length;
                        const tooShort = fullLength > 0 && fullLength < 10;
                        return (
                          <div key={i} className="flex items-center gap-2">
                            <div className="flex items-center gap-0.5 font-mono text-xs">
                              <span className={`px-1 py-0.5 rounded ${p.ddi ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                                {p.ddi || '--'}
                              </span>
                              <span className={`px-1 py-0.5 rounded ${p.ddd ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                                {p.ddd || '--'}
                              </span>
                              <span className={`px-1 py-0.5 rounded ${p.number ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                                {p.number || '--'}
                              </span>
                            </div>
                            {tooShort && <span className="text-[9px] text-red-500 font-semibold">⚠ muito curto</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {renderSimpleField({ key: 'email', label: 'Email', required: false })}
            {renderSimpleField({ key: 'created_at', label: 'Data e Horário de Chegada', required: false })}

            {/* Etiquetas a Adicionar */}
            <div className="flex flex-col gap-1.5 pt-1 border-t border-gray-100 dark:border-gray-700">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Etiquetas a Adicionar</label>
              <div className="flex flex-col gap-1">
                <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider">Via coluna CSV</p>
                <ColumnCombobox
                  headers={previewData.headers}
                  value={mapping.tags}
                  onChange={(val) => setMapping({ ...mapping, tags: val })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider">Ou digitar manualmente (para todos)</p>
                <TagChipInput
                  tags={fixedTags}
                  setTags={setFixedTags}
                  availableTags={availableTags}
                  placeholder="ex: lead, cliente-vip..."
                />
              </div>
            </div>

            {/* Etiquetas a Remover */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Etiquetas a Remover</label>
              <div className="flex flex-col gap-1">
                <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider">Via coluna CSV</p>
                <ColumnCombobox
                  headers={previewData.headers}
                  value={mapping.remove_tags}
                  onChange={(val) => setMapping({ ...mapping, remove_tags: val })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider">Ou digitar manualmente (para todos)</p>
                <TagChipInput
                  tags={fixedRemoveTags}
                  setTags={setFixedRemoveTags}
                  availableTags={availableTags}
                  placeholder="ex: prospecto, lista-fria..."
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Prévia dos Dados</h4>
            <button
              type="button"
              onClick={() => setIsPreviewMaximized(true)}
              title="Maximizar prévia"
              className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            >
              <FiMaximize2 size={13} />
            </button>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 overflow-x-auto max-h-[280px]">
            {renderPreviewTable(true)}
          </div>
        </div>
      </div>
    </div>
  );
}
