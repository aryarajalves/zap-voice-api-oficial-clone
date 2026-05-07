import React from 'react';
import { createPortal } from 'react-dom';

const BulkGuideModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
            <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden"
                style={{ background: 'linear-gradient(160deg, #0a1628 0%, #0f1f14 100%)', border: '1px solid rgba(52,211,153,0.2)' }}>

                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-white/5"
                    style={{ background: 'linear-gradient(90deg, rgba(52,211,153,0.12) 0%, transparent 100%)' }}>
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl"
                            style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.35)' }}>
                            🚀
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Guia do Disparo em Massa</h2>
                            <p className="text-sm text-slate-400">Entenda cada etapa e como enviar mensagens com inteligência.</p>
                        </div>
                    </div>
                </div>

                {/* Conteúdo */}
                <div className="overflow-y-auto flex-1 px-8 py-6 space-y-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e3a2f transparent' }}>

                    {/* Card 1 — Visão Geral */}
                    <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #34d399' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">📡</span>
                            <h3 className="font-bold text-white text-sm">O que é o Disparo em Massa?</h3>
                        </div>
                        <p className="text-slate-300 text-sm leading-relaxed">Permite enviar um <b className="text-white">template aprovado pela Meta</b> para centenas ou milhares de contatos de uma vez. Cada envio é individualizado e pode conter variáveis personalizadas por contato.</p>
                        <p className="text-emerald-400 text-xs mt-2 italic">💡 Use junto com Funis e Agendamentos para criar sequências automáticas de relacionamento.</p>
                    </div>

                    {/* Card 2 — Passo 1: Configuração */}
                    <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #6366f1' }}>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="w-6 h-6 rounded-full bg-indigo-500 text-white text-xs font-black flex items-center justify-center shrink-0">1</span>
                            <h3 className="font-bold text-white text-sm">Etapa 1 — Configuração de Template</h3>
                        </div>
                        <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.1)' }}>
                            <p className="text-slate-300 text-xs leading-relaxed">Um único template enviado para toda a lista. Você preenche as variáveis (ex: nome, data) com valores fixos ou por contato.</p>
                        </div>
                    </div>

                    {/* Card 3 — Variáveis */}
                    <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #a78bfa' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">🔡</span>
                            <h3 className="font-bold text-white text-sm">Variáveis do Template</h3>
                        </div>
                        <p className="text-slate-300 text-sm leading-relaxed mb-3">Campos <b className="text-white">{'{{1}}'}, {'{{2}}'}</b> etc. aparecem ao selecionar o template. Preencha-os com o valor fixo desejado ou deixe em branco para ser preenchido por coluna do CSV.</p>
                        <div className="rounded-xl p-3 font-mono text-xs text-purple-300 leading-relaxed" style={{ background: 'rgba(0,0,0,0.3)' }}>
                            {'{{1}}'} = Nome do cliente → "Maria"<br/>
                            {'{{2}}'} = Data → "15/03/2026"
                        </div>
                        <p className="text-purple-400 text-xs mt-2 italic">💡 Use o botão ⛶ para expandir o campo e editar textos longos com conforto.</p>
                    </div>

                    {/* Card 4 — Mensagem Direta */}
                    <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #f59e0b' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">💬</span>
                            <h3 className="font-bold text-white text-sm">Mensagem Direta Pós-Envio</h3>
                        </div>
                        <p className="text-slate-300 text-sm leading-relaxed">Mensagem de texto livre enviada <b className="text-white">imediatamente após</b> o template, quando a janela de 24h já estiver aberta. Ideal para complementar o template com um texto mais pessoal.</p>
                        <p className="text-amber-400 text-xs mt-2 italic">💡 Suporta botões de resposta rápida para qualificar o lead logo após o disparo.</p>
                    </div>

                    {/* Card 5 — Mensagem Privada */}
                    <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #10b981' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">⏱️</span>
                            <h3 className="font-bold text-white text-sm">Mensagem Privada com Delay</h3>
                        </div>
                        <p className="text-slate-300 text-sm leading-relaxed">Segunda mensagem enviada com um <b className="text-white">atraso configurável</b> (ex: 30 min, 2h). Enviada apenas internamente no Chatwoot como nota, ou também para o contato.</p>
                        <div className="mt-3 space-y-1.5">
                            <p className="text-slate-400 text-xs"><span className="text-emerald-400 font-bold">Delay:</span> tempo de espera antes do envio da 2ª mensagem.</p>
                            <p className="text-slate-400 text-xs"><span className="text-emerald-400 font-bold">Concorrência:</span> quantas mensagens privadas são enviadas simultaneamente.</p>
                        </div>
                    </div>

                    {/* Card 6 — Passo 2: Contatos */}
                    <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #3b82f6' }}>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-black flex items-center justify-center shrink-0">2</span>
                            <h3 className="font-bold text-white text-sm">Etapa 2 — Contatos e Envio</h3>
                        </div>
                        <div className="space-y-2">
                            {[
                                { label: 'Lista Manual', desc: 'Cole números diretamente ou importe um CSV/Excel com coluna de telefone.' },
                                { label: 'Lista de Exclusão', desc: 'Números nesta lista serão pulados. Ideal para quem já recebeu ou pediu para sair.' },
                                { label: 'Delay entre envios', desc: 'Intervalo em segundos entre cada mensagem. Valores menores são mais rápidos mas aumentam o risco de bloqueio.' },
                                { label: 'Concorrência', desc: 'Quantas mensagens são enviadas em paralelo. Recomendado: 1-3 para contas novas.' },
                            ].map(item => (
                                <div key={item.label} className="flex items-start gap-3 p-2.5 rounded-xl" style={{ background: 'rgba(59,130,246,0.08)' }}>
                                    <span className="text-blue-300 font-bold text-xs shrink-0 mt-0.5 w-28">{item.label}</span>
                                    <p className="text-slate-400 text-xs leading-relaxed">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Card 7 — Agendamento */}
                    <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #ec4899' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">📅</span>
                            <h3 className="font-bold text-white text-sm">Agendamento</h3>
                        </div>
                        <p className="text-slate-300 text-sm leading-relaxed">Programe o disparo para uma <b className="text-white">data e hora futura</b>. O sistema enfileira o disparo e executa automaticamente, mesmo que você feche o navegador.</p>
                        <p className="text-pink-400 text-xs mt-2 italic">💡 Combine com a seção "Agenda de Disparos" para visualizar e gerenciar todos os envios programados.</p>
                    </div>

                    {/* Card 8 — Custos */}
                    <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #f97316' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">💰</span>
                            <h3 className="font-bold text-white text-sm">Estimativa de Custo (Meta)</h3>
                        </div>
                        <p className="text-slate-300 text-sm leading-relaxed mb-3">Cada template enviado tem um custo cobrado pela Meta. Os valores estimados são:</p>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { cat: 'Marketing', price: 'R$ 0,35', color: 'text-indigo-300' },
                                { cat: 'Utilidade', price: 'R$ 0,07', color: 'text-emerald-300' },
                                { cat: 'Autenticação', price: 'R$ 0,05', color: 'text-blue-300' },
                            ].map(item => (
                                <div key={item.cat} className="text-center p-2.5 rounded-xl" style={{ background: 'rgba(0,0,0,0.25)' }}>
                                    <p className={`font-black text-sm ${item.color}`}>{item.price}</p>
                                    <p className="text-slate-500 text-[10px] mt-0.5">{item.cat}</p>
                                </div>
                            ))}
                        </div>
                        <p className="text-orange-400 text-xs mt-3 italic">⚠️ Valores podem variar conforme tabela oficial da Meta para o Brasil.</p>
                    </div>

                </div>

                {/* Footer */}
                <div className="px-8 py-5 border-t border-white/5 flex justify-end" style={{ background: 'rgba(0,0,0,0.2)' }}>
                    <button
                        onClick={onClose}
                        className="px-8 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 active:scale-95"
                        style={{ background: 'linear-gradient(135deg, #10b981, #34d399)', boxShadow: '0 4px 20px rgba(16,185,129,0.35)' }}
                    >
                        Entendido!
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default BulkGuideModal;
