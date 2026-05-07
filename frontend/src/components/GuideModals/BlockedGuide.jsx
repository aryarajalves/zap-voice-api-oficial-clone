import React from 'react';

const BlockedGuide = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #1a0a00 0%, #1c1008 100%)', border: '1px solid rgba(249,115,22,0.2)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-white/5"
          style={{ background: 'linear-gradient(90deg, rgba(249,115,22,0.12) 0%, transparent 100%)' }}>
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl"
              style={{ background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.35)' }}>
              🚫
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Guia de Contatos Bloqueados</h2>
              <p className="text-sm text-gray-400">Entenda como funciona o bloqueio automático e manual de contatos.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-white transition-all hover:scale-110"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Conteúdo */}
        <div className="overflow-y-auto flex-1 px-8 py-6 space-y-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#431407 transparent' }}>

          {/* Card 1 — O que é */}
          <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #fb923c' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🚫</span>
              <h3 className="font-bold text-white text-sm">O que são Contatos Bloqueados?</h3>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">Contatos bloqueados são números que <b className="text-white">nunca receberão mensagens</b> dos seus disparos ou funis — independente da campanha. O sistema automaticamente os pula durante qualquer envio.</p>
            <p className="text-orange-400 text-xs mt-2 italic">💡 Respeitar pedidos de opt-out evita bloqueios pela Meta e mantém a reputação do número saudável.</p>
          </div>

          {/* Card 2 — Gatilhos de Auto-Bloqueio */}
          <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #ef4444' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">⚡</span>
              <h3 className="font-bold text-white text-sm">Gatilhos de Auto-Bloqueio</h3>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed mb-3">Se um contato clicar em um botão ou enviar uma mensagem contendo alguma das palavras cadastradas, ele é <b className="text-white">bloqueado automaticamente</b> em tempo real.</p>
            <div className="rounded-xl p-3 font-mono text-xs leading-relaxed" style={{ background: 'rgba(0,0,0,0.3)' }}>
              <div className="flex flex-wrap gap-2">
                {['sair', 'parar', 'cancelar', 'não quero', 'stop', 'unsubscribe', 'opt-out', 'descadastrar'].map(w => (
                  <span key={w} className="px-2 py-0.5 rounded-full text-red-300" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)' }}>{w}</span>
                ))}
              </div>
            </div>
            <p className="text-red-400 text-xs mt-2 italic">💡 Adicione variações da mesma palavra (ex: "nao quero" e "não quero") para cobrir todas as formas de escrita.</p>
          </div>

          {/* Card 3 — Como adicionar gatilhos */}
          <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #f59e0b' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">➕</span>
              <h3 className="font-bold text-white text-sm">Gerenciando Gatilhos</h3>
            </div>
            <div className="space-y-2">
              {[
                { label: 'Adicionar', desc: 'Digite a palavra no campo e clique em "Adicionar". Os gatilhos são salvos automaticamente.' },
                { label: 'Remover', desc: 'Clique no × ao lado da palavra para removê-la da lista.' },
                { label: 'Case Insensitive', desc: 'A comparação ignora maiúsculas/minúsculas. "SAIR" e "sair" funcionam igualmente.' },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-3 p-2.5 rounded-xl" style={{ background: 'rgba(245,158,11,0.07)' }}>
                  <span className="text-amber-300 font-bold text-xs shrink-0 mt-0.5 w-24">{item.label}</span>
                  <p className="text-gray-400 text-xs leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Card 4 — Bloqueio Manual */}
          <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #6366f1' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">📵</span>
              <h3 className="font-bold text-white text-sm">Bloqueio Manual de Números</h3>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed mb-3">Adicione números específicos que <b className="text-white">nunca devem receber mensagens</b>, independente de terem enviado alguma palavra de gatilho.</p>
            <div className="space-y-2">
              {[
                { label: 'Manual', desc: 'Cole os números diretamente no campo de texto, um por linha ou separados por vírgula.' },
                { label: 'Upload CSV/Excel', desc: 'Importe um arquivo com uma coluna de telefones para bloquear em lote.' },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-3 p-2.5 rounded-xl" style={{ background: 'rgba(99,102,241,0.08)' }}>
                  <span className="text-indigo-300 font-bold text-xs shrink-0 mt-0.5 w-24">{item.label}</span>
                  <p className="text-gray-400 text-xs leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
            <p className="text-indigo-400 text-xs mt-2 italic">💡 Use com DDI 55 (ex: 5585999999999) para garantir que o número seja reconhecido corretamente.</p>
          </div>

          {/* Card 5 — Como funciona na prática */}
          <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #10b981' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">⚙️</span>
              <h3 className="font-bold text-white text-sm">Como funciona na prática</h3>
            </div>
            <div className="space-y-1.5">
              <p className="text-gray-400 text-xs">1. Contato recebe seu template e responde <span className="text-white font-mono">"Não quero"</span>.</p>
              <p className="text-gray-400 text-xs">2. O sistema detecta a palavra gatilho e <b className="text-orange-300">bloqueia automaticamente</b> o número.</p>
              <p className="text-gray-400 text-xs">3. Nos próximos disparos, esse número é <b className="text-white">pulado silenciosamente</b>.</p>
              <p className="text-gray-400 text-xs">4. O contato nunca mais recebe mensagens dessa conta até ser <b className="text-white">desbloqueado manualmente</b>.</p>
            </div>
            <p className="text-emerald-400 text-xs mt-3 italic">💡 Também é possível adicionar a lista de exclusão diretamente no Disparo em Massa para bloquear apenas naquela campanha específica.</p>
          </div>

        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-white/5 flex justify-end" style={{ background: 'rgba(0,0,0,0.2)' }}>
          <button
            onClick={onClose}
            className="px-8 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #ea580c, #fb923c)', boxShadow: '0 4px 20px rgba(249,115,22,0.35)' }}
          >
            Entendido!
          </button>
        </div>
      </div>
    </div>
  );
};

export default BlockedGuide;
