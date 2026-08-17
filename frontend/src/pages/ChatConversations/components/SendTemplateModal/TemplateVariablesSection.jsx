import React from 'react';
import { FiUser, FiChevronRight } from 'react-icons/fi';

export default function TemplateVariablesSection({
  variables,
  handleVariableChange,
  contactName,
  contactFirstName
}) {
  const sortedKeys = Object.keys(variables).sort((a, b) => parseInt(a) - parseInt(b));

  if (sortedKeys.length === 0) return null;

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <FiUser size={13} className="text-blue-400" />
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Variáveis</span>
      </div>

      {sortedKeys.map(vNum => (
        <div key={vNum} className="flex flex-col gap-2">
          <label className="text-xs font-medium text-gray-400">Variável {`{{${vNum}}}`}</label>
          <input
            id={`template-var-${vNum}`}
            type="text"
            placeholder={`Valor para {{${vNum}}}`}
            value={variables[vNum]}
            onChange={(e) => handleVariableChange(vNum, e.target.value)}
            className="w-full bg-[#0f172a] border border-white/10 text-white rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm placeholder-gray-600"
          />
          {contactName && (
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] text-gray-600">Atalhos:</span>
              {contactFirstName && (
                <button
                  type="button"
                  onClick={() => handleVariableChange(vNum, contactFirstName)}
                  className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 hover:bg-blue-500/25 transition-colors cursor-pointer"
                >
                  <FiChevronRight size={9} />{contactFirstName}
                </button>
              )}
              {contactName !== contactFirstName && (
                <button
                  type="button"
                  onClick={() => handleVariableChange(vNum, contactName)}
                  className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 hover:bg-purple-500/25 transition-colors cursor-pointer"
                >
                  <FiChevronRight size={9} />{contactName}
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
