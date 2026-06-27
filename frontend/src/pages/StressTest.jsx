import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FiActivity, FiPlay, FiAlertCircle, FiCheckCircle, FiXCircle, FiSlash, FiZap, FiEye, FiX, FiClock, FiSettings, FiChevronDown, FiSearch } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useStressTest, PLATFORM_EVENT_OPTIONS, generateWebhookPayload } from './StressTest/hooks/useStressTest';

// ─── Searchable Integration Dropdown ─────────────────────────────────────────
function IntegrationSearchSelect({ integrations, value, onChange }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const containerRef = useRef(null);
    const inputRef = useRef(null);

    const selected = integrations.find(i => String(i.id) === String(value));
    const filtered = integrations.filter(i =>
        `${i.name} ${i.platform}`.toLowerCase().includes(query.toLowerCase())
    );

    useEffect(() => {
        if (!open) return;
        setTimeout(() => inputRef.current?.focus(), 50);
    }, [open]);

    useEffect(() => {
        const handler = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
                setQuery('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleSelect = useCallback((id) => {
        onChange(id);
        setOpen(false);
        setQuery('');
    }, [onChange]);

    return (
        <div ref={containerRef} className="relative w-full">
            {/* Trigger button */}
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border transition-all text-sm outline-none
                    ${open
                        ? 'border-violet-500/60 bg-violet-500/5 ring-1 ring-violet-500/20'
                        : 'border-white/10 bg-gray-900/50 hover:border-white/20'
                    }`}
            >
                {selected ? (
                    <span className="flex items-center gap-2 min-w-0">
                        <span className="text-white font-medium truncate">{selected.name}</span>
                        <span className="text-[10px] text-gray-500 font-mono bg-white/5 px-1.5 py-0.5 rounded shrink-0">{selected.platform}</span>
                    </span>
                ) : (
                    <span className="text-gray-500 italic">Selecionar integração…</span>
                )}
                <FiChevronDown
                    size={14}
                    className={`text-gray-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Dropdown panel — always below */}
            {open && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-white/10 bg-[#181d2a] shadow-2xl shadow-black/60 overflow-hidden w-full">
                    {/* Search input */}
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-white/8">
                        <FiSearch size={13} className="text-gray-500 shrink-0" />
                        <input
                            ref={inputRef}
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Filtrar por nome ou plataforma…"
                            className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 outline-none"
                        />
                        {query && (
                            <button type="button" onClick={() => setQuery('')}>
                                <FiX size={12} className="text-gray-500 hover:text-white" />
                            </button>
                        )}
                    </div>

                    {/* Options list */}
                    <div className="overflow-y-auto overflow-x-hidden max-h-52">
                        {filtered.length === 0 ? (
                            <p className="text-xs text-gray-500 italic text-center py-4">Nenhuma integração encontrada</p>
                        ) : (
                            filtered.map(i => {
                                const isActive = String(i.id) === String(value);
                                return (
                                    <button
                                        key={i.id}
                                        type="button"
                                        onClick={() => handleSelect(i.id)}
                                        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm text-left transition-colors
                                            ${isActive
                                                ? 'bg-violet-500/15 text-violet-300'
                                                : 'text-gray-200 hover:bg-white/5'
                                            }`}
                                    >
                                        <span className="truncate font-medium">{i.name}</span>
                                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0
                                            ${isActive ? 'bg-violet-500/20 text-violet-400' : 'bg-white/5 text-gray-500'}`}>
                                            {i.platform}
                                        </span>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

const CountdownBadge = ({ temp_paused_until }) => {
    const calculateSeconds = () => {
        if (!temp_paused_until) return 0;
        const diff = new Date(temp_paused_until).getTime() - new Date().getTime();
        return Math.max(0, Math.ceil(diff / 1000));
    };

    const [secondsLeft, setSecondsLeft] = React.useState(calculateSeconds);

    React.useEffect(() => {
        const interval = setInterval(() => {
            const left = calculateSeconds();
            setSecondsLeft(left);
            if (left <= 0) {
                clearInterval(interval);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [temp_paused_until]);

    return <span>{secondsLeft}</span>;
};

import { ERROR_EXPLANATIONS } from './StressTest/utils/errorExplanations';

const StressTest = ({ onStartSuccess, onNavigateToHistory, onNavigateToIntegrations }) => {
    const {
        user, activeClient,
        testType, setTestType, funnelId, setFunnelId, templateName, setTemplateName,
        numberOfContacts, setNumberOfContacts, delaySeconds, setDelaySeconds,
        concurrencyLimit, setConcurrencyLimit, pricingCategory, setPricingCategory,
        interactionFunnelId, setInteractionFunnelId, blockFunnelId, setBlockFunnelId,
        funnels, loadingFunnels,
        activeTriggerId, triggerDetails, messageStats, recentMessages, isRunning,
        handleStartTest, handleCancelTest, selectedErrors, setSelectedErrors, ALL_ERRORS,
        // Webhook test
        webhookIntegrations, loadingWebhookIntegrations,
        selectedIntegrationId, setSelectedIntegrationId,
        webhookSelectedEvents, setWebhookSelectedEvents,
        webhookCount, setWebhookCount,
        webhookConcurrency, setWebhookConcurrency,
        webhookDelayMs, setWebhookDelayMs,
        webhookTestResults, setWebhookTestResults,
        isWebhookRunning,
        webhookSendEach, setWebhookSendEach,
        handleStartWebhookTest, handleCancelWebhookTest,
    } = useStressTest(onStartSuccess);

    // Derive selected integration's platform for event type options
    const selectedIntegration = webhookIntegrations.find(i => String(i.id) === String(selectedIntegrationId));
    const platformKey = selectedIntegration?.platform?.toLowerCase() || '';
    const eventOptions = PLATFORM_EVENT_OPTIONS[platformKey] || [{ value: 'purchase_approved', label: 'Compra Aprovada' }];

    const toggleWebhookEvent = (value) => {
        setWebhookSelectedEvents(prev =>
            prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
        );
    };
    const allEventsSelected = eventOptions.every(o => webhookSelectedEvents.includes(o.value));
    const toggleAllEvents = () => {
        if (allEventsSelected) setWebhookSelectedEvents([]);
        else setWebhookSelectedEvents(eventOptions.map(o => o.value));
    };

    const [showConfirmCancel, setShowConfirmCancel] = React.useState(false);
    const [explainError, setExplainError] = React.useState(null);
    const [previewEvent, setPreviewEvent] = React.useState(null); // { platform, eventType, label }
    const [jsonMaximized, setJsonMaximized] = React.useState(false);

    React.useEffect(() => {
        const mainEl = document.querySelector('main');
        if (previewEvent) {
            document.body.style.overflow = 'hidden';
            if (mainEl) mainEl.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
            if (mainEl) mainEl.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
            if (mainEl) mainEl.style.overflow = '';
        };
    }, [previewEvent]);

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
                            <div className="flex gap-1.5 bg-gray-100 dark:bg-gray-800/50 p-1 rounded-xl">
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
                                <button
                                    type="button"
                                    onClick={() => setTestType('webhook')}
                                    className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
                                        testType === 'webhook'
                                            ? 'bg-violet-600 text-white shadow-md'
                                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'
                                    }`}
                                >
                                    <FiZap className="shrink-0" /> Webhook
                                </button>
                            </div>
                        </div>

                        {testType === 'webhook' ? (
                            /* ── Webhook Test Form ── */
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Integração de Webhook</label>
                                    {loadingWebhookIntegrations ? (
                                        <div className="text-xs text-gray-400 italic py-2">Carregando integrações...</div>
                                    ) : webhookIntegrations.length === 0 ? (
                                        <div className="text-xs text-amber-500 italic py-2">Nenhuma integração cadastrada.</div>
                                    ) : (
                                        <IntegrationSearchSelect
                                            integrations={webhookIntegrations}
                                            value={selectedIntegrationId}
                                            onChange={setSelectedIntegrationId}
                                        />
                                    )}
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Tipos de Evento
                                            {webhookSelectedEvents.length > 1 && (
                                                <span className="ml-2 text-violet-400 normal-case font-normal">(aleatório a cada envio)</span>
                                            )}
                                        </label>
                                        <button
                                            type="button"
                                            onClick={toggleAllEvents}
                                            className="text-[10px] text-violet-400 hover:text-violet-300 transition-colors font-bold uppercase tracking-wide"
                                        >
                                            {allEventsSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                                        </button>
                                    </div>
                                    <div className="bg-gray-900/40 border border-white/10 rounded-xl p-3 space-y-1.5 max-h-52 overflow-y-auto">
                                        {eventOptions.map(opt => {
                                            const isChecked = webhookSelectedEvents.includes(opt.value);
                                            return (
                                                <div key={opt.value} className="flex items-center gap-2 group">
                                                    <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={() => toggleWebhookEvent(opt.value)}
                                                            className="w-3.5 h-3.5 rounded border-gray-600 text-violet-600 focus:ring-violet-500/20 bg-transparent transition-all shrink-0"
                                                        />
                                                        <span className={`text-xs transition-colors ${isChecked ? 'text-white font-medium' : 'text-gray-500 group-hover:text-gray-300'}`}>
                                                            {opt.label}
                                                        </span>
                                                        <span className="text-[10px] text-gray-600 font-mono ml-auto shrink-0">{opt.value}</span>
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={() => { setPreviewEvent({ platform: platformKey, eventType: opt.value, label: opt.label }); setJsonMaximized(true); }}
                                                        className="shrink-0 text-gray-600 hover:text-violet-400 transition-colors opacity-0 group-hover:opacity-100 p-0.5"
                                                        title="Ver payload"
                                                    >
                                                        <FiEye size={12} />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {webhookSelectedEvents.length === 0 && (
                                        <p className="text-[10px] text-red-400 mt-1">Selecione pelo menos 1 evento</p>
                                    )}
                                    {webhookSelectedEvents.length > 1 && (
                                        <p className="text-[10px] text-violet-400 mt-1">
                                            {webhookSelectedEvents.length} eventos selecionados — cada disparo escolhe um aleatoriamente
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            {webhookSendEach ? 'Modo de Envio' : 'Quantidade de Eventos'}
                                        </label>
                                    </div>
                                    {/* Toggle: 1 de cada vs N aleatórios */}
                                    <label className="flex items-center gap-3 cursor-pointer mb-3 p-2.5 bg-gray-900/40 border border-white/10 rounded-xl hover:border-violet-500/30 transition-all">
                                        <div className="relative shrink-0">
                                            <input
                                                type="checkbox"
                                                className="sr-only"
                                                checked={webhookSendEach}
                                                onChange={(e) => setWebhookSendEach(e.target.checked)}
                                            />
                                            <div className={`w-9 h-5 rounded-full transition-colors ${webhookSendEach ? 'bg-violet-600' : 'bg-gray-700'}`} />
                                            <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${webhookSendEach ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </div>
                                        <div>
                                            <span className="text-xs font-bold text-white block">1 vez por evento selecionado</span>
                                            <span className="text-[10px] text-gray-500">
                                                {webhookSendEach
                                                    ? `Disparará ${webhookSelectedEvents.length} evento${webhookSelectedEvents.length !== 1 ? 's' : ''} em ordem`
                                                    : 'Desligado — usa quantidade abaixo'}
                                            </span>
                                        </div>
                                    </label>
                                    {!webhookSendEach && (
                                        <input
                                            type="number" min="1" max="500"
                                            value={webhookCount}
                                            onChange={(e) => setWebhookCount(parseInt(e.target.value) || 1)}
                                            className="w-full bg-gray-900/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all outline-none"
                                        />
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Concorrência</label>
                                        <input
                                            type="number" min="1" max="20"
                                            value={webhookConcurrency}
                                            onChange={(e) => setWebhookConcurrency(parseInt(e.target.value) || 1)}
                                            className="w-full bg-gray-900/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Delay (ms)</label>
                                        <input
                                            type="number" min="0" max="5000"
                                            value={webhookDelayMs}
                                            onChange={(e) => setWebhookDelayMs(parseInt(e.target.value) || 0)}
                                            className="w-full bg-gray-900/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all outline-none"
                                        />
                                    </div>
                                </div>

                                {selectedIntegration && (
                                    <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3">
                                        <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider block mb-1">URL do Webhook</span>
                                        <span className="text-xs text-gray-400 break-all font-mono">
                                            /api/webhooks/{selectedIntegration.custom_slug || selectedIntegration.id}
                                        </span>
                                    </div>
                                )}
                            </div>
                        ) : testType === 'funnel' ? (
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
                                        className="w-full bg-gray-950/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all outline-none"
                                    >
                                        <option value="" className="bg-[#131722] text-white">Nenhum</option>
                                        {funnels.map(f => (
                                            <option key={f.id} value={f.id} className="bg-[#131722] text-white">{f.is_pinned ? '📌 ' : ''}{f.name}{f.tag ? ` [${f.tag}]` : ''}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        {testType !== 'webhook' && (
                        <>
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
                        </>
                        )}

                        {testType !== 'webhook' && (
                        <div className="bg-amber-500/10 dark:bg-yellow-500/5 border border-amber-500/20 rounded-2xl p-4 mt-2 space-y-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                                <FiAlertCircle className="shrink-0" /> Erros Simulados (Taxa de 10%)
                            </span>
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                Selecione quais tipos de erro deseja que ocorram aleatoriamente durante o teste de escala:
                            </p>
                            <div className="space-y-2.5 pt-1 border-l border-amber-500/20 pl-2">
                                {ALL_ERRORS.map((errorReason) => {
                                    const isChecked = selectedErrors.includes(errorReason);
                                    return (
                                        <div key={errorReason} className="flex items-start justify-between gap-2 text-[11px] font-mono text-gray-650 dark:text-gray-400">
                                            <label className="flex items-start gap-2 cursor-pointer select-none flex-1">
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => {
                                                        if (isChecked) {
                                                            setSelectedErrors(prev => prev.filter(e => e !== errorReason));
                                                        } else {
                                                            setSelectedErrors(prev => [...prev, errorReason]);
                                                        }
                                                    }}
                                                    className="mt-0.5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500/20 w-3.5 h-3.5 bg-transparent transition-all"
                                                />
                                                <span className={isChecked ? "text-gray-800 dark:text-gray-200" : "text-gray-450 line-through"}>
                                                    {errorReason}
                                                </span>
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => setExplainError(errorReason)}
                                                className="shrink-0 p-1 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10 dark:hover:bg-blue-500/5 rounded transition-all"
                                                title="Explicar erro"
                                            >
                                                <FiAlertCircle className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        )}

                        <div className="flex items-center gap-3 pt-2">
                            {testType === 'webhook' ? (
                                isWebhookRunning ? (
                                    <button
                                        type="button"
                                        onClick={handleCancelWebhookTest}
                                        className="w-full py-4 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-2xl font-bold shadow-lg hover:shadow-red-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        <FiSlash /> Parar Teste
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleStartWebhookTest}
                                        disabled={!selectedIntegrationId || loadingWebhookIntegrations}
                                        className="w-full py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-2xl font-bold shadow-lg hover:shadow-violet-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <FiZap /> Iniciar Teste de Webhook
                                    </button>
                                )
                            ) : (
                                <button
                                    type="submit"
                                    disabled={isRunning}
                                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <FiPlay /> Iniciar Teste de Escala
                                </button>
                            )}
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
                            <div className="flex items-center gap-2">
                                {onNavigateToHistory && (
                                    <button
                                        type="button"
                                        onClick={onNavigateToHistory}
                                        className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white rounded-xl font-bold transition-all text-xs flex items-center gap-1.5 border border-blue-500/20"
                                        title="Ver Histórico de Disparos"
                                    >
                                        <FiClock size={12} /> Histórico
                                    </button>
                                )}
                                {onNavigateToIntegrations && (
                                    <button
                                        type="button"
                                        onClick={onNavigateToIntegrations}
                                        className="px-3 py-1.5 bg-violet-500/10 hover:bg-violet-500 text-violet-400 hover:text-white rounded-xl font-bold transition-all text-xs flex items-center gap-1.5 border border-violet-500/20"
                                        title="Ir para Integrações Webhook"
                                    >
                                        <FiSettings size={12} /> Integração
                                    </button>
                                )}
                                {isRunning && (
                                    <button
                                        onClick={() => setShowConfirmCancel(true)}
                                        className="px-4 py-1.5 bg-red-150 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-xl font-bold hover:bg-red-200 transition-all text-xs flex items-center gap-1.5 cursor-pointer border-0"
                                    >
                                        <FiSlash /> Abortar Teste
                                    </button>
                                )}
                            </div>
                        </div>

                        {testType === 'webhook' ? (
                            /* ── Webhook Test Results ── */
                            webhookTestResults ? (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                                            <span className="text-xs text-gray-550 dark:text-gray-400 block font-bold uppercase">Status</span>
                                            <span className={`text-base font-black uppercase ${isWebhookRunning ? 'text-violet-500 animate-pulse' : 'text-emerald-500'}`}>
                                                {isWebhookRunning ? '⚡ Enviando...' : '✓ Concluído'}
                                            </span>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                                            <span className="text-xs text-gray-550 dark:text-gray-400 block font-bold uppercase">Total</span>
                                            <span className="text-xl font-black text-gray-900 dark:text-white">{webhookTestResults.total}</span>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                                            <span className="text-xs text-gray-550 dark:text-gray-400 block font-bold uppercase">OK / Falhas</span>
                                            <span className="text-xl font-black">
                                                <span className="text-emerald-500">{webhookTestResults.success}</span>
                                                <span className="text-gray-450 mx-1">/</span>
                                                <span className="text-red-500">{webhookTestResults.failed}</span>
                                            </span>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                                            <span className="text-xs text-gray-550 dark:text-gray-400 block font-bold uppercase">Integração</span>
                                            <span className="text-sm font-black text-violet-400 truncate block">{selectedIntegration?.name || '—'}</span>
                                            <span className="text-[10px] text-gray-500">{selectedIntegration?.platform}</span>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                                            <span>Progresso</span>
                                            <span>{Math.round((webhookTestResults.sent / (webhookTestResults.total || 1)) * 100)}%</span>
                                        </div>
                                        <div className="w-full bg-gray-100 dark:bg-gray-800 h-3 rounded-full overflow-hidden">
                                            <div
                                                className="bg-violet-600 h-full rounded-full transition-all duration-300"
                                                style={{ width: `${Math.min(100, Math.round((webhookTestResults.sent / (webhookTestResults.total || 1)) * 100))}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Log de Eventos</h4>
                                            <button
                                                type="button"
                                                onClick={() => setWebhookTestResults(null)}
                                                className="text-[10px] text-gray-400 hover:text-red-400 transition-colors"
                                            >
                                                Limpar
                                            </button>
                                        </div>
                                        <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-4 max-h-[300px] overflow-y-auto space-y-1.5 font-mono text-xs text-white">
                                            {webhookTestResults.log.length === 0 ? (
                                                <div className="text-gray-500 text-center py-4">Aguardando eventos...</div>
                                            ) : (
                                                [...webhookTestResults.log].reverse().map((entry, idx) => (
                                                    <div key={idx} className="flex gap-2 items-center py-0.5 border-b border-white/5 pb-1">
                                                        <span className="text-gray-500 shrink-0">#{entry.index}</span>
                                                        {entry.ok ? (
                                                            <span className="text-emerald-500 flex items-center gap-1 shrink-0 font-bold"><FiCheckCircle /> {entry.status}</span>
                                                        ) : (
                                                            <span className="text-red-500 flex items-center gap-1 shrink-0 font-bold"><FiXCircle /> {entry.status || 'ERR'}</span>
                                                        )}
                                                        {entry.event && <span className="text-violet-400 font-mono text-[10px] shrink-0">{entry.event}</span>}
                                                        {entry.error && <span className="text-amber-400 italic truncate">{entry.error}</span>}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12 space-y-3 text-gray-500">
                                    <FiZap className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-700" />
                                    <p>Nenhum teste de webhook ativo.</p>
                                    <p className="text-xs text-gray-400">Selecione uma integração e clique em "Iniciar Teste de Webhook".</p>
                                </div>
                            )
                        ) : activeTriggerId ? (
                            <div className="space-y-6">
                                {/* Progress bar and counters */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                                        <span className="text-xs text-gray-550 dark:text-gray-400 block font-bold uppercase">Status</span>
                                        {triggerDetails?.processed_data?.temp_paused ? (
                                            <div className="flex flex-col">
                                                <span className="text-base font-black text-amber-500 uppercase animate-pulse">
                                                    ⏳ Pausado
                                                </span>
                                                <span className="text-[10px] text-amber-500 font-bold">
                                                    Retomando em <CountdownBadge temp_paused_until={triggerDetails.processed_data.temp_paused_until} />s
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-base font-black text-blue-500 uppercase">{triggerDetails?.status || 'Processando'}</span>
                                        )}
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

                                {/* Banner de Pausa Temporária por instabilidade da Meta */}
                                {triggerDetails?.processed_data?.temp_paused && (
                                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3 animate-pulse">
                                        <FiAlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                        <div className="space-y-1">
                                            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 block uppercase tracking-wider">
                                                Disparo Pausado Temporariamente
                                            </span>
                                            <p className="text-xs text-gray-650 dark:text-gray-300">
                                                {triggerDetails.processed_data.temp_paused_reason || "Instabilidade detectada nos servidores da Meta. Aguardando para retomar..."}
                                            </p>
                                        </div>
                                    </div>
                                )}

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

            {/* Popup Bonito de Confirmação para Abortar Teste */}
            {showConfirmCancel && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 w-screen h-screen">
                    <div className="w-full max-w-sm bg-white dark:bg-[#131722] border border-gray-200 dark:border-white/5 rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 text-center">
                        <FiAlertCircle className="w-14 h-14 text-rose-500 mx-auto mb-4 animate-pulse" />
                        <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">
                            Abortar Teste de Escala?
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
                            Você tem certeza que deseja cancelar imediatamente este teste de estresse em execução? Esta ação não pode ser desfeita.
                        </p>
                        
                        <div className="flex items-center gap-3 justify-center">
                            <button
                                type="button"
                                onClick={() => setShowConfirmCancel(false)}
                                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold transition-all active:scale-95 border-0"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    handleCancelTest();
                                    setShowConfirmCancel(false);
                                }}
                                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md hover:shadow-rose-500/20 border-0"
                            >
                                Sim, Abortar
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {explainError && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 w-screen h-screen">
                    <div className="w-full max-w-md bg-white dark:bg-[#131722] border border-gray-200 dark:border-white/5 rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                            <FiAlertCircle className="text-blue-500 w-5 h-5" />
                            {ERROR_EXPLANATIONS[explainError]?.titulo || "Explicação do Erro"}
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1">O que é este erro?</span>
                                <p className="text-xs text-gray-650 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-white/5 rounded-xl p-3">
                                    {ERROR_EXPLANATIONS[explainError]?.descricao}
                                </p>
                            </div>

                            <div>
                                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block mb-1">O que fazer?</span>
                                <p className="text-xs text-gray-650 dark:text-gray-300 leading-relaxed bg-amber-50 dark:bg-amber-900/10 rounded-xl p-3 border border-amber-200 dark:border-amber-500/20">
                                    {ERROR_EXPLANATIONS[explainError]?.solucao}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => setExplainError(null)}
                            className="mt-5 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95"
                        >
                            Entendido
                        </button>
                    </div>
                </div>,
                document.body
            )}

            {/* ── Modal de Preview de Payload ───────────────────────────────── */}
            {previewEvent && (() => {
                // ── Computação compartilhada ──────────────────────────────────
                const METHOD_PT = {
                    'CREDIT_CARD': 'Cartão de Crédito', 'credit_card': 'Cartão de Crédito',
                    'BILLET': 'Boleto', 'boleto': 'Boleto', 'billet': 'Boleto',
                    'PIX': 'Pix', 'pix': 'Pix',
                    'BANK_SLIP': 'Boleto', 'bank_slip': 'Boleto', 'DEBIT_CARD': 'Cartão de Débito',
                    'PAYPAL': 'PayPal', 'TWO_CREDIT_CARDS': '2 Cartões',
                    'Pix': 'Pix', 'Boleto': 'Boleto',
                };
                const statusPT = previewEvent.label;
                const p = generateWebhookPayload(previewEvent.platform, previewEvent.eventType, 0);
                const ext = {};
                const formatPrice = (val) => val != null ? `R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null;

                if (previewEvent.platform === 'hotmart') {
                    const d = p.data || {};
                    ext.Nome = d.buyer?.name; ext.Email = d.buyer?.email;
                    ext.Telefone = d.subscriber?.phone ? `${d.subscriber.phone.dddCell}${d.subscriber.phone.cell}` : null;
                    ext.Produto = d.product?.name; ext.Status = statusPT;
                    ext['Método'] = METHOD_PT[d.purchase?.payment?.type] || d.purchase?.payment?.type;
                    ext['Preço'] = formatPrice(d.purchase?.price?.value);
                } else if (previewEvent.platform === 'greenn') {
                    const whType = String(p.type || '').toLowerCase();
                    if (whType === 'sale') {
                        const client = p.client || {};
                        const saleObj = p.sale || {};
                        ext.Nome = client.name;
                        ext.Email = client.email;
                        ext.Telefone = client.cellphone ? String(client.cellphone).replace(/\D/g, '') : null;
                        ext.Produto = p.product?.name;
                        ext.Status = statusPT;
                        ext['Método'] = METHOD_PT[saleObj.method] || saleObj.method;
                        ext['Preço'] = formatPrice(saleObj.amount);
                        if (client.cpf_cnpj) {
                            const digits = String(client.cpf_cnpj).replace(/\D/g, '');
                            const docLabel = (digits.length >= 10 && digits.length <= 12) ? 'CPF' : (digits.length >= 13 && digits.length <= 15) ? 'CNPJ' : 'Documento';
                            ext[docLabel] = client.cpf_cnpj;
                        }
                        // Order Bump
                        const obItems = (p.products || []).filter(pr => pr.is_order_bump);
                        if (obItems.length > 0) {
                            ext['⚡ Order Bump'] = obItems.map(ob => ob.name || 'Produto OB').join(', ');
                        }
                        // Upsell
                        const prodNameLower = String(p.product?.name || '').toLowerCase();
                        if (prodNameLower.includes('upsell') || prodNameLower.includes('upgrade')) {
                            ext['🚀 Upsell'] = 'Sim — compra pós-venda';
                        }
                    } else if (whType === 'contract') {
                        const client = p.client || {};
                        const currentSale = p.currentSale || {};
                        ext.Nome = client.name;
                        ext.Email = client.email;
                        ext.Telefone = client.cellphone ? String(client.cellphone).replace(/\D/g, '') : null;
                        ext.Produto = p.product?.name;
                        ext.Status = statusPT;
                        ext['Método'] = METHOD_PT[currentSale.method] || currentSale.method;
                        ext['Preço'] = formatPrice(currentSale.amount || p.product?.amount);
                        if (client.cpf_cnpj) {
                            const digits = String(client.cpf_cnpj).replace(/\D/g, '');
                            const docLabel = (digits.length >= 10 && digits.length <= 12) ? 'CPF' : (digits.length >= 13 && digits.length <= 15) ? 'CNPJ' : 'Documento';
                            ext[docLabel] = client.cpf_cnpj;
                        }
                    } else if (whType === 'lead') {
                        const lead = p.lead || {};
                        ext.Nome = lead.name;
                        ext.Email = lead.email;
                        ext.Telefone = lead.cellphone ? String(lead.cellphone).replace(/\D/g, '') : null;
                        ext.Status = statusPT;
                    }
                } else if (previewEvent.platform === 'guru') {
                    const whType = String(p.webhook_type || '').toLowerCase();
                    if (whType === 'transaction') {
                        const contact = p.contact || {};
                        const payment = p.payment || {};
                        ext.Nome = contact.name;
                        ext.Email = contact.email;
                        const localCode = String(contact.phone_local_code || '');
                        const phoneNum = String(contact.phone_number || '');
                        ext.Telefone = (localCode + phoneNum).replace(/\D/g, '') || null;
                        ext.Produto = p.product?.name;
                        ext.Status = statusPT;
                        ext['Método'] = METHOD_PT[payment.method] || payment.method;
                        ext['Preço'] = formatPrice(payment.total ?? p.product?.total_value);
                        if (contact.doc) {
                            const digits = String(contact.doc).replace(/\D/g, '');
                            const docLabel = (digits.length >= 10 && digits.length <= 12) ? 'CPF' : (digits.length >= 13 && digits.length <= 15) ? 'CNPJ' : 'Documento';
                            ext[docLabel] = contact.doc;
                        }
                        // Order Bump
                        const obItems = (p.products || []).filter(pr => pr.is_order_bump);
                        if (obItems.length > 0) {
                            ext['⚡ Order Bump'] = obItems.map(ob => ob.name || 'Produto OB').join(', ');
                        }
                        // Upsell
                        const prodNameLower = String(p.product?.name || '').toLowerCase();
                        if (prodNameLower.includes('upsell') || prodNameLower.includes('upgrade')) {
                            ext['🚀 Upsell'] = 'Sim — compra pós-venda';
                        }
                    } else if (whType === 'subscription') {
                        const subscriber = p.subscriber || {};
                        const invoice = p.current_invoice || {};
                        ext.Nome = subscriber.name;
                        ext.Email = subscriber.email;
                        const localCode = String(subscriber.phone_local_code || '');
                        const phoneNum = String(subscriber.phone_number || '');
                        ext.Telefone = (localCode + phoneNum).replace(/\D/g, '') || null;
                        ext.Produto = p.product?.name;
                        ext.Status = statusPT;
                        ext['Método'] = METHOD_PT[p.payment_method] || p.payment_method;
                        ext['Preço'] = formatPrice(invoice.value);
                        if (subscriber.doc) {
                            const digits = String(subscriber.doc).replace(/\D/g, '');
                            const docLabel = (digits.length >= 10 && digits.length <= 12) ? 'CPF' : (digits.length >= 13 && digits.length <= 15) ? 'CNPJ' : 'Documento';
                            ext[docLabel] = subscriber.doc;
                        }
                        // Upsell na Assinatura (por nome do produto)
                        const prodNameLower = String(p.product?.name || '').toLowerCase();
                        if (prodNameLower.includes('upsell') || prodNameLower.includes('upgrade')) {
                            ext['🚀 Upsell'] = 'Sim — compra pós-venda';
                        }
                    }
                } else if (previewEvent.platform === 'kirvano') {
                    ext.Nome = p.customer?.name; ext.Email = p.customer?.email;
                    ext.Telefone = p.customer?.phone_number; ext.Produto = p.products?.[0]?.name || 'Produto Scale Test';
                    ext.Status = statusPT; ext['Método'] = METHOD_PT[p.payment?.method] || p.payment?.method;
                    ext['Preço'] = p.products?.[0]?.price || null;
                } else if (previewEvent.platform === 'kiwify') {
                    ext.Nome = p.Customer?.full_name; ext.Email = p.Customer?.email;
                    ext.Telefone = p.Customer?.mobile; ext.Produto = p.Product?.title;
                    ext.Status = statusPT; ext['Método'] = METHOD_PT[p.payment_method] || null;
                    ext['Preço'] = formatPrice(p.order_total);
                } else if (previewEvent.platform === 'eduzz') {
                    if (p.data?.learner) {
                        ext.Nome = p.data.learner.name; ext.Email = p.data.learner.email;
                        ext.Produto = p.data.course?.title; ext.Status = statusPT;
                    } else {
                        const d = p.data || {};
                        ext.Nome = d.buyer?.name; ext.Email = d.buyer?.email;
                        ext.Telefone = d.buyer?.cellphone; ext.Produto = d.items?.[0]?.name;
                        ext.Status = statusPT; ext['Método'] = METHOD_PT[d.paymentMethod] || d.paymentMethod;
                        ext['Preço'] = formatPrice(d.price?.value ?? d.items?.[0]?.price?.value);
                    }
                } else if (previewEvent.platform === 'ticto') {
                    const o = p.order || {};
                    ext.Nome = o.buyer?.name; ext.Email = o.buyer?.email;
                    ext.Telefone = o.buyer?.phone_number; ext.Produto = o.product?.name;
                    ext.Status = statusPT; ext['Método'] = METHOD_PT[o.payment_method] || o.payment_method;
                    ext['Preço'] = formatPrice(o.total_price);
                } else if (previewEvent.platform === 'pepper') {
                    const d = p.data || {};
                    ext.Nome = d.customer?.name; ext.Email = d.customer?.email;
                    ext.Telefone = d.customer?.phone; ext.Produto = d.product?.name;
                    ext.Status = statusPT; ext['Método'] = METHOD_PT[d.transaction?.payment_method] || d.transaction?.payment_method;
                    ext['Preço'] = formatPrice(d.transaction?.price);
                } else if (previewEvent.platform === 'braip') {
                    ext.Nome = p.contact_name; ext.Email = p.contact_email;
                    ext.Telefone = p.contact_phone; ext.Produto = p.product_title;
                    ext.Status = statusPT; ext['Método'] = METHOD_PT[p.payment_method] || p.payment_method;
                    ext['Preço'] = formatPrice(p.price);
                } else if (previewEvent.platform === 'monetizze') {
                    ext.Nome = p.consumer?.name; ext.Email = p.consumer?.email;
                    ext.Telefone = p.consumer?.cellphone || p.consumer?.phone;
                    ext.Produto = p.product?.name; ext.Status = statusPT;
                    ext['Método'] = typeof p.payment_method === 'object' ? p.payment_method?.name : p.payment_method;
                    ext['Preço'] = formatPrice(p.product?.price || p.value);
                } else if (previewEvent.platform === 'cakto') {
                    const d = p.data || {};
                    ext.Nome = d.customer?.name; ext.Email = d.customer?.email;
                    ext.Telefone = d.customer?.phone; ext.Produto = d.product?.name;
                    ext.Status = statusPT; ext['Método'] = METHOD_PT[d.order?.payment_method] || d.order?.payment_method;
                    const rawTotal = d.order?.total;
                    ext['Preço'] = rawTotal ? formatPrice(rawTotal) : null;
                } else if (previewEvent.platform === 'elementor') {
                    ext.Nome = p['fields[name][value]'] || p.fields?.name?.value || p.name || p.fullname;
                    ext.Email = p['fields[email][value]'] || p.fields?.email?.value || p.email;
                    ext.Telefone = p['fields[phone][value]'] || p['fields[whatsapp][value]'] || p.fields?.whatsapp?.value || p.fields?.phone?.value || p.phone;
                    ext['Formulário'] = p['form[name]'] || p.form_name || null;
                    ext.Status = statusPT;
                } else if (previewEvent.platform === 'pagtrust') {
                    ext.Nome = p.buyerVOName || p.customerFullName || p.name;
                    ext.Email = p.buyerVOEmail || p.customerEmail || p.email;
                    const lc = p.phone_local_code || '';
                    const pn = p.phone_number || '';
                    ext.Telefone = p.customerFullPhoneNumber || (lc && pn ? `55${lc}${pn}` : null);
                    ext.Produto = p.productName || p.productUCode || p.prod_name;
                    ext.Status = statusPT; ext['Método'] = METHOD_PT[p.payment_type] || p.payment_type;
                    ext['Preço'] = p.price ? `R$ ${p.price}` : null;
                } else if (previewEvent.platform === 'herospark') {
                    ext.Nome = p.buyer?.name;
                    ext.Email = p.buyer?.email;
                    ext.Telefone = p.buyer?.phone ? String(p.buyer.phone).replace(/\D/g, '') : null;
                    ext.Produto = p.product?.name;
                    ext.Status = statusPT;
                    ext['Método'] = METHOD_PT[p.purchase?.payment?.type] || p.purchase?.payment?.type;
                    const rawCents = p.purchase?.price?.value ?? p.purchase?.price?.gross;
                    if (rawCents != null) {
                        const cents = Number(rawCents);
                        ext['Preço'] = formatPrice(cents > 1000 ? cents / 100 : cents);
                    }
                    if (p.buyer?.doc) {
                        const digits = String(p.buyer.doc).replace(/\D/g, '');
                        const docLabel = (digits.length >= 10 && digits.length <= 12) ? 'CPF' : (digits.length >= 13 && digits.length <= 15) ? 'CNPJ' : 'Documento';
                        ext[docLabel] = p.buyer.doc;
                    }
                    // Order Bump
                    if (p.purchaseBumpUsed && Array.isArray(p.bump) && p.bump.length > 0) {
                        ext['⚡ Order Bump'] = p.bump.map(b => b.name || 'Produto OB').join(', ');
                    }
                    // Upsell
                    if (p.upsell) {
                        ext['🚀 Upsell'] = 'Sim — compra pós-venda';
                    }
                } else {
                    ext.Nome = 'Contato Teste 1'; ext.Email = 'teste.contato1@example.com';
                    ext.Status = statusPT;
                }

                // ── Order Bump extraction ─────────────────────────────────────
                // Hotmart/PagTrust: OB é um webhook separado com is_order_bump: true
                const isHotmartOB = previewEvent.platform === 'hotmart' && p.data?.purchase?.is_order_bump === true;
                const isPagtrustOB = previewEvent.platform === 'pagtrust' && String(p.order_bump).toLowerCase() === 'true';
                if (isHotmartOB || isPagtrustOB) {
                    ext['⚡ É Order Bump'] = 'Sim — este webhook é do produto extra';
                }
                // Kirvano: OB está no array products com is_order_bump: true
                const kirOBs = (p.products || []).filter(pr => pr.is_order_bump);
                // Eduzz: múltiplos items — item[0] = principal, demais = OBs
                const eduzzItems = (p.data?.items || []);
                const eduzzOBs = eduzzItems.length > 1 ? eduzzItems.slice(1) : [];
                // Kiwify: OrderBumps array
                const kiwifyOBs = (p.OrderBumps || []);
                // Ticto: order.order_bumps array
                const tictoOBs = (p.order?.order_bumps || []);
                // Pepper: data.order_bumps array
                const pepperOBs = (p.data?.order_bumps || []);
                // Braip: order_bump object
                const braipOB = p.order_bump ? [p.order_bump] : [];
                // Monetizze: se type === 'upsell', o próprio produto é o OB
                const monetizzeOB = (p.type === 'upsell' && p.product) ? [{ name: p.product.name, price: p.product.price }] : [];
                // Cakto: data.order.order_bumps array
                const caktoOBs = (p.data?.order?.order_bumps || []);

                const obProducts = [
                    ...kirOBs.map(pr => ({ name: pr.name, price: pr.price })),
                    ...eduzzOBs.map(it => ({ name: it.name, price: it.price?.value ?? it.price })),
                    ...kiwifyOBs.map(ob => ({ name: ob.product?.title, price: ob.price })),
                    ...tictoOBs.map(ob => ({ name: ob.product?.name, price: ob.price })),
                    ...pepperOBs.map(ob => ({ name: ob.product?.name, price: ob.price })),
                    ...braipOB.map(ob => ({ name: ob.product_title, price: ob.price })),
                    ...monetizzeOB,
                    ...caktoOBs.map(ob => ({ name: ob.product?.name, price: ob.price ?? null })),
                ];

                const utmObj = p.utm || p.data?.utm || {};
                const utms = {
                    'utm_source':   p.utm_source   || utmObj.utm_source,
                    'utm_medium':   p.utm_medium   || utmObj.utm_medium,
                    'utm_campaign': p.utm_campaign || utmObj.utm_campaign,
                    'utm_term':     p.utm_term     || utmObj.utm_term,
                    'utm_content':  p.utm_content  || utmObj.utm_content,
                };
                const utmFields = Object.entries(utms).filter(([, v]) => v);
                const fields = Object.entries(ext).filter(([, v]) => v);

                const jsonStr = JSON.stringify(p, null, 2);
                const highlighted = jsonStr
                    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                    .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g, (m) => {
                        if (/^"/.test(m)) {
                            if (/:$/.test(m)) return `<span style="color:#79b8ff;font-weight:600">${m}</span>`;
                            return `<span style="color:#9ecbff">${m}</span>`;
                        }
                        if (/true|false/.test(m)) return `<span style="color:#f97583">${m}</span>`;
                        if (/null/.test(m)) return `<span style="color:#f97583">${m}</span>`;
                        return `<span style="color:#ffab70">${m}</span>`;
                    });

                // ── Painel de campos extraídos (reutilizado nos dois layouts) ──
                const FieldsPanel = ({ cols = 2 }) => (
                    <div className="space-y-2">
                        <div className={`grid grid-cols-${cols} gap-2`}>
                            {fields.map(([k, v]) => {
                                const isPrice = k === 'Preço';
                                const isStatus = k === 'Status';
                                return (
                                    <div
                                        key={k}
                                        className="rounded-xl px-3 py-2.5 relative overflow-hidden"
                                        style={{
                                            background: isPrice
                                                ? 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.05))'
                                                : 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(59,130,246,0.05))',
                                            border: isPrice
                                                ? '1px solid rgba(16,185,129,0.25)'
                                                : '1px solid rgba(59,130,246,0.25)',
                                            boxShadow: isPrice
                                                ? '0 0 12px rgba(16,185,129,0.08) inset'
                                                : '0 0 12px rgba(59,130,246,0.08) inset',
                                        }}
                                    >
                                        <p style={{
                                            fontSize: '9px',
                                            fontWeight: 800,
                                            letterSpacing: '0.12em',
                                            textTransform: 'uppercase',
                                            color: isPrice ? 'rgba(52,211,153,0.8)' : 'rgba(96,165,250,0.8)',
                                            marginBottom: '3px',
                                        }}>{k}</p>
                                        <p style={{
                                            fontSize: isPrice ? '14px' : '12px',
                                            fontWeight: isPrice ? 800 : 600,
                                            color: isPrice ? '#34d399' : isStatus ? '#93c5fd' : '#e2e8f0',
                                            lineHeight: 1.3,
                                            wordBreak: 'break-all',
                                        }}>{v}</p>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Seção Order Bump */}
                        {obProducts.length > 0 && (
                            <div>
                                <p className="text-[9px] font-black text-orange-400/80 uppercase tracking-widest mb-1.5">⚡ Order Bump{obProducts.length > 1 ? 's' : ''}</p>
                                <div className="space-y-1.5">
                                    {obProducts.map((ob, idx) => (
                                        <div key={idx} className={`grid grid-cols-${cols} gap-2`}>
                                            <div className="bg-orange-900/20 border border-orange-500/15 rounded-lg px-3 py-2">
                                                <p className="text-[9px] text-orange-400/60 uppercase tracking-wider">Produto OB{obProducts.length > 1 ? ` #${idx+1}` : ''}</p>
                                                <p className="text-xs text-orange-200 font-medium truncate mt-0.5">{ob.name || '—'}</p>
                                            </div>
                                            <div className="bg-orange-900/20 border border-orange-500/15 rounded-lg px-3 py-2">
                                                <p className="text-[9px] text-orange-400/60 uppercase tracking-wider">Preço OB{obProducts.length > 1 ? ` #${idx+1}` : ''}</p>
                                                <p className="text-xs text-orange-200 font-medium truncate mt-0.5">
                                                    {ob.price != null ? (typeof ob.price === 'number' ? formatPrice(ob.price) : ob.price) : '—'}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Hotmart/PagTrust OB badge */}
                        {(isHotmartOB || isPagtrustOB) && obProducts.length === 0 && (
                            <div className="bg-orange-900/20 border border-orange-500/15 rounded-lg px-3 py-2.5 col-span-2">
                                <p className="text-[9px] text-orange-400/60 uppercase tracking-widest font-black mb-0.5">⚡ Order Bump</p>
                                <p className="text-xs text-orange-200 font-medium">Este webhook é do produto extra (order bump). O sistema vai ignorá-lo para não criar contato duplicado.</p>
                            </div>
                        )}

                        {utmFields.length > 0 && (
                            <div>
                                <p className="text-[9px] font-black text-violet-400/70 uppercase tracking-widest mb-1.5">Rastreamento UTM</p>
                                <div className={`grid grid-cols-${cols} gap-2`}>
                                    {utmFields.map(([k, v]) => (
                                        <div key={k} className="bg-violet-900/20 border border-violet-500/10 rounded-lg px-3 py-2">
                                            <p className="text-[9px] text-violet-400/60 uppercase tracking-wider">{k}</p>
                                            <p className="text-xs text-violet-200 font-medium truncate mt-0.5">{v}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );

                // ── Barra do editor JSON (reutilizada nos dois layouts) ────────
                const JsonToolbar = () => (
                    <div className="flex items-center justify-between px-4 py-2.5 shrink-0" style={{ borderBottom: '1px solid #30363d', background: '#161b22' }}>
                        <div className="flex items-center gap-2.5">
                            <div className="flex gap-1.5">
                                <span className="w-3 h-3 rounded-full" style={{ background: '#ff5f57' }} />
                                <span className="w-3 h-3 rounded-full" style={{ background: '#febc2e' }} />
                                <span className="w-3 h-3 rounded-full" style={{ background: '#28c840' }} />
                            </div>
                            <span className="text-[10px] font-mono" style={{ color: '#8b949e' }}>payload.json</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={(e) => {
                                    navigator.clipboard.writeText(jsonStr);
                                    toast.success('JSON copiado!');
                                    const btn = e.target.closest('button');
                                    const orig = btn.textContent;
                                    btn.textContent = '✓ Copiado!';
                                    setTimeout(() => { btn.textContent = orig; }, 1500);
                                }}
                                className="text-[11px] font-bold px-3 py-1 rounded-md"
                                style={{ color: '#8b949e', background: '#21262d', border: '1px solid #30363d' }}
                                onMouseEnter={e => { e.currentTarget.style.color='#c9d1d9'; e.currentTarget.style.borderColor='#8b949e'; }}
                                onMouseLeave={e => { e.currentTarget.style.color='#8b949e'; e.currentTarget.style.borderColor='#30363d'; }}
                            >Copiar</button>
                        </div>
                    </div>
                );

                // ── Layout MAXIMIZADO (tela cheia, duas colunas) ───────────────
                if (jsonMaximized) return createPortal(
                    <div className="fixed inset-0 z-[10001] flex" style={{ background: '#0d1117' }}>
                        {/* Coluna esquerda — JSON */}
                        <div className="flex flex-col" style={{ width: '55%', borderRight: '1px solid #30363d' }}>
                            <JsonToolbar />
                            <div className="flex-1 overflow-auto p-6" style={{ background: '#0d1117' }}>
                                <pre className="text-[12px] font-mono leading-6 whitespace-pre-wrap break-all"
                                    style={{ color: '#c9d1d9' }}
                                    dangerouslySetInnerHTML={{ __html: highlighted }} />
                            </div>
                        </div>
                        {/* Coluna direita — Campos extraídos */}
                        <div className="flex flex-col overflow-hidden" style={{ width: '45%', background: '#0f172a' }}>
                            {/* Mini-header */}
                            <div className="flex items-center justify-between px-5 py-3.5 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <FiZap size={12} className="text-violet-400" />
                                        <span className="text-xs font-black text-white">{previewEvent.label}</span>
                                        <span className="text-[9px] font-mono text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">{previewEvent.platform}</span>
                                    </div>
                                    <p className="text-[9px] text-gray-500 mt-0.5 uppercase tracking-widest">Dados que o sistema vai extrair</p>
                                </div>
                                <button onClick={() => { setJsonMaximized(false); setPreviewEvent(null); }} className="text-gray-600 hover:text-white transition-colors p-1">
                                    <FiX size={16} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-5">
                                <FieldsPanel cols={2} />
                            </div>
                        </div>
                    </div>,
                    document.body
                );

                // ── Layout NORMAL (modal compacto) ─────────────────────────────
                return createPortal(
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-white/5">
                            <div>
                                <div className="flex items-center gap-2">
                                    <FiZap size={14} className="text-violet-400" />
                                    <span className="text-sm font-black text-white">{previewEvent.label}</span>
                                    <span className="text-[10px] font-mono text-gray-500 bg-gray-800 px-2 py-0.5 rounded">{previewEvent.eventType}</span>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest">
                                    Plataforma: <span className="text-violet-400">{previewEvent.platform}</span> — Preview do payload enviado
                                </p>
                            </div>
                            <button onClick={() => { setPreviewEvent(null); setJsonMaximized(false); }} className="text-gray-600 hover:text-white transition-colors p-1">
                                <FiX size={18} />
                            </button>
                        </div>

                        {/* Campos extraídos */}
                        <div className="p-5 border-b border-white/5">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Dados que o sistema vai extrair</p>
                            <FieldsPanel cols={2} />
                        </div>

                        {/* Raw JSON — editor style */}
                        <div className="flex-1 overflow-auto flex flex-col" style={{ background: '#0d1117' }}>
                            <JsonToolbar />
                            <div className="flex-1 overflow-auto p-5" style={{ background: '#0d1117' }}>
                                <pre
                                    className="text-[12px] font-mono leading-6 whitespace-pre-wrap break-all"
                                    style={{ color: '#c9d1d9' }}
                                    dangerouslySetInnerHTML={{ __html: highlighted }}
                                />
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
                );
            })()}
        </div>
    );
};

export default StressTest;
