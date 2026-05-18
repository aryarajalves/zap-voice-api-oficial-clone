import React from 'react';
import { FiEyeOff, FiEye, FiCopy, FiImage, FiUpload, FiShield, FiAlertCircle, FiZap } from 'react-icons/fi';
import { resolveUrl } from '../../../config';

const tierMapping = {
    'TIER_250': '250',
    'TIER_1K': '1.000',
    'TIER_10K': '10.000',
    'TIER_100K': '100.000',
    'TIER_UNLIMITED': 'Ilimitado'
};

const WhatsAppTab = ({
    user, formData, handleChange, visibleFields, handleRevealSetting, copyToClipboard,
    whatsappProfile, whatsappAbout, setWhatsappAbout, handleUpdateWhatsAppAbout, isUpdatingWaAbout,
    whatsappName, setWhatsappName, handleUpdateWhatsAppName, isUpdatingWaName,
    handleRegisterWhatsAppNumber, isRegisteringWa, handleWhatsAppLogoUpload, isUpdatingWaLogo
}) => {
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
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Token gerado no painel de desenvolvedor da Meta.</p>
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

                                    {whatsappProfile?.display_phone_number && (
                                        <div className="flex items-center gap-2 mb-3 bg-white/50 dark:bg-black/20 w-fit px-2 py-1 rounded-md border border-gray-100 dark:border-gray-800">
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
                            <div className="flex items-center gap-2">
                                <FiZap className="text-blue-500 w-5 h-5" />
                                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide">Configuração de Webhook (Meta)</h4>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-3">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500 ml-1">URL do Webhook</label>
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            readOnly 
                                            value={resolveUrl('/api/meta').replace('http://', 'https://')}
                                            className="flex-1 bg-white/70 dark:bg-black/40 border border-gray-100 dark:border-white/5 rounded-xl px-3 py-2.5 text-xs font-mono text-gray-600 dark:text-gray-400 focus:outline-none"
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => copyToClipboard(resolveUrl('/api/meta').replace('http://', 'https://'), "URL do Webhook")}
                                            className="p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all shadow-sm active:scale-95"
                                            title="Copiar URL"
                                        >
                                            <FiCopy size={18} />
                                        </button>
                                    </div>
                                </div>
                                
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
