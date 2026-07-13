import React from 'react';
import { FiZap, FiCopy, FiAlertCircle } from 'react-icons/fi';

const WebhookConfigSection = ({
    formData,
    handleChange,
    isUniqueWebhook,
    metaWebhookUrl,
    copyToClipboard
}) => {
    return (
        <div className="space-y-4 md:col-span-2 mt-4 p-5 bg-blue-50/30 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30 shadow-sm">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <FiZap className="text-blue-500 w-5 h-5" />
                    <h4 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide">Configuração de Webhook (Meta)</h4>
                </div>
                <label className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-600/20 text-blue-600 dark:text-blue-400 rounded-xl cursor-pointer text-xs font-bold transition-all">
                    <input 
                        type="checkbox"
                        name="WA_USE_UNIQUE_WEBHOOK"
                        checked={formData.WA_USE_UNIQUE_WEBHOOK === true || formData.WA_USE_UNIQUE_WEBHOOK === 'true'}
                        onChange={handleChange}
                        className="rounded border-gray-300 dark:border-white/10 text-blue-600 focus:ring-blue-500 outline-none"
                    />
                    Usar Webhook Exclusivo por Cliente
                </label>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-3">
                <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500 ml-1">URL do Webhook</label>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            readOnly 
                            value={metaWebhookUrl}
                            className="flex-1 bg-white/70 dark:bg-black/40 border border-gray-100 dark:border-white/5 rounded-xl px-3 py-2.5 text-xs font-mono text-gray-600 dark:text-gray-400 focus:outline-none"
                        />
                        <button 
                            type="button"
                            onClick={() => copyToClipboard(metaWebhookUrl, "URL do Webhook")}
                            className="p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all shadow-sm active:scale-95"
                            title="Copiar URL"
                        >
                            <FiCopy size={18} />
                        </button>
                    </div>
                </div>
                
                {isUniqueWebhook && (
                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500 ml-1">Slug Exclusivo</label>
                        <input 
                            type="text"
                            name="WA_WEBHOOK_SLUG"
                            value={formData.WA_WEBHOOK_SLUG || ""}
                            onChange={(e) => {
                                const sanitized = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
                                handleChange({ target: { name: 'WA_WEBHOOK_SLUG', value: sanitized } });
                            }}
                            className="w-full bg-white dark:bg-[#1f2937]/50 border border-gray-300 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs font-mono text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            placeholder="Ex: minha_empresa_2024"
                            title="Slug usado na URL do webhook. Use apenas letras minúsculas, números, _ e -"
                        />
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 ml-1">Apenas letras minúsculas, números, _ e - são permitidos.</p>
                    </div>
                )}
                
                <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500 ml-1">Token de Verificação</label>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            readOnly 
                            value={formData.WHATSAPP_VERIFY_TOKEN || "zapvoice_oficial"}
                            className="flex-1 bg-white/70 dark:bg-black/40 border border-gray-100 dark:border-white/5 rounded-xl px-3 py-2.5 text-xs font-mono text-gray-600 dark:text-gray-400 focus:outline-none"
                        />
                        <button 
                            type="button"
                            onClick={() => copyToClipboard(formData.WHATSAPP_VERIFY_TOKEN || "zapvoice_oficial", "Token de Verificação")}
                            className="p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all shadow-sm active:scale-95"
                            title="Copiar Token"
                        >
                            <FiCopy size={18} />
                        </button>
                    </div>
                </div>
            </div>
            
            <div className="mt-3 p-3 bg-white/40 dark:bg-black/10 rounded-xl border border-blue-50 dark:border-blue-900/20">
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                    <FiAlertCircle className="inline mr-1 text-blue-400" size={14} />
                    Configure esses dados no Painel da Meta em <b>WhatsApp &gt; Configuração &gt; Webhook</b>. 
                    Certifique-se de assinar o campo <b>messages</b> para receber as interações dos seus leads.
                </p>
            </div>
        </div>
    );
};

export default WebhookConfigSection;
