import React from 'react';
import { FiEdit2 } from 'react-icons/fi';

export default function HistoryMappingEditor({
  mappingFields,
  setMappingFields,
  setShowMappingEditor,
  integration,
  handleUpdateCustomFieldsMapping,
  payloadKeys
}) {
  const handleAddKeyToField = (field, keyToAdd) => {
    const current = mappingFields[field] || '';
    const parts = current.split(',').map(p => p.trim()).filter(Boolean);
    if (!parts.includes(keyToAdd)) {
      parts.push(keyToAdd);
    }
    setMappingFields(prev => ({ ...prev, [field]: parts.join(', ') }));
  };

  const getAvailableKeysForField = (fieldValue) => {
    const parts = (fieldValue || '').split(',').map(p => p.trim()).filter(Boolean);
    return payloadKeys.filter(k => !parts.includes(k));
  };

  const fieldsConfig = [
    { key: 'name', label: 'Campo de Nome', placeholder: 'Ex: contact_name, name' },
    { key: 'phone', label: 'Campo de Telefone', placeholder: 'Ex: contact_phone, phone' },
    { key: 'email', label: 'Campo de E-mail', placeholder: 'Ex: contact_email, email' },
    { key: 'product_name', label: 'Campo de Produto', placeholder: 'Ex: product_name, offer_name' },
    { key: 'price', label: 'Campo de Valor', placeholder: 'Ex: price, charge_price' },
    { key: 'payment_method', label: 'Método de Pagamento', placeholder: 'Ex: payment_type, method' },
  ];

  return (
    <div className="mb-5 p-5 bg-slate-900/90 border border-white/10 rounded-2xl relative z-10 space-y-4 shadow-xl">
      <div className="text-[10px] font-black uppercase text-blue-400 tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
        <FiEdit2 size={12} /> Mapeamento Manual de Campos (Multi-fallbacks: separe chaves por vírgula)
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
        {fieldsConfig.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="block text-gray-400 font-bold mb-1">{label}</label>
            <input
              type="text"
              value={mappingFields[key]}
              onChange={(e) => setMappingFields(prev => ({ ...prev, [key]: e.target.value }))}
              placeholder={placeholder}
              className="w-full bg-[#0b1120] border border-white/10 rounded-xl px-3 py-1.5 font-bold text-gray-200 outline-none focus:border-blue-500 text-xs"
            />
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleAddKeyToField(key, e.target.value);
                  e.target.value = '';
                }
              }}
              className="mt-1 w-full bg-slate-800 text-[10px] text-gray-400 rounded border border-white/5 py-1 outline-none cursor-pointer"
            >
              <option value="">+ Selecionar do JSON...</option>
              {getAvailableKeysForField(mappingFields[key]).map(k => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
        <button
          type="button"
          onClick={() => setShowMappingEditor(false)}
          className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-lg text-[10px] uppercase tracking-wider transition-all"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={async () => {
            const success = await handleUpdateCustomFieldsMapping(integration.id, mappingFields);
            if (success) {
              setShowMappingEditor(false);
            }
          }}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[10px] uppercase tracking-wider transition-all shadow-md shadow-blue-500/20"
        >
          Salvar Regra
        </button>
      </div>
    </div>
  );
}
