import React from 'react';

const ScheduleGuide = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0f1a0a 0%, #111827 100%)', border: '1px solid rgba(251,191,36,0.2)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-white/5"
          style={{ background: 'linear-gradient(90deg, rgba(251,191,36,0.12) 0%, transparent 100%)' }}>
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl"
              style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.35)' }}>
              📅
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Guia da Agenda de Disparos</h2>
              <p className="text-sm text-gray-400">Entenda como visualizar, gerenciar e reagendar seus disparos.</p>
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
        <div className="overflow-y-auto flex-1 px-8 py-6 space-y-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#422006 transparent' }}>

          {/* Card 1 — O que é a Agenda */}
          <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #fbbf24' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">📅</span>
              <h3 className="font-bold text-white text-sm">O que é a Agenda de Disparos?</h3>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">A Agenda exibe todos os disparos <b className="text-white">agendados para the futuro</b> em formato de calendário. Cada bolinha colorida no dia representa um disparo programado — seja de Funil, Disparo em Massa ou um Agendamento avulso.</p>
            <p className="text-amber-400 text-xs mt-2 italic">💡 O disparo acontece automaticamente na data e hora configuradas, mesmo com o navegador fechado.</p>
          </div>

          {/* Card 2 — Como agendar */}
          <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #f97316' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">⏰</span>
              <h3 className="font-bold text-white text-sm">Como criar um agendamento?</h3>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed mb-3">Agendamentos são criados ao configurar um disparo nas seções:</p>
            <div className="space-y-2">
              {[
                { label: 'Disparo em Massa', color: 'text-emerald-300', desc: 'Na etapa de Envio, defina uma data/hora futura antes de confirmar.' },
                { label: 'Disparar Funil', color: 'text-indigo-300', desc: 'Ao selecionar um funil e configurar a lista, ative o campo de agendamento.' },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-3 p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <span className={`font-bold text-xs shrink-0 mt-0.5 ${item.color}`}>{item.label}</span>
                  <p className="text-gray-400 text-xs leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3 — Clicando num evento */}
          <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #3b82f6' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🖱️</span>
              <h3 className="font-bold text-white text-sm">Clicando em um Evento</h3>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed mb-3">Ao clicar em uma bolinha de evento no calendário, um painel lateral abre com detalhes e ações:</p>
            <div className="space-y-2">
              {[
                { icon: '📋', label: 'Detalhes completos', desc: 'Nome do disparo, template utilizado, quantidade de contatos, horário programado.' },
                { icon: '✏️', label: 'Reagendar', desc: 'Altere a data e hora do disparo antes que ele execute. Útil para ajustes de última hora.' },
                { icon: '🗑️', label: 'Cancelar / Excluir', desc: 'Remove o agendamento. O disparo não será mais executado.' },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-3 p-2.5 rounded-xl" style={{ background: 'rgba(59,130,246,0.08)' }}>
                  <span className="text-base shrink-0">{item.icon}</span>
                  <div>
                    <p className="text-blue-200 font-bold text-xs">{item.label}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 4 — Navegação */}
          <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #10b981' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🗓️</span>
              <h3 className="font-bold text-white text-sm">Navegando no Calendário</h3>
            </div>
            <div className="space-y-2">
              {[
                { label: '‹ ›  Setas', desc: 'Navega entre os meses para ver disparos passados ou futuros.' },
                { label: 'Hoje', desc: 'Volta imediatamente para o mês atual e destaca o dia de hoje.' },
                { label: 'Bolinhas coloridas', desc: 'Cada cor representa um tipo diferente de disparo. Clique para ver o detalhe.' },
                { label: 'Contador (0)', desc: 'Número ao lado do mês indica quantos eventos estão agendados naquele mês.' },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-3 p-2.5 rounded-xl" style={{ background: 'rgba(16,185,129,0.07)' }}>
                  <span className="text-emerald-300 font-bold text-xs shrink-0 mt-0.5 w-28">{item.label}</span>
                  <p className="text-gray-400 text-xs leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Card 5 — Status dos disparos */}
          <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #a78bfa' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">📊</span>
              <h3 className="font-bold text-white text-sm">Acompanhando Resultados</h3>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">Após o disparo executar, ele sai da Agenda e vai para o <b className="text-white">Histórico de Disparos</b>. Lá você encontra o status de cada mensagem (enviada, falha, pendente) e métricas detalhadas da campanha.</p>
            <p className="text-purple-400 text-xs mt-2 italic">💡 Use o "Histórico" no menu lateral para auditar disparos concluídos.</p>
          </div>

        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-white/5 flex justify-end" style={{ background: 'rgba(0,0,0,0.2)' }}>
          <button
            onClick={onClose}
            className="px-8 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #d97706, #fbbf24)', boxShadow: '0 4px 20px rgba(251,191,36,0.3)' }}
          >
            Entendido!
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleGuide;
