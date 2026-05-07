import React from 'react';

const SettingsGuide = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
            <div
                className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
                style={{ background: 'linear-gradient(160deg, #0f1729 0%, #111827 100%)', border: '1px solid rgba(99,102,241,0.3)' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 rounded-t-2xl" style={{ background: 'rgba(15,23,41,0.95)', borderBottom: '1px solid rgba(99,102,241,0.2)', backdropFilter: 'blur(10px)' }}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl" style={{ background: 'rgba(99,102,241,0.15)' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Guia — Configurações do Sistema</h2>
                            <p className="text-xs" style={{ color: '#6b7280' }}>Entenda cada campo e seção das configurações</p>
                        </div>
                    </div>
                </div>

                {/* Cards */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">

                    {/* Card 1 — Geral */}
                    <div className="rounded-xl p-4 col-span-1 md:col-span-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #818cf8' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
                            <span className="text-sm font-bold" style={{ color: '#818cf8' }}>Geral — Nome do Cliente</span>
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: '#9ca3af' }}>
                            O <strong style={{ color: '#e5e7eb' }}>Nome do Cliente</strong> é o identificador principal da conta ativa. Ele aparece no cabeçalho do sistema e é usado para diferenciar múltiplos clientes quando você usa a seleção de clientes no painel. Preencha com o nome da empresa ou projeto.
                        </p>
                    </div>

                    {/* Card 2 — WhatsApp */}
                    <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #34d399' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.8a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                            <span className="text-sm font-bold" style={{ color: '#34d399' }}>Configurações WhatsApp (Meta)</span>
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: '#9ca3af' }}>
                            Esses campos conectam o sistema à API oficial do WhatsApp Business:<br/>
                            • <strong style={{ color: '#e5e7eb' }}>WA_BUSINESS_ACCOUNT_ID</strong>: ID da sua conta Meta Business<br/>
                            • <strong style={{ color: '#e5e7eb' }}>WA_PHONE_NUMBER_ID</strong>: ID do número cadastrado na Meta<br/>
                            • <strong style={{ color: '#e5e7eb' }}>WA_ACCESS_TOKEN</strong>: Token de acesso permanente gerado no painel Meta for Developers
                        </p>
                    </div>

                    {/* Card 3 — Chatwoot */}
                    <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #60a5fa' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                            <span className="text-sm font-bold" style={{ color: '#60a5fa' }}>Configurações Chatwoot</span>
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: '#9ca3af' }}>
                            Integra o sistema ao seu Chatwoot para sincronizar contatos e receber eventos:<br/>
                            • <strong style={{ color: '#e5e7eb' }}>CHATWOOT_API_URL</strong>: URL do seu servidor Chatwoot<br/>
                            • <strong style={{ color: '#e5e7eb' }}>CHATWOOT_ACCOUNT_ID</strong>: ID da conta no Chatwoot<br/>
                            • <strong style={{ color: '#e5e7eb' }}>CHATWOOT_SELECTED_INBOX_ID</strong>: Inbox padrão para envios<br/>
                            • <strong style={{ color: '#e5e7eb' }}>CHATWOOT_API_TOKEN</strong>: Token de autenticação da API
                        </p>
                    </div>

                    {/* Card 4 — Meta Return Config */}
                    <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #f59e0b' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>
                            <span className="text-sm font-bold" style={{ color: '#f59e0b' }}>Meta Return Config</span>
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: '#9ca3af' }}>
                            Define o comportamento padrão ao receber respostas do webhook da Meta. Configura como o sistema deve processar eventos de entrega, leitura e resposta de mensagens enviadas via API oficial do WhatsApp Business. Deixe em branco para usar o comportamento padrão.
                        </p>
                    </div>

                    {/* Card 5 — White Label */}
                    <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #a78bfa' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
                            <span className="text-sm font-bold" style={{ color: '#a78bfa' }}>White Label (Marca Personalizada)</span>
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: '#9ca3af' }}>
                            Personalize a identidade visual do sistema:<br/>
                            • <strong style={{ color: '#e5e7eb' }}>APP_NAME</strong>: Nome exibido no título da aba e cabeçalho<br/>
                            • <strong style={{ color: '#e5e7eb' }}>APP_LOGO</strong>: URL ou upload da logo que aparece no topo do painel<br/>
                            • <strong style={{ color: '#e5e7eb' }}>APP_LOGO_SIZE</strong>: Tamanho da logo (pequeno, médio, grande)
                        </p>
                    </div>

                    {/* Card 6 — AI Memory Webhook */}
                    <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #22d3ee' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/><path d="M12 8v4l3 3"/></svg>
                            <span className="text-sm font-bold" style={{ color: '#22d3ee' }}>Webhook de Memória de IA</span>
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: '#9ca3af' }}>
                            A cada mensagem enviada pelo sistema, o conteúdo e o número do destinatário são enviados para esta URL via POST. Use para alimentar a memória de um Agente de IA no <strong style={{ color: '#e5e7eb' }}>n8n</strong>, <strong style={{ color: '#e5e7eb' }}>Flowise</strong> ou qualquer automação. Deixe vazio para desativar.
                        </p>
                    </div>

                    {/* Card 7 — Perfil do Usuário */}
                    <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #fb923c' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            <span className="text-sm font-bold" style={{ color: '#fb923c' }}>Perfil do Usuário</span>
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: '#9ca3af' }}>
                            Altere seus dados de acesso ao sistema:<br/>
                            • <strong style={{ color: '#e5e7eb' }}>Nome completo</strong>: Exibido no painel e nos logs<br/>
                            • <strong style={{ color: '#e5e7eb' }}>E-mail</strong>: Usado para login<br/>
                            • <strong style={{ color: '#e5e7eb' }}>Nova senha</strong>: Deixe em branco para manter a senha atual. Preencha apenas se quiser alterar.
                        </p>
                    </div>

                    {/* Card 8 — Tema */}
                    <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #818cf8' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>
                            <span className="text-sm font-bold" style={{ color: '#818cf8' }}>Tema do Sistema</span>
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: '#9ca3af' }}>
                            Alterne entre o <strong style={{ color: '#e5e7eb' }}>modo claro</strong> e o <strong style={{ color: '#e5e7eb' }}>modo escuro</strong> usando o botão de tema no canto inferior da tela. A preferência é salva automaticamente no navegador e aplicada em todas as sessões futuras neste dispositivo.
                        </p>
                    </div>

                </div>

                {/* Footer */}
                <div className="px-6 pb-6 pt-2 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105"
                        style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8' }}
                    >
                        Entendi, fechar guia
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsGuide;
