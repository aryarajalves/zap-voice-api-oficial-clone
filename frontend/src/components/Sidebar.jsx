import React, { useState } from 'react';
import { FiHome, FiLayers, FiClock, FiSettings, FiLogOut, FiSlash, FiUsers, FiGitMerge, FiPlus, FiCalendar, FiGlobe } from 'react-icons/fi'; // Add FiGlobe
import ClientSelector from './ClientSelector';
import ConfirmModal from './ConfirmModal';
import { useClient } from '../contexts/ClientContext';

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

    const menuItems = [
        { id: 'templates', label: 'Criar Template', icon: FiPlus, roles: ['super_admin', 'admin', 'premium'] },
        { id: 'bulk_sender', label: 'Disparo em Massa', icon: FiHome, roles: ['super_admin', 'admin', 'premium'] },
        { id: 'funnels', label: 'Meus Funis', icon: FiLayers, roles: ['super_admin', 'admin', 'premium'] },
        { id: 'incoming_webhooks', label: 'Integrações (Webhooks)', icon: FiGlobe, roles: ['super_admin', 'admin', 'premium'] },
        { id: 'schedules', label: 'Agenda de Disparos', icon: FiCalendar, roles: ['super_admin', 'admin', 'premium', 'user'] },
        { id: 'history', label: 'Histórico', icon: FiClock, roles: ['super_admin', 'admin', 'premium', 'user'] },
        { id: 'blocked', label: 'Contatos Bloqueados', icon: FiSlash, roles: ['super_admin', 'admin', 'premium'] },
        { id: 'users', label: 'Gestão de Usuários', icon: FiUsers, roles: ['super_admin'] },
        { id: 'monitoring', label: 'Monitoramento', icon: FiActivity, roles: ['super_admin'] },
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
        <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-screen sticky top-0 shadow-sm z-30 font-sans transition-colors duration-200">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-3">
                    {appLogo ? (
                        <div className={`${logoContainerClass} rounded-lg overflow-hidden shadow-md shrink-0`}>
                            <img src={appLogo} alt={appName} className="w-full h-full object-cover" />
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
                        Api Oficial do WhatsApp do cliente <span className="font-semibold text-gray-700 dark:text-gray-300">{clientName}</span>
                    </p>
                )}
            </div>

            <ClientSelector onCreateClick={onClientCreate} />

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {activeClient && menuItems.filter(item => item.roles.includes(user?.role)).map((item) => {
                    const Icon = item.icon;
                    const isActive = activeView === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onViewChange(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium text-sm ${isActive
                                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                        >
                            <Icon size={20} />
                            {item.label}
                        </button>
                    )
                })}
            </nav>

            <div className="p-4 border-t border-gray-100 dark:border-gray-700 space-y-2 bg-gray-50/50 dark:bg-gray-800/50">
                {user && (
                    <div className="px-4 py-2 mb-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">
                            {user.role === 'super_admin' ? 'Super Admin' : user.role === 'admin' ? 'Administrador' : user.role === 'premium' ? 'Usuário Premium' : 'Usuário'}
                        </p>
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{user.full_name || user.email}</p>
                    </div>
                )}

                {activeClient && (
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
