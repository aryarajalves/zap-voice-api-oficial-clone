import React from 'react';
import ManualTagsDropdown from './ManualTagsDropdown';

const Step2SaveLeads = ({
    csvData,
    nameColumn = '',
    setNameColumn,
    emailColumn = '',
    setEmailColumn,
    availableTags = [],
    saveLeadsTags = '',
    isSaveTagsDropdownOpen = false,
    setIsSaveTagsDropdownOpen,
    saveTagsSearch = '',
    setSaveTagsSearch,
    toggleSaveLeadsTag,
    onBack,
    onConfirm
}) => {
    return (
        <>
            <div className="px-8 py-6 space-y-6 max-h-[45vh] overflow-y-auto premium-scrollbar bg-[#0d1117] pb-48">
                {/* Info Box */}
                <div className="bg-emerald-500/5 border border-emerald-500/10 p-5 rounded-2xl">
                    <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest">
                        Atualizar contatos no banco de dados?
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                        Preencha os campos abaixo para salvar ou atualizar os dados destes clientes na aba{' '}
                        <strong>Contatos</strong> do ZapVoice. Caso já os tenha atualizado, você pode ignorar e avançar diretamente.
                    </p>
                </div>

                {/* Manual Tag Selector */}
                <ManualTagsDropdown
                    availableTags={availableTags}
                    saveLeadsTags={saveLeadsTags}
                    isSaveTagsDropdownOpen={isSaveTagsDropdownOpen}
                    setIsSaveTagsDropdownOpen={setIsSaveTagsDropdownOpen}
                    saveTagsSearch={saveTagsSearch}
                    setSaveTagsSearch={setSaveTagsSearch}
                    toggleSaveLeadsTag={toggleSaveLeadsTag}
                />

                {/* Name & Email Column Mapping Dropdowns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-white/70 uppercase tracking-widest flex items-center gap-1">
                            👤 Coluna de Nome (Opcional)
                        </label>
                        <select
                            value={nameColumn}
                            onChange={(e) => setNameColumn(e.target.value)}
                            className="w-full bg-black/40 border border-white/5 rounded-2xl px-4 py-3.5 text-xs font-bold text-white outline-none hover:border-white/10 focus:border-emerald-500/50 transition-all font-medium cursor-pointer"
                        >
                            <option value="" className="bg-[#0d1117] text-slate-400">
                                -- Não importar nome --
                            </option>
                            {csvData?.nonEmptyIndices?.map(idx => (
                                <option key={idx} value={String(idx)} className="bg-[#0d1117] text-white">
                                    {csvData.headers?.[idx] || `Coluna ${idx + 1}`}
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
                            className="w-full bg-black/40 border border-white/5 rounded-2xl px-4 py-3.5 text-xs font-bold text-white outline-none hover:border-white/10 focus:border-emerald-500/50 transition-all font-medium cursor-pointer"
                        >
                            <option value="" className="bg-[#0d1117] text-slate-400">
                                -- Não importar e-mail --
                            </option>
                            {csvData?.nonEmptyIndices?.map(idx => (
                                <option key={idx} value={String(idx)} className="bg-[#0d1117] text-white">
                                    {csvData.headers?.[idx] || `Coluna ${idx + 1}`}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Footer Passo 2 */}
            <div className="px-8 py-6 border-t border-white/5 flex flex-col sm:flex-row gap-3 bg-[#0d1117]">
                <button
                    type="button"
                    onClick={onBack}
                    className="px-6 py-3 text-slate-500 font-bold hover:text-white transition-all duration-200 uppercase text-xs rounded-xl hover:bg-white/5 cursor-pointer"
                >
                    Voltar
                </button>
                <div className="flex-1 flex flex-col sm:flex-row gap-3">
                    <button
                        type="button"
                        onClick={() => onConfirm(false)}
                        className="flex-1 py-3 bg-white/[0.05] border border-white/10 hover:bg-white/[0.08] text-slate-300 hover:text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-200 cursor-pointer"
                    >
                        Pular e Importar
                    </button>
                    <button
                        type="button"
                        onClick={() => onConfirm(true)}
                        className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-200 shadow-lg shadow-emerald-900/30 active:scale-[0.98] cursor-pointer"
                    >
                        Salvar e Importar
                    </button>
                </div>
            </div>
        </>
    );
};

export default Step2SaveLeads;
