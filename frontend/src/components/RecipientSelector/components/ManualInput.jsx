
import React from 'react';

const ManualInput = ({ inputText, setInputText, parseContacts, add55ToInput, templateVariables = [] }) => {
    return (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="relative group/input">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-2xl blur opacity-0 group-hover/input:opacity-100 transition duration-500"></div>
                <textarea
                    className="relative w-full p-6 bg-black/40 border border-white/10 rounded-2xl focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 outline-none text-slate-200 text-sm min-h-[160px] placeholder:text-slate-600 font-mono transition-all resize-none shadow-inner"
                    placeholder={templateVariables.length > 0
                        ? `Cole sua lista aqui...\n5511999999999|${templateVariables.map(v => v.label).join('|')}\n5511888888888|${templateVariables.map(v => v.label).join('|')}`
                        : "Cole sua lista aqui...\n5511999999999\n5511888888888"}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                />
                <div className="absolute bottom-4 right-4 text-[10px] uppercase font-black text-slate-600 tracking-widest pointer-events-none">
                    Um por linha
                </div>
            </div>
            {templateVariables.length > 0 && (
                <div className="text-[11px] text-emerald-400/70 font-mono px-2 -mt-1">
                    💡 Separe variáveis com <span className="text-emerald-300 font-bold">|</span> — ex: <span className="text-slate-300">telefone|{templateVariables.map(v => v.label).join('|')}</span>
                </div>
            )}
            <div className="flex gap-4">
                <button
                    onClick={parseContacts}
                    disabled={!inputText.trim()}
                    className="flex-1 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-lg shadow-emerald-900/40 hover:shadow-emerald-900/60 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group-hover/input:shadow-emerald-500/10"
                >
                    Processar Lista
                </button>
                {inputText.trim().length > 0 && (
                    <button
                        onClick={add55ToInput}
                        className="px-6 bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl font-black text-xs uppercase tracking-widest border border-white/5 transition-all shadow-md hover:shadow-lg active:scale-95 animate-in zoom-in duration-200"
                        title="Adicionar 55 aos números abaixo"
                    >
                        +55
                    </button>
                )}
            </div>
        </div>
    );
};

export default ManualInput;
