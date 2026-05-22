import React, { useState, useEffect } from 'react';
import { API_URL, resolveUrl } from '../../config';
import { toast } from 'react-hot-toast';
import { FiEye, FiEyeOff, FiUser, FiMail, FiLock, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';

const InviteRegister = ({ token }) => {
    const [invitation, setInvitation] = useState(null);
    const [loadingInvite, setLoadingInvite] = useState(true);
    const [inviteError, setInviteError] = useState('');
    const [branding, setBranding] = useState({ name: 'ZapVoice Funnels', logo: null });

    // Campos do formulário
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        // Buscar Branding
        const fetchBranding = async () => {
            try {
                const res = await fetch(`${API_URL}/settings/branding`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.APP_NAME) {
                        setBranding({
                            name: data.APP_NAME,
                            logo: data.APP_LOGO || null
                        });
                    }
                }
            } catch (err) {
                console.error("Erro ao buscar branding:", err);
            }
        };

        // Verificar token de convite
        const verifyInvitation = async () => {
            try {
                const res = await fetch(`${API_URL}/auth/invitations/${token}`);
                if (res.ok) {
                    const data = await res.json();
                    setInvitation(data);
                } else {
                    const errData = await res.json();
                    setInviteError(errData.detail || "Este convite é inválido ou expirou.");
                }
            } catch (err) {
                setInviteError("Erro de conexão ao verificar o convite.");
            } finally {
                setLoadingInvite(false);
            }
        };

        fetchBranding();
        verifyInvitation();
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const loadingToast = toast.loading("Criando sua conta...");

        try {
            const res = await fetch(`${API_URL}/auth/invitations/${token}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    full_name: fullName,
                    email: email,
                    password: password
                })
            });

            if (res.ok) {
                toast.success("Conta criada com sucesso! Faça login para continuar.");
                // Redireciona para o login na raiz
                setTimeout(() => {
                    window.location.href = '/';
                }, 1500);
            } else {
                const errData = await res.json();
                throw new Error(errData.detail || "Erro ao realizar cadastro.");
            }
        } catch (err) {
            toast.error(err.message);
            setIsSubmitting(false);
        } finally {
            toast.dismiss(loadingToast);
        }
    };

    const translateRole = (role) => {
        switch (role) {
            case 'super_admin': return 'Super Administrador';
            case 'admin': return 'Administrador';
            case 'premium': return 'Usuário Premium';
            default: return 'Usuário';
        }
    };

    const renderAppName = () => {
        const name = branding.name || 'ZapVoice Funnels';
        const parts = name.split(' ');
        if (parts.length === 1) return name;
        const last = parts.pop();
        return (
            <>
                {parts.join(' ')} <span className="text-blue-500">{last}</span>
            </>
        );
    };

    if (loadingInvite) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4">
                <div className="text-center space-y-4">
                    <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-gray-400 text-sm">Verificando convite...</p>
                </div>
            </div>
        );
    }

    if (inviteError) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
                <div className="bg-[#1e293b] rounded-2xl shadow-2xl w-full max-w-md p-8 border border-gray-700 text-center space-y-6">
                    <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center text-red-500 mx-auto">
                        <FiAlertTriangle size={32} />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-white">Convite Inválido</h2>
                        <p className="text-gray-400 text-sm">{inviteError}</p>
                    </div>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition duration-200"
                    >
                        Voltar para o Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
            <div className="bg-[#1e293b] rounded-2xl shadow-2xl w-full max-w-md p-8 border border-gray-700">
                {/* Branding/Header */}
                <div className="text-center mb-8">
                    <div className="flex flex-col items-center gap-4 mb-4">
                        {branding.logo ? (
                            <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-lg border border-gray-700">
                                <img src={resolveUrl(branding.logo)} alt={branding.name} className="w-full h-full object-cover" />
                            </div>
                        ) : (
                            <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg border-t border-blue-400">
                                <span className="text-white text-5xl font-bold font-sans">
                                    {(branding.name || 'Z')[0].toUpperCase()}
                                </span>
                            </div>
                        )}
                        <h1 className="text-3xl font-bold text-white">
                            {renderAppName()}
                        </h1>
                    </div>
                    <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg px-4 py-2 inline-block">
                        <p className="text-xs text-blue-400 font-semibold tracking-wider uppercase">
                            Você foi convidado como {translateRole(invitation?.role)}
                        </p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
                    {/* Hidden inputs to trick browsers autofill */}
                    <input type="text" name="prevent_autofill_username" style={{ display: 'none' }} />
                    <input type="password" name="prevent_autofill_password" style={{ display: 'none' }} />

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">
                            Nome Completo
                        </label>
                        <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
                                <FiUser size={18} />
                            </span>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required
                                autoComplete="off"
                                className="w-full pl-10 pr-4 py-3 bg-[#0f172a] border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition placeholder-gray-500"
                                placeholder="Seu nome completo"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">
                            Endereço de E-mail
                        </label>
                        <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
                                <FiMail size={18} />
                            </span>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="off"
                                className="w-full pl-10 pr-4 py-3 bg-[#0f172a] border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition placeholder-gray-500"
                                placeholder="exemplo@email.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">
                            Senha de Acesso
                        </label>
                        <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
                                <FiLock size={18} />
                            </span>
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="new-password"
                                className="w-full pl-10 pr-12 py-3 bg-[#0f172a] border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition placeholder-gray-500"
                                placeholder="Sua senha de acesso"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 focus:outline-none"
                                title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                            >
                                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 shadow-lg shadow-blue-500/20"
                    >
                        {isSubmitting ? "Criando conta..." : "Registrar e Ativar Conta"}
                    </button>
                </form>

                {/* Footer */}
                <div className="mt-8 pt-6 border-t border-gray-700 text-center text-xs text-gray-500">
                    <p>{branding.name} © {new Date().getFullYear()}</p>
                </div>
            </div>
        </div>
    );
};

export default InviteRegister;
