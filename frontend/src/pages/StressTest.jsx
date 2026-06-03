import React from 'react';
import { FiActivity, FiPlay, FiAlertCircle, FiCheckCircle, FiXCircle, FiSlash } from 'react-icons/fi';
import { useStressTest } from './StressTest/hooks/useStressTest';

const StressTest = () => {
    const {
        user, activeClient,
        testType, setTestType, funnelId, setFunnelId, templateName, setTemplateName,
        numberOfContacts, setNumberOfContacts, delaySeconds, setDelaySeconds,
        concurrencyLimit, setConcurrencyLimit, pricingCategory, setPricingCategory,
        interactionFunnelId, setInteractionFunnelId, blockFunnelId, setBlockFunnelId,
        funnels, loadingFunnels,
        activeTriggerId, triggerDetails, messageStats, recentMessages, isRunning,
        handleStartTest, handleCancelTest
    } = useStressTest();

    if (user?.role !== 'super_admin') {
        return (
            <div className="flex-1 flex items-center justify-center p-6 min-h-[80vh]">
                <div className="max-w-md w-full bg-white dark:bg-[#131722] border border-gray-200 dark:border-white/5 rounded-3xl p-8 shadow-2xl text-center backdrop-blur-xl">
                    <FiAlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4 animate-bounce" />
                    <h2 className="text-2xl font-black text-gray-800 dark:text-white mb-2">Acesso Restrito</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                        Esta tela de Teste de Escala é restrita a administradores do sistema (Super Admin) para prevenir abusos.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 max-w-6xl mx-auto text-gray-800 dark:text-gray-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                        <FiActivity className="text-blue-500" /> Teste de Escala
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        Dispare mensagens simuladas em lote para testar o comportamento e performance do seu servidor.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form settings */}
                <div className="lg:col-span-1 bg-white dark:bg-[#131722] border border-gray-200 dark:border-white/5 rounded-3xl p-6 shadow-xl space-y-6">
                    <form onSubmit={handleStartTest} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Tipo de Teste</label>
                            <div className="flex gap-2 bg-gray-100 dark:bg-gray-800/50 p-1 rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => setTestType('funnel')}
                                    className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                                        testType === 'funnel'
                                            ? 'bg-blue-600 text-white shadow-md'
                                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'
                                    }`}
                                >
                                    Funil
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTestType('template')}
                                    className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                                        testType === 'template'
                                            ? 'bg-blue-600 text-white shadow-md'
                                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'
                                    }`}
                                >
                                    Template
                                </button>
                            </div>
                        </div>

                        {testType === 'funnel' ? (
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Funil de Teste</label>
                                <select
                                    value={funnelId}
                                    onChange={(e) => setFunnelId(e.target.value)}
                                    className="w-full bg-gray-900/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all outline-none"
                                    disabled={loadingFunnels}
                                >
                                    {funnels.map(f => (
                                        <option key={f.id} value={f.id} className="bg-[#131722] text-white">{f.is_pinned ? '📌 ' : ''}{f.name}{f.tag ? ` [${f.tag}]` : ''}</option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Nome do Template</label>
                                    <input
                                        type="text"
                                        value={templateName}
                                        onChange={(e) => setTemplateName(e.target.value)}
                                        placeholder="Ex: welcome_message"
                                        className="w-full bg-gray-900/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Categoria do Template (Custo)</label>
                                    <div className="flex gap-2 bg-gray-100 dark:bg-gray-800/50 p-1 rounded-xl">
                                        <button
                                            type="button"
                                            onClick={() => setPricingCategory('marketing')}
                                            className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                                                pricingCategory === 'marketing'
                                                    ? 'bg-blue-600 text-white shadow-md'
                                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'
                                            }`}
                                        >
                                            Marketing (R$ 0,35)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPricingCategory('utility')}
                                            className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                                                pricingCategory === 'utility'
                                                    ? 'bg-blue-600 text-white shadow-md'
                                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'
                                            }`}
                                        >
                                            Utility (R$ 0,07)
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Funil de Interação</label>
                                    <select
                                        value={interactionFunnelId}
                                        onChange={(e) => setInteractionFunnelId(e.target.value)}
                                        className="w-full bg-gray-900/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all outline-none"
                                    >
                                        <option value="" className="bg-[#131722] text-white">Nenhum (Apenas envia template)</option>
                                        {funnels.map(f => (
                                            <option key={f.id} value={f.id} className="bg-[#131722] text-white">{f.is_pinned ? '📌 ' : ''}{f.name}{f.tag ? ` [${f.tag}]` : ''}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Funil de Bloqueio</label>
                                    <select
                                        value={blockFunnelId}
                                        onChange={(e) => setBlockFunnelId(e.target.value)}
                                        className="w-full bg-gray-900/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all outline-none"
                                    >
                                        <option value="" className="bg-[#131722] text-white">Nenhum</option>
                                        {funnels.map(f => (
                                            <option key={f.id} value={f.id} className="bg-[#131722] text-white">{f.is_pinned ? '📌 ' : ''}{f.name}{f.tag ? ` [${f.tag}]` : ''}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Quantidade de Contatos</label>
                            <input
                                type="number"
                                min="1"
                                max="20000"
                                value={numberOfContacts}
                                onChange={(e) => setNumberOfContacts(parseInt(e.target.value) || 1)}
                                className="w-full bg-gray-900/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Delay (segundos)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={delaySeconds}
                                    onChange={(e) => setDelaySeconds(parseInt(e.target.value) || 0)}
                                    className="w-full bg-gray-900/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Concorrência</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={concurrencyLimit}
                                    onChange={(e) => setConcurrencyLimit(parseInt(e.target.value) || 1)}
                                    className="w-full bg-gray-900/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                            <button
                                type="submit"
                                disabled={isRunning}
                                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <FiPlay /> Iniciar Teste de Escala
                            </button>
                        </div>
                    </form>
                </div>

                {/* Monitoring Panel */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-[#131722] p-6 rounded-3xl border border-gray-200 dark:border-white/5 shadow-xl">
                        <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-white/5 mb-6">
                            <div className="flex items-center gap-2">
                                <FiActivity className="text-emerald-500 text-xl" />
                                <h3 className="font-bold text-lg text-gray-850 dark:text-white">Painel de Monitoramento</h3>
                            </div>
                            {isRunning && (
                                <button
                                    onClick={handleCancelTest}
                                    className="px-4 py-1.5 bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-xl font-bold hover:bg-red-200 transition-all text-xs flex items-center gap-1.5"
                                >
                                    <FiSlash /> Abortar Teste
                                </button>
                            )}
                        </div>

                        {activeTriggerId ? (
                            <div className="space-y-6">
                                {/* Progress bar and counters */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                                        <span className="text-xs text-gray-550 dark:text-gray-400 block font-bold uppercase">Status</span>
                                        <span className="text-base font-black text-blue-500 uppercase">{triggerDetails?.status || 'Processando'}</span>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                                        <span className="text-xs text-gray-550 dark:text-gray-400 block font-bold uppercase">Contatos</span>
                                        <span className="text-xl font-black text-gray-900 dark:text-white">
                                            {messageStats?.total || triggerDetails?.total_contacts || 0}
                                        </span>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                                        <span className="text-xs text-gray-550 dark:text-gray-400 block font-bold uppercase">Sucesso / Falhas</span>
                                        <span className="text-xl font-black">
                                            <span className="text-emerald-500">{messageStats?.sent || 0}</span>
                                            <span className="text-gray-450 mx-1">/</span>
                                            <span className="text-red-500">{messageStats?.failed || 0}</span>
                                        </span>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                                        <span className="text-xs text-gray-550 dark:text-gray-400 block font-bold uppercase">Custo Estimado</span>
                                        <span className="text-xl font-black text-blue-450">
                                            R$ {((messageStats?.sent || 0) * (pricingCategory === 'marketing' ? 0.35 : 0.07)).toFixed(2)}
                                        </span>
                                    </div>
                                </div>

                                {/* Progress bar */}
                                <div>
                                    <div className="flex justify-between text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                                        <span>Progresso</span>
                                        <span>
                                            {Math.round(
                                                (((messageStats?.sent || 0) + (messageStats?.failed || 0)) / 
                                                (messageStats?.total || triggerDetails?.total_contacts || 1)) * 100
                                            )}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-3 rounded-full overflow-hidden">
                                        <div 
                                            className="bg-blue-600 h-full rounded-full transition-all duration-300"
                                            style={{
                                                width: `${Math.min(
                                                    100,
                                                    Math.round(
                                                        (((messageStats?.sent || 0) + (messageStats?.failed || 0)) / 
                                                        (messageStats?.total || triggerDetails?.total_contacts || 1)) * 100
                                                    )
                                                )}%`
                                            }}
                                        ></div>
                                    </div>
                                </div>

                                {/* Recent messages log */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Mensagens Recentes</h4>
                                    <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-4 max-h-[300px] overflow-y-auto space-y-2 font-mono text-xs text-white">
                                        {recentMessages.length === 0 ? (
                                            <div className="text-gray-500 text-center py-4">Nenhuma mensagem registrada ainda.</div>
                                        ) : (
                                            recentMessages.map((msg) => (
                                                <div key={msg.id} className="flex gap-2 items-start py-0.5 border-b border-gray-100 dark:border-white/5 pb-1">
                                                    <span className="text-gray-500 shrink-0">[{new Date(msg.updated_at).toLocaleTimeString()}]</span>
                                                    <span className="text-blue-500 shrink-0">{msg.phone_number}</span>
                                                    {msg.status === 'sent' ? (
                                                        <span className="text-emerald-500 flex items-center gap-1 shrink-0 font-bold"><FiCheckCircle /> OK</span>
                                                    ) : (
                                                        <span className="text-red-500 flex items-center gap-1 shrink-0 font-bold"><FiXCircle /> FALHA</span>
                                                    )}
                                                    <span className="text-gray-600 dark:text-gray-400 truncate">{msg.content || `Simulado (Ref: ${msg.message_id})`}</span>
                                                    {msg.failure_reason && (
                                                        <span className="text-amber-500 italic">( {msg.failure_reason} )</span>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12 space-y-3 text-gray-500">
                                <FiActivity className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-700" />
                                <p>Nenhum teste de estresse ativo no momento.</p>
                                <p className="text-xs text-gray-400">Configure os parâmetros na barra lateral e clique em "Iniciar Teste".</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StressTest;
