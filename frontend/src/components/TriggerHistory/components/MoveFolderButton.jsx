import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function MoveFolderButton({ trigger, folders, moveTriggerToFolder }) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, bottom: 0, left: 0, right: 0 });
  const btnRef = useRef(null);

  const updateCoords = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setCoords({ top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right });
    }
  };

  return (
    <span className="relative inline-flex" ref={btnRef}>
      <button
        onClick={() => { if (!isOpen) updateCoords(); setIsOpen(!isOpen); }}
        className={`p-1 rounded transition-colors ${trigger.folder ? '' : 'text-gray-300 hover:text-indigo-400 hover:bg-indigo-50 dark:text-gray-600 dark:hover:bg-indigo-900/20'}`}
        style={trigger.folder ? { color: trigger.folder.color } : undefined}
        title={trigger.folder ? `Pasta: ${trigger.folder.name}` : 'Mover para uma pasta'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill={trigger.folder ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
        </svg>
      </button>

      {isOpen && createPortal(
        <>
          <div className="fixed inset-0 z-[99999]" onClick={() => setIsOpen(false)}></div>
          <div
            className="fixed bg-white dark:bg-[#0f172a] border border-gray-100 dark:border-white/5 rounded-xl shadow-2xl z-[100000] overflow-y-auto p-1.5"
            style={{
              right: window.innerWidth - coords.right,
              top: coords.bottom + 4,
              minWidth: 180,
              maxWidth: 260,
              maxHeight: 260
            }}
          >
            {(!folders || folders.length === 0) ? (
              <div className="p-3 text-center text-gray-400 text-xs italic">Nenhuma pasta criada ainda</div>
            ) : (
              folders.map(folder => (
                <div
                  key={folder.id}
                  onClick={() => { moveTriggerToFolder(trigger.id, folder.id); setIsOpen(false); }}
                  className={`px-2.5 py-1.5 text-xs rounded-lg cursor-pointer flex items-center gap-2 ${trigger.folder_id === folder.id ? 'bg-indigo-50 dark:bg-indigo-900/30' : 'hover:bg-gray-100 dark:hover:bg-white/5'}`}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: folder.color || '#6366f1' }}></span>
                  <span className="truncate text-gray-800 dark:text-gray-200">{folder.name}</span>
                </div>
              ))
            )}
            {trigger.folder_id && (
              <div
                onClick={() => { moveTriggerToFolder(trigger.id, null); setIsOpen(false); }}
                className="px-2.5 py-1.5 text-xs rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 italic border-t border-gray-100 dark:border-white/5 mt-1"
              >
                Remover da pasta
              </div>
            )}
          </div>
        </>,
        document.body
      )}
    </span>
  );
}
