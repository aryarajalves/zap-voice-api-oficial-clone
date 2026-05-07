import React from 'react';
import { FiSlash } from 'react-icons/fi';

export default function KeywordSection({ keywords, newKeyword, setNewKeyword, addKeyword, removeKeyword }) {
    return (
        <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-white/5 transition-all duration-200">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-4">
                <FiSlash className="text-orange-500" />
                Gatilhos de Auto-Bloqueio (Botões)
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Se o contato clicar em um botão (ou enviar mensagem) contendo estas palavras, ele será <strong>bloqueado automaticamente</strong>.
            </p>

            <form onSubmit={addKeyword} className="flex gap-2 mb-4">
                <input
                    type="text"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    placeholder="Ex: Parar, Sair, Desinscrever..."
                    className="flex-1 px-4 py-2 border border-white/10 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none bg-white/5 dark:bg-gray-700/50 text-gray-900 dark:text-white"
                />
                <button
                    type="submit"
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition shadow-lg shadow-orange-500/20"
                >
                    Adicionar
                </button>
            </form>

            <div className="flex flex-wrap gap-2 mb-6 min-h-[40px] p-3 bg-white/5 dark:bg-gray-900/50 rounded-lg border border-white/5">
                {keywords.map((kw, i) => (
                    <div key={i} className="flex items-center gap-1 bg-white/10 dark:bg-gray-800/80 px-3 py-1 rounded-full border border-white/10 text-sm text-gray-700 dark:text-gray-300 group">
                        {kw}
                        <button
                            onClick={() => removeKeyword(kw)}
                            className="text-gray-400 hover:text-red-500 transition ml-1"
                        >
                            &times;
                        </button>
                    </div>
                ))}
                {keywords.length === 0 && <span className="text-gray-400 text-sm italic">Nenhum gatilho configurado.</span>}
            </div>

            <div className="flex justify-between items-center text-xs text-gray-400">
                <span>* Gatilhos são salvos automaticamente ao adicionar/remover.</span>
            </div>
        </div>
    );
}
