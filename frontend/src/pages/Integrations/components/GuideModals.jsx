import React from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiCheckCircle, FiCopy, FiZap, FiSettings, FiActivity } from 'react-icons/fi';

export const GuideModal = ({ isOpen, onClose, toast }) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[11000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-500">
      <div className="bg-white dark:bg-[#1e293b] rounded-[3rem] w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-gray-100 dark:border-white/5 animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-[#0f172a]/50 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-600/20">
              <FiZap size={24} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight uppercase">Guia de Integração</h3>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-10">
          <div className="bg-indigo-500/5 p-8 rounded-[2rem] border border-indigo-500/10">
            <h4 className="text-lg font-black text-indigo-600 dark:text-indigo-400 mb-4 uppercase tracking-tight">O que é a Integração Webhook?</h4>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
              A integração via Webhook permite que o ZapVoice receba notificações automáticas de plataformas externas (como Hotmart, Kiwify, Eduzz, Elementor, etc.) quando ocorre um evento específico, como uma compra aprovada ou carrinho abandonado.
            </p>
          </div>

          <div className="space-y-6">
            <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest border-l-4 border-blue-600 pl-4">Como Configurar:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { title: '1. Criar Integração', desc: 'Clique em "Nova Integração" e dê um nome (Ex: Hotmart VIP).' },
                { title: '2. Copiar Webhook URL', desc: 'Copie a URL gerada e cole na área de Webhooks da sua plataforma.' },
                { title: '3. Configurar Gatilhos', desc: 'Escolha qual evento (ex: Compra Aprovada) dispara qual template.' },
                { title: '4. Mapear Variáveis', desc: 'Mapeie campos como "Nome" e "Telefone" para envio dinâmico.' }
              ].map((step, idx) => (
                <div key={idx} className="p-6 bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-3xl group hover:border-blue-500/30 transition-all shadow-inner">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-xs font-black mb-3">{idx + 1}</div>
                  <h5 className="font-black text-gray-900 dark:text-white text-sm uppercase mb-2">{step.title}</h5>
                  <p className="text-xs text-gray-500 leading-relaxed font-medium">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-emerald-500/5 p-8 rounded-[2rem] border border-emerald-500/10">
             <h4 className="text-sm font-black text-emerald-600 dark:text-emerald-400 mb-4 uppercase tracking-widest">Dica Premium:</h4>
             <p className="text-xs text-gray-600 dark:text-gray-400 font-medium leading-relaxed italic">
               "Você pode configurar múltiplos gatilhos para a mesma URL de Webhook. O sistema identificará automaticamente o tipo de evento enviado pela plataforma e disparará o template correto."
             </p>
          </div>
        </div>

        <div className="p-8 bg-gray-50/50 dark:bg-[#0f172a]/50 border-t border-gray-100 dark:border-white/5 flex justify-center">
          <button
            onClick={onClose}
            className="px-12 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-95"
          >
            Entendi, vamos começar!
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export const MappingGuideModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[12000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-[#1e293b] rounded-[3rem] w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-gray-100 dark:border-white/5 animate-in zoom-in-95">
        <div className="p-8 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-[#0f172a]/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg">
              <FiSettings size={24} />
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight uppercase">Guia de Variáveis</h3>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-8">
          <div className="space-y-4">
            <h4 className="text-xs font-black text-indigo-500 uppercase tracking-widest">O que são variáveis dinâmicas?</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
              São campos que mudam a cada envio. Se você usa <code className="bg-indigo-50 dark:bg-indigo-900/40 px-1.5 py-0.5 rounded font-black">{"{{1}}"}</code> no seu template do WhatsApp, o sistema precisa saber de onde tirar esse valor do Webhook.
            </p>
          </div>

          <div className="space-y-6">
             <div className="p-6 bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-3xl shadow-inner">
                <h5 className="font-black text-xs uppercase mb-3 text-gray-900 dark:text-white">Opções de Mapeamento:</h5>
                <ul className="space-y-4">
                   <li className="flex items-start gap-3">
                    <FiCheckCircle className="text-emerald-500 mt-1 shrink-0" />
                    <div>
                      <span className="text-xs font-black text-gray-900 dark:text-white block uppercase">Campos Padrão</span>
                      <p className="text-[11px] text-gray-500">Nome, Telefone, E-mail, Nome do Produto.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <FiCheckCircle className="text-emerald-500 mt-1 shrink-0" />
                    <div>
                      <span className="text-xs font-black text-gray-900 dark:text-white block uppercase">Campo Personalizado (Path)</span>
                      <p className="text-[11px] text-gray-500">Se precisar de algo específico, use o caminho do JSON (ex: <code className="text-blue-500 font-bold">data.transaction.status</code>).</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <FiCheckCircle className="text-emerald-500 mt-1 shrink-0" />
                    <div>
                      <span className="text-xs font-black text-gray-900 dark:text-white block uppercase">Valor Fixo</span>
                      <p className="text-[11px] text-gray-500">Digite um texto fixo que será enviado para todos.</p>
                    </div>
                  </li>
                </ul>
             </div>
          </div>
        </div>

        <div className="p-8 bg-gray-50/50 dark:bg-[#0f172a]/50 border-t border-gray-100 dark:border-white/5 flex justify-center">
          <button
            onClick={onClose}
            className="px-12 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700 transition-all active:scale-95"
          >
            Fechar Guia
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
