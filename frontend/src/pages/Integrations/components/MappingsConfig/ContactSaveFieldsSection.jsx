import React from 'react';
import { FiDatabase } from 'react-icons/fi';

// Campos configuráveis. nome e telefone são sempre salvos (não aparecem aqui).
const AVAILABLE_FIELDS = [
  { key: 'email',          label: 'E-mail',             desc: 'Endereço de e-mail do comprador' },
  { key: 'product_name',   label: 'Produto',             desc: 'Nome do produto ou curso' },
  { key: 'price',          label: 'Valor',               desc: 'Valor pago na transação' },
  { key: 'payment_method', label: 'Método de Pagamento', desc: 'Pix, cartão, boleto etc.' },
  { key: 'document',       label: 'CPF / Documento',     desc: 'CPF ou documento enviado pela plataforma' },
  { key: 'custom_fields',  label: 'Campos Extras',       desc: 'Outros dados extraídos (ex: endereço, estado)' },
];

const DEFAULT_FIELDS = ['email', 'product_name', 'price', 'payment_method'];

const ContactSaveFieldsSection = ({ mapping, mIndex, updateMapping }) => {
  // null/undefined = comportamento padrão (DEFAULT_FIELDS)
  const current = mapping.contact_save_fields ?? DEFAULT_FIELDS;

  const toggle = (key) => {
    const next = current.includes(key)
      ? current.filter(k => k !== key)
      : [...current, key];
    updateMapping(mIndex, 'contact_save_fields', next);
  };

  return (
    <div className="mt-4 space-y-3">
      <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5 px-1">
        <FiDatabase size={12} /> Informações para salvar no Contato
      </label>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {/* Nome e Telefone: sempre salvos, não editáveis */}
        {['Nome', 'Telefone'].map(label => (
          <div
            key={label}
            className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-100/50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 opacity-50 cursor-not-allowed"
          >
            <div className="w-4 h-4 mt-0.5 rounded flex items-center justify-center bg-blue-500/20 border border-blue-500/30 shrink-0">
              <div className="w-2 h-2 rounded-sm bg-blue-500" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-300">{label}</p>
              <p className="text-[10px] text-gray-500">Sempre salvo</p>
            </div>
          </div>
        ))}

        {AVAILABLE_FIELDS.map(({ key, label, desc }) => {
          const active = current.includes(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all active:scale-[0.98] ${
                active
                  ? 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20'
                  : 'bg-gray-100/50 dark:bg-white/[0.02] border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10'
              }`}
            >
              <div className={`w-4 h-4 mt-0.5 rounded flex items-center justify-center shrink-0 transition-all ${
                active
                  ? 'bg-blue-500 border-blue-600'
                  : 'bg-transparent border border-gray-400 dark:border-gray-600'
              }`}>
                {active && (
                  <svg viewBox="0 0 10 8" className="w-2.5 h-2 fill-white">
                    <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <div>
                <p className={`text-[11px] font-bold ${active ? 'text-blue-400' : 'text-gray-400 dark:text-gray-400'}`}>{label}</p>
                <p className="text-[10px] text-gray-500 leading-tight">{desc}</p>
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-gray-500 italic px-1">
        Nome e telefone são sempre salvos. Os demais campos são atualizados apenas quando presentes no webhook.
      </p>
    </div>
  );
};

export default ContactSaveFieldsSection;
