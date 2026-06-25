import React, { useState } from 'react';
import { FiEye, FiEyeOff, FiInstagram } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

const InstagramTab = ({
    user,
    formData,
    handleChange,
    visibleFields,
    handleRevealSetting
}) => {
    const [revealing, setRevealing] = useState(false);
    const [showToken, setShowToken] = useState(false);

    const onReveal = async () => {
        setRevealing(true);
        try {
            await handleRevealSetting('INSTAGRAM_ACCESS_TOKEN');
            setShowToken(prev => !prev);
        } catch (e) {
            toast.error("Erro ao revelar token");
        } finally {
            setRevealing(false);
        }
    };

    const webhookUrl = formData.WEBHOOK_BASE_URL && formData.INSTAGRAM_WEBHOOK_SLUG
        ? `${formData.WEBHOOK_BASE_URL}/api/instagram/webhook/${formData.INSTAGRAM_WEBHOOK_SLUG}`
        : '';

    const copyToClipboard = () => {
        if (!webhookUrl) {
            toast.error("Webhook URL incompleto. Verifique se o slug e a URL base estão definidos.");
            return;
        }
        navigator.clipboard.writeText(webhookUrl);
        toast.success("URL do Webhook copiada!");
    };

    const tokenJaConfigurado = !!formData.INSTAGRAM_ACCESS_TOKEN;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Header Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-white/5">
                    <span className="text-pink-500">
                        <FiInstagram className="h-5 w-5" />
                    </span>
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Instagram Integration</h3>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                    Configure as credenciais manuais da API do Instagram Business. Use o token permanente gerado no Painel de Desenvolvedores do Meta.
                </p>

                <div className="grid grid-cols-1 gap-4">
                    {/* ID da Conta do Instagram */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">ID da Conta do Instagram Business</label>
                        <input
                            type="text"
                            name="INSTAGRAM_ACCOUNT_ID"
                            value={formData.INSTAGRAM_ACCOUNT_ID || ''}
                            onChange={handleChange}
                            placeholder="Ex: 17841478293157797"
                            className="w-full p-2.5 border border-gray-100 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all bg-white dark:bg-[#1f2937]/50 text-gray-900 dark:text-white"
                            autoComplete="off"
                        />
                    </div>

                    {/* Token de Acesso */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Token de Acesso da Página (Page Access Token)</label>
                        <div className="relative">
                            <input
                                type={showToken || visibleFields['INSTAGRAM_ACCESS_TOKEN'] ? 'text' : 'password'}
                                name="INSTAGRAM_ACCESS_TOKEN"
                                value={formData.INSTAGRAM_ACCESS_TOKEN || ''}
                                onChange={handleChange}
                                placeholder={tokenJaConfigurado && !visibleFields['INSTAGRAM_ACCESS_TOKEN'] ? '••••••••••••••••••••••••••••••••••••••••' : 'EAAGb...'}
                                autoComplete="new-password"
                                className="w-full p-2.5 pr-12 border border-gray-100 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all bg-white dark:bg-[#1f2937]/50 text-gray-900 dark:text-white"
                            />
                            <button
                                type="button"
                                onClick={onReveal}
                                disabled={revealing}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-pink-500 transition-colors p-1 disabled:opacity-50"
                                title={showToken || visibleFields['INSTAGRAM_ACCESS_TOKEN'] ? 'Ocultar token' : 'Clique para revelar o token salvo'}
                            >
                                {revealing ? (
                                    <span className="animate-spin text-xs">...</span>
                                ) : (showToken || visibleFields['INSTAGRAM_ACCESS_TOKEN'] ? (
                                    <FiEyeOff size={16} />
                                ) : (
                                    <FiEye size={16} />
                                ))}
                            </button>
                        </div>
                        {tokenJaConfigurado && !visibleFields['INSTAGRAM_ACCESS_TOKEN'] && (
                            <span className="text-[10px] text-green-500 mt-1 block font-bold">✅ Token salvo. Clique no olho para revelar ou digite um novo para atualizar.</span>
                        )}
                    </div>

                    {/* Slug do Webhook */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Slug do Webhook (final da URL)</label>
                        <input
                            type="text"
                            name="INSTAGRAM_WEBHOOK_SLUG"
                            value={formData.INSTAGRAM_WEBHOOK_SLUG || ''}
                            onChange={(e) => {
                                const sanitized = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
                                handleChange({
                                    target: {
                                        name: 'INSTAGRAM_WEBHOOK_SLUG',
                                        value: sanitized
                                    }
                                });
                            }}
                            placeholder="Ex: luana"
                            className="w-full p-2.5 border border-gray-100 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all bg-white dark:bg-[#1f2937]/50 text-gray-900 dark:text-white"
                            autoComplete="off"
                        />
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 block">Apenas letras minúsculas, números, underscores (_) e hífens (-).</span>
                    </div>

                    {/* URL do Webhook */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">URL do Webhook (configurar no Meta)</label>
                        <div className="relative">
                            <input
                                type="text"
                                readOnly
                                value={webhookUrl || 'Configure WEBHOOK_BASE_URL e o Slug do Instagram'}
                                className="w-full p-2.5 pr-24 border border-dashed border-pink-500/30 rounded-lg bg-gray-50 dark:bg-gray-800/30 outline-none text-xs font-mono text-gray-500 dark:text-gray-400 cursor-default"
                            />
                            <button
                                type="button"
                                onClick={copyToClipboard}
                                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-pink-600/20 hover:bg-pink-600/40 text-pink-500 dark:text-pink-400 text-[10px] font-black rounded-lg transition-all uppercase tracking-wider"
                            >
                                Copiar
                            </button>
                        </div>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 block">
                            Cole esta URL no campo &quot;URL de Callback&quot; do webhook do Instagram no painel do Meta Developers.
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InstagramTab;
