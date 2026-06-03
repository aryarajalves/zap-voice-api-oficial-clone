import React from 'react';
import { createPortal } from 'react-dom';

const BulkGuideModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
        >
            <div className="relative w-full max-w-3xl max-h-[85vh] flex flex-col rounded-[2rem] shadow-2xl overflow-hidden"
                style={{ background: 'linear-gradient(160deg, #0b1528 0%, #061f12 100%)', border: '1px solid rgba(16,185,129,0.3)' }}>

                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-white/5"
                    style={{ background: 'linear-gradient(90deg, rgba(16,185,129,0.15) 0%, transparent 100%)' }}>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg"
                            style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', boxShadow: '0 0 20px rgba(16,185,129,0.2)' }}>
                            🚀
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tight">Manual Completo: Disparo em Massa</h2>
                            <p className="text-xs text-slate-400 font-medium">Entenda todos os recursos, etapas e configurações para dominar a tela de disparos.</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors text-2xl font-bold p-1 hover:bg-white/5 rounded-lg w-8 h-8 flex items-center justify-center"
                    >
                        &times;
                    </button>
                </div>

                {/* Conteúdo */}
                <div className="overflow-y-auto flex-1 px-8 py-6 space-y-6" style={{ scrollbarWidth: 'thin', scrollbarColor: '#10b981 transparent' }}>

                    {/* Visão Geral */}
                    <div className="rounded-3xl p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderLeft: '4px solid #10b981' }}>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-xl">📡</span>
                            <h3 className="font-black text-white text-base">O que é e como funciona?</h3>
                        </div>
                        <p className="text-slate-300 text-sm leading-relaxed">
                            O <b>Disparo em Massa (Bulk Sender)</b> é uma ferramenta oficial de alta performance que permite enviar templates homologados pela Meta para listas de contatos personalizadas. Ao contrário de disparos informais, este método garante <b>máxima entrega</b> com total conformidade com as regras do WhatsApp.
                        </p>
                    </div>

                    {/* Bloco Etapas do Fluxo */}
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 border-b border-white/5 pb-2">Etapas do Processo de Disparo</h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Etapa 1 */}
                        <div className="rounded-3xl p-5" style={{ background: 'rgba(99,102,241,0.03)', border: '1px solid rgba(99,102,241,0.1)', borderLeft: '4px solid #6366f1' }}>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="w-7 h-7 rounded-full bg-indigo-500 text-white text-xs font-black flex items-center justify-center shrink-0">1</span>
                                <h3 className="font-black text-white text-sm">Etapa 1: Configuração</h3>
                            </div>
                            <ul className="text-slate-400 text-xs space-y-2 list-disc pl-4 leading-relaxed">
                                <li><b>Escolha do Template:</b> Selecione um dos templates oficiais importados diretamente do seu WhatsApp Business.</li>
                                <li><b>Preenchimento de Variáveis:</b> Defina os valores que preencherão as variáveis <code className="text-indigo-300 font-mono">{"{{1}}"}</code>, <code className="text-indigo-300 font-mono">{"{{2}}"}</code> do template.</li>
                                <li><b>Automatizações de Etiquetas:</b> Vincule etiquetas do Chatwoot para serem aplicadas à conversa no momento do envio.</li>
                            </ul>
                        </div>

                        {/* Etapa 2 */}
                        <div className="rounded-3xl p-5" style={{ background: 'rgba(59,130,246,0.03)', border: '1px solid rgba(59,130,246,0.1)', borderLeft: '4px solid #3b82f6' }}>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="w-7 h-7 rounded-full bg-blue-500 text-white text-xs font-black flex items-center justify-center shrink-0">2</span>
                                <h3 className="font-black text-white text-sm">Etapa 2: Destinatários e Envio</h3>
                            </div>
                            <ul className="text-slate-400 text-xs space-y-2 list-disc pl-4 leading-relaxed">
                                <li><b>Filtros de Destinatários:</b> Selecione de onde virão os contatos (manuais, importação de arquivo, contatos com etiquetas específicas).</li>
                                <li><b>Regras de Velocidade:</b> Defina o delay e concorrência ideais para o disparo seguro.</li>
                                <li><b>Ações de Botões e Agendamento:</b> Configure ações inteligentes para cliques em botões e defina se o disparo será imediato ou programado.</li>
                            </ul>
                        </div>
                    </div>

                    {/* Detalhamento dos Recursos da Tela */}
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 border-b border-white/5 pb-2">Recursos Detalhados da Tela</h4>

                    <div className="space-y-4">
                        {/* 1. Variáveis do Template */}
                        <div className="rounded-3xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderLeft: '4px solid #a78bfa' }}>
                            <div className="flex items-center gap-2.5 mb-2">
                                <span className="text-lg">🔡</span>
                                <h3 className="font-black text-white text-sm">Preenchimento Inteligente de Variáveis</h3>
                            </div>
                            <p className="text-slate-300 text-xs leading-relaxed mb-3">
                                Os campos dinâmicos do seu template (<code className="text-purple-300 font-mono">{"{{1}}"}</code>, <code className="text-purple-300 font-mono">{"{{2}}"}</code>) podem ser preenchidos de duas formas:
                            </p>
                            <ul className="text-slate-400 text-xs space-y-1.5 list-disc pl-4 mb-3">
                                <li><b>Valor Fixo:</b> Digite um valor direto para que todos os contatos recebam exatamente o mesmo texto (ex: <i>"Cupom: DESCONTO10"</i>).</li>
                                <li><b>Valor Dinâmico (por Planilha/Contatos):</b> Deixe o campo em branco ou configure a correspondência para puxar o nome ou dados específicos de cada contato importado via planilha CSV/Excel.</li>
                            </ul>
                            <div className="bg-purple-950/20 p-3 rounded-2xl border border-purple-500/10 text-[11px] text-purple-300 font-mono space-y-1">
                                <div>💡 <b>Dica:</b> Use o botão de expansão <span className="text-white">⛶</span> ao lado de cada campo para editar variáveis mais longas de forma confortável.</div>
                            </div>
                        </div>

                        {/* 2. Fluxo Automático de Etiquetas */}
                        <div className="rounded-3xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderLeft: '4px solid #ec4899' }}>
                            <div className="flex items-center gap-2.5 mb-2">
                                <span className="text-lg">🏷️</span>
                                <h3 className="font-black text-white text-sm">Fluxo Automático Pós-Envio (Etiquetas Chatwoot)</h3>
                            </div>
                            <p className="text-slate-300 text-xs leading-relaxed">
                                No bloco <b>Fluxo Automático Pós-Envio</b>, você pode selecionar etiquetas (ex: <i>"Campanha_Maio"</i>, <i>"Lead_Frio"</i>). Assim que o disparo for realizado, o sistema marcará automaticamente a conversa de cada destinatário no Chatwoot com essas etiquetas, facilitando sua organização e futuros filtros.
                            </p>
                        </div>

                        {/* 3. Ações dos Botões */}
                        <div className="rounded-3xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderLeft: '4px solid #8b5cf6' }}>
                            <div className="flex items-center gap-2.5 mb-2">
                                <span className="text-lg">⚡</span>
                                <h3 className="font-black text-white text-sm">Ações Inteligentes dos Botões do Template</h3>
                            </div>
                            <p className="text-slate-300 text-xs leading-relaxed mb-3">
                                Se o seu template contiver botões de resposta rápida homologados pela Meta, você pode configurar comportamentos automáticos para o momento em que o cliente clicar no botão:
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="p-3 bg-slate-800/40 rounded-2xl border border-white/5">
                                    <span className="text-slate-400 font-bold text-xs">❌ Nenhum</span>
                                    <p className="text-slate-500 text-[10px] mt-1">Apenas recebe a resposta no painel sem nenhuma automação.</p>
                                </div>
                                <div className="p-3 bg-emerald-950/20 rounded-2xl border border-emerald-500/10">
                                    <span className="text-emerald-400 font-bold text-xs">⚡ Interação / Funil</span>
                                    <p className="text-emerald-500/80 text-[10px] mt-1">Dispara um funil de automação configurado no ZapVoice 5-8s após o clique do lead.</p>
                                </div>
                                <div className="p-3 bg-rose-950/20 rounded-2xl border border-rose-500/10">
                                    <span className="text-rose-400 font-bold text-xs">🚫 Bloqueio</span>
                                    <p className="text-rose-500/80 text-[10px] mt-1">Insere o contato na lista de bloqueios automaticamente se ele clicar (ex: botão <i>"Sair da Lista"</i>).</p>
                                </div>
                            </div>
                        </div>

                        {/* 4. Lista de Exclusão */}
                        <div className="rounded-3xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderLeft: '4px solid #f59e0b' }}>
                            <div className="flex items-center gap-2.5 mb-2">
                                <span className="text-lg">🛡️</span>
                                <h3 className="font-black text-white text-sm">Gerenciador de Lista de Exclusão</h3>
                            </div>
                            <p className="text-slate-300 text-xs leading-relaxed mb-2">
                                Evite enviar mensagens para pessoas indesejadas, clientes antigos ou leads que solicitaram a exclusão:
                            </p>
                            <ul className="text-slate-400 text-xs space-y-1.5 list-disc pl-4">
                                <li><b>Exclusão Manual:</b> Cole números diretamente para serem limpos da sua fila atual de disparos.</li>
                                <li><b>Exclusão via Etiquetas ou CSV:</b> Importe uma planilha de exclusão ou carregue contatos vinculados a tags de bloqueio para cruzamento automático da base.</li>
                            </ul>
                        </div>

                        {/* 5. Atraso e Concorrência */}
                        <div className="rounded-3xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderLeft: '4px solid #06b6d4' }}>
                            <div className="flex items-center gap-2.5 mb-2">
                                <span className="text-lg">⚙️</span>
                                <h3 className="font-black text-white text-sm">Configurações de Envio e Segurança</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <span className="text-cyan-400 font-bold text-xs">Atraso de Envio (Delay)</span>
                                    <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                                        Tempo de espera configurado em segundos ou minutos entre o envio de cada mensagem. <b>Recomendamos no mínimo 15 segundos</b> para disparos volumosos, evitando a detecção de spam e garantindo a entrega saudável.
                                    </p>
                                </div>
                                <div>
                                    <span className="text-cyan-400 font-bold text-xs">Concorrência</span>
                                    <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                                        Quantidade de mensagens processadas de forma simultânea (paralelo). O recomendado é manter entre 1 e 3 processos ativos em contas normais para garantir a cadência e integridade da fila do servidor.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 6. Agendamento */}
                        <div className="rounded-3xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderLeft: '4px solid #f43f5e' }}>
                            <div className="flex items-center gap-2.5 mb-2">
                                <span className="text-lg">📅</span>
                                <h3 className="font-black text-white text-sm">Agendamento Único e Recorrente</h3>
                            </div>
                            <p className="text-slate-300 text-xs leading-relaxed mb-2">
                                Programe seus disparos para datas e horas específicas:
                            </p>
                            <ul className="text-slate-400 text-xs space-y-1.5 list-disc pl-4">
                                <li><b>Agendamento Único:</b> Escolha uma data e horário no futuro. O sistema fará todo o processamento de forma 100% autônoma.</li>
                                <li><b>Agendamento Recorrente:</b> Defina disparos automáticos diários, semanais ou mensais com hora marcada para manter seus leads sempre engajados.</li>
                            </ul>
                        </div>

                        {/* 7. Custos da API da Meta */}
                        <div className="rounded-3xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderLeft: '4px solid #eab308' }}>
                            <div className="flex items-center gap-2.5 mb-2">
                                <span className="text-lg">💰</span>
                                <h3 className="font-black text-white text-sm">Estimador de Custos Oficiais</h3>
                            </div>
                            <p className="text-slate-300 text-xs leading-relaxed mb-3">
                                No topo da Etapa 2, o sistema exibe automaticamente um cálculo de custo estimado com base no total de destinatários válidos selecionados e na categoria do template:
                            </p>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { cat: 'Marketing', price: 'R$ 0,35', color: 'text-rose-300' },
                                    { cat: 'Utilidade', price: 'R$ 0,07', color: 'text-emerald-300' },
                                    { cat: 'Autenticação', price: 'R$ 0,05', color: 'text-blue-300' },
                                ].map(item => (
                                    <div key={item.cat} className="text-center p-2 rounded-2xl" style={{ background: 'rgba(0,0,0,0.3)' }}>
                                        <p className={`font-black text-xs ${item.color}`}>{item.price}</p>
                                        <p className="text-slate-500 text-[9px] mt-0.5">{item.cat}</p>
                                    </div>
                                ))}
                            </div>
                            <p className="text-slate-500 text-[10px] mt-3 italic leading-relaxed">
                                * Nota: Os custos exibidos são estimativas baseadas na tabela padrão da Meta para o Brasil e dependem do modelo de faturamento da sua conta WhatsApp Business.
                            </p>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="px-8 py-5 border-t border-white/5 flex justify-end" style={{ background: 'rgba(0,0,0,0.3)' }}>
                    <button
                        onClick={onClose}
                        className="px-10 py-3 rounded-2xl text-xs font-black uppercase tracking-widest text-white transition-all hover:scale-105 active:scale-95"
                        style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 20px rgba(16,185,129,0.3)' }}
                    >
                        Entendido, vamos lá!
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default BulkGuideModal;
