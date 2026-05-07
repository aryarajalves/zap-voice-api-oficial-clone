import React from 'react';

const FunnelGuide = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0f1729 0%, #111827 100%)', border: '1px solid rgba(99,102,241,0.25)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-white/5"
          style={{ background: 'linear-gradient(90deg, rgba(99,102,241,0.15) 0%, transparent 100%)' }}>
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl"
              style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)' }}>
              🔀
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Guia de Funis de Automação</h2>
              <p className="text-sm text-gray-400">Entenda como criar e disparar funis inteligentes no WhatsApp.</p>
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
        <div className="overflow-y-auto flex-1 px-8 py-6 space-y-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#312e81 transparent' }}>

          {/* Card 1 — O que é um Funil */}
          <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #6366f1' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🔀</span>
              <h3 className="font-bold text-white text-sm">O que é um Funil?</h3>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">Um funil é uma <b className="text-white">sequência automática de mensagens</b> enviadas com intervalos definidos. Após disparar para um contato, cada etapa é executada uma a uma, sem intervenção manual.</p>
            <p className="text-indigo-400 text-xs mt-2 italic">💡 Ideal para nutrição de leads, boas-vindas, follow-ups e jornadas de onboarding.</p>
          </div>

          {/* Card 2 — Tipos de etapa */}
          <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #f59e0b' }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🧩</span>
              <h3 className="font-bold text-white text-sm">Tipos de Etapa</h3>
            </div>
            <div className="space-y-2">
              {[
                { label: 'Mensagem', color: 'text-blue-300 bg-blue-900/20', desc: 'Envia um texto livre. Pode incluir até 3 botões de resposta rápida para o contato interagir.' },
                { label: 'Template', color: 'text-indigo-300 bg-indigo-900/20', desc: 'Envia um template aprovado pela Meta. Use para iniciar contatos fora da janela de 24h.' },
                { label: 'Delay', color: 'text-amber-300 bg-amber-900/20', desc: 'Pausa a sequência por um tempo configurável (minutos, horas, dias) antes da próxima etapa.' },
                { label: 'Enquete', color: 'text-emerald-300 bg-emerald-900/20', desc: 'Envia uma poll interativa do WhatsApp com opções para o contato votar.' },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${item.color}`}>{item.label}</span>
                  <p className="text-gray-400 text-xs leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3 — Editor visual */}
          <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #3b82f6' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🎨</span>
              <h3 className="font-bold text-white text-sm">Editor Visual de Fluxo</h3>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed mb-2">Ao clicar em um funil para editar, você entra no <b className="text-white">editor visual drag-and-drop</b>. Arraste nós, conecte etapas e visualize o fluxo completo da jornada do cliente.</p>
            <div className="space-y-1.5">
              <p className="text-gray-400 text-xs">• <span className="text-white">Arrastar nós:</span> reorganize a ordem das etapas livremente.</p>
              <p className="text-gray-400 text-xs">• <span className="text-white">Conectar setas:</span> defina qual etapa vem depois de qual.</p>
              <p className="text-gray-400 text-xs">• <span className="text-white">Clique duplo no nó:</span> edita o conteúdo da etapa.</p>
            </div>
          </div>

          {/* Card 4 — Disparar Funil */}
          <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #10b981' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🚀</span>
              <h3 className="font-bold text-white text-sm">Disparar um Funil</h3>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed mb-3">Selecione um funil na lista para abrir o painel <b className="text-white">"Disparar Funil"</b> à direita. Lá você configura:</p>
            <div className="space-y-2">
              {[
                { label: 'Lista de contatos', desc: 'Cole números manualmente ou importe um CSV/Excel.' },
                { label: 'Delay entre envios', desc: 'Intervalo entre cada disparo para evitar bloqueios.' },
                { label: 'Agendamento', desc: 'Programe o início do funil para uma data e hora futura.' },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-3 p-2.5 rounded-xl" style={{ background: 'rgba(16,185,129,0.07)' }}>
                  <span className="text-emerald-400 font-bold text-xs shrink-0 mt-0.5">•</span>
                  <p className="text-gray-400 text-xs leading-relaxed"><span className="text-white font-semibold">{item.label}:</span> {item.desc}</p>
                </div>
              ))}
            </div>
            <p className="text-emerald-400 text-xs mt-2 italic">💡 Funis com etapa de Template devem ser disparados pelo "Disparo em Massa" (ícone indica isso automaticamente).</p>
          </div>

          {/* Card 5 — Variáveis Globais */}
          <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #a78bfa' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🌐</span>
              <h3 className="font-bold text-white text-sm">Variáveis Globais</h3>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed mb-3">Valores reutilizáveis em qualquer mensagem do funil. Use a sintaxe <span className="font-mono text-purple-300 text-xs">{'{{nome_da_variavel}}'}</span> no texto das etapas.</p>
            <div className="rounded-xl p-3 font-mono text-xs text-emerald-400 space-y-1" style={{ background: 'rgba(0,0,0,0.3)' }}>
              <div>{'{{link_grupo}}'} → https://chat.whatsapp.com/...</div>
              <div>{'{{nome_empresa}}'} → Luana Ribeiro Imóveis</div>
            </div>
            <p className="text-purple-400 text-xs mt-2 italic">💡 Ideal para links, nomes, telefones e outras informações que mudam por cliente.</p>
          </div>

          {/* Card 6 — Etiquetas Chatwoot */}
          <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #ec4899' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🏷️</span>
              <h3 className="font-bold text-white text-sm">Criar Etiqueta Chatwoot</h3>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">Cria etiquetas diretamente no Chatwoot para organizar contatos. As etapas do funil podem aplicar etiquetas automaticamente aos contatos que passam por elas, facilitando a segmentação da equipe de atendimento.</p>
          </div>

        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-white/5 flex justify-end" style={{ background: 'rgba(0,0,0,0.2)' }}>
          <button
            onClick={onClose}
            className="px-8 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 20px rgba(99,102,241,0.4)' }}
          >
            Entendido!
          </button>
        </div>
      </div>
    </div>
  );
};

export default FunnelGuide;
