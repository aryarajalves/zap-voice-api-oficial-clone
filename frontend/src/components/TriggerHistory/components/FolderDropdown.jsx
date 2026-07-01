import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';

const PALETTE = ['#6366f1', '#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6', '#ec4899', '#64748b'];

const FolderIcon = ({ color, className = 'h-4 w-4' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill={color ? color : 'none'} stroke={color || 'currentColor'} strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
    </svg>
);

const FolderDropdown = ({
    folders, loadingFolders, selectedFolderId, onSelectFolder,
    createFolder, updateFolder, deleteFolder
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [coords, setCoords] = useState({ top: 0, bottom: 0, left: 0, width: 0 });
    const [direction, setDirection] = useState('down');
    const containerRef = useRef(null);

    const [newName, setNewName] = useState('');
    const [newColor, setNewColor] = useState(PALETTE[0]);
    const [creating, setCreating] = useState(false);

    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');
    const [editColor, setEditColor] = useState(PALETTE[0]);

    const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);

    const updateCoords = () => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            setDirection(spaceBelow < 320 ? 'up' : 'down');
            setCoords({ top: rect.top, bottom: rect.bottom, left: rect.left, width: rect.width });
        }
    };

    const closeDropdown = () => {
        setIsOpen(false);
        setEditingId(null);
        setConfirmingDeleteId(null);
    };

    const selectedFolder = folders.find(f => f.id === selectedFolderId) || null;

    const handleCreate = async () => {
        const name = newName.trim();
        if (!name || creating) return;
        setCreating(true);
        const folder = await createFolder(name, newColor);
        setCreating(false);
        if (folder) {
            setNewName('');
            setNewColor(PALETTE[0]);
        }
    };

    const startEditing = (folder) => {
        setEditingId(folder.id);
        setEditName(folder.name);
        setEditColor(folder.color || PALETTE[0]);
        setConfirmingDeleteId(null);
    };

    const saveEditing = async () => {
        const name = editName.trim();
        if (!name) return;
        await updateFolder(editingId, { name, color: editColor });
        setEditingId(null);
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => { if (isOpen) { closeDropdown(); } else { updateCoords(); setIsOpen(true); } }}
                title="Organizar disparos em pastas"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                    selectedFolder
                        ? 'text-white shadow-sm'
                        : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-indigo-400 hover:text-indigo-500'
                }`}
                style={selectedFolder ? { backgroundColor: selectedFolder.color, borderColor: selectedFolder.color } : undefined}
            >
                <FolderIcon color={selectedFolder ? '#fff' : undefined} />
                {selectedFolder ? selectedFolder.name : 'Pastas'}
            </button>

            {isOpen && createPortal(
                <>
                    <div className="fixed inset-0 z-[99999]" onClick={closeDropdown}></div>
                    <div
                        className="fixed bg-white dark:bg-[#0f172a] border border-gray-100 dark:border-white/5 rounded-xl shadow-2xl z-[100000] overflow-hidden flex flex-col"
                        style={{
                            left: coords.left,
                            minWidth: Math.max(coords.width, 260),
                            width: 'max-content',
                            maxWidth: 'min(320px, calc(100vw - 32px))',
                            maxHeight: '360px',
                            ...(direction === 'up'
                                ? { bottom: window.innerHeight - coords.top + 4 }
                                : { top: coords.bottom + 4 })
                        }}
                    >
                        <div className="max-h-60 overflow-y-auto p-1.5">
                            <div
                                className={`px-3 py-2 text-sm rounded-lg cursor-pointer mb-0.5 font-medium transition-colors ${!selectedFolderId ? 'bg-indigo-500 text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                                onClick={() => { onSelectFolder(null); closeDropdown(); }}
                            >
                                Todos os disparos
                            </div>

                            {loadingFolders && (
                                <div className="p-3 text-center text-gray-400 text-xs">Carregando pastas...</div>
                            )}

                            {!loadingFolders && folders.length === 0 && (
                                <div className="p-3 text-center text-gray-400 text-xs italic">Nenhuma pasta criada ainda</div>
                            )}

                            {folders.map(folder => {
                                const isEditing = editingId === folder.id;
                                const isConfirmingDelete = confirmingDeleteId === folder.id;

                                if (isEditing) {
                                    return (
                                        <div key={folder.id} className="p-2 mb-1 rounded-lg bg-gray-50 dark:bg-white/5 space-y-2" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                autoFocus
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(); if (e.key === 'Escape') setEditingId(null); }}
                                                className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none"
                                            />
                                            <div className="flex items-center gap-1 flex-wrap">
                                                {PALETTE.map(c => (
                                                    <button
                                                        key={c}
                                                        onClick={() => setEditColor(c)}
                                                        className={`w-5 h-5 rounded-full border-2 ${editColor === c ? 'border-gray-900 dark:border-white' : 'border-transparent'}`}
                                                        style={{ backgroundColor: c }}
                                                    />
                                                ))}
                                            </div>
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => setEditingId(null)} className="text-[11px] text-gray-500 hover:text-gray-700 font-medium">Cancelar</button>
                                                <button onClick={saveEditing} className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold">Salvar</button>
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div
                                        key={folder.id}
                                        className={`group px-2 py-2 text-sm rounded-lg cursor-pointer mb-0.5 flex items-center justify-between gap-2 transition-colors ${selectedFolderId === folder.id ? 'bg-indigo-50 dark:bg-indigo-900/30' : 'hover:bg-gray-100 dark:hover:bg-white/5'}`}
                                        onClick={() => { onSelectFolder(folder.id); closeDropdown(); }}
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: folder.color || '#6366f1' }}></span>
                                            <span className="truncate text-gray-800 dark:text-gray-200">{folder.name}</span>
                                            <span className="text-[10px] text-gray-400 shrink-0">{folder.trigger_count || 0}</span>
                                        </div>

                                        {isConfirmingDelete ? (
                                            <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                                <span className="text-[10px] text-red-500 font-semibold">Excluir?</span>
                                                <button onClick={() => setConfirmingDeleteId(null)} className="text-[10px] text-gray-500 hover:text-gray-700">Não</button>
                                                <button onClick={() => { deleteFolder(folder.id); setConfirmingDeleteId(null); }} className="text-[10px] text-red-600 font-bold hover:text-red-800">Sim</button>
                                            </div>
                                        ) : (
                                            <div className="hidden group-hover:flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                                <button onClick={() => startEditing(folder)} title="Renomear/Recolorir" className="text-gray-400 hover:text-indigo-500">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                </button>
                                                <button onClick={() => setConfirmingDeleteId(folder.id)} title="Excluir pasta" className="text-gray-400 hover:text-red-500">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="p-2 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-[#0b1120]/50 space-y-2" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1.5">
                                <input
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
                                    placeholder="Nova pasta..."
                                    className="flex-1 px-2 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500/40"
                                />
                                <button
                                    onClick={handleCreate}
                                    disabled={!newName.trim() || creating}
                                    className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-indigo-500 text-white disabled:opacity-40 hover:bg-indigo-600 transition-colors"
                                >
                                    + Criar
                                </button>
                            </div>
                            <div className="flex items-center gap-1 flex-wrap">
                                {PALETTE.map(c => (
                                    <button
                                        key={c}
                                        onClick={() => setNewColor(c)}
                                        className={`w-5 h-5 rounded-full border-2 ${newColor === c ? 'border-gray-900 dark:border-white' : 'border-transparent'}`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </>,
                document.body
            )}
        </div>
    );
};

export default FolderDropdown;
