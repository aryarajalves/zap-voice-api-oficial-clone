import React from 'react';
import { FiEyeOff, FiEye, FiCopy, FiZap, FiX, FiCalendar } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { resolveUrl, WEBHOOK_BASE_URL, META_APP_ID, META_CONFIG_ID, API_URL } from '../../../config';
import { handleMetaEmbeddedSignupHelper } from '../utils/whatsAppTabUtils';
import { useClient } from '../../../contexts/ClientContext';
import { fetchWithAuth } from '../../../AuthContext';

// Import dos componentes modularizados
import LabelSearchSelect from '../components/LabelSearchSelect';
import WhatsAppProfileSection from '../components/WhatsAppProfileSection';
import WebhookConfigSection from '../components/WebhookConfigSection';
import WhatsAppAutoReplySection from '../components/WhatsAppAutoReplySection';
import TemplatePreview from '../../BulkSender/common/TemplatePreview';
import WabaPaymentCard from '../components/WabaPaymentCard';

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

    // Estados e hooks para seleção de etiquetas na janela de 24h
    const [availableLabels, setAvailableLabels] = React.useState([]);
    const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');
    const dropdownRef = React.useRef(null);

    // Estado e useEffect para carregar templates oficiais
    const [templates, setTemplates] = React.useState([]);
    React.useEffect(() => {
        const fetchTemplates = async () => {
            if (!activeClient) return;
            try {
                const res = await fetchWithAuth(`${API_URL}/whatsapp/templates?include_paused=false`, {}, activeClient.id);
                if (res.ok) {
                    const data = await res.json();
                    setTemplates(data || []);
                }
            } catch (err) {
                console.error("Erro ao buscar templates em WhatsAppTab:", err);
            }
        };
        fetchTemplates();
    }, [activeClient]);

    React.useEffect(() => {
        const fetchAllLabels = async () => {
            if (!activeClient) return;
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${API_URL}/chat/labels/details`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'X-Client-ID': String(activeClient.id)
                    }
                });
                if (res.ok) {
                    const data = await res.json();
                    setAvailableLabels(data);
                }
            } catch (err) {
                console.error("Erro ao buscar etiquetas em WhatsAppTab:", err);
            }
        };
        fetchAllLabels();
    }, [activeClient]);

    // Sub-abas do WhatsApp
    const [waSubTab, setWaSubTab] = React.useState('api');

    // Funnels, appointment params and button actions states
    const [funnels, setFunnels] = React.useState([]);
    const [appointmentParams, setAppointmentParams] = React.useState({});
    const [buttonActions, setButtonActions] = React.useState({});

    React.useEffect(() => {
        const fetchFunnels = async () => {
            if (!activeClient) return;
            try {
                const res = await fetchWithAuth(`${API_URL}/funnels`, {}, activeClient.id);
                if (res.ok) {
                    const data = await res.json();
                    setFunnels(data || []);
                }
            } catch (err) {
                console.error("Erro ao buscar funis em WhatsAppTab:", err);
            }
        };
        fetchFunnels();
    }, [activeClient]);

    React.useEffect(() => {
        if (formData.APPOINTMENTS_REMINDER_PARAMS) {
            try {
                setAppointmentParams(JSON.parse(formData.APPOINTMENTS_REMINDER_PARAMS));
            } catch (e) {
                setAppointmentParams({});
            }
        } else {
            setAppointmentParams({});
        }
    }, [formData.APPOINTMENTS_REMINDER_TEMPLATE, formData.APPOINTMENTS_REMINDER_PARAMS]);

    React.useEffect(() => {
        if (formData.APPOINTMENTS_REMINDER_BUTTONS) {
            try {
                setButtonActions(JSON.parse(formData.APPOINTMENTS_REMINDER_BUTTONS));
            } catch (e) {
                setButtonActions({});
            }
        } else {
            setButtonActions({});
        }
    }, [formData.APPOINTMENTS_REMINDER_TEMPLATE, formData.APPOINTMENTS_REMINDER_BUTTONS]);

    React.useEffect(() => {
        if (!formData.APPOINTMENTS_REMINDER_TEMPLATE || templates.length === 0) return;
        const selectedTemplateObj = templates.find(t => t.name === formData.APPOINTMENTS_REMINDER_TEMPLATE);
        if (!selectedTemplateObj) return;

        const headerComp = selectedTemplateObj.components?.find(c => c.type === 'HEADER');
        const bodyComp = selectedTemplateObj.components?.find(c => c.type === 'BODY');

        const getVariables = (text) => {
            if (!text) return [];
            const matches = [...text.matchAll(/\{\{(\d+)\}\}/g)];
            return matches.map(m => m[1]);
        };

        const headerTextVars = headerComp && headerComp.text ? getVariables(headerComp.text) : [];
        const bodyTextVars = bodyComp && bodyComp.text ? getVariables(bodyComp.text) : [];

        let currentParams = {};
        if (formData.APPOINTMENTS_REMINDER_PARAMS) {
            try {
                currentParams = JSON.parse(formData.APPOINTMENTS_REMINDER_PARAMS);
            } catch (e) {
                currentParams = {};
            }
        }

        let changed = false;
        headerTextVars.forEach(vNum => {
            const key = `HEADER_${vNum}`;
            if (currentParams[key] === undefined) {
                currentParams[key] = '{name}';
                changed = true;
            }
        });

        bodyTextVars.forEach(vNum => {
            const key = `BODY_${vNum}`;
            if (currentParams[key] === undefined) {
                currentParams[key] = '{name}';
                changed = true;
            }
        });

        if (changed) {
            handleChange({ target: { name: 'APPOINTMENTS_REMINDER_PARAMS', value: JSON.stringify(currentParams) } });
        }
    }, [formData.APPOINTMENTS_REMINDER_TEMPLATE, templates, formData.APPOINTMENTS_REMINDER_PARAMS]);

    const handleParamChange = (key, value) => {
        const updated = { ...appointmentParams, [key]: value };
        setAppointmentParams(updated);
        handleChange({ target: { name: 'APPOINTMENTS_REMINDER_PARAMS', value: JSON.stringify(updated) } });
    };

    const handleButtonActionChange = (btnText, newAction) => {
        const updated = { ...buttonActions, [btnText]: newAction };
        setButtonActions(updated);
        handleChange({ target: { name: 'APPOINTMENTS_REMINDER_BUTTONS', value: JSON.stringify(updated) } });
    };

    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAddLabel = (labelName) => {
        const current = formData.WA_WINDOW_CLOSED_REMOVE_LABELS
            ? formData.WA_WINDOW_CLOSED_REMOVE_LABELS.split(',').map(s => s.trim()).filter(Boolean)
            : [];
        if (!current.includes(labelName)) {
            const newLabels = [...current, labelName].join(',');
            handleChange({ target: { name: 'WA_WINDOW_CLOSED_REMOVE_LABELS', value: newLabels } });
        }
        setSearchQuery('');
    };

    const handleRemoveLabel = (labelName) => {
        const current = formData.WA_WINDOW_CLOSED_REMOVE_LABELS
            ? formData.WA_WINDOW_CLOSED_REMOVE_LABELS.split(',').map(s => s.trim()).filter(Boolean)
            : [];
        const newLabels = current.filter(l => l !== labelName).join(',');
        handleChange({ target: { name: 'WA_WINDOW_CLOSED_REMOVE_LABELS', value: newLabels } });
    };

    const selectedLabels = formData.WA_WINDOW_CLOSED_REMOVE_LABELS
        ? formData.WA_WINDOW_CLOSED_REMOVE_LABELS.split(',').map(s => s.trim()).filter(Boolean)
        : [];

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
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Sub-abas horizontais */}
            <div className="flex flex-wrap gap-2 p-1.5 bg-gray-100/50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 mb-4">
                {[
                    { id: 'api', label: 'Conexão & Webhook' },
                    { id: 'profile', label: 'Perfil Comercial' },
                    { id: 'automation', label: 'Automação & IA' },
                    { id: 'reminders', label: 'Lembretes de Agenda' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setWaSubTab(tab.id)}
                        className={`flex-1 min-w-[120px] py-2 px-3 text-xs font-bold rounded-xl transition-all duration-200 ${
                            waSubTab === tab.id
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* WhatsApp Section */}
            {['super_admin', 'admin', 'administrator', 'owner'].includes(user?.role) && (
                <div className="space-y-4">
                    {/* CONEXÃO & API TAB */}
                    {waSubTab === 'api' && (
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

                            {/* Webhook Configuration Info (Componente Extraído) */}
                            <WebhookConfigSection
                                formData={formData}
                                handleChange={handleChange}
                                isUniqueWebhook={isUniqueWebhook}
                                metaWebhookUrl={metaWebhookUrl}
                                copyToClipboard={copyToClipboard}
                            />
                        </div>
                    )}

                    {/* PROFILE TAB */}
                    {waSubTab === 'profile' && (
                        <div className="space-y-4 animate-in fade-in duration-200">
                            {/* WhatsApp Profile Section (Componente Extraído) */}
                            <WhatsAppProfileSection
                                formData={formData}
                                handleChange={handleChange}
                                whatsappProfile={whatsappProfile}
                                whatsappName={whatsappName}
                                setWhatsappName={setWhatsappName}
                                handleUpdateWhatsAppName={handleUpdateWhatsAppName}
                                isUpdatingWaName={isUpdatingWaName}
                                whatsappAbout={whatsappAbout}
                                setWhatsappAbout={setWhatsappAbout}
                                handleUpdateWhatsAppAbout={handleUpdateWhatsAppAbout}
                                isUpdatingWaAbout={isUpdatingWaAbout}
                                handleRegisterWhatsAppNumber={handleRegisterWhatsAppNumber}
                                isRegisteringWa={isRegisteringWa}
                                handleWhatsAppLogoUpload={handleWhatsAppLogoUpload}
                                isUpdatingWaLogo={isUpdatingWaLogo}
                                copyToClipboard={copyToClipboard}
                            />
                        </div>
                    )}

                    {/* AUTOMATION & IA TAB */}
                    {waSubTab === 'automation' && (
                        <div className="space-y-6 animate-in fade-in duration-200">
                            {/* Janela de 24 Horas */}
                            <div className="space-y-4 p-5 bg-purple-50/30 dark:bg-purple-900/10 rounded-2xl border border-purple-100 dark:border-purple-900/30 shadow-sm">
                                <div className="flex items-center gap-2">
                                    <FiX className="text-purple-500 w-5 h-5" />
                                    <h4 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide">Janela de 24 Horas</h4>
                                </div>
                                
                                <div className="grid grid-cols-1 gap-5 mt-3">
                                    <div className="space-y-1.5 relative" ref={dropdownRef}>
                                        <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500 ml-1">
                                            Selecione as etiquetas a serem removidas quando a janela fechar
                                        </label>
                                        
                                        <div 
                                            className="w-full bg-white dark:bg-[#1f2937]/50 border border-gray-300 dark:border-white/10 rounded-xl p-2.5 flex flex-wrap gap-2 cursor-text focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-purple-500 transition-all min-h-[42px]"
                                            onClick={() => setIsDropdownOpen(true)}
                                        >
                                            {selectedLabels.map(lbl => {
                                                const match = availableLabels.find(al => al.name.toLowerCase() === lbl.toLowerCase());
                                                const bgColor = match?.color || '#8B5CF6';
                                                return (
                                                    <span 
                                                        key={lbl}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-white shadow-sm"
                                                        style={{ backgroundColor: bgColor }}
                                                    >
                                                        {lbl}
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRemoveLabel(lbl);
                                                            }}
                                                            className="hover:bg-black/20 rounded p-0.5 transition-colors"
                                                        >
                                                            <FiX size={10} />
                                                        </button>
                                                    </span>
                                                );
                                            })}
                                            
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => {
                                                    setSearchQuery(e.target.value);
                                                    setIsDropdownOpen(true);
                                                }}
                                                onFocus={() => setIsDropdownOpen(true)}
                                                placeholder={selectedLabels.length === 0 ? "Clique para escolher marcadores..." : ""}
                                                className="flex-1 min-w-[120px] bg-transparent text-xs text-gray-700 dark:text-gray-200 outline-none border-none p-0 focus:ring-0"
                                            />
                                        </div>
                                        
                                        {isDropdownOpen && (
                                            <div className="absolute z-30 w-full mt-1.5 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl max-h-48 overflow-y-auto overflow-x-hidden custom-scrollbar py-1">
                                                {availableLabels
                                                    .filter(lbl => 
                                                        !selectedLabels.map(s => s.toLowerCase()).includes(lbl.name.toLowerCase()) &&
                                                        lbl.name.toLowerCase().includes(searchQuery.toLowerCase())
                                                    )
                                                    .map(lbl => (
                                                        <button
                                                            key={lbl.id || lbl.name}
                                                            type="button"
                                                            onClick={() => handleAddLabel(lbl.name)}
                                                            className="w-full text-left px-3.5 py-2 text-xs hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2.5 text-gray-700 dark:text-gray-300 font-medium transition-colors"
                                                        >
                                                            <span 
                                                                className="w-2.5 h-2.5 rounded-full shrink-0" 
                                                                style={{ backgroundColor: lbl.color || '#8B5CF6' }}
                                                            />
                                                            <span className="truncate flex-1">{lbl.name}</span>
                                                        </button>
                                                    ))
                                                }
                                                
                                                {availableLabels.filter(lbl => 
                                                    !selectedLabels.map(s => s.toLowerCase()).includes(lbl.name.toLowerCase()) &&
                                                    lbl.name.toLowerCase().includes(searchQuery.toLowerCase())
                                                ).length === 0 && (
                                                    <div className="px-3.5 py-2 text-xs text-gray-400 dark:text-gray-500 italic text-center">
                                                        Nenhum marcador disponível para selecionar.
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        
                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 ml-1">
                                            Essas etiquetas serão automaticamente removidas da conversa no chat interno do ZapVoice quando a janela de 24 horas expirar.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Bloco de Configuração do Agente de IA / Atendimento Humano */}
                            <div className="bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-2xl p-5 md:p-6 space-y-5 transition-colors duration-200">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500">
                                        <FiZap size={20} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-800 dark:text-white">Automação de Agente de IA (Atendimento Humano)</h4>
                                        <p className="text-xs text-gray-400 dark:text-gray-500">Defina se este WhatsApp possui um robô de IA e as etiquetas para transição de atendimento.</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                            Ativar agente de IA conversando neste WhatsApp
                                        </span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                name="WA_HAS_AI_AGENT"
                                                checked={formData.WA_HAS_AI_AGENT === true || formData.WA_HAS_AI_AGENT === 'true'}
                                                onChange={(e) => {
                                                    handleChange({ target: { name: 'WA_HAS_AI_AGENT', value: e.target.checked } });
                                                }}
                                                className="sr-only peer"
                                            />
                                            <div className="w-9 h-5 bg-gray-200 dark:bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>

                                    {(formData.WA_HAS_AI_AGENT === true || formData.WA_HAS_AI_AGENT === 'true') && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                            <LabelSearchSelect
                                                label="Etiqueta Humano"
                                                name="WA_HUMAN_LABEL"
                                                value={formData.WA_HUMAN_LABEL}
                                                availableLabels={availableLabels}
                                                onChange={handleChange}
                                            />

                                            <LabelSearchSelect
                                                label="Etiqueta Robo"
                                                name="WA_ROBO_LABEL"
                                                value={formData.WA_ROBO_LABEL}
                                                availableLabels={availableLabels}
                                                onChange={handleChange}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Bloco de Configuração de Resposta Automática (Auto-Reply) (NOVO Componente Extraído) */}
                            <WhatsAppAutoReplySection
                                formData={formData}
                                handleChange={handleChange}
                            />
                        </div>
                    )}

                    {/* REMINDERS TAB */}
                    {waSubTab === 'reminders' && (
                        <div className="space-y-4 animate-in fade-in duration-200">
                            {/* Bloco de Configuração de Agendamentos de Evento (NOVO) */}
                            <div className="bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-2xl p-5 md:p-6 space-y-5 transition-colors duration-200">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500">
                                        <FiCalendar size={20} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-800 dark:text-white">Lembretes de Agendamento</h4>
                                        <p className="text-xs text-gray-400 dark:text-gray-500">Envie um lembrete (template oficial) de forma automática X minutos antes do horário agendado de um contato.</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                            Ativar agendamentos de lembrete
                                        </span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                name="APPOINTMENTS_ENABLED"
                                                checked={formData.APPOINTMENTS_ENABLED === true || formData.APPOINTMENTS_ENABLED === 'true'}
                                                onChange={(e) => {
                                                    handleChange({ target: { name: 'APPOINTMENTS_ENABLED', value: e.target.checked } });
                                                }}
                                                className="sr-only peer"
                                            />
                                            <div className="w-9 h-5 bg-gray-200 dark:bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>

                                    {(formData.APPOINTMENTS_ENABLED === true || formData.APPOINTMENTS_ENABLED === 'true') && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Template a ser disparado</label>
                                                <select
                                                    name="APPOINTMENTS_REMINDER_TEMPLATE"
                                                    value={formData.APPOINTMENTS_REMINDER_TEMPLATE || ''}
                                                    onChange={handleChange}
                                                    className="w-full p-2.5 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white text-xs font-medium"
                                                >
                                                    <option value="" className="bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white">Selecione um template...</option>
                                                    {templates.map(t => (
                                                        <option key={t.name} value={t.name} className="bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white">{t.name} ({t.language})</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Minutos antes do disparo</label>
                                                <select
                                                    name="APPOINTMENTS_REMINDER_MINUTES"
                                                    value={formData.APPOINTMENTS_REMINDER_MINUTES || '30'}
                                                    onChange={handleChange}
                                                    className="w-full p-2.5 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white text-xs font-medium"
                                                >
                                                    <option value="5" className="bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white">5 minutos antes</option>
                                                    <option value="10" className="bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white">10 minutos antes</option>
                                                    <option value="15" className="bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white">15 minutos antes</option>
                                                    <option value="30" className="bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white">30 minutos antes</option>
                                                    <option value="45" className="bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white">45 minutos antes</option>
                                                    <option value="60" className="bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white">1 hora antes (60 min)</option>
                                                    <option value="120" className="bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white">2 horas antes (120 min)</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    {(() => {
                                        if (!(formData.APPOINTMENTS_ENABLED === true || formData.APPOINTMENTS_ENABLED === 'true')) return null;
                                        const selectedTemplateObj = templates.find(t => t.name === formData.APPOINTMENTS_REMINDER_TEMPLATE);
                                        if (!selectedTemplateObj) return null;

                                        const headerComp = selectedTemplateObj.components?.find(c => c.type === 'HEADER');
                                        const isMediaHeader = headerComp && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerComp.format);

                                        const bodyComp = selectedTemplateObj.components?.find(c => c.type === 'BODY');

                                        const getVariables = (text) => {
                                            if (!text) return [];
                                            const matches = [...text.matchAll(/\{\{(\d+)\}\}/g)];
                                            return matches.map(m => m[1]);
                                        };

                                        const headerTextVars = headerComp && headerComp.text ? getVariables(headerComp.text) : [];
                                        const bodyTextVars = bodyComp && bodyComp.text ? getVariables(bodyComp.text) : [];

                                        const buttonsComp = selectedTemplateObj.components?.find(c => c.type === 'BUTTONS');
                                        const quickReplyButtons = buttonsComp && Array.isArray(buttonsComp.buttons)
                                            ? buttonsComp.buttons.filter(b => b.type === 'QUICK_REPLY').map(b => b.text)
                                            : [];

                                        const VAR_OPTIONS = [
                                            { value: '{name}', label: 'Nome do Contato' },
                                            { value: '{event_datetime}', label: 'Data/Hora do Evento' },
                                            { value: '{google_calendar_link}', label: 'Link da Agenda' },
                                            { value: 'custom', label: 'Texto Customizado / Livre' },
                                        ];

                                        return (
                                            <div className="flex flex-col gap-6 pt-4 border-t border-gray-100 dark:border-white/5 mt-4">
                                                {/* Painel de Configurações do Template */}
                                                <div className="w-full space-y-4">
                                                    {/* Media Uploader if template requires header media */}
                                                    {isMediaHeader && (
                                                        <div className="space-y-1.5">
                                                            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Upload de Mídia do Cabeçalho</label>
                                                            <MediaHeaderUploader
                                                                format={headerComp.format}
                                                                templateParams={appointmentParams}
                                                                handleParamChange={(key, val) => handleParamChange(key, val)}
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Variable Mappings */}
                                                    {(headerTextVars.length > 0 || bodyTextVars.length > 0) && (
                                                        <div className="space-y-4">
                                                            <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300">Variáveis do Template</h4>
                                                            
                                                            {headerTextVars.map(vNum => {
                                                                const paramKey = `HEADER_${vNum}`;
                                                                const paramVal = appointmentParams[paramKey] || '';
                                                                const isCustom = !['{name}', '{event_datetime}', '{google_calendar_link}'].includes(paramVal) && paramVal !== '';
                                                                const selectVal = isCustom ? 'custom' : (paramVal || '{name}');
                                                                
                                                                return (
                                                                    <div key={paramKey} className="space-y-1.5 p-3 rounded-2xl bg-white/5 border border-white/5">
                                                                        <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Variável do Cabeçalho {'{{' + vNum + '}}'}</label>
                                                                        <div className="flex gap-2">
                                                                            <select
                                                                                value={selectVal}
                                                                                onChange={(e) => {
                                                                                    const val = e.target.value;
                                                                                    if (val === 'custom') {
                                                                                        handleParamChange(paramKey, '');
                                                                                    } else {
                                                                                        handleParamChange(paramKey, val);
                                                                                    }
                                                                                }}
                                                                                className="p-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none flex-1"
                                                                            >
                                                                                {VAR_OPTIONS.map(opt => (
                                                                                    <option key={opt.value} value={opt.value} className="bg-[#1e293b] text-white">{opt.label}</option>
                                                                                ))}
                                                                            </select>
                                                                            {(selectVal === 'custom' || isCustom) && (
                                                                                <input
                                                                                    type="text"
                                                                                    placeholder="Digite o valor..."
                                                                                    value={paramVal}
                                                                                    onChange={(e) => handleParamChange(paramKey, e.target.value)}
                                                                                    className="p-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none flex-1"
                                                                                />
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}

                                                            {bodyTextVars.map(vNum => {
                                                                const paramKey = `BODY_${vNum}`;
                                                                const paramVal = appointmentParams[paramKey] || '';
                                                                const isCustom = !['{name}', '{event_datetime}', '{google_calendar_link}'].includes(paramVal) && paramVal !== '';
                                                                const selectVal = isCustom ? 'custom' : (paramVal || '{name}');
                                                                
                                                                return (
                                                                    <div key={paramKey} className="space-y-1.5 p-3 rounded-2xl bg-white/5 border border-white/5">
                                                                        <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Variável do Corpo {'{{' + vNum + '}}'}</label>
                                                                        <div className="flex gap-2">
                                                                            <select
                                                                                value={selectVal}
                                                                                onChange={(e) => {
                                                                                    const val = e.target.value;
                                                                                    if (val === 'custom') {
                                                                                        handleParamChange(paramKey, '');
                                                                                    } else {
                                                                                        handleParamChange(paramKey, val);
                                                                                    }
                                                                                }}
                                                                                className="p-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none flex-1"
                                                                            >
                                                                                {VAR_OPTIONS.map(opt => (
                                                                                    <option key={opt.value} value={opt.value} className="bg-[#1e293b] text-white">{opt.label}</option>
                                                                                ))}
                                                                            </select>
                                                                            {(selectVal === 'custom' || isCustom) && (
                                                                                <input
                                                                                    type="text"
                                                                                    placeholder="Digite o valor..."
                                                                                    value={paramVal}
                                                                                    onChange={(e) => handleParamChange(paramKey, e.target.value)}
                                                                                    className="p-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none flex-1"
                                                                                />
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}

                                                    {/* Button Actions */}
                                                    {quickReplyButtons.length > 0 && (
                                                        <div className="space-y-4">
                                                            <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300">Ações dos Botões (Quick Replies)</h4>
                                                            
                                                            {quickReplyButtons.map(btnText => {
                                                                const action = buttonActions[btnText] || { type: 'none', funnel_id: null };
                                                                
                                                                return (
                                                                    <div key={btnText} className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-3">
                                                                        <div className="flex justify-between items-center">
                                                                            <span className="px-2.5 py-1 bg-white/10 rounded-xl text-xs font-bold text-white max-w-[180px] truncate">{btnText}</span>
                                                                            <span className="text-[10px] text-gray-400 font-semibold uppercase">Botão Rápido</span>
                                                                        </div>
                                                                        
                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                            <div className="space-y-1">
                                                                                <label className="text-[10px] uppercase font-bold text-gray-400">Tipo de Ação</label>
                                                                                <select
                                                                                    value={action.type}
                                                                                    onChange={(e) => handleButtonActionChange(btnText, { ...action, type: e.target.value, funnel_id: e.target.value === 'none' ? null : action.funnel_id })}
                                                                                    className="w-full p-2 border border-gray-300 dark:border-white/10 rounded-xl bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                                                                >
                                                                                    <option value="none" className="bg-[#1e293b] text-white">Nenhuma</option>
                                                                                    <option value="interaction" className="bg-[#1e293b] text-white">Interação (Dispara Funil)</option>
                                                                                    <option value="block" className="bg-[#1e293b] text-white">Bloqueio</option>
                                                                                </select>
                                                                            </div>
                                                                            
                                                                            {action.type !== 'none' && (
                                                                                <div className="space-y-1">
                                                                                    <label className="text-[10px] uppercase font-bold text-gray-400">Selecionar Funil</label>
                                                                                    <select
                                                                                        value={action.funnel_id || ''}
                                                                                        onChange={(e) => handleButtonActionChange(btnText, { ...action, funnel_id: e.target.value ? parseInt(e.target.value) : null })}
                                                                                        className="w-full p-2 border border-gray-300 dark:border-white/10 rounded-xl bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                                                                    >
                                                                                        <option value="" className="bg-[#1e293b] text-white">— Nenhum funil —</option>
                                                                                        {funnels.map(f => (
                                                                                            <option key={f.id} value={f.id} className="bg-[#1e293b] text-white">{f.is_pinned ? '📌 ' : ''}{f.name}</option>
                                                                                        ))}
                                                                                    </select>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Coluna da direita: Live Preview do WhatsApp Bubble */}
                                                <div className="w-full space-y-2 border-t border-gray-100 dark:border-white/5 pt-6">
                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Visualização em Tempo Real</label>
                                                    {(() => {
                                                        const mappedParams = {};
                                                        Object.entries(appointmentParams).forEach(([k, v]) => {
                                                            const match = k.match(/^(HEADER|BODY)_(\d+)$/);
                                                            if (match) {
                                                                const type = match[1];
                                                                const index = parseInt(match[2]);
                                                                if (index > 0) {
                                                                    mappedParams[`${type}_${index - 1}`] = v;
                                                                } else {
                                                                    mappedParams[k] = v;
                                                                }
                                                            } else {
                                                                mappedParams[k] = v;
                                                            }
                                                        });
                                                        return (
                                                            <div className="w-full">
                                                                <TemplatePreview 
                                                                    template={selectedTemplateObj} 
                                                                    params={mappedParams}
                                                                />
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default WhatsAppTab;
