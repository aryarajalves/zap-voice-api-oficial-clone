import React from 'react';
import { FiX, FiZap, FiLink, FiPhone } from 'react-icons/fi';

const TemplateGuide = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden"
                style={{ background: 'linear-gradient(160deg, #0f1729 0%, #111827 100%)', border: '1px solid rgba(99,102,241,0.25)' }}>

                {/* Header do modal */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-white/5"
                    style={{ background: 'linear-gradient(90deg, rgba(99,102,241,0.15) 0%, transparent 100%)' }}>
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl"
                            style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)' }}>
                            📋
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Guia de Criação de Templates</h2>
                            <p className="text-sm text-gray-400">Entenda cada campo e como criar templates aprovados pela Meta.</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-white transition-all hover:scale-110"
                        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                        <FiX size={18} />
                    </button>
                </div>

                {/* Conteúdo rolável */}
                <div className="overflow-y-auto flex-1 px-8 py-6 space-y-4 custom-scrollbar">

                    {/* Card 1 — O que é um Template? */}
                    <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #6366f1' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">🚀</span>
                            <h3 className="font-bold text-white text-sm">O que é um Template?</h3>
                        </div>
                        <p className="text-gray-300 text-sm leading-relaxed">Um template é uma mensagem <b className="text-white">pré-aprovada pela Meta</b> que permite iniciar conversas proativas no WhatsApp Business. Sem um template aprovado, você só pode responder — não pode iniciar.</p>
                        <p className="text-indigo-400 text-xs mt-2 italic">💡 Use templates para disparos em massa, funis automáticos e agendamentos.</p>
                    </div>

                    {/* Card 2 — Nome do Template */}
                    <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #f59e0b' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">✏️</span>
                            <h3 className="font-bold text-white text-sm">Nome do Template</h3>
                        </div>
                        <p className="text-gray-300 text-sm leading-relaxed mb-3">Identificador único do template. Deve ser em <b className="text-white">minúsculas com underscores</b> (snake_case), sem espaços ou caracteres especiais.</p>
                        <div className="rounded-xl p-3 font-mono text-xs text-emerald-400 space-y-1" style={{ background: 'rgba(0,0,0,0.3)' }}>
                            <div>promocao_natal_2024</div>
                            <div>boas_vindas_cliente</div>
                            <div>lembrete_consulta_v2</div>
                        </div>
                        <p className="text-amber-400 text-xs mt-2 italic">💡 Seja descritivo. "lembrete_consulta" é melhor do que "msg1".</p>
                    </div>

                    {/* Card 3 — Categoria */}
                    <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #10b981' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">🏷️</span>
                            <h3 className="font-bold text-white text-sm">Categoria</h3>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.1)' }}>
                                <span className="text-indigo-400 font-bold text-xs mt-0.5 shrink-0">MARKETING</span>
                                <p className="text-gray-300 text-xs leading-relaxed">Promoções, convites, novidades. Ideal para campanhas e lançamentos. Custo por mensagem mais alto.</p>
                            </div>
                            <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(16,185,129,0.1)' }}>
                                <span className="text-emerald-400 font-bold text-xs mt-0.5 shrink-0">UTILITY</span>
                                <p className="text-gray-300 text-xs leading-relaxed">Alertas, cobranças, confirmações, atualizações de pedido. Custo menor, mas o conteúdo deve ser transacional.</p>
                            </div>
                        </div>
                    </div>

                    {/* Card 4 — Cabeçalho */}
                    <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #3b82f6' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">🖼️</span>
                            <h3 className="font-bold text-white text-sm">Cabeçalho (Opcional)</h3>
                        </div>
                        <p className="text-gray-300 text-sm leading-relaxed mb-3">Aparece <b className="text-white">acima do corpo</b> da mensagem. Pode ser texto, imagem, vídeo ou documento.</p>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { label: 'Nenhum', desc: 'Sem cabeçalho. Mensagem simples de texto.' },
                                { label: 'Texto', desc: 'Frase de destaque no topo. Máx. 60 caracteres.' },
                                { label: 'Imagem', desc: 'JPG ou PNG. Cole a URL de exemplo para aprovação.' },
                                { label: 'Vídeo / Doc', desc: 'Arquivos de mídia. Requer URL de exemplo da Meta.' },
                            ].map(item => (
                                <div key={item.label} className="p-2.5 rounded-xl" style={{ background: 'rgba(59,130,246,0.1)' }}>
                                    <p className="text-blue-300 font-bold text-xs">{item.label}</p>
                                    <p className="text-gray-400 text-xs mt-0.5">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Card 5 — Corpo da Mensagem */}
                    <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #a78bfa' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">📝</span>
                            <h3 className="font-bold text-white text-sm">Corpo da Mensagem</h3>
                        </div>
                        <p className="text-gray-300 text-sm leading-relaxed mb-3">É o <b className="text-white">conteúdo principal</b> — obrigatório. Use variáveis para personalizar cada envio.</p>
                        <div className="rounded-xl p-3 font-mono text-xs text-purple-300 leading-relaxed" style={{ background: 'rgba(0,0,0,0.3)' }}>
                            {'Olá, {{1}}! Sua consulta está confirmada para {{2}}. Responda SIM para confirmar.'}
                        </div>
                        <div className="mt-3 space-y-1.5">
                            <p className="text-gray-400 text-xs"><span className="text-purple-400 font-mono">{'{{1}}'}, {'{{2}}'}</span> — substituídos pelo nome, data, etc. no momento do envio.</p>
                            <p className="text-gray-400 text-xs"><span className="text-white font-mono">*texto*</span> — <b>negrito</b> &nbsp;|&nbsp; <span className="text-white font-mono">_texto_</span> — <i>itálico</i> &nbsp;|&nbsp; <span className="text-white font-mono">~texto~</span> — <s>tachado</s></p>
                        </div>
                        <p className="text-purple-400 text-xs mt-2 italic">💡 Use o botão "Maximizar" para editar confortavelmente textos longos.</p>
                    </div>

                    {/* Card 6 — Rodapé */}
                    <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #6b7280' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">📄</span>
                            <h3 className="font-bold text-white text-sm">Rodapé (Opcional)</h3>
                        </div>
                        <p className="text-gray-300 text-sm leading-relaxed">Texto cinza pequeno exibido abaixo do corpo. Ideal para <b className="text-white">avisos legais</b> ou instrução de descadastro. Máx. 60 caracteres.</p>
                        <div className="rounded-xl p-3 font-mono text-xs text-gray-400 mt-3" style={{ background: 'rgba(0,0,0,0.3)' }}>
                            Digite SAIR para não receber mais mensagens.
                        </div>
                    </div>

                    {/* Card 7 — Botões */}
                    <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #f97316' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">🔘</span>
                            <h3 className="font-bold text-white text-sm">Botões de Interação (Opcional)</h3>
                        </div>
                        <p className="text-gray-300 text-sm leading-relaxed mb-3">Aparecem abaixo da mensagem no WhatsApp. Até <b className="text-white">10 botões</b> por template.</p>
                        <div className="space-y-2">
                            {[
                                { icon: <FiZap size={12} />, label: 'Resposta Rápida', color: 'text-orange-300', desc: 'Botão simples que o cliente toca para responder. Ótimo para "Sim / Não / Tenho interesse".' },
                                { icon: <FiLink size={12} />, label: 'Link (Abrir Site)', color: 'text-blue-300', desc: 'Abre uma URL no navegador. Ideal para páginas de compra, rastreamento, ou landing pages.' },
                                { icon: <FiPhone size={12} />, label: 'Ligar para Número', color: 'text-emerald-300', desc: 'Inicia uma ligação diretamente. Use para suporte ou vendas por voz.' },
                            ].map(item => (
                                <div key={item.label} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                    <span className={`${item.color} mt-0.5 shrink-0`}>{item.icon}</span>
                                    <div>
                                        <p className={`font-bold text-xs ${item.color}`}>{item.label}</p>
                                        <p className="text-gray-400 text-xs mt-0.5">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Card 8 — Status */}
                    <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #ec4899' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">✅</span>
                            <h3 className="font-bold text-white text-sm">Status de Aprovação da Meta</h3>
                        </div>
                        <div className="space-y-2">
                            {[
                                { status: 'APPROVED', color: 'text-emerald-400 bg-emerald-900/30', desc: 'Aprovado e pronto para uso em disparos e funis.' },
                                { status: 'PENDING', color: 'text-yellow-400 bg-yellow-900/30', desc: 'Em revisão pela Meta. Pode levar de 2h a 24h.' },
                                { status: 'PAUSED', color: 'text-amber-400 bg-amber-900/30', desc: 'Pausado por baixa qualidade. Edite e reenvie para reativar.' },
                                { status: 'REJECTED', color: 'text-red-400 bg-red-900/30', desc: 'Reprovado. Evite nomes de marcas, links suspeitos ou promessas enganosas.' },
                            ].map(item => (
                                <div key={item.status} className="flex items-start gap-3 p-2.5 rounded-xl" style={{ background: 'rgba(0,0,0,0.2)' }}>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${item.color}`}>{item.status}</span>
                                    <p className="text-gray-400 text-xs leading-relaxed">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

                {/* Footer do modal */}
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

export default TemplateGuide;
