import React from 'react';
import { FiSettings } from 'react-icons/fi';
import SearchableSelect from '../common/SearchableSelect';

const AutomationSection = ({
    sendPrivateMessage,
    setSendPrivateMessage,
    cloneToPrivateNote,
    chatwootLabels,
    selectedChatwootLabels,
    setSelectedChatwootLabels,
    privateMessageText,
    setPrivateMessageText,
    openExpansion,
    privateMessageDelay,
    setPrivateMessageDelay,
    privateMessageDelayUnit,
    setPrivateMessageDelayUnit,
    privateMessageConcurrency,
    setPrivateMessageConcurrency,
}) => {
    return (
        <section className="bg-slate-900/60 backdrop-blur-md rounded-[2.5rem] p-10 shadow-2xl border border-white/5 h-fit relative overflow-hidden group/auto">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-orange-500/5 blur-3xl rounded-full"></div>

            <div className="flex items-center gap-4 mb-10 relative z-10">
                <h2 className="text-2xl font-black text-white flex items-center gap-4">
                    <span className="p-3 bg-orange-500/10 text-orange-400 rounded-2xl border border-orange-500/20 shadow-xl shadow-orange-500/10">02</span>
                    Fluxo Automático Pós-Envio
                </h2>
                <button
                    onClick={() => cloneToPrivateNote()}
                    className="text-[10px] font-black bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-white px-4 py-2 rounded-xl uppercase tracking-widest border border-orange-500/20 backdrop-blur-md transition-all flex items-center gap-2"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></svg>
                    Clonar Template
                </button>
            </div>

            <div className="space-y-8 relative z-10">
                <label className={`flex items-center p-6 rounded-3xl cursor-pointer transition-all border-2 group/card ${sendPrivateMessage ? 'bg-orange-500/5 border-orange-500/30' : 'bg-slate-800/10 border-white/5 hover:border-white/10 hover:bg-slate-800/20'}`}>
                    <div className={`w-14 h-14 flex items-center justify-center rounded-2xl transition-all duration-700 ${sendPrivateMessage ? 'bg-orange-600 text-white shadow-2xl shadow-orange-900/40 rotate-6 scale-110' : 'bg-slate-800 text-slate-500'}`}>
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                    </div>
                    <div className="ml-5 flex-1">
                        <div className={`text-lg font-black tracking-tight transition-colors ${sendPrivateMessage ? 'text-white' : 'text-slate-500'}`}>Nota Privada Automatizada</div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Registro Automático Chatwoot</div>
                    </div>
                    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${sendPrivateMessage ? 'bg-orange-600 border-orange-400' : 'bg-slate-900 border-slate-700'}`}>
                        {sendPrivateMessage && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="text-white"><path d="M20 6L9 17l-5-5" /></svg>}
                    </div>
                    <input
                        type="checkbox"
                        className="hidden"
                        checked={sendPrivateMessage}
                        onChange={(e) => setSendPrivateMessage(e.target.checked)}
                    />
                </label>

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

                {sendPrivateMessage && (
                    <div className="space-y-6 animate-in slide-in-from-top-4 fade-in duration-500">
                        <div className="relative group/field">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500/20 to-yellow-500/20 rounded-3xl blur opacity-0 group-hover/field:opacity-100 transition duration-500"></div>
                            <textarea
                                className="relative w-full p-6 pr-14 bg-black/40 border border-white/10 rounded-3xl focus:border-orange-500/40 outline-none transition-all text-slate-200 min-h-[140px] shadow-inner placeholder:text-slate-800 text-sm font-medium leading-relaxed"
                                placeholder="Este conteúdo será visível apenas internamente no Chatwoot..."
                                value={privateMessageText}
                                onChange={(e) => setPrivateMessageText(e.target.value)}
                            />
                            <button
                                onClick={() => openExpansion("Configuração - Nota Privada (Chatwoot)", "privateMessageText", privateMessageText)}
                                className="absolute bottom-5 right-5 p-3 bg-slate-800/80 backdrop-blur shadow-2xl text-slate-400 hover:text-orange-400 rounded-xl transition-all opacity-0 group-hover/field:opacity-100"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-5">
                            <div className="p-5 bg-slate-800/40 border border-white/5 rounded-3xl group/param transition-all hover:bg-slate-800/60">
                                <label className="block text-[9px] font-black text-slate-600 uppercase mb-3 px-1 tracking-widest group-hover/param:text-orange-400 transition-colors">Atraso de Envio</label>
                                <div className="flex items-center gap-3 bg-black/40 p-2.5 rounded-2xl border border-white/5 shadow-inner">
                                    <input
                                        type="number"
                                        className="flex-1 bg-transparent outline-none font-black text-xl text-white tabular-nums w-12"
                                        value={privateMessageDelay}
                                        onChange={(e) => setPrivateMessageDelay(parseInt(e.target.value))}
                                    />
                                    <select
                                        className="bg-slate-700 text-[10px] font-black text-slate-200 outline-none px-3 py-1.5 rounded-xl border border-white/10"
                                        value={privateMessageDelayUnit}
                                        onChange={(e) => setPrivateMessageDelayUnit(e.target.value)}
                                    >
                                        <option value="seconds">SEG</option>
                                        <option value="minutes">MIN</option>
                                    </select>
                                </div>
                            </div>
                            <div className="p-5 bg-slate-800/40 border border-white/5 rounded-3xl group/param transition-all hover:bg-slate-800/60">
                                <label className="block text-[9px] font-black text-slate-600 uppercase mb-3 px-1 tracking-widest group-hover/param:text-orange-400 transition-colors">Concorrência</label>
                                <div className="bg-black/40 p-2.5 rounded-2xl border border-white/5 shadow-inner flex items-center">
                                    <input
                                        type="number"
                                        className="w-full bg-transparent outline-none font-black text-xl text-white tabular-nums"
                                        value={privateMessageConcurrency}
                                        onChange={(e) => setPrivateMessageConcurrency(parseInt(e.target.value))}
                                    />
                                    <span className="text-[10px] font-black text-slate-700 uppercase">Jobs</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};

export default AutomationSection;
