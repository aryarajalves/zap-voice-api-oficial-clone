import React, { useState } from 'react';
import { FiHome, FiLayers, FiClock, FiSettings, FiLogOut, FiSlash, FiUsers, FiGitMerge, FiPlus, FiCalendar, FiGlobe, FiActivity, FiZap, FiDollarSign, FiDatabase, FiInstagram, FiHelpCircle, FiTerminal, FiMessageSquare } from 'react-icons/fi';
import ClientSelector from './ClientSelector';
import ConfirmModal from './ConfirmModal';
import { useClient } from '../contexts/ClientContext';
import { resolveUrl } from '../config';

const SIMULATE_MESSAGING = import.meta.env.VITE_SIMULATE_MESSAGING === 'true' || 
                           window._env_?.VITE_SIMULATE_MESSAGING === 'true' || 
                           window._env_?.SIMULATE_MESSAGING === 'true' || 
                           window._env_?.SIMULATE_MESSAGING === true;

export default function Sidebar({ activeView, onViewChange, onLogout, onSettings, user, clientName, onClientCreate, appBranding }) {
    const { activeClient } = useClient();
    const appName = appBranding?.name || 'ZapVoice';
    const appLogo = appBranding?.logo;
    const logoSize = appBranding?.logoSize || 'medium';

    // Map logo size to Tailwind classes
    const sizeClasses = {
        small: 'w-8 h-8 text-xl',
        medium: 'w-12 h-12 text-2xl',
        large: 'w-16 h-16 text-3xl',
        xlarge: 'w-20 h-20 text-4xl'
    };

    const currentSizeClass = sizeClasses[logoSize] || sizeClasses.medium;
    const [logoContainerClass, logoTextSize] = currentSizeClass.split(' ');

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        isDangerous: false,
        confirmText: 'Sair'
    });

    const categories = [
        { id: 'campanhas', label: 'Envios & Campanhas' },
        { id: 'vendas', label: 'Vendas' },
        { id: 'automacao', label: 'Automação' },
        { id: 'contatos', label: 'Contatos' },
        { id: 'admin', label: 'Administração' }
    ];

    const menuItems = [
        // Campanhas
        { id: 'bulk_sender', label: 'Disparo em Massa', icon: FiHome, roles: ['super_admin', 'admin', 'premium'], category: 'campanhas' },
        { id: 'recurring_schedules', label: 'Disparo Recorrente Criado', icon: FiClock, roles: ['super_admin', 'admin', 'premium'], category: 'campanhas' },
        { id: 'schedules', label: 'Agenda de Disparos', icon: FiCalendar, roles: ['super_admin', 'admin', 'premium', 'user'], category: 'campanhas' },
        { id: 'history', label: 'Histórico', icon: FiClock, roles: ['super_admin', 'admin', 'premium', 'user'], category: 'campanhas' },
        
        // Vendas
        { id: 'hot_leads', label: 'Leads Quentes', icon: FiZap, roles: ['super_admin', 'admin', 'premium', 'vendedor'], category: 'vendas' },

        // Automação
        { id: 'templates', label: 'Criar Template', icon: FiPlus, roles: ['super_admin', 'admin', 'premium'], category: 'automacao' },
        { id: 'funnels', label: 'Meus Funis', icon: FiLayers, roles: ['super_admin', 'admin', 'premium'], category: 'automacao' },
        { id: 'integrations', label: 'Integrações Webhook', icon: FiZap, roles: ['super_admin', 'admin', 'premium'], category: 'automacao' },
        { id: 'instagram_automation', label: 'Automação Instagram', icon: FiInstagram, roles: ['super_admin', 'admin', 'premium'], category: 'automacao' },

        // Contatos
        { id: 'chat_conversations', label: 'Atendimento', icon: FiMessageSquare, roles: ['super_admin', 'admin', 'premium', 'vendedor'], category: 'contatos' },
        { id: 'human_agents', label: 'Atendente humano', icon: FiUsers, roles: ['super_admin', 'admin', 'premium', 'vendedor'], category: 'contatos' },
        { id: 'leads', label: 'Contatos', icon: FiUsers, roles: ['super_admin', 'admin', 'premium'], category: 'contatos' },
        { id: 'appointments', label: 'Agendamentos', icon: FiCalendar, roles: ['super_admin', 'admin', 'premium'], category: 'contatos' },
        { id: 'import_history', label: 'Histórico importação de contatos', icon: FiClock, roles: ['super_admin', 'admin', 'premium'], category: 'contatos' },
        { id: 'blocked', label: 'Contatos Bloqueados', icon: FiSlash, roles: ['super_admin', 'admin', 'premium'], category: 'contatos' },


        // Administração
        { id: 'financial', label: 'Financeiro', icon: FiDollarSign, roles: ['super_admin', 'admin', 'premium', 'user'], category: 'admin' },
        { id: 'users', label: 'Gestão de Usuários', icon: FiUsers, roles: ['super_admin'], category: 'admin' },
        { id: 'monitoring', label: 'Monitoramento', icon: FiActivity, roles: ['super_admin'], category: 'admin' },
        {id: 'backup_db', label: 'Backup Banco', icon: FiDatabase, roles: ['super_admin'], category: 'admin'},
        {id: 'tutorial', label: 'Tutorial API Oficial', icon: FiHelpCircle, roles: ['super_admin'], category: 'admin'},
        {id: 'log_viewer', label: 'Visualizador de Logs', icon: FiTerminal, roles: ['super_admin'], category: 'admin'},
        ...(SIMULATE_MESSAGING ? [{ id: 'stress_test', label: 'Teste de Escala', icon: FiZap, roles: ['super_admin'], category: 'admin' }] : []),
    ];

    const handleLogoutClick = () => {
        setConfirmModal({
            isOpen: true,
            title: 'Sair do Sistema',
            message: 'Tem certeza que deseja sair? Sua sessão será encerrada.',
            confirmText: 'Sair',
            isDangerous: true,
            onConfirm: onLogout
        });
    };

    return (
        <aside className="w-64 bg-white dark:bg-[#1e293b] border-r border-gray-200 dark:border-white/5 flex flex-col h-screen sticky top-0 shadow-sm z-30 font-sans transition-colors duration-200">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-3">
                    {appLogo ? (
                        <div className={`${logoContainerClass} rounded-lg overflow-hidden shadow-md shrink-0`}>
                            <img src={resolveUrl(appLogo)} alt={appName} className="w-full h-full object-cover" />
                        </div>
                    ) : (
                        <div className={`${logoContainerClass} bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold ${logoTextSize} shadow-md shrink-0`}>
                            {appName[0]}
                        </div>
                    )}
                    <span className="font-bold text-xl text-gray-800 dark:text-white tracking-tight">{appName}</span>
                </div>
                {clientName && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed pl-1">
                        Api Oficial do WhatsApp do cliente <span className="font-semibold text-gray-700 dark:text-gray-300">{clientName} (ID: {activeClient?.id})</span>
                    </p>
                )}
            </div>

            <ClientSelector onCreateClick={onClientCreate} />

            <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
                {activeClient && categories.map((category) => {
                    // Mapeia os caminhos/ids do frontend para as strings de blocked_features do backend
                    const featureMapping = {
                        'bulk_sender': 'schedules',
                        'recurring_schedules': 'schedules',
                        'schedules': 'schedules',
                        'history': 'history',
                        'templates': 'whatsapp',
                        'funnels': 'funnels',
                        'integrations': 'settings',
                        'leads': 'leads',
                        'appointments': 'leads',
                        'import_history': 'leads',
                        'blocked': 'leads'
                    };


                    const categoryItems = menuItems.filter(item => {
                        if (item.category !== category.id) return false;
                        
                        // Se for Atendente Humano, só exibe se o WhatsApp tiver o agente de IA ativo nas configurações
                        if (item.id === 'human_agents') {
                            const isAiAgentEnabled = appBranding?.WA_HAS_AI_AGENT === true || appBranding?.WA_HAS_AI_AGENT === 'true';
                            if (!isAiAgentEnabled) return false;
                        }

                        // Se for Agendamentos, só exibe se os agendamentos estiverem ativos nas configurações
                        if (item.id === 'appointments') {
                            const isAppointmentsEnabled = appBranding?.APPOINTMENTS_ENABLED === true || appBranding?.APPOINTMENTS_ENABLED === 'true';
                            if (!isAppointmentsEnabled) return false;
                        }

                        // Se for a automação do Instagram e a env estiver desativada, oculta
                        if (item.id === 'instagram_automation') {
                            const isInstagramEnabled = window._env_?.ENABLE_INSTAGRAM !== 'false' && window._env_?.ENABLE_INSTAGRAM !== false;
                            if (!isInstagramEnabled) return false;
                        }

                        const meetsRole = item.roles.includes(user?.role);
                        if (!meetsRole) return false;
                        
                        // Verifica se o recurso está bloqueado nas restrições customizadas do usuário
                        const backendFeature = featureMapping[item.id];
                        if (backendFeature && user?.blocked_features?.includes(backendFeature)) {
                            return false;
                        }
                        
                        return true;
                    });

                    if (categoryItems.length === 0) return null;

                    return (
                        <div key={category.id} className="space-y-1.5">
                            {/* Cabeçalho da Categoria */}
                            <div className="px-3 pt-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest border-b border-gray-100/50 dark:border-white/5 pb-1 mb-2">
                                {category.label}
                            </div>

                            
                            <div className="space-y-1">
                                {categoryItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = activeView === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => onViewChange(item.id)}
                                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 font-medium text-sm ${isActive
                                                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shadow-sm'
                                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200'
                                                }`}
                                        >
                                            <Icon size={18} />
                                            {item.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-gray-100 dark:border-white/5 space-y-2 bg-gray-50/50 dark:bg-[#0b0e14]/50">
                {user && (
                    <div className="px-4 py-2 mb-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">
                            {user.role === 'super_admin' ? 'Super Admin' : user.role === 'admin' ? 'Administrador' : user.role === 'premium' ? 'Usuário Premium' : user.role === 'vendedor' ? 'Vendedor' : 'Usuário'}
                        </p>
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{user.full_name || user.email}</p>
                    </div>
                )}

                {activeClient && user?.role !== 'vendedor' && !user?.blocked_features?.includes('settings') && (
                    <button
                        onClick={onSettings}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700 hover:shadow-sm hover:text-gray-900 dark:hover:text-white transition-all font-medium text-sm border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
                    >
                        <FiSettings size={18} />
                        Configurações
                    </button>
                )}

                <button
                    onClick={handleLogoutClick}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium text-sm"
                >
                    <FiLogOut size={18} />
                    Sair
                </button>
                <div className="px-4 py-1 mt-1 border-t border-gray-100 dark:border-white/5 opacity-50">
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium tracking-widest uppercase text-center">
                        ZapVoice v3.9.0
                    </p>
                </div>
            </div>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText={confirmModal.confirmText}
                isDangerous={confirmModal.isDangerous}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
            />
        </aside>
    );
}
