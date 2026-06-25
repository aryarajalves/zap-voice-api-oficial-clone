import React from 'react';
import { FiEyeOff, FiEye, FiCopy, FiImage, FiUpload, FiShield, FiAlertCircle, FiZap } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { resolveUrl, WEBHOOK_BASE_URL, META_APP_ID, META_CONFIG_ID, API_URL } from '../../../config';
import { handleMetaEmbeddedSignupHelper } from '../utils/whatsAppTabUtils';
import { useClient } from '../../../contexts/ClientContext';
import { fetchWithAuth } from '../../../AuthContext';

const tierMapping = {
    'TIER_250': '250',
    'TIER_1K': '1.000',
    'TIER_10K': '10.000',
    'TIER_100K': '100.000',
    'TIER_UNLIMITED': 'Ilimitado'
};

const getQualityRatingBadge = (rating) => {
    if (!rating) return null;
    const r = rating.toUpperCase();
    
    let label = 'Desconhecida';
    let colorClass = 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    let dotColor = 'bg-gray-400';
    
    if (r === 'HIGH' || r === 'GREEN' || r === 'GOOD') {
        label = 'Alta';
        colorClass = 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-500/20';
        dotColor = 'bg-green-500';
    } else if (r === 'MEDIUM' || r === 'YELLOW' || r === 'AVERAGE') {
        label = 'Média';
        colorClass = 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-500/20';
        dotColor = 'bg-yellow-500';
    } else if (r === 'LOW' || r === 'RED' || r === 'BAD') {
        label = 'Baixa';
        colorClass = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-500/20';
        dotColor = 'bg-red-500';
    }
    
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold ${colorClass}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
            Qualidade: {label}
        </span>
    );
};

const WhatsAppTab = ({
    user, formData, setFormData, handleChange, visibleFields, handleRevealSetting, copyToClipboard,
    whatsappProfile, whatsappAbout, setWhatsappAbout, handleUpdateWhatsAppAbout, isUpdatingWaAbout,
    whatsappName, setWhatsappName, handleUpdateWhatsAppName, isUpdatingWaName,
    handleRegisterWhatsAppNumber, isRegisteringWa, handleWhatsAppLogoUpload, isUpdatingWaLogo
}) => {
    const isUniqueWebhook = formData.WA_USE_UNIQUE_WEBHOOK === true || formData.WA_USE_UNIQUE_WEBHOOK === 'true';
    const baseWebhookUrl = formData.WEBHOOK_BASE_URL || WEBHOOK_BASE_URL || resolveUrl('/').replace(/\/$/, '');
    const metaWebhookUrl = isUniqueWebhook && formData.WA_WEBHOOK_SLUG
        ? `${baseWebhookUrl}/api/meta/${formData.WA_WEBHOOK_SLUG}`.replace('http://', 'https://')
        : `${baseWebhookUrl}/api/meta`.replace('http://', 'https://');

    const { activeClient } = useClient();
    const [testingToken, setTestingToken] = React.useState(false);
    const [testResult, setTestResult] = React.useState(null);

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

    React.useEffect(() => {
        if (!META_APP_ID) return;
        
        window.fbAsyncInit = function() {
            window.FB.init({
                appId: META_APP_ID,
                cookie: true,
                xfbml: true,
                version: 'v19.0'
            });
        };

        (function(d, s, id) {
            var js, fjs = d.getElementsByTagName(s)[0];
            if (d.getElementById(id)) return;
            js = d.createElement(s); js.id = id;
            js.src = "https://connect.facebook.net/pt_BR/sdk.js";
            fjs.parentNode.insertBefore(js, fjs);
        }(document, 'script', 'facebook-jssdk'));
    }, []);

    const handleMetaEmbeddedSignup = () => {
        handleMetaEmbeddedSignupHelper(setFormData);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* WhatsApp Section */}
            {['super_admin', 'admin', 'administrator', 'owner'].includes(user?.role) && (
                <div className="space-y-4">
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

                        <div className="space-y-2 md:col-span-2 mt-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Foto de Perfil do WhatsApp</label>
                            
                            <div className="flex items-center gap-4 p-4 bg-green-50/50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-900/30">
                                <div className="relative group w-20 h-20 bg-white dark:bg-[#1f2937]/80 rounded-full overflow-hidden border-2 border-green-500 shadow-lg">
                                    {whatsappProfile?.profile_picture_url ? (
                                        <img 
                                            src={whatsappProfile.profile_picture_url} 
                                            alt="WhatsApp Profile" 
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                            <FiImage size={32} />
                                        </div>
                                    )}
                                    {isUpdatingWaLogo && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex-1">
                                    <div className="mb-3">
                                        <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500 mb-1 block">Nome de Exibição (Certificado)</label>
                                        <div className="flex gap-2">
                                            <input 
                                                type="text" 
                                                value={whatsappName}
                                                onChange={(e) => setWhatsappName(e.target.value)}
                                                className="flex-1 bg-white dark:bg-[#1f2937]/50 border border-gray-100 dark:border-white/10 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-green-500 outline-none transition-all"
                                                placeholder="Ex: ZapVoice Suporte"
                                            />
                                            <button 
                                                type="button"
                                                onClick={handleUpdateWhatsAppName}
                                                disabled={isUpdatingWaName}
                                                className="px-3 py-1.5 bg-gray-800 dark:bg-white text-white dark:text-gray-800 text-xs font-bold rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
                                            >
                                                {isUpdatingWaName ? '...' : 'Alterar'}
                                            </button>
                                        </div>
                                        {whatsappProfile?.verified_name && (
                                            <div className="mt-1.5 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-gray-500">Atual: <b className="text-gray-700 dark:text-gray-300">{whatsappProfile.verified_name}</b></span>
                                                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                                                        whatsappProfile.name_status === 'APPROVED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                    }`}>
                                                        {whatsappProfile.name_status === 'APPROVED' ? 'APROVADO' : 'EM ANÁLISE'}
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handleRegisterWhatsAppNumber}
                                                    disabled={isRegisteringWa || whatsappProfile.name_status !== 'APPROVED'}
                                                    className={`text-[9px] font-bold flex items-center gap-1 transition-all ${
                                                        whatsappProfile.name_status === 'APPROVED' 
                                                        ? 'text-green-600 dark:text-green-400 hover:underline' 
                                                        : 'text-gray-400 cursor-not-allowed opacity-50'
                                                    }`}
                                                    title={whatsappProfile.name_status === 'APPROVED' ? "Ativar Certificado" : "Aguarde a aprovação da Meta para ativar"}
                                                >
                                                    {isRegisteringWa ? '...' : (
                                                        <>
                                                            <FiShield size={10} />
                                                            {whatsappProfile.name_status === 'APPROVED' ? 'Ativar Certificado' : 'Certificado Indisponível'}
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                        
                                        {whatsappProfile?.name_status && whatsappProfile.name_status !== 'APPROVED' && (
                                            <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-2 animate-pulse">
                                                <FiAlertCircle className="text-amber-600 dark:text-amber-400 mt-0.5" size={14} />
                                                <div className="flex-1">
                                                    <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300">Nome em Análise pela Meta</p>
                                                    <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80 leading-tight">O botão de "Ativar Certificado" ficará disponível assim que a Meta aprovar seu nome. Isso pode levar de 2 a 24 horas.</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mb-2">
                                        <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500 mb-1 block">Recado / Frase do WhatsApp</label>
                                        <div className="flex gap-2">
                                            <input 
                                                type="text" 
                                                value={whatsappAbout}
                                                onChange={(e) => setWhatsappAbout(e.target.value)}
                                                className="flex-1 bg-white dark:bg-[#1f2937]/80 border border-gray-200 dark:border-white/5 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-green-500 outline-none transition-all"
                                                placeholder="Ex: Hey there! I am using WhatsApp."
                                            />
                                            <button 
                                                type="button"
                                                onClick={handleUpdateWhatsAppAbout}
                                                disabled={isUpdatingWaAbout}
                                                className="px-3 py-1.5 bg-gray-800 dark:bg-white text-white dark:text-gray-800 text-xs font-bold rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
                                            >
                                                {isUpdatingWaAbout ? '...' : 'Salvar'}
                                            </button>
                                        </div>
                                    </div>

                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                                        Esta imagem e frase são exibidas para seus clientes no WhatsApp.
                                    </p>

                                    <div className="flex flex-wrap items-center gap-2 mb-3">
                                        {whatsappProfile?.display_phone_number && (
                                            <div className="flex items-center gap-2 bg-white/50 dark:bg-black/20 w-fit px-2 py-1 rounded-md border border-gray-100 dark:border-gray-800">
                                                <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                                                    {whatsappProfile.display_phone_number.startsWith('+') ? whatsappProfile.display_phone_number : `+${whatsappProfile.display_phone_number}`}
                                                </span>
                                                <button 
                                                    type="button"
                                                    onClick={() => copyToClipboard(whatsappProfile.display_phone_number, "Número")}
                                                    className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                                                    title="Copiar Número"
                                                >
                                                    <FiCopy size={14} />
                                                </button>
                                            </div>
                                        )}

                                        {whatsappProfile?.quality_rating && getQualityRatingBadge(whatsappProfile.quality_rating)}

                                        {whatsappProfile?.messaging_limit_tier && (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-500/20">
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                Limite 24h: {tierMapping[whatsappProfile.messaging_limit_tier] || '250'} envios
                                            </span>
                                        )}
                                    </div>
                                    
                                    <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-all shadow-sm active:scale-95">
                                        <FiUpload size={14} />
                                        Alterar Foto no WhatsApp
                                        <input 
                                            type="file" 
                                            className="hidden" 
                                            accept="image/png, image/jpeg" 
                                            onChange={handleWhatsAppLogoUpload}
                                            disabled={isUpdatingWaLogo}
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Webhook Configuration Info */}
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
                                                // Permite apenas letras, números, underscores e hífens
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
                    </div>
                </div>
            )}
        </div>
    );
};

export default WhatsAppTab;
