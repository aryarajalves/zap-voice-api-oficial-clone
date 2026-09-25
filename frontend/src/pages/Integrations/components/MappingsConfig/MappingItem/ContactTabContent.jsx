import React from 'react';
import { FiSettings } from 'react-icons/fi';
import SearchableSelect from '../../SearchableSelect';
import InternalTagsInput from '../InternalTagsInput';
import ContactSaveFieldsSection from '../ContactSaveFieldsSection';

export default function ContactTabContent({
  mapping,
  mIndex,
  updateMapping,
  chatwootLabels,
  existingInternalTags,
}) {
  const shouldUpdateContact = mapping.update_contact_on_trigger !== false;

  const formattedChatLabels = React.useMemo(() => {
    const list = chatwootLabels || [];
    const seen = new Set();
    const result = [];
    list.forEach(l => {
      const raw = typeof l === 'object' ? (l.title || l.name || l.label) : l;
      if (!raw) return;
      const clean = String(raw).trim();
      if (!clean) return;
      const key = clean.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ value: clean, label: clean });
      }
    });
    return result;
  }, [chatwootLabels]);

  return (
    <div className="p-5 space-y-4">
      {/* Toggle: Atualizar contato */}
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/[0.03] rounded-xl border border-gray-100 dark:border-white/5">
        <div>
          <p className="text-xs font-black text-gray-700 dark:text-gray-200 uppercase tracking-widest">
            Atualizar contato na aba Contatos
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Quando ativado, o contato é criado/atualizado na aba Contatos ao disparar este gatilho
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer ml-4 flex-shrink-0">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={shouldUpdateContact}
            onChange={(e) => updateMapping(mIndex, 'update_contact_on_trigger', e.target.checked)}
          />
          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Etiquetas Chat */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5 px-1">
            <FiSettings size={12} /> Etiquetas na conversa (Chat Local)
          </label>
          <SearchableSelect
            isMulti={true}
            options={formattedChatLabels}
            value={mapping.chatwoot_label || []}
            onChange={(val) => updateMapping(mIndex, 'chatwoot_label', val)}
            placeholder="Adicione etiquetas..."
            colorClass="focus-within:ring-purple-500/20"
          />
        </div>

        {/* Etiquetas Internas */}
        {shouldUpdateContact && (
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5 px-1">
              <FiSettings size={12} /> Etiquetas Internas (ZapVoice)
            </label>
            <InternalTagsInput
              value={mapping.internal_tags || ''}
              onChange={(val) => updateMapping(mIndex, 'internal_tags', val)}
              existingTags={existingInternalTags}
              placeholder="Digite uma tag e aperte Enter..."
            />
          </div>
        )}
      </div>

      {/* Campos do contato */}
      {shouldUpdateContact && (
        <ContactSaveFieldsSection mapping={mapping} mIndex={mIndex} updateMapping={updateMapping} />
      )}
    </div>
  );
}
