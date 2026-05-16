import React from 'react';
import { FiSettings } from 'react-icons/fi';
import SearchableSelect from '../common/SearchableSelect';

const AutomationSection = ({
    chatwootLabels,
    selectedChatwootLabels,
    setSelectedChatwootLabels,
}) => {
    return (
        <section className="bg-slate-900/60 backdrop-blur-md rounded-[2.5rem] p-10 shadow-2xl border border-white/5 h-fit relative overflow-hidden group/auto">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-orange-500/5 blur-3xl rounded-full"></div>

            <div className="flex items-center gap-4 mb-10 relative z-10">
                <h2 className="text-2xl font-black text-white flex items-center gap-4">
                    <span className="p-3 bg-orange-500/10 text-orange-400 rounded-2xl border border-orange-500/20 shadow-xl shadow-orange-500/10">02</span>
                    Fluxo Automático Pós-Envio
                </h2>
            </div>

            <div className="space-y-8 relative z-10">
                <div className={`p-6 rounded-3xl transition-all border-2 ${selectedChatwootLabels.length > 0 ? 'bg-purple-500/5 border-purple-500/30' : 'bg-slate-800/10 border-white/5 hover:border-white/10'}`}>
                    <div className="flex items-center gap-4 mb-5">
                        <div className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all ${selectedChatwootLabels.length > 0 ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40 scale-110' : 'bg-slate-800 text-slate-500'}`}>
                            <FiSettings size={22} />
                        </div>
                        <div className="flex-1">
                            <div className={`text-base font-black tracking-tight ${selectedChatwootLabels.length > 0 ? 'text-white' : 'text-slate-500'}`}>Etiquetas Chatwoot</div>
                            <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Aplicar na conversa (Discovery)</div>
                        </div>
                    </div>
                    <SearchableSelect
                        isMulti={true}
                        options={chatwootLabels.map((lbl) => ({ value: lbl.title, label: lbl.title }))}
                        value={selectedChatwootLabels}
                        onChange={(val) => setSelectedChatwootLabels(Array.isArray(val) ? val : [])}
                        placeholder="Selecione as etiquetas..."
                        icon={FiSettings}
                        colorClass="focus-within:ring-purple-500/20"
                    />
                </div>
            </div>
        </section>
    );
};

export default AutomationSection;
