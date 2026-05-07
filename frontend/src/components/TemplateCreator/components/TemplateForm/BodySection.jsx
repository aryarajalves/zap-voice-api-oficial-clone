import React from 'react';
import { FiMaximize, FiAlertCircle } from 'react-icons/fi';
import { hasMetaVarIssue } from '../../utils/templateUtils';

const BodySection = ({ logic }) => {
    const { formData, setFormData, setIsBodyExpanded, fixBodyTextForMeta } = logic;

    const addVariable = () => {
        const ta = document.getElementById('bodyTextarea');
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const text = formData.body_text;
        const matches = text.match(/\{\{(\d+)\}\}/g) || [];
        const nextNum = matches.length + 1;
        const varStr = `{{${nextNum}}}`;
        const newText = text.substring(0, start) + varStr + text.substring(end);
        setFormData({ ...formData, body_text: newText });
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-bold text-gray-700 dark:text-white">Corpo da Mensagem</label>
                <button
                    type="button"
                    onClick={addVariable}
                    className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded"
                >
                    + Adicionar Variável
                </button>
            </div>
            <div className="relative group">
                <textarea
                    id="bodyTextarea"
                    value={formData.body_text}
                    onChange={(e) => setFormData({ ...formData, body_text: e.target.value })}
                    rows="10"
                    className="w-full p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white font-sans text-base leading-relaxed"
                    placeholder="Escreva sua mensagem aqui. Use {{1}}, {{2}} para variáveis que poderá preencher no momento do envio."
                    required
                />
                <button
                    type="button"
                    onClick={() => setIsBodyExpanded(true)}
                    className="absolute top-2 right-2 p-2 text-gray-400 hover:text-blue-500 bg-white/50 dark:bg-black/20 rounded-lg opacity-0 group-hover:opacity-100 transition shadow-sm border border-gray-200 dark:border-gray-700"
                    title="Maximizar"
                >
                    <FiMaximize size={16} />
                </button>
            </div>
            {hasMetaVarIssue(formData.body_text) && (
                <div className="mt-2 flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-xl px-4 py-2.5">
                    <FiAlertCircle className="text-amber-500 shrink-0" size={16} />
                    <span className="text-xs text-amber-700 dark:text-amber-300 flex-1">
                        Variável no início ou fim do texto — a Meta vai rejeitar. Clique para corrigir automaticamente.
                    </span>
                    <button
                        type="button"
                        onClick={fixBodyTextForMeta}
                        className="text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 px-3 py-1 rounded-lg transition shrink-0"
                    >
                        Corrigir
                    </button>
                </div>
            )}
        </div>
    );
};

export default BodySection;
