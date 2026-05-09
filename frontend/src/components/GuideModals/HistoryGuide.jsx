import React from 'react';

const HistoryGuide = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0a1628 0%, #0c1a2e 100%)', border: '1px solid rgba(14,165,233,0.2)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-white/5"
          style={{ background: 'linear-gradient(90deg, rgba(14,165,233,0.12) 0%, transparent 100%)' }}>
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl"
              style={{ background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.35)' }}>
              🕐
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Guia do Histórico de Disparos</h2>
              <p className="text-sm text-gray-400">Entenda como ler, filtrar e auditar seus disparos realizados.</p>
            </div>
          </div>

        </div>

        {/* Conteúdo */}
        <div className="overflow-y-auto flex-1 px-8 py-6 space-y-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#0c4a6e transparent' }}>

          {/* Card 1 — O que é o Histórico */}
          <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #38bdf8' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🕐</span>
              <h3 className="font-bold text-white text-sm">O que é o Histórico?</h3>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">O Histórico registra <b className="text-white">todos os disparos já executados</b> — tanto de Funis quanto de Disparo em Massa. Cada linha representa uma mensagem enviada a um contato específico, com data, status e detalhes da campanha.</p>
            <p className="text-sky-400 text-xs mt-2 italic">💡 Use o Histórico para auditar entregas, identificar falhas e entender o desempenho das suas campanhas.</p>
          </div>

          {/* Card 2 — Colunas da tabela */}
          <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #6366f1' }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📋</span>
              <h3 className="font-bold text-white text-sm">Colunas da Tabela</h3>
            </div>
            <div className="space-y-2">
              {[
                { col: 'Data/Hora', desc: 'Quando o disparo foi executado ou agendado.' },
                { col: 'Funil / Template', desc: 'Nome da campanha ou template usado. Badge "Bulk" indica Disparo em Massa.' },
                { col: 'Contato', desc: 'Número de telefone do destinatário. Pode aparecer como "-" em disparos em lote.' },
                { col: 'Status', desc: 'Resultado do envio: Enviado, Falha, Cancelado ou Pendente.' },
                { col: 'Ações', desc: 'Botão de lixeira para excluir o registro do histórico.' },
              ].map(item => (
                <div key={item.col} className="flex items-start gap-3 p-2.5 rounded-xl" style={{ background: 'rgba(99,102,241,0.07)' }}>
                  <span className="text-indigo-300 font-bold text-xs shrink-0 mt-0.5 w-28">{item.col}</span>
                  <p className="text-gray-400 text-xs leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3 — Status */}
          <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #10b981' }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🚦</span>
              <h3 className="font-bold text-white text-sm">Status de Envio</h3>
            </div>
            <div className="space-y-2">
              {[
                { status: 'Enviado', color: 'text-emerald-400 bg-emerald-900/30', desc: 'Mensagem entregue com sucesso ao WhatsApp do contato.' },
                { status: 'Falha', color: 'text-red-400 bg-red-900/30', desc: 'Erro no envio. Veja o "Relatório de Falhas" para entender o motivo.' },
                { status: 'Cancelado', color: 'text-gray-400 bg-gray-800/50', desc: 'Disparo foi cancelado manualmente antes de ser executado.' },
                { status: 'Pendente', color: 'text-yellow-400 bg-yellow-900/30', desc: 'Agendado mas ainda não executado. Aparece aqui antes do horário programado.' },
              ].map(item => (
                <div key={item.status} className="flex items-start gap-3 p-2.5 rounded-xl" style={{ background: 'rgba(0,0,0,0.2)' }}>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${item.color}`}>{item.status}</span>
                  <p className="text-gray-400 text-xs leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Card 4 — Filtros */}
          <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #f59e0b' }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🔍</span>
              <h3 className="font-bold text-white text-sm">Filtros Disponíveis</h3>
            </div>
            <div className="space-y-2">
              {[
                { label: 'Busca por funil', desc: 'Digite parte do nome do funil ou template para filtrar os registros.' },
                { label: 'Todos os tipos', desc: 'Filtra por Bulk (Disparo em Massa) ou Funil.' },
                { label: 'Todo o período', desc: 'Restringe os resultados por intervalo de datas.' },
                { label: 'Todos os status', desc: 'Mostra apenas Enviados, Falhas, Cancelados ou Pendentes.' },
                { label: '10 itens ▾', desc: 'Controla quantos registros são exibidos por página.' },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-3 p-2.5 rounded-xl" style={{ background: 'rgba(251,191,36,0.07)' }}>
                  <span className="text-amber-300 font-bold text-xs shrink-0 mt-0.5 w-32">{item.label}</span>
                  <p className="text-gray-400 text-xs leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Card 5 — Relatório de Falhas */}
          <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #f97316' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">⚠️</span>
              <h3 className="font-bold text-white text-sm">Relatório de Falhas</h3>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">Quando um disparo tem mensagens com falha, aparece o link <b className="text-orange-300">"Ver Relatório de Falhas (N)"</b> abaixo do nome do template. Clique para ver quais contatos não receberam e o motivo detalhado.</p>
            <div className="mt-3 space-y-1.5">
              <p className="text-gray-400 text-xs">• Número inválido ou não existe no WhatsApp.</p>
              <p className="text-gray-400 text-xs">• Contato bloqueou o número da empresa.</p>
              <p className="text-gray-400 text-xs">• Template não aprovado ou pausado pela Meta.</p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-white/5 flex justify-end" style={{ background: 'rgba(0,0,0,0.2)' }}>
          <button
            onClick={onClose}
            className="px-8 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)', boxShadow: '0 4px 20px rgba(14,165,233,0.35)' }}
          >
            Entendido!
          </button>
        </div>
      </div>
    </div>
  );
};

export default HistoryGuide;
