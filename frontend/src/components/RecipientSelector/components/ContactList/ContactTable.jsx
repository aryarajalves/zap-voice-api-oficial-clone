import React, { useState, useMemo, useEffect } from 'react';
import { FiTrash2, FiSliders } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useTableDragScroll } from '../../hooks/useTableDragScroll';
import { useContactTagsLookup } from '../../hooks/useContactTagsLookup';
import ContactTableRow from './ContactTableRow';
import ContactTablePagination from './ContactTablePagination';
import ContactBulkDeleteModal from './ContactBulkDeleteModal';
import VariableActionModal, { isVariableEmpty, isVariableNumeric } from './VariableActionModal';
import { isPhoneExcluded } from '../../../../utils/phoneFilters';

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
    setContacts,
    filterExcludedOnly = false,
    setFilterExcludedOnly,
    excludedCount = 0
}) => {
    // 1. Estados de Paginação
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);

    // 2. Estados de Seleção em Lote e Remoção
    const [selectedPhones, setSelectedPhones] = useState([]);
    const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

    // 3. Estados de Filtro de Variáveis e Modal de Ações
    const [varContentFilters, setVarContentFilters] = useState({});
    const [activeVarModal, setActiveVarModal] = useState({ isOpen: false, varKey: '', varLabel: '' });

    // 4. Arraste com o Botão Esquerdo do Mouse (Drag-to-Scroll)
    const { isDragging, dragProps } = useTableDragScroll();

    // Determinar a lista base de contatos (usar a lista filtrada completa se disponível)
    const baseContacts = useMemo(() => {
        if (filteredContacts && filteredContacts.length > 0) return filteredContacts;
        return displayedContacts;
    }, [filteredContacts, displayedContacts]);

    // Filtrar contatos pelo conteúdo de variáveis (ex: apenas números ou vazios)
    const contactsAfterVarFilters = useMemo(() => {
        const activeFilters = Object.entries(varContentFilters).filter(([_, mode]) => mode && mode !== 'all');
        if (activeFilters.length === 0) return baseContacts;

        return baseContacts.filter(c => {
            return activeFilters.every(([varKey, mode]) => {
                const rawVal = c.vars?.[varKey];
                const val = rawVal !== null && rawVal !== undefined ? String(rawVal).trim() : '';
                if (mode === 'empty') return isVariableEmpty(val);
                if (mode === 'numeric') return isVariableNumeric(val);
                return true;
            });
        });
    }, [baseContacts, varContentFilters]);

    // 5. Consulta de Etiquetas da Aba Contatos
    const {
        showContactTags,
        isLoadingTags,
        contactsTagsMap,
        toggleShowContactTags
    } = useContactTagsLookup({ contacts: contactsAfterVarFilters });

    const totalItems = contactsAfterVarFilters.length;
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
        return contactsAfterVarFilters.slice(start, start + itemsPerPage);
    }, [contactsAfterVarFilters, currentPage, itemsPerPage]);

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
        setSelectedPhones(prev => prev.includes(phone) ? prev.filter(p => p !== phone) : [...prev, phone]);
    };

    const handleSelectAllFiltered = () => {
        if (selectedPhones.length === totalItems) {
            setSelectedPhones([]);
        } else {
            const allPhones = contactsAfterVarFilters.map(c => c.phone);
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

    const handleCopyPhone = (phone) => {
        if (navigator?.clipboard?.writeText) {
            navigator.clipboard.writeText(phone);
            toast.success(`Número ${phone} copiado!`, { id: `copy-${phone}`, duration: 2000 });
        }
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

    const handleSetVarContentFilter = (varKey, filterMode) => {
        setVarContentFilters(prev => ({
            ...prev,
            [varKey]: filterMode
        }));
        setCurrentPage(1);
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
                            className="text-[10px] font-black text-slate-400 hover:text-white uppercase tracking-wider underline transition-colors cursor-pointer"
                        >
                            {selectedPhones.length === totalItems ? 'Desmarcar Todos' : `Selecionar Todos os ${totalItems} Contatos`}
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setSelectedPhones([])}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                            Limpar Seleção
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowBulkDeleteModal(true)}
                            className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-red-900/30 active:scale-95 flex items-center gap-1.5 cursor-pointer"
                        >
                            <FiTrash2 size={14} />
                            Deletar Selecionados ({selectedPhones.length})
                        </button>
                    </div>
                </div>
            )}

            {/* Barra de Ferramentas: Navegação e Opção de Etiquetas da Aba Contatos */}
            <div className="px-6 py-2.5 bg-[#0b132b]/90 border-b border-white/5 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="text-[11px] font-semibold flex items-center gap-1.5 text-slate-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        💡 Segure com o botão esquerdo para arrastar a tabela (horizontal e vertical)
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {excludedCount > 0 && (
                        <button
                            type="button"
                            onClick={() => setFilterExcludedOnly && setFilterExcludedOnly(!filterExcludedOnly)}
                            className={`px-3.5 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-2 border shadow-md active:scale-95 cursor-pointer ${
                                filterExcludedOnly
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-amber-950/40 ring-1 ring-amber-500/30'
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-white/10'
                            }`}
                            title="Filtrar e visualizar contatos que coincidiram com o filtro de exclusão"
                        >
                            <span>🚫</span>
                            <span>{filterExcludedOnly ? 'Voltar para Destinatários' : `Ver Excluídos (${excludedCount})`}</span>
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={toggleShowContactTags}
                        disabled={isLoadingTags}
                        className={`px-3.5 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-2 border shadow-md active:scale-95 cursor-pointer ${
                            showContactTags
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-emerald-950/40 ring-1 ring-emerald-500/30'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-white/10'
                        }`}
                        title="Ver se o contato está cadastrado na aba Contatos e suas etiquetas"
                    >
                        {isLoadingTags ? (
                            <>
                                <span className="w-3 h-3 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin"></span>
                                <span>Consultando Contatos...</span>
                            </>
                        ) : (
                            <>
                                <span>🏷️</span>
                                <span>{showContactTags ? 'Ocultar Etiquetas Contatos' : 'Ver Etiquetas da Aba Contatos'}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Tabela de Contatos */}
            <div 
                ref={dragProps.ref}
                onMouseDown={dragProps.onMouseDown}
                className={`max-h-[450px] overflow-auto premium-scrollbar ${
                    isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'
                }`}
                title="Segure o botão esquerdo do mouse para rolar na horizontal e vertical"
            >
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
                                const currentFilter = varContentFilters[v.key] || 'all';
                                const isFiltered = currentFilter !== 'all';

                                return (
                                    <th key={v.key} className="px-4 py-4 text-[10px] font-black uppercase text-center min-w-[240px]">
                                        <div className="flex flex-col items-center gap-1.5 justify-center">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-emerald-500/80 tracking-[0.2em]">{v.label}</span>
                                                <button
                                                    type="button"
                                                    data-no-drag="true"
                                                    onClick={() => setActiveVarModal({ isOpen: true, varKey: v.key, varLabel: v.label })}
                                                    className={`px-2 py-0.5 rounded-lg text-[9px] font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                                                        isFiltered
                                                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 ring-1 ring-amber-500/30'
                                                            : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border-white/10'
                                                    }`}
                                                    title="Ações e Filtros desta Variável"
                                                >
                                                    <FiSliders size={11} />
                                                    <span>Ações</span>
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    data-no-drag="true"
                                                    onClick={() => toggleVarFilter(v.key)}
                                                    className={`px-2 py-0.5 rounded-lg text-[8.5px] font-black uppercase tracking-wider transition-all select-none border border-white/5 active:scale-95 cursor-pointer ${
                                                        isFirstName
                                                            ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-slate-950 shadow-md shadow-green-500/20 border-green-500/20'
                                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-750 hover:text-white'
                                                    }`}
                                                    title={isFirstName ? 'Enviando apenas a primeira palavra' : 'Enviando conteúdo completo'}
                                                >
                                                    {isFirstName ? '✦ 1º Nome' : 'Inteiro'}
                                                </button>
                                                {isFiltered && (
                                                    <button
                                                        type="button"
                                                        data-no-drag="true"
                                                        onClick={() => handleSetVarContentFilter(v.key, 'all')}
                                                        className="text-[8px] bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 px-1.5 py-0.5 rounded border border-amber-500/30 font-bold flex items-center gap-0.5 cursor-pointer"
                                                        title="Remover filtro de conteúdo desta coluna"
                                                    >
                                                        <span>{currentFilter === 'numeric' ? 'Só Núm.' : 'Vazios'}</span>
                                                        <span className="text-[10px] leading-none">×</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </th>
                                );
                            })}
                            {showValidation && <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] text-center">Status</th>}
                            {showValidation && <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] text-center">Janela 24h</th>}
                            {showContactTags && (
                                <th className="px-6 py-5 text-[10px] font-black uppercase text-emerald-400 tracking-[0.2em] text-center min-w-[200px]">
                                    Aba Contatos / Etiquetas
                                </th>
                            )}
                            <th className="px-8 py-5 text-right"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {pageContacts.length === 0 ? (
                            <tr>
                                <td colSpan={4 + activeVarColumns.length + (showValidation ? 2 : 0) + (showContactTags ? 1 : 0)} className="px-8 py-12 text-center text-slate-500 italic text-xs">
                                    Nenhum contato encontrado nesta página.
                                </td>
                            </tr>
                        ) : (
                            pageContacts.map((c, i) => {
                                const globalIndex = startIndex + i + 1;
                                const isExcluded = isPhoneExcluded(c.phone, exclusionList);
                                const isSelected = selectedPhones.includes(c.phone);

                                return (
                                    <ContactTableRow
                                        key={c.phone}
                                        contact={c}
                                        globalIndex={globalIndex}
                                        isSelected={isSelected}
                                        isExcluded={isExcluded}
                                        showValidation={showValidation}
                                        showContactTags={showContactTags}
                                        activeVarColumns={activeVarColumns}
                                        variableFilters={variableFilters}
                                        contactsTagsMap={contactsTagsMap}
                                        isLoadingTags={isLoadingTags}
                                        onToggleSelect={handleToggleSelectPhone}
                                        onCopyPhone={handleCopyPhone}
                                        onVarChange={handleVarChange}
                                        onUnblock={unblockContact}
                                        onRemove={removeContact}
                                    />
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Rodapé de Paginação Otimizado */}
            <ContactTablePagination
                itemsPerPage={itemsPerPage}
                handleItemsPerPageChange={handleItemsPerPageChange}
                totalItems={totalItems}
                startIndex={startIndex}
                endIndex={endIndex}
                currentPage={currentPage}
                totalPages={totalPages}
                setCurrentPage={setCurrentPage}
            />

            {/* Modal de Confirmação para Exclusão em Lote */}
            <ContactBulkDeleteModal
                isOpen={showBulkDeleteModal}
                selectedCount={selectedPhones.length}
                onClose={() => setShowBulkDeleteModal(false)}
                onConfirm={handleConfirmBulkDelete}
            />

            {/* Modal de Ações e Filtros de Conteúdo da Variável */}
            <VariableActionModal
                isOpen={activeVarModal.isOpen}
                onClose={() => setActiveVarModal({ isOpen: false, varKey: '', varLabel: '' })}
                varKey={activeVarModal.varKey}
                varLabel={activeVarModal.varLabel}
                contacts={baseContacts}
                setContacts={setContacts}
                currentFilter={varContentFilters[activeVarModal.varKey] || 'all'}
                onSetFilter={(filterMode) => handleSetVarContentFilter(activeVarModal.varKey, filterMode)}
            />
        </div>
    );
};

export default ContactTable;
