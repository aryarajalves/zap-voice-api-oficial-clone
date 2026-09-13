import React from 'react';

export default function ContactsConfigSection({
  contactsCount,
  setContactsCount,
  contactsTagCount,
  setContactsTagCount
}) {
  return (
    <div className="space-y-4">
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
        <p className="text-xs text-emerald-300 leading-relaxed">
          Gera contatos fictícios com nomes, e-mails e etiquetas aleatórias e os insere diretamente no banco de contatos.
        </p>
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Quantidade de Contatos</label>
        <input
          type="number"
          min="1"
          max="50000"
          value={contactsCount}
          onChange={(e) => setContactsCount(parseInt(e.target.value) || 1)}
          className="w-full bg-gray-900/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all outline-none"
        />
        <p className="text-[10px] text-gray-500 mt-1">Máximo 50.000 por vez</p>
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Etiquetas Aleatórias por Contato</label>
        <input
          type="number"
          min="1"
          max="15"
          value={contactsTagCount}
          onChange={(e) => setContactsTagCount(parseInt(e.target.value) || 1)}
          className="w-full bg-gray-900/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all outline-none"
        />
      </div>
    </div>
  );
}
