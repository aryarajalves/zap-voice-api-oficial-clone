import React, { useState } from 'react';

export default function TagChipInput({ tags = [], setTags, placeholder }) {
  const [input, setInput] = useState('');

  const addTag = (val) => {
    const trimmed = val.trim().toLowerCase().replace(/\s+/g, '-');
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  };

  const handleBlur = () => {
    if (input.trim()) addTag(input);
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-1 p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg min-h-[34px] focus-within:ring-2 focus-within:ring-blue-500 transition-all cursor-text">
        {tags.map((tag, i) => (
          <span key={i} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded text-[10px] font-medium">
            {tag}
            <button
              type="button"
              onClick={() => setTags(tags.filter((_, idx) => idx !== i))}
              className="ml-0.5 hover:text-red-500 transition-colors leading-none text-[11px] font-bold"
            >
              &times;
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[80px] text-xs bg-transparent outline-none text-gray-800 dark:text-white placeholder:text-gray-400"
        />
      </div>
      <p className="text-[9px] text-gray-400">Enter ou vírgula para adicionar · Backspace para remover</p>
    </div>
  );
}
