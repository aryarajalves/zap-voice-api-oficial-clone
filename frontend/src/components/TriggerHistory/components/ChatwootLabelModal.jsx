import React, { useState, useEffect } from 'react';

export default function ChatwootLabelModal({ isOpen, onClose, onConfirm, loading, count, clientId }) {
  const [selected, setSelected] = useState([]);
  const [labels, setLabels] = useState([]);
  const [fetchingLabels, setFetchingLabels] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isOpen) { setSelected([]); setSearch(''); return; }
    setFetchingLabels(true);
    import('../../../config').then(({ API_URL }) => {
      import('../../../AuthContext').then(({ fetchWithAuth }) => {
        fetchWithAuth(`${API_URL}/chat/labels`, {}, clientId)
          .then(r => r.ok ? r.json() : [])
          .then(data => {
            const items = Array.isArray(data) ? data.map(item => {
              if (typeof item === 'string') return { title: item, name: item, color: '#6366f1' };
              if (item && typeof item === 'object') return { title: item.name || item.title || '', name: item.name || item.title || '', color: item.color || '#6366f1' };
              return { title: String(item || ''), name: String(item || ''), color: '#6366f1' };
            }).filter(l => l.title) : [];
            setLabels(items);
          })
          .catch(() => setLabels([]))
          .finally(() => setFetchingLabels(false));
      });
    });
  }, [isOpen, clientId]);

  if (!isOpen) return null;

  const filtered = labels.filter(l => {
    const title = l.title || l.name || '';
    return title.toLowerCase().includes(search.toLowerCase());
  });

  const toggle = (title) => {
    setSelected(prev => prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]);
  };

  const handleConfirm = () => {
    if (selected.length > 0) onConfirm(selected);
  };

  const hasExactMatch = labels.some(l => (l.title || '').toLowerCase() === search.trim().toLowerCase());

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black bg-opacity-60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col max-h-[90vh] border border-gray-100 dark:border-white/5 animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏷️</span>
            <div>
              <h3 className="font-bold text-gray-800 dark:text-white text-base">Etiquetar Atendimento</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {count > 0 ? `${count} contato(s) selecionado(s)` : 'Todos os contatos do disparo'}
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="px-5 pt-4 pb-2">
          <input
            autoFocus
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar ou criar etiqueta..."
            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
          />
        </div>

        {/* Selected chips */}
        {selected.length > 0 && (
          <div className="px-5 pb-2 flex flex-wrap gap-1.5 max-h-20 overflow-y-auto custom-scrollbar">
            {selected.map(s => (
              <span key={s} className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
                {s}
                <button type="button" onClick={() => toggle(s)} className="hover:text-indigo-900 dark:hover:text-white ml-1 leading-none text-xs cursor-pointer">×</button>
              </span>
            ))}
          </div>
        )}

        {/* Label list */}
        <div className="overflow-y-auto flex-1 px-5 pb-2 custom-scrollbar" style={{ minHeight: 80, maxHeight: 260 }}>
          {search.trim() !== '' && !hasExactMatch && (
            <button
              type="button"
              onClick={() => {
                const newLabelStr = search.trim();
                setLabels(prev => [{ title: newLabelStr, name: newLabelStr, color: '#6366f1' }, ...prev]);
                toggle(newLabelStr);
                setSearch('');
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-dashed border-indigo-300/50 dark:border-indigo-500/20 font-bold mb-2 transition-all justify-center cursor-pointer"
            >
              <span>➕ Criar etiqueta "{search.trim()}"</span>
            </button>
          )}

          {fetchingLabels ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
            </div>
          ) : filtered.length === 0 && search.trim() === '' ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-6">
              Nenhuma etiqueta cadastrada. Digite acima para criar.
            </p>
          ) : (
            <div className="space-y-1">
              {filtered.map(l => {
                const title = l.title || l.name || '';
                const color = l.color || '#6366f1';
                const isChecked = selected.includes(title);
                return (
                  <button
                    key={title}
                    type="button"
                    onClick={() => toggle(title)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                      isChecked
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0 border-2" style={{ backgroundColor: isChecked ? color : 'transparent', borderColor: color }}></span>
                    <span className="flex-1 text-left font-medium truncate">{title}</span>
                    {isChecked && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-indigo-600 dark:text-indigo-400 shrink-0">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 dark:border-gray-700 flex gap-2 justify-between items-center bg-gray-50/30 dark:bg-gray-800/30">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {selected.length > 0 ? `${selected.length} selecionada(s)` : 'Nenhuma selecionada'}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setSelected([]); onClose(); }}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-gray-200 dark:hover:bg-gray-600 transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={selected.length === 0 || loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-indigo-950/20 active:scale-95 cursor-pointer"
            >
              {loading
                ? <><div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div> Aplicando...</>
                : 'Aplicar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
