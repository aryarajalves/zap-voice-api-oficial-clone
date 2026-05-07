import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiCheckCircle, FiPlay, FiShare2 } from 'react-icons/fi';

const TestWebhookModal = ({ isOpen, onClose, integration, onTest, isTesting }) => {
  const [testPayload, setTestPayload] = useState(JSON.stringify({
    event_type: "compra_aprovada",
    name: "Cliente Teste",
    phone: "5511999999999",
    email: "teste@exemplo.com",
    price: "97.00",
    payment_method: "pix",
    product_name: "Produto Digital VIP"
  }, null, 2));

  if (!isOpen || !integration) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#1e293b] border border-white/5 rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-[#0f172a]/50">
          <h3 className="text-xl font-black text-white flex items-center gap-4 tracking-tight">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <FiPlay className="text-emerald-500" />
            </div>
            Testar Webhook: {integration.name}
          </h3>
        </div>
        <div className="p-8 space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Payload JSON de Simulação</label>
            <div className="relative group">
              <textarea
                value={testPayload}
                onChange={(e) => setTestPayload(e.target.value)}
                className="w-full h-64 bg-[#0b1120] border border-white/5 rounded-2xl p-6 text-[11px] font-mono text-emerald-400 outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all custom-scrollbar shadow-inner"
              />
              <div className="absolute top-4 right-4 opacity-20 group-hover:opacity-100 transition-opacity">
                <FiCheckCircle className="text-emerald-500" />
              </div>
            </div>
            <p className="text-[11px] text-gray-500 italic px-1 leading-relaxed">
              O sistema irá simular o recebimento deste JSON como se viesse da plataforma configurada.
            </p>
          </div>

          <div className="flex justify-end items-center gap-4 pt-6 border-t border-white/5 bg-[#0f172a]/20 -mx-8 px-8 mt-4">
            <button
              onClick={onClose}
              className="px-6 py-3 text-xs font-black text-gray-500 hover:text-gray-300 uppercase tracking-widest transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={() => onTest(testPayload)}
              disabled={isTesting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-4 rounded-2xl font-black transition-all active:scale-95 flex items-center gap-3 shadow-xl shadow-emerald-600/20 disabled:opacity-50 uppercase tracking-widest text-xs"
            >
              {isTesting ? <FiShare2 className="animate-spin" /> : <FiCheckCircle size={18} />}
              {isTesting ? 'Enviando Teste...' : 'Executar Teste'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default TestWebhookModal;
