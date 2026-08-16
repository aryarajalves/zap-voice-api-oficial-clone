import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';

const ColumnSelectorModal = ({
    isVisible,
    csvData,
    columnMapping,
    setColumnMapping,
    templateVariables,
    onConfirm,
    onClose,
    availableTags = [],
    saveLeadsTags = '',
    setSaveLeadsTags,
    isSaveTagsDropdownOpen = false,
    setIsSaveTagsDropdownOpen,
    saveTagsSearch = '',
    setSaveTagsSearch,
    toggleSaveLeadsTag,
    nameColumn = '',
    setNameColumn,
    emailColumn = '',
    setEmailColumn
}) => {
    const [step, setStep] = useState(1);

    useEffect(() => {
        if (isVisible) {
            setStep(1);
        }
    }, [isVisible]);

    if (!isVisible) return null;

    const handleSelect = (idx, val) => {
        setColumnMapping(prev => {
            const next = { ...prev };
            // Remove this value from any other column first
            if (val !== 'ignore') {
                Object.keys(next).forEach(k => {
                    if (k !== String(idx) && next[k] === val) next[k] = 'ignore';
                });
            }
            next[String(idx)] = val;
            return next;
        });
    };

    const handleNextStep = () => {
        const phoneIdx = Object.keys(columnMapping).find(k => columnMapping[k] === 'phone');
        if (phoneIdx === undefined) {
            toast.error("Selecione a coluna de TELEFONE");
            return;
        }

        // Validação: verificar se alguma coluna selecionada (diferente de ignore) está totalmente vazia no arquivo
        for (const [colIdxStr, mappingValue] of Object.entries(columnMapping)) {
            if (mappingValue && mappingValue !== 'ignore') {
                const colIdx = parseInt(colIdxStr, 10);
                const colName = csvData.headers?.[colIdx] || `Coluna ${colIdx + 1}`;
                const hasData = csvData.rows?.some(row => {
                    const cellVal = row?.[colIdx];
                    return cellVal !== undefined && cellVal !== null && String(cellVal).trim() !== '';
                });

                if (!hasData) {
                    toast.error(`A coluna "${colName}" foi selecionada, mas não possui nenhuma informação no arquivo.`);
                    return;
                }
            }
        }

        setStep(2);
    };

    const handleConfirm = (shouldSaveToLeads) => {
        if (shouldSaveToLeads) {
            if (nameColumn !== '') {
                const colIdx = parseInt(nameColumn, 10);
                const colName = csvData.headers?.[colIdx] || `Coluna ${colIdx + 1}`;
                const hasData = csvData.rows?.some(row => {
                    const cellVal = row?.[colIdx];
                    return cellVal !== undefined && cellVal !== null && String(cellVal).trim() !== '';
                });
                if (!hasData) {
                    toast.error(`A coluna "${colName}" selecionada para Nome não possui dados no arquivo.`);
                    return;
                }
            }

            if (emailColumn !== '') {
                const colIdx = parseInt(emailColumn, 10);
                const colName = csvData.headers?.[colIdx] || `Coluna ${colIdx + 1}`;
                const hasData = csvData.rows?.some(row => {
                    const cellVal = row?.[colIdx];
                    return cellVal !== undefined && cellVal !== null && String(cellVal).trim() !== '';
                });
                if (!hasData) {
                    toast.error(`A coluna "${colName}" selecionada para E-mail não possui dados no arquivo.`);
                    return;
                }
            }
        }
        onConfirm(shouldSaveToLeads);
    };

    return createPortal(
        <div className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-[#0d1117] w-full max-w-2xl rounded-[2rem] border border-white/8 shadow-2xl flex flex-col relative">
                {/* Header */}
                <div className="flex justify-between items-center px-8 pt-8 pb-6 border-b border-white/5 bg-[#0d1117]">
                    <div>
                        <div className="flex items-center gap-3">
                            <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Passo {step} de 2
                            </span>
                            <h3 className="text-xl font-black text-white tracking-tight">
                                {step === 1 ? "Mapear Colunas" : "Salvar na Base de Contatos"}
                            </h3>
                        </div>
                        <p className="text-xs text-slate-500 mt-1.5">
                            {step === 1 
                                ? "Clique nos badges para definir o que cada coluna do seu arquivo representa" 
                                : "Escolha como deseja registrar os contatos na sua base do painel"
                            }
                        </p>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 hover:text-white hover:bg-white/8 transition-all duration-200">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Step 1: Mapeamento de Colunas */}
                {step === 1 && (
                    <>
                        <div className="px-8 py-5 space-y-3 max-h-[50vh] overflow-y-auto premium-scrollbar bg-[#0d1117]">
                            {csvData.nonEmptyIndices.map((idx) => {
                                const header = csvData.headers[idx] || `Coluna ${idx + 1}`;
                                const previewVal = csvData.rows[0]?.[idx];
                                const currentMapping = columnMapping[String(idx)] || 'ignore';

                                const allOptions = [
                                    { value: 'ignore', label: 'Ignorar', icon: null, color: 'slate' },
                                    { value: 'phone', label: 'Telefone', icon: '📞', color: 'blue' },
                                    { value: 'tags', label: 'Etiquetas', icon: '🏷️', color: 'emerald' },
                                    ...templateVariables.map(v => ({ value: v.key, label: v.label, icon: '✦', color: 'emerald' }))
                                ];

                                const takenByOthers = new Set(
                                    Object.entries(columnMapping)
                                        .filter(([k, v]) => k !== String(idx) && v !== 'ignore')
                                        .map(([, v]) => v)
                                );

                                return (
                                    <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all duration-200">
                                        {/* Column name */}
                                        <div className="w-44 shrink-0">
                                            <div className="font-bold text-white text-sm truncate">{header}</div>
                                            {previewVal !== undefined && previewVal !== null && String(previewVal).trim() !== '' && (
                                                <div className="text-[10px] text-slate-600 truncate mt-0.5 font-mono">ex: {String(previewVal)}</div>
                                            )}
                                        </div>

                                        {/* Option pills */}
                                        <div className="flex flex-wrap gap-2 flex-1">
                                            {allOptions.map(opt => {
                                                const isSelected = currentMapping === opt.value;
                                                const isTaken = takenByOthers.has(opt.value) && opt.value !== 'ignore';
                                                const colorMap = {
                                                    slate: isSelected ? 'bg-slate-700 border-slate-500 text-slate-200' : 'bg-transparent border-slate-800 text-slate-600 hover:border-slate-600 hover:text-slate-400',
                                                    blue: isSelected ? 'bg-blue-500/20 border-blue-400/60 text-blue-300 shadow-sm shadow-blue-500/20' : isTaken ? 'bg-transparent border-slate-800/50 text-slate-700 cursor-not-allowed' : 'bg-transparent border-slate-700 text-slate-500 hover:border-blue-500/50 hover:text-blue-400',
                                                    emerald: isSelected ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-300 shadow-sm shadow-emerald-500/20' : isTaken ? 'bg-transparent border-slate-800/50 text-slate-700 cursor-not-allowed' : 'bg-transparent border-slate-700 text-slate-500 hover:border-emerald-500/50 hover:text-emerald-400',
                                                };
                                                return (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() => !isTaken && handleSelect(idx, opt.value)}
                                                        disabled={isTaken}
                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all duration-200 ${colorMap[opt.color]} ${isSelected ? 'scale-105' : 'hover:scale-[1.03]'}`}
                                                    >
                                                        {opt.icon && <span className="text-[10px]">{opt.icon}</span>}
                                                        {opt.label}
                                                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-current ml-0.5 opacity-70"></span>}
                                                        {isTaken && <span className="opacity-40 text-[9px] ml-0.5">✓</span>}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Footer Passo 1 */}
                        <div className="px-8 py-6 border-t border-white/5 flex gap-3 bg-[#0d1117]">
                            <button
                                onClick={() => setColumnMapping({})}
                                className="px-6 py-3 text-slate-500 font-bold hover:text-white transition-all duration-200 uppercase text-xs rounded-xl hover:bg-white/5"
                            >
                                Limpar Mapeamento
                            </button>
                            <button
                                onClick={handleNextStep}
                                className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-black text-sm uppercase tracking-widest transition-all duration-200 shadow-lg shadow-emerald-900/30 active:scale-[0.98]"
                            >
                                Continuar
                            </button>
                        </div>
                    </>
                )}

                {/* Step 2: Informações de Salvamento (Leads) */}
                {step === 2 && (
                    <>
                        <div className="px-8 py-6 space-y-6 max-h-[45vh] overflow-y-auto premium-scrollbar bg-[#0d1117] pb-48">
                            <div className="bg-emerald-500/5 border border-emerald-500/10 p-5 rounded-2xl">
                                <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest">Atualizar contatos no banco de dados?</h4>
                                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                                    Preencha os campos abaixo para salvar ou atualizar os dados destes clientes na aba <strong>Contatos</strong> do ZapVoice. Caso já os tenha atualizado, você pode ignorar e avançar diretamente.
                                </p>
                            </div>

                            {/* Manual Tag Selector inside Column Maper */}
                            <div className="flex flex-col gap-2 relative">
                                <div>
                                    <h4 className="text-[10px] font-black text-white/70 uppercase tracking-widest">Etiqueta Manual Geral (Opcional)</h4>
                                    <p className="text-[9px] text-slate-500 mt-0.5">Esta etiqueta será aplicada a todos os contatos importados, além das etiquetas individuais da coluna se houver</p>
                                </div>

                                <div className="relative w-full save-tags-dropdown-container">
                                    <div 
                                        onClick={() => setIsSaveTagsDropdownOpen(!isSaveTagsDropdownOpen)}
                                        className="w-full bg-black/40 border border-white/5 rounded-2xl px-4 py-3.5 text-xs font-bold text-white cursor-pointer hover:border-emerald-500/30 transition-all flex justify-between items-center group shadow-inner"
                                    >
                                        <span className={saveLeadsTags ? 'text-white' : 'text-slate-600'}>
                                            {saveLeadsTags || "SELECIONAR OU CRIAR ETIQUETA MANUAL..."}
                                        </span>
                                        <svg className={`w-4 h-4 text-slate-600 group-hover:text-emerald-500 transition-all ${isSaveTagsDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                                            <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>

                                    {isSaveTagsDropdownOpen && (
                                        <div className="absolute left-0 right-0 top-full mt-2 z-[10002] bg-slate-900 border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                            <div className="p-3 bg-slate-800/50 border-b border-white/5 relative">
                                                <input
                                                    type="text"
                                                    autoFocus
                                                    placeholder="Filtrar etiquetas..."
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-9 py-2 text-[10px] font-bold text-white placeholder:text-slate-600 outline-none focus:border-emerald-500/50 transition-all"
                                                    value={saveTagsSearch}
                                                    onChange={(e) => setSaveTagsSearch(e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                <svg className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                                            </div>
                                            <div className="max-h-40 overflow-y-auto premium-scrollbar">
                                                {availableTags
                                                    .filter(tag => tag.toLowerCase().includes(saveTagsSearch.toLowerCase()))
                                                    .map(tag => {
                                                        const currentTags = saveLeadsTags ? saveLeadsTags.split(',').map(t => t.trim()) : [];
                                                        const isSelected = currentTags.includes(tag);
                                                        return (
                                                            <div 
                                                                key={tag}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    toggleSaveLeadsTag(tag);
                                                                }}
                                                                className={`px-5 py-2.5 hover:bg-emerald-500/10 cursor-pointer transition-colors flex items-center justify-between group/item ${isSelected ? 'bg-emerald-500/15 border-l-2 border-emerald-500' : ''}`}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`w-1.5 h-1.5 rounded-full transition-all ${isSelected ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-emerald-500 opacity-40 group-hover/item:opacity-100'}`}></div>
                                                                    <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${isSelected ? 'text-emerald-400 font-extrabold' : 'text-slate-200'}`}>{tag}</span>
                                                                </div>
                                                                {isSelected && (
                                                                    <svg className="w-3.5 h-3.5 text-emerald-400 filter drop-shadow-[0_0_3px_rgba(52,211,153,0.4)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4.5">
                                                                        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                                                                    </svg>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                            {saveTagsSearch.trim() !== '' && !availableTags.some(tag => tag.toLowerCase() === saveTagsSearch.trim().toLowerCase()) && (
                                                <div className="p-4 bg-slate-800/80 border-t border-white/5 flex items-center justify-between gap-4">
                                                    <span className="text-[10px] font-bold text-slate-400">Criar etiqueta com "{saveTagsSearch}":</span>
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleSaveLeadsTag(saveTagsSearch.trim());
                                                            setSaveTagsSearch('');
                                                        }}
                                                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                                                    >
                                                        Criar etiqueta
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Name & Email Column Mapping Dropdowns */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-black text-white/70 uppercase tracking-widest flex items-center gap-1">
                                        👤 Coluna de Nome (Opcional)
                                    </label>
                                    <select
                                        value={nameColumn}
                                        onChange={(e) => setNameColumn(e.target.value)}
                                        className="w-full bg-black/40 border border-white/5 rounded-2xl px-4 py-3.5 text-xs font-bold text-white outline-none hover:border-white/10 focus:border-emerald-500/50 transition-all font-medium"
                                    >
                                        <option value="" className="bg-[#0d1117] text-slate-400">-- Não importar nome --</option>
                                        {csvData.nonEmptyIndices.map(idx => (
                                            <option key={idx} value={String(idx)} className="bg-[#0d1117] text-white">
                                                {csvData.headers[idx] || `Coluna ${idx + 1}`}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-black text-white/70 uppercase tracking-widest flex items-center gap-1">
                                        ✉️ Coluna de E-mail (Opcional)
                                    </label>
                                    <select
                                        value={emailColumn}
                                        onChange={(e) => setEmailColumn(e.target.value)}
                                        className="w-full bg-black/40 border border-white/5 rounded-2xl px-4 py-3.5 text-xs font-bold text-white outline-none hover:border-white/10 focus:border-emerald-500/50 transition-all font-medium"
                                    >
                                        <option value="" className="bg-[#0d1117] text-slate-400">-- Não importar e-mail --</option>
                                        {csvData.nonEmptyIndices.map(idx => (
                                            <option key={idx} value={String(idx)} className="bg-[#0d1117] text-white">
                                                {csvData.headers[idx] || `Coluna ${idx + 1}`}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Footer Passo 2 */}
                        <div className="px-8 py-6 border-t border-white/5 flex flex-col sm:flex-row gap-3 bg-[#0d1117]">
                            <button
                                onClick={() => setStep(1)}
                                className="px-6 py-3 text-slate-500 font-bold hover:text-white transition-all duration-200 uppercase text-xs rounded-xl hover:bg-white/5"
                            >
                                Voltar
                            </button>
                            <div className="flex-1 flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={() => handleConfirm(false)}
                                    className="flex-1 py-3 bg-white/[0.05] border border-white/10 hover:bg-white/[0.08] text-slate-300 hover:text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-200"
                                >
                                    Pular e Importar
                                </button>
                                <button
                                    onClick={() => handleConfirm(true)}
                                    className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-200 shadow-lg shadow-emerald-900/30 active:scale-[0.98]"
                                >
                                    Salvar e Importar
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>,
        document.body
    );
};

export default ColumnSelectorModal;
