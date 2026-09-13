import React from 'react';

const ColumnSelectorHeader = ({ step, onClose }) => {
    return (
        <div className="flex justify-between items-center px-8 pt-8 pb-6 border-b border-white/5 bg-[#0d1117]">
            <div>
                <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Passo {step} de 2
                    </span>
                    <h3 className="text-xl font-black text-white tracking-tight">
                        {step === 1 ? 'Mapear Colunas' : 'Salvar na Base de Contatos'}
                    </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1.5">
                    {step === 1
                        ? 'Clique nos badges para definir o que cada coluna do seu arquivo representa'
                        : 'Escolha como deseja registrar os contatos na sua base do painel'}
                </p>
            </div>
            <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 hover:text-white hover:bg-white/8 transition-all duration-200 cursor-pointer"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6L6 18M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
};

export default ColumnSelectorHeader;
