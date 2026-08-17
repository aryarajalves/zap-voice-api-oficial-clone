import React, { useState } from 'react';
import { FiZap, FiEyeOff, FiEye, FiCopy } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { META_APP_ID, META_CONFIG_ID, API_URL } from '../../../../config';
import { fetchWithAuth } from '../../../../AuthContext';
import { handleMetaEmbeddedSignupHelper } from '../../utils/whatsAppTabUtils';
import WabaPaymentCard from '../WabaPaymentCard';
import WebhookConfigSection from '../WebhookConfigSection';

export default function WhatsAppApiSubTab({
    formData,
    setFormData,
    handleChange,
    visibleFields,
    handleRevealSetting,
    copyToClipboard,
    activeClient,
    isUniqueWebhook,
    metaWebhookUrl
}) {
    const [testingToken, setTestingToken] = useState(false);
    const [testResult, setTestResult] = useState(null);

    const handleTestToken = async () => {
        const token = formData.WA_ACCESS_TOKEN;
        const phoneId = formData.WA_PHONE_NUMBER_ID;

        if (!token || !phoneId) {
            toast.error("Por favor, preencha o Access Token e o Phone Number ID antes de testar.");
            return;
        }

        setTestingToken(true);
        setTestResult(null);
        const loadingToast = toast.loading("Testando token na Meta...");

        try {
            const res = await fetchWithAuth(`${API_URL}/whatsapp/test-token`, {
                method: 'POST',
                body: JSON.stringify({
                    access_token: token,
                    phone_number_id: phoneId
                })
            }, activeClient?.id);

            const data = await res.json();
            if (res.ok && data.success) {
                setTestResult({ success: true, message: data.message });
                toast.success("Conexão com a Meta realizada com sucesso!");
            } else {
                setTestResult({ success: false, message: data.detail || "Falha ao testar token." });
                toast.error("Erro ao validar token com a Meta.");
            }
        } catch (err) {
            console.error(err);
            setTestResult({ success: false, message: "Erro de conexão ao testar token." });
            toast.error("Erro de conexão.");
        } finally {
            setTestingToken(false);
            toast.dismiss(loadingToast);
        }
    };

    const handleMetaEmbeddedSignup = () => {
        handleMetaEmbeddedSignupHelper(setFormData);
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-white/5">
                <span className="text-green-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                    </svg>
                </span>
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">WhatsApp Cloud API (Meta)</h3>
            </div>

            {/* Botão de Embedded Signup da Meta */}
            {META_APP_ID && META_CONFIG_ID ? (
                <div className="p-4 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-xl space-y-3">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-600 rounded-lg text-white mt-0.5 shadow-md shadow-blue-500/20">
                            <FiZap size={18} />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-semibold text-gray-800 dark:text-white">Conexão Rápida com o Cadastro Incorporado</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                                Clique no botão abaixo para conectar sua conta comercial da Meta e autodescobrir seus IDs do WhatsApp instantaneamente.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleMetaEmbeddedSignup}
                        className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-500/20"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                        Conectar com a Meta
                    </button>
                </div>
            ) : (
                <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                    <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
                        💡 <b>Dica:</b> Para habilitar o cadastro incorporado e preencher os dados de forma automática, configure as variáveis <code>META_APP_ID</code> e <code>META_CONFIG_ID</code> no seu arquivo <code>.env</code>.
                    </p>
                </div>
            )}

            {/* Monitor de Saúde e Pagamento WABA */}
            <WabaPaymentCard />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Business Account ID</label>
                    <input
                        type="text"
                        name="WA_BUSINESS_ACCOUNT_ID"
                        value={formData.WA_BUSINESS_ACCOUNT_ID}
                        onChange={handleChange}
                        placeholder="Ex: 123456789"
                        className="w-full p-2.5 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-white dark:bg-[#1f2937]/50 text-gray-900 dark:text-white"
                        autoComplete="one-time-code"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number ID</label>
                    <input
                        type="text"
                        name="WA_PHONE_NUMBER_ID"
                        value={formData.WA_PHONE_NUMBER_ID}
                        onChange={handleChange}
                        placeholder="Ex: 100000000"
                        className="w-full p-2.5 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-white dark:bg-[#1f2937]/50 text-gray-900 dark:text-white"
                    />
                </div>
                <div className="space-y-1 md:col-span-2 relative">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Access Token (Permanente)</label>
                    <div className="relative group">
                        <input 
                            type={visibleFields.WA_ACCESS_TOKEN ? "text" : "password"}
                            name="WA_ACCESS_TOKEN"
                            value={formData.WA_ACCESS_TOKEN}
                            onChange={handleChange}
                            placeholder="EAAB..."
                            className="w-full p-2.5 pr-20 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all font-mono text-sm bg-white dark:bg-[#1f2937]/50 text-gray-900 dark:text-white"
                            autoComplete="new-password"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => handleRevealSetting('WA_ACCESS_TOKEN')}
                                className="p-1.5 text-gray-400 hover:text-green-500 transition-colors"
                                title={visibleFields.WA_ACCESS_TOKEN ? "Esconder" : "Visualizar"}
                            >
                                {visibleFields.WA_ACCESS_TOKEN ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                            </button>
                            <button
                                type="button"
                                onClick={() => copyToClipboard(formData.WA_ACCESS_TOKEN, "Token")}
                                className="p-1.5 text-gray-400 hover:text-green-500 transition-colors"
                                title="Copiar"
                            >
                                <FiCopy size={18} />
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mt-1.5">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Token gerado no painel de desenvolvedor da Meta.</p>
                        <button
                            type="button"
                            onClick={handleTestToken}
                            disabled={testingToken}
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white rounded-lg text-xs font-bold transition-all shadow flex items-center gap-1.5 nodrag"
                        >
                            {testingToken ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                            ) : (
                                <FiZap size={13} />
                            )}
                            Testar Conexão
                        </button>
                    </div>
                    
                    {testResult && (
                        <div className={`mt-2 p-2.5 rounded-lg text-xs border ${
                            testResult.success 
                                ? 'bg-green-500/5 border-green-500/20 text-green-600 dark:text-green-400' 
                                : 'bg-red-500/5 border-red-500/20 text-red-600 dark:text-red-400'
                        }`}>
                            <strong>Resultado:</strong> {testResult.message}
                        </div>
                    )}
                </div>
                
                <div className="space-y-1 md:col-span-2 relative">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">PIN de Registro (Verificação em 2 Etapas)</label>
                    <div className="relative group w-full md:w-1/2">
                        <input 
                            type={visibleFields.WA_PIN ? "text" : "password"}
                            name="WA_PIN"
                            value={formData.WA_PIN || ''}
                            onChange={handleChange}
                            placeholder="Ex: 123456"
                            className="w-full p-2.5 pr-10 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all font-mono text-sm bg-white dark:bg-[#1f2937]/50 text-gray-900 dark:text-white"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => handleRevealSetting('WA_PIN')}
                                className="p-1.5 text-gray-400 hover:text-green-500 transition-colors"
                                title={visibleFields.WA_PIN ? "Esconder" : "Visualizar"}
                            >
                                {visibleFields.WA_PIN ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                            </button>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Utilizado para ativar o certificado do nome do WhatsApp.</p>
                </div>
            </div>

            {/* Configurações do Webhook */}
            <WebhookConfigSection
                formData={formData}
                handleChange={handleChange}
                isUniqueWebhook={isUniqueWebhook}
                metaWebhookUrl={metaWebhookUrl}
                copyToClipboard={copyToClipboard}
            />
        </div>
    );
}
