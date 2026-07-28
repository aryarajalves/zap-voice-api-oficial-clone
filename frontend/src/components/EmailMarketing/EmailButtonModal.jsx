import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import { FiX, FiExternalLink, FiMousePointer, FiLink } from 'react-icons/fi';

const COLOR_OPTIONS = [
  { label: 'Azul Padrão', hex: '#2563eb', bgClass: 'bg-blue-600' },
  { label: 'Verde Vendas / WhatsApp', hex: '#16a34a', bgClass: 'bg-green-600' },
  { label: 'Roxo Premium', hex: '#9333ea', bgClass: 'bg-purple-600' },
  { label: 'Vermelho Destaque', hex: '#dc2626', bgClass: 'bg-red-600' },
  { label: 'Laranja Chamativo', hex: '#ea580c', bgClass: 'bg-orange-600' },
  { label: 'Preto Elegante', hex: '#0f172a', bgClass: 'bg-slate-900' },
];

export default function EmailButtonModal({ isOpen, onClose, onInsert }) {
  const [btnText, setBtnText] = useState('Garantir Minha Vaga');
  const [btnUrl, setBtnUrl] = useState('https://');
  const [btnColor, setBtnColor] = useState('#2563eb');
  const [btnAlign, setBtnAlign] = useState('center');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!btnUrl || btnUrl === 'https://') return toast.error("Digite a URL de destino do botão.");
    if (!btnText || !btnText.trim()) return toast.error("Digite o texto do botão.");

    const buttonHtml = `\n<div style="text-align: ${btnAlign}; margin: 24px 0;">\n  <a href="${btnUrl}" target="_blank" style="background-color: ${btnColor}; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-family: Arial, sans-serif; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.12); font-size: 15px; letter-spacing: 0.3px;">${btnText}</a>\n</div>\n`;

    onInsert(buttonHtml);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[99990] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-gray-100 dark:border-white/10 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <FiExternalLink className="text-blue-500" /> Inserir Botão de Ação (CTA)
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <FiX size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Texto que aparecerá no Botão *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Quero Garantir Minha Vaga"
              value={btnText}
              onChange={e => setBtnText(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-gray-700 rounded-xl text-xs text-gray-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Link / URL de Destino (para onde o cliente vai ao clicar) *
            </label>
            <div className="relative">
              <input
                type="url"
                required
                placeholder="https://seu-site.com/checkout"
                value={btnUrl}
                onChange={e => setBtnUrl(e.target.value)}
                className="w-full px-3 py-2 pl-9 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-gray-700 rounded-xl text-xs text-gray-800 dark:text-white"
              />
              <FiLink className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              💡 Ao clicar no botão, o cliente será redirecionado para esta página em uma nova aba.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              Cor do Botão
            </label>
            <div className="grid grid-cols-3 gap-2">
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setBtnColor(c.hex)}
                  className={`px-2 py-1.5 rounded-xl text-[11px] font-semibold text-white flex items-center justify-center gap-1.5 transition-all ${c.bgClass} ${
                    btnColor === c.hex ? 'ring-2 ring-offset-2 ring-blue-500 scale-105 shadow-md' : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Alinhamento no E-mail
            </label>
            <div className="flex items-center gap-2">
              {[
                { id: 'left', label: 'Esquerda' },
                { id: 'center', label: 'Centralizado' },
                { id: 'right', label: 'Direita' }
              ].map(a => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setBtnAlign(a.id)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                    btnAlign === a.id
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 border-transparent'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pré-visualização do Botão */}
          <div className="p-4 bg-gray-100 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-gray-700 text-center space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Pré-visualização</span>
            <div style={{ textAlign: btnAlign }}>
              <span
                style={{
                  backgroundColor: btnColor,
                  color: '#ffffff',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  display: 'inline-block'
                }}
              >
                {btnText || 'Texto do Botão'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20"
            >
              Inserir Botão
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
