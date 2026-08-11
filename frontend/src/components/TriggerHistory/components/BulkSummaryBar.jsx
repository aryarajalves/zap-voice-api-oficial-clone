import React, { useState } from 'react';

const BulkSummaryBar = ({ selectedIds, setSelectedIds, triggers, folders, bulkMoveToFolder }) => {
    const [folderMenuOpen, setFolderMenuOpen] = useState(false);

    if (selectedIds.length === 0) return null;

    const selectedTriggers = (Array.isArray(triggers) ? triggers : []).filter(t => selectedIds.includes(t.id));
    const totals = selectedTriggers.reduce((acc, curr) => ({
        total_contacts: acc.total_contacts + (curr.total_contacts || (curr.contacts_list?.length) || 0),
        sent: acc.sent + (curr.total_sent || 0),
        delivered: acc.delivered + (curr.total_delivered || 0),
        read: acc.read + (curr.total_read || 0),
        interactions: acc.interactions + (curr.total_interactions || 0),
        blocked: acc.blocked + (curr.total_blocked || 0),
        skipped: acc.skipped + (curr.total_skipped || 0),
        failed: acc.failed + (curr.total_failed || 0),
        cost: acc.cost + (curr.total_cost || 0)
    }), { total_contacts: 0, sent: 0, delivered: 0, read: 0, interactions: 0, blocked: 0, skipped: 0, failed: 0, cost: 0 });

    return (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="bg-[#0f172a]/90 backdrop-blur-2xl border border-blue-500/30 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5),0_0_20px_rgba(59,130,246,0.2)] rounded-[2.5rem] p-6 flex items-center gap-10 min-w-[850px]">
                
                {/* Selecionados Section */}
                <div className="flex flex-col border-r border-white/5 pr-10">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-2">Selecionados</span>
                    <div className="flex items-center gap-4">
                        <span className="text-4xl font-black text-white drop-shadow-sm">{selectedIds.length}</span>
                        <button
                            onClick={() => setSelectedIds([])}
                            className="text-[10px] font-black bg-white/5 hover:bg-white/10 text-gray-400 px-3 py-1.5 rounded-xl border border-white/5 transition-all active:scale-95 uppercase tracking-widest"
                        >
                            Limpar
                        </button>
                    </div>

                    {bulkMoveToFolder && (
                        <div className="relative mt-2">
                            <button
                                onClick={() => setFolderMenuOpen(v => !v)}
                                className="text-[10px] font-black bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 px-3 py-1.5 rounded-xl border border-indigo-500/20 transition-all active:scale-95 uppercase tracking-widest w-full"
                            >
                                Mover para pasta
                            </button>
                            {folderMenuOpen && (
                                <>
                                    <div className="fixed inset-0 z-[100]" onClick={() => setFolderMenuOpen(false)}></div>
                                    <div className="absolute bottom-full mb-2 left-0 bg-[#0f172a] border border-white/10 rounded-xl shadow-2xl z-[101] min-w-[180px] max-h-56 overflow-y-auto p-1.5">
                                        {(folders || []).length === 0 ? (
                                            <div className="p-2 text-[10px] text-gray-500 italic text-center">Nenhuma pasta criada</div>
                                        ) : (
                                            folders.map(folder => (
                                                <div
                                                    key={folder.id}
                                                    onClick={() => { bulkMoveToFolder(selectedIds, folder.id); setFolderMenuOpen(false); }}
                                                    className="px-2.5 py-1.5 text-xs rounded-lg cursor-pointer hover:bg-white/5 text-gray-200 flex items-center gap-2"
                                                >
                                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: folder.color || '#6366f1' }}></span>
                                                    <span className="truncate">{folder.name}</span>
                                                </div>
                                            ))
                                        )}
                                        <div
                                            onClick={() => { bulkMoveToFolder(selectedIds, null); setFolderMenuOpen(false); }}
                                            className="px-2.5 py-1.5 text-xs rounded-lg cursor-pointer hover:bg-white/5 text-gray-400 italic border-t border-white/5 mt-1"
                                        >
                                            Remover da pasta
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Stats Section */}
                <div className="flex flex-1 justify-between gap-2 px-4">
                    <div className="flex flex-col items-center group">
                        <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">🚀</span>
                        <span className="text-lg font-black text-gray-400 leading-none">{totals.total_contacts}</span>
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-tighter mt-1">Total</span>
                    </div>
                    <div className="flex flex-col items-center group">
                        <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">✅</span>
                        <span className="text-lg font-black text-white leading-none">{totals.sent}</span>
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-tighter mt-1">Enviados</span>
                    </div>
                    <div className="flex flex-col items-center group">
                        <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">📬</span>
                        <span className="text-lg font-black text-emerald-400 leading-none">{totals.delivered}</span>
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-tighter mt-1">Entregues</span>
                    </div>
                    <div className="flex flex-col items-center group">
                        <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">👀</span>
                        <span className="text-lg font-black text-blue-400 leading-none">{totals.read}</span>
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-tighter mt-1">Lidos</span>
                    </div>
                    <div className="flex flex-col items-center group">
                        <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">👆</span>
                        <span className="text-lg font-black text-amber-400 leading-none">{totals.interactions}</span>
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-tighter mt-1">Cliques</span>
                    </div>
                    <div className="flex flex-col items-center group">
                        <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">🚫</span>
                        <span className="text-lg font-black text-rose-500 leading-none">{totals.blocked}</span>
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-tighter mt-1">Bloqueios</span>
                    </div>
                    <div className="flex flex-col items-center group">
                        <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">⏭️</span>
                        <span className="text-lg font-black text-amber-500 leading-none">{totals.skipped}</span>
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-tighter mt-1">Pulados</span>
                    </div>
                    <div className="flex flex-col items-center group">
                        <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">❌</span>
                        <span className="text-lg font-black text-red-500 leading-none">{totals.failed}</span>
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-tighter mt-1">Falhas</span>
                    </div>
                </div>

                {/* Investment Section */}
                <div className="flex flex-col items-end border-l border-white/5 pl-10 min-w-[200px]">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 mb-1">Investimento Total</span>
                    <span className="text-3xl font-black text-white drop-shadow-md">
                        R$ {totals.cost.toFixed(2)}
                    </span>

                    <div className="mt-3 flex flex-col items-end gap-1.5">
                        {totals.interactions > 0 && (
                            <div className="flex items-center gap-3">
                                <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-xl text-[10px] font-black text-emerald-400 tracking-tight">
                                    R$ {(totals.cost / totals.interactions).toFixed(2)} / interação
                                </div>
                                <span className="text-[10px] text-gray-500 font-bold">({totals.delivered} entregues)</span>
                            </div>
                        )}
                        {totals.delivered > 0 && (
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em]">
                                Taxa de Conversão: <span className="text-white font-black">{((totals.interactions / totals.delivered) * 100).toFixed(1)}%</span>
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BulkSummaryBar;
