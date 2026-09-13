import React from 'react';

export default function TagsCell({ lead, onOpenTagsModal }) {
  if (!lead.tags) return <span className="text-[10px] text-gray-400 italic">Sem etiquetas</span>;

  const cleanedTags = lead.tags
    .replace(/[\[\]'"]/g, '')
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);

  if (cleanedTags.length === 0) return <span className="text-[10px] text-gray-400 italic">Sem etiquetas</span>;

  const prefVisible = lead.variables?.visible_tags;
  let displayedTags, hiddenTags;
  if (Array.isArray(prefVisible)) {
    displayedTags = cleanedTags.filter(t => prefVisible.includes(t));
    hiddenTags = cleanedTags.filter(t => !prefVisible.includes(t));
  } else {
    displayedTags = cleanedTags.slice(0, 3);
    hiddenTags = cleanedTags.slice(3);
  }

  return (
    <>
      {displayedTags.map((tag, idx) => (
        <span
          key={idx}
          className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50"
        >
          {tag}
        </span>
      ))}
      {displayedTags.length === 0 && <span className="text-[10px] text-gray-400 italic">Ocultas</span>}
      {hiddenTags.length > 0 && (
        <button
          type="button"
          onClick={() => onOpenTagsModal(lead)}
          className="px-2 py-0.5 bg-gray-150 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md text-[10px] font-bold transition-all shadow-sm cursor-pointer"
          title="Ver todas as etiquetas"
        >
          +{hiddenTags.length}
        </button>
      )}
    </>
  );
}
