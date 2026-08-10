import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiTrash2, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

const ContactTable = ({
    displayedContacts = [],
    filteredContacts = [],
    activeVarColumns = [],
    showValidation,
    removeContact,
    unblockContact,
    displayLimit,
    setDisplayLimit,
    filteredContactsCount = 0,
    variableFilters = {},
    setVariableFilters,
    exclusionList = [],
    setContacts
}) => {
    // 1. Estados de Paginação
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);

    // 2. Estados de Seleção em Lote e Remoção
    const [selectedPhones, setSelectedPhones] = useState([]);
    const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

    // Determinar a lista base de contatos (usar a lista filtrada completa se disponível)
    const baseContacts = useMemo(() => {
        if (filteredContacts && filteredContacts.length > 0) return filteredContacts;
        return displayedContacts;
    }, [filteredContacts, displayedContacts]);

    const totalItems = filteredContactsCount || baseContacts.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

    // Garantir que a página atual seja válida caso os filtros ou limite mudem
    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(1);
        }
    }, [totalPages, currentPage]);

    // Reseta a página para 1 quando o limite de itens por página muda
    const handleItemsPerPageChange = (e) => {
        const newLimit = Number(e.target.value);
        setItemsPerPage(newLimit);
        setCurrentPage(1);
        if (setDisplayLimit) {
            setDisplayLimit(newLimit);
        }
    };

    // Calcular os contatos visíveis na página atual
    const pageContacts = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return baseContacts.slice(start, start + itemsPerPage);
    }, [baseContacts, currentPage, itemsPerPage]);

    // Handlers de Seleção em Lote
    const isAllPageSelected = useMemo(() => {
        if (pageContacts.length === 0) return false;
        return pageContacts.every(c => selectedPhones.includes(c.phone));
    }, [pageContacts, selectedPhones]);

    const handleToggleSelectPage = (checked) => {
        if (checked) {
            const pagePhones = pageContacts.map(c => c.phone);
            setSelectedPhones(prev => Array.from(new Set([...prev, ...pagePhones])));
        } else {
            const pagePhonesSet = new Set(pageContacts.map(c => c.phone));
            setSelectedPhones(prev => prev.filter(phone => !pagePhonesSet.has(phone)));
        }
    };

    const handleToggleSelectPhone = (phone) => {
        setSelectedPhones(prev =>
            prev.includes(phone)
                ? prev.filter(p => p !== phone)
                : [...prev, phone]
        );
    };

    const handleSelectAllFiltered = () => {
        if (selectedPhones.length === totalItems) {
            setSelectedPhones([]);
        } else {
            const allPhones = baseContacts.map(c => c.phone);
            setSelectedPhones(allPhones);
        }
    };

    const handleConfirmBulkDelete = () => {
        if (selectedPhones.length === 0) return;
        const count = selectedPhones.length;
        const selectedSet = new Set(selectedPhones);

        if (setContacts) {
            setContacts(prev => prev.filter(c => !selectedSet.has(c.phone)));
        } else if (removeContact) {
            selectedPhones.forEach(phone => removeContact(phone));
        }

        setSelectedPhones([]);
        setShowBulkDeleteModal(false);
        toast.success(`${count} contato${count > 1 ? 's' : ''} removido${count > 1 ? 's' : ''} da lista com sucesso!`);
    };

    const handleVarChange = (phone, varKey, value) => {
        if (!setContacts) return;
        setContacts(prev => prev.map(c => {
            if (c.phone === phone) {
                const newVars = { ...c.vars, [varKey]: value };
                return { ...c, vars: newVars };
            }
            return c;
        }));
    };

    const toggleVarFilter = (varKey) => {
        if (!setVariableFilters) return;
        setVariableFilters(prev => {
            const current = prev[varKey] || 'full';
            const next = current === 'full' ? 'first_name' : 'full';
            return { ...prev, [varKey]: next };
        });
    };

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

    return (
        <div className="bg-slate-900/60 rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl flex flex-col">
            
            {/* Barra de Ações em Lote quando houver itens selecionados */}
            {selectedPhones.length > 0 && (
                <div className="bg-gradient-to-r from-red-950/80 via-slate-900 to-slate-900 border-b border-red-500/30 p-3 px-6 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center gap-3">
                        <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-xs px-3 py-1 rounded-xl font-black">
                            {selectedPhones.length} selecionado{selectedPhones.length > 1 ? 's' : ''}
                        </span>
                        <button
                            type="button"
                            onClick={handleSelectAllFiltered}
                            className="text-[10px] font-black text-slate-400 hover:text-white uppercase tracking-wider underline transition-colors"
                        >
                            {selectedPhones.length === totalItems ? 'Desmarcar Todos' : `Selecionar Todos os ${totalItems} Contatos`}
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setSelectedPhones([])}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
                        >
                            Limpar Seleção
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowBulkDeleteModal(true)}
                            className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-red-900/30 active:scale-95 flex items-center gap-1.5"
                        >
                            <FiTrash2 size={14} />
                            Deletar Selecionados ({selectedPhones.length})
                        </button>
                    </div>
                </div>
            )}

            {/* Tabela de Contatos */}
            <div className="max-h-[450px] overflow-y-auto premium-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-[#0f172a] sticky top-0 z-10 border-b border-white/10">
                        <tr>
                            <th className="px-4 py-5 text-center w-10">
                                <input
                                    type="checkbox"
                                    checked={isAllPageSelected}
                                    onChange={(e) => handleToggleSelectPage(e.target.checked)}
                                    className="rounded border-white/10 text-red-600 focus:ring-red-500 bg-slate-800 cursor-pointer"
                                    title="Selecionar todos os contatos desta página"
                                />
                            </th>
                            <th className="px-4 py-5 text-[10px] font-black uppercase text-slate-600 tracking-[0.2em] text-center w-12">#</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Número</th>
                            {activeVarColumns.map(v => {
                                const isFirstName = variableFilters[v.key] === 'first_name';
                                return (
                                    <th key={v.key} className="px-4 py-5 text-[10px] font-black uppercase text-center min-w-[240px]">
                                        <div className="flex flex-col items-center gap-1.5 justify-center">
                                            <span className="text-emerald-500/70 tracking-[0.2em]">{v.label}</span>
                                            <button
                                                type="button"
                                                onClick={() => toggleVarFilter(v.key)}
                                                className={`px-2.5 py-1 rounded-lg text-[8.5px] font-black uppercase tracking-wider transition-all select-none border border-white/5 active:scale-95 ${
                                                    isFirstName
                                                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-slate-950 shadow-md shadow-green-500/20 border-green-500/20'
                                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-750 hover:text-white'
                                                }`}
                                                title={isFirstName ? 'Enviando apenas a primeira palavra' : 'Enviando conteúdo completo'}
                                             >
                                                {isFirstName ? '✦ 1º Nome' : 'Inteiro'}
                                            </button>
                                        </div>
                                    </th>
                                );
                            })}
                            {showValidation && <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] text-center">Status</th>}
                            {showValidation && <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] text-center">Janela 24h</th>}
                            <th className="px-8 py-5 text-right"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {pageContacts.length === 0 ? (
                            <tr>
                                <td colSpan={4 + activeVarColumns.length + (showValidation ? 2 : 0)} className="px-8 py-12 text-center text-slate-500 italic text-xs">
                                    Nenhum contato encontrado nesta página.
                                </td>
                            </tr>
                        ) : (
                            pageContacts.map((c, i) => {
                                const globalIndex = startIndex + i + 1;
                                const isExcluded = exclusionList.includes(c.phone);
                                const isSelected = selectedPhones.includes(c.phone);

                                return (
                                    <tr key={c.phone} className={`group/row hover:bg-white/[0.03] transition-colors border-l-2 ${isSelected ? 'bg-red-500/10 border-l-red-500' : 'border-l-transparent hover:border-l-emerald-500/50'} ${isExcluded ? 'opacity-40 line-through decoration-red-500/50' : ''}`}>
                                        <td className="px-4 py-4 text-center">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleToggleSelectPhone(c.phone)}
                                                className="rounded border-white/10 text-red-600 focus:ring-red-500 bg-slate-800 cursor-pointer"
                                            />
                                        </td>
                                        <td className="px-4 py-4 text-center text-[11px] font-black text-slate-600 w-12 tabular-nums">
                                            {globalIndex}
                                        </td>
                                        <td className={`px-8 py-4 font-mono text-sm tracking-wider ${isExcluded ? 'text-red-400' : 'text-slate-200'}`}>
                                            {c.phone}
                                        </td>
                                        {activeVarColumns.map(v => {
                                            const rawVal = c.vars?.[v.key];
                                            const val = typeof rawVal === 'string' ? rawVal : (rawVal !== null && rawVal !== undefined ? String(rawVal) : '');
                                            const isFirstName = variableFilters[v.key] === 'first_name';
                                            const displayedVal = isFirstName ? val.split(' ')[0] : val;
                                            return (
                                                <td key={v.key} className="px-4 py-3 text-center text-xs text-emerald-300 font-medium min-w-[240px]">
                                                    <input
                                                        type="text"
                                                        value={displayedVal}
                                                        onChange={(e) => handleVarChange(c.phone, v.key, e.target.value)}
                                                        placeholder="Digitar..."
                                                        title={displayedVal}
                                                        className="w-full min-w-[220px] bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-center text-emerald-300 placeholder:text-slate-700 focus:outline-none focus:border-emerald-500/70 focus:bg-black/80 transition-all shadow-inner"
                                                    />
                                                </td>
                                            );
                                        })}
                                        {showValidation && (
                                            <td className="px-8 py-4 text-center">
                                                {isExcluded ? (
                                                    <span className="text-[10px] font-black text-red-500 bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/20 uppercase">Excluído</span>
                                                ) : c.is_blocked ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => unblockContact && unblockContact(c.phone)}
                                                        className="text-[10px] font-black text-red-400 bg-red-500/10 hover:bg-red-500/25 px-3 py-1.5 rounded-xl border border-red-500/20 uppercase tracking-wider transition-all hover:scale-105 active:scale-95 cursor-pointer inline-flex items-center gap-1.5 group/unblock"
                                                        title="Remover este contato da lista de bloqueio"
                                                    >
                                                        <span>Bloqueado</span>
                                                        <span className="text-[8px] text-red-500/50 group-hover/unblock:text-red-400/90 lowercase tracking-normal">(desbloquear)</span>
                                                    </button>
                                                ) : c.status === 'pending' ? (
                                                    <span className="inline-flex w-2 h-2 rounded-full bg-slate-700 animate-pulse"></span>
                                                ) : c.status === 'verified' ? (
                                                    <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20 uppercase">Cadastrado</span>
                                                ) : (
                                                    <span className="text-[10px] font-black text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20 uppercase">Novo</span>
                                                )}
                                            </td>
                                        )}
                                        {showValidation && (
                                            <td className="px-6 py-4 text-center">
                                                {c.status === 'verified' ? (
                                                    c.window_open ? (
                                                        <span className="text-[9px] font-black text-green-400 bg-green-500/20 px-3 py-1.5 rounded-xl border-2 border-green-500/30 uppercase flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(34,197,94,0.15)] ring-1 ring-green-500/20">
                                                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                                            Sessão 24h
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] font-black text-red-400 bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/20 uppercase">Fechada</span>
                                                    )
                                                ) : <span className="text-slate-700 font-bold">-</span>}
                                            </td>
                                        )}
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                type="button"
                                                onClick={() => removeContact && removeContact(c.phone)}
                                                className="p-2 text-slate-600 hover:text-red-400 transition-all opacity-0 group-hover/row:opacity-100 transform scale-90 hover:scale-100"
                                                title="Remover este contato"
                                            >
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Rodapé de Paginação Otimizado */}
            <div className="p-4 px-6 bg-[#0b132b]/80 border-t border-white/5 flex items-center justify-between gap-4 flex-wrap text-xs">
                {/* Seleção de Contatos por Página */}
                <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-bold text-[11px]">Exibir:</span>
                    <select
                        value={itemsPerPage}
                        onChange={handleItemsPerPageChange}
                        className="bg-slate-800 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-black text-emerald-400 focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                        <option value={50}>50 contatos</option>
                        <option value={100}>100 contatos</option>
                        <option value={200}>200 contatos</option>
                        <option value={500}>500 contatos</option>
                    </select>
                    <span className="text-slate-400 font-bold text-[11px]">por página</span>
                </div>

                {/* Contador de Números Filtrados */}
                <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                    Mostrando <span className="text-white font-mono">{totalItems > 0 ? startIndex + 1 : 0}</span> a <span className="text-white font-mono">{Math.min(endIndex, totalItems)}</span> de <span className="text-emerald-400 font-mono">{totalItems}</span> números filtrados
                </div>

                {/* Controles de Navegação de Página */}
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 active:scale-95"
                    >
                        <FiChevronLeft size={14} /> Anterior
                    </button>

                    <span className="text-xs font-black text-slate-300 px-2">
                        Página <strong className="text-emerald-400">{currentPage}</strong> de {totalPages}
                    </span>

                    <button
                        type="button"
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 active:scale-95"
                    >
                        Próxima <FiChevronRight size={14} />
                    </button>
                </div>
            </div>

            {/* Modal de Confirmação para Exclusão em Lote */}
            {showBulkDeleteModal && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 w-screen h-screen">
                    <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-black text-white flex items-center gap-2 mb-3">
                            <FiTrash2 className="text-red-500 w-5 h-5" />
                            Remover Contatos Selecionados?
                        </h3>
                        <p className="text-xs text-slate-300 leading-relaxed mb-6 bg-black/40 p-4 rounded-2xl border border-white/5">
                            Tem certeza que deseja remover <strong className="text-red-400">{selectedPhones.length}</strong> contatos selecionados da lista de disparo? Esta ação irá retirá-los do lote de envio atual.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowBulkDeleteModal(false)}
                                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all active:scale-95"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmBulkDelete}
                                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-red-900/40 active:scale-95 flex items-center gap-2"
                            >
                                <FiTrash2 size={14} />
                                Confirmar Remoção ({selectedPhones.length})
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default ContactTable;
