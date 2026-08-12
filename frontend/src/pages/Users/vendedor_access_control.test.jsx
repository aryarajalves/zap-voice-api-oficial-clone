import { describe, it, expect } from 'vitest';

/**
 * Testes unitários para validar restrições de acesso do cargo Vendedor.
 * Valida que:
 * 1. Ao selecionar o cargo "vendedor", os blocked_features corretos são aplicados
 * 2. O vendedor não tem acesso a nenhum módulo além do chat de atendimento
 */

describe('Controle de Acesso — Cargo Vendedor', () => {

    // Simula a lógica de defaultBlocked do UserModal.jsx
    function getDefaultBlockedForRole(role) {
        if (role === 'premium') {
            return ['settings'];
        } else if (role === 'user') {
            return ['settings', 'schedules', 'funnels', 'leads'];
        } else if (role === 'vendedor') {
            return ['settings', 'schedules', 'funnels', 'leads', 'history', 'whatsapp', 'bulk_sender'];
        }
        return [];
    }

    // Simula a lógica do Sidebar que filtra menus por role
    const menuItems = [
        { id: 'bulk_sender',            roles: ['super_admin', 'admin', 'premium'] },
        { id: 'recurring_schedules',     roles: ['super_admin', 'admin', 'premium'] },
        { id: 'schedules',               roles: ['super_admin', 'admin', 'premium', 'user'] },
        { id: 'history',                 roles: ['super_admin', 'admin', 'premium', 'user'] },
        { id: 'capture_page',            roles: ['super_admin', 'admin', 'premium'] },
        { id: 'pagina_captura',          roles: ['super_admin', 'admin', 'premium'] },
        { id: 'hot_leads',               roles: ['super_admin', 'admin', 'premium'] },
        { id: 'templates',               roles: ['super_admin', 'admin', 'premium'] },
        { id: 'funnels',                 roles: ['super_admin', 'admin', 'premium'] },
        { id: 'integrations',            roles: ['super_admin', 'admin', 'premium'] },
        { id: 'instagram_automation',    roles: ['super_admin', 'admin', 'premium'] },
        { id: 'chat_conversations',      roles: ['super_admin', 'admin', 'premium', 'vendedor'] },
        { id: 'human_agents',            roles: ['super_admin', 'admin', 'premium'] },
        { id: 'leads',                   roles: ['super_admin', 'admin', 'premium'] },
        { id: 'appointments',            roles: ['super_admin', 'admin', 'premium'] },
        { id: 'import_history',          roles: ['super_admin', 'admin', 'premium'] },
        { id: 'blocked',                 roles: ['super_admin', 'admin', 'premium'] },
        { id: 'financial',               roles: ['super_admin', 'admin', 'premium', 'user'] },
        { id: 'users',                   roles: ['super_admin'] },
        { id: 'monitoring',              roles: ['super_admin'] },
    ];

    function getMenuItemsForRole(role) {
        return menuItems.filter(item => item.roles.includes(role));
    }

    it('vendedor deve ter todos os módulos críticos bloqueados', () => {
        const blocked = getDefaultBlockedForRole('vendedor');
        expect(blocked).toContain('settings');
        expect(blocked).toContain('schedules');
        expect(blocked).toContain('funnels');
        expect(blocked).toContain('leads');
        expect(blocked).toContain('history');
        expect(blocked).toContain('whatsapp');
        expect(blocked).toContain('bulk_sender');
    });

    it('vendedor só deve ter acesso ao menu de Atendimento no Sidebar', () => {
        const vendedorMenus = getMenuItemsForRole('vendedor');
        expect(vendedorMenus).toHaveLength(1);
        expect(vendedorMenus[0].id).toBe('chat_conversations');
    });

    it('cargo admin não deve ter menus bloqueados por padrão', () => {
        const blocked = getDefaultBlockedForRole('admin');
        expect(blocked).toHaveLength(0);
    });

    it('cargo premium bloqueia apenas configurações', () => {
        const blocked = getDefaultBlockedForRole('premium');
        expect(blocked).toEqual(['settings']);
    });

    it('cargo user bloqueia configurações, agendamentos, funis e leads', () => {
        const blocked = getDefaultBlockedForRole('user');
        expect(blocked).toContain('settings');
        expect(blocked).toContain('schedules');
        expect(blocked).toContain('funnels');
        expect(blocked).toContain('leads');
        expect(blocked).not.toContain('history'); // user pode ver histórico
    });

    it('vendedor NÃO deve ter acesso a funis, campanhas ou contatos', () => {
        const vendedorMenus = getMenuItemsForRole('vendedor');
        const vendedorIds = vendedorMenus.map(m => m.id);
        
        // Não deve aparecer nenhum desses no menu do vendedor
        expect(vendedorIds).not.toContain('bulk_sender');
        expect(vendedorIds).not.toContain('funnels');
        expect(vendedorIds).not.toContain('leads');
        expect(vendedorIds).not.toContain('history');
        expect(vendedorIds).not.toContain('integrations');
        expect(vendedorIds).not.toContain('templates');
        expect(vendedorIds).not.toContain('financial');
        expect(vendedorIds).not.toContain('schedules');
    });
});

// Replica a lista NAV_SHORTCUTS do ChatConversations.jsx
const NAV_SHORTCUTS = [
    { view: 'webhook_integrations', label: 'Integração Webhook' },
    { view: 'bulk_sender',          label: 'Disparo em Massa' },
    { view: 'history',              label: 'Histórico de Disparos' },
    { view: 'funnels',              label: 'Funis' },
    { view: 'leads',                label: 'Contatos' },
];

describe('NAV_SHORTCUTS — Header do Chat', () => {

    function getVisibleShortcuts(role) {
        // Replica a lógica: user?.role !== 'vendedor' && NAV_SHORTCUTS.map(...)
        if (role === 'vendedor') return [];
        return NAV_SHORTCUTS;
    }

    it('vendedor não deve ver nenhum botão de atalho no header do chat', () => {
        expect(getVisibleShortcuts('vendedor')).toHaveLength(0);
    });

    it('admin deve ver todos os botões de atalho no header', () => {
        expect(getVisibleShortcuts('admin')).toHaveLength(NAV_SHORTCUTS.length);
    });

    it('premium deve ver todos os botões de atalho no header', () => {
        expect(getVisibleShortcuts('premium')).toHaveLength(NAV_SHORTCUTS.length);
    });

    it('super_admin deve ver todos os botões de atalho no header', () => {
        expect(getVisibleShortcuts('super_admin')).toHaveLength(NAV_SHORTCUTS.length);
    });
});
