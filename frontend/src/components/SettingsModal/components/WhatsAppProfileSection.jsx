import React from 'react';
import { FiImage, FiShield, FiAlertCircle, FiCopy, FiUpload, FiCreditCard } from 'react-icons/fi';

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

const WhatsAppProfileSection = ({
    formData,
    handleChange,
    whatsappProfile,
    whatsappName,
    setWhatsappName,
    handleUpdateWhatsAppName,
    isUpdatingWaName,
    whatsappAbout,
    setWhatsappAbout,
    handleUpdateWhatsAppAbout,
    isUpdatingWaAbout,
    handleRegisterWhatsAppNumber,
    isRegisteringWa,
    handleWhatsAppLogoUpload,
    isUpdatingWaLogo,
    copyToClipboard
}) => {
    return (
        <div className="space-y-2 md:col-span-2 mt-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Foto de Perfil do WhatsApp</label>
            
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 bg-green-50/50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-900/30">
                <div className="relative group w-20 h-20 bg-white dark:bg-[#1f2937]/80 rounded-full overflow-hidden border-2 border-green-500 shadow-lg shrink-0">
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
                
                <div className="flex-1 w-full space-y-3">
                    <div>
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

                    <div>
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

                    {/* Campo de Cartão de Crédito WABA (Últimos 4 Dígitos) */}
                    {formData && handleChange && (
                        <div className="pt-2 border-t border-gray-200/60 dark:border-white/5 space-y-1">
                            <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500 mb-1 flex items-center gap-1.5">
                                <FiCreditCard className="text-blue-500" size={13} />
                                Últimos 4 Dígitos do Cartão de Crédito (WABA)
                            </label>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="text" 
                                    name="WA_WABA_CARD_LAST4"
                                    value={formData.WA_WABA_CARD_LAST4 || ''}
                                    onChange={handleChange}
                                    maxLength={4}
                                    className="w-full sm:w-48 bg-white dark:bg-[#1f2937]/80 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-sm font-mono tracking-widest focus:ring-2 focus:ring-green-500 outline-none transition-all"
                                    placeholder="Digite ex: 4821"
                                />
                            </div>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500">
                                💡 Digite os 4 dígitos do seu cartão acima e clique em <b>"Salvar Configurações"</b> no canto inferior da modal. Se em branco, a informação será ignorada.
                            </p>
                        </div>
                    )}

                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Esta imagem e frase são exibidas para seus clientes no WhatsApp.
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
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
                    
                    <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-all shadow-sm active:scale-95 w-fit">
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
    );
};

export default WhatsAppProfileSection;
