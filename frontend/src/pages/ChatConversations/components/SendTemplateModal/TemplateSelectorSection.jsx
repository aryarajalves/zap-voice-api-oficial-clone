import React from 'react';

export default function TemplateSelectorSection({
  templates = [],
  selectedTemplate,
  onSelectTemplate
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
        Template
      </label>
      <select
        value={selectedTemplate?.name || ''}
        onChange={(e) => {
          const selected = templates.find(t => t.name === e.target.value);
          onSelectTemplate(selected || null);
        }}
        className="w-full bg-[#1e293b] border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
      >
        <option value="">Selecione um template...</option>
        {templates.map(tpl => (
          <option key={tpl.id || tpl.name} value={tpl.name}>
            {tpl.name} ({tpl.language})
          </option>
        ))}
      </select>
    </div>
  );
}
