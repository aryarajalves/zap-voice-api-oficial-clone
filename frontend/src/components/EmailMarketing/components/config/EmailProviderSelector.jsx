import React from 'react';

const PROVIDERS = [
  {
    id: 'ses',
    title: '⚡ Amazon SES',
    description: 'Custo ultra baixo ($0.10 / 1.000 e-mails) e alta entregabilidade.',
    colorClass: 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30'
  },
  {
    id: 'resend',
    title: '🚀 Resend',
    description: 'Configuração em 30 segundos usando apenas 1 API Key.',
    colorClass: 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30'
  },
  {
    id: 'smtp',
    title: '⚙️ SMTP Customizado',
    description: 'Qualquer servidor próprio (Host, Porta, Usuário e Senha).',
    colorClass: 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30'
  },
  {
    id: 'direct',
    title: '✉️ Envio Direto (Sem SMTP)',
    description: 'Envio grátis pelo servidor. Pode ir para caixa de SPAM.',
    colorClass: 'border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/30'
  }
];

export default function EmailProviderSelector({ selectedProvider, onSelectProvider }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
        Selecione o Provedor
      </label>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {PROVIDERS.map((prov) => {
          const isSelected = selectedProvider === prov.id;
          return (
            <button
              key={prov.id}
              type="button"
              onClick={() => onSelectProvider(prov.id)}
              className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                isSelected
                  ? prov.colorClass
                  : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900/50 hover:border-gray-300'
              }`}
            >
              <div>
                <div className="font-bold text-gray-800 dark:text-white flex items-center gap-2 text-sm">
                  {prov.title}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {prov.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
