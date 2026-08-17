import React, { useState, useRef, useEffect } from 'react';
import { FiCheckSquare, FiSquare, FiMaximize2 } from 'react-icons/fi';
import { LEVEL_COLORS, levelIcon, highlightText } from '../utils/logHelpers';

const ROW_HEIGHT = 28; // px por linha (altura fixa)
const BUFFER     = 40; // linhas extras acima/abaixo da janela visível

export default function VirtualLogList({ items, filterText, selectedIdx, onToggleSelect, onOpenDetail }) {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContainerHeight(el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const totalHeight = items.length * ROW_HEIGHT;
  const startIdx    = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER);
  const endIdx      = Math.min(items.length, Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + BUFFER);
  const visibleItems = items.slice(startIdx, endIdx);

  return (
    <div
      ref={containerRef}
      className="overflow-y-auto max-h-[60vh] font-mono text-xs"
      onScroll={e => setScrollTop(e.currentTarget.scrollTop)}
    >
      {/* Espaço total para manter a scrollbar correta */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ position: 'absolute', top: startIdx * ROW_HEIGHT, left: 0, right: 0 }}>
          {visibleItems.map(line => {
            const colors = LEVEL_COLORS[line.level] || { bg: '', text: 'text-gray-400', badge: '' };
            const isSelected = selectedIdx.has(line.idx);
            return (
              <div
                key={line.idx}
                style={{ height: ROW_HEIGHT }}
                className={`group flex items-center gap-2 px-4 border-b border-gray-800/40 hover:bg-white/[0.03] transition-colors cursor-pointer ${colors.bg} ${isSelected ? 'bg-blue-500/10 ring-1 ring-inset ring-blue-500/30' : ''}`}
                onClick={() => onOpenDetail(line)}
              >
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onToggleSelect(line.idx); }}
                  className="flex-shrink-0 text-gray-500 hover:text-blue-400 transition-colors"
                  title="Selecionar linha"
                >
                  {isSelected ? <FiCheckSquare size={13} className="text-blue-400" /> : <FiSquare size={13} />}
                </button>
                <span className="text-gray-600 select-none w-10 text-right flex-shrink-0">{line.idx + 1}</span>
                <span>{levelIcon(line.level)}</span>
                {line.level && (
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-black flex-shrink-0 ${colors.badge}`}>
                    {line.level}
                  </span>
                )}
                <span className={`truncate flex-1 ${colors.text}`}>
                  {filterText ? highlightText(line.raw, filterText) : line.raw}
                </span>
                <FiMaximize2 size={11} className="text-gray-600 flex-shrink-0 opacity-0 group-hover:opacity-100" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
