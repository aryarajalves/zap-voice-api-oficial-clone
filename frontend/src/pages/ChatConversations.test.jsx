import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChatFilterState } from './ChatConversations/hooks/useChatFilterState';
import { useChatModalState } from './ChatConversations/hooks/useChatModalState';

describe('Modularização de ChatConversations', () => {
    it('deve inicializar useChatFilterState com valores padrão e permitir alterações', () => {
        const { result } = renderHook(() => useChatFilterState());

        expect(result.current.activeTab).toBe('todos');
        expect(result.current.statusFilter).toBe('open');
        expect(result.current.searchQuery).toBe('');
        expect(result.current.selectedConvo).toBeNull();

        act(() => {
            result.current.setActiveTab('meus');
            result.current.setSearchQuery('Lead Teste');
            result.current.setFilterUrgent(true);
        });

        expect(result.current.activeTab).toBe('meus');
        expect(result.current.searchQuery).toBe('Lead Teste');
        expect(result.current.filterUrgent).toBe(true);
    });

    it('deve inicializar useChatModalState e gerenciar visibilidade de modais', () => {
        const { result } = renderHook(() => useChatModalState());

        expect(result.current.showRightSidebar).toBe(true);
        expect(result.current.showTemplateModal).toBe(false);
        expect(result.current.isCancelFunnelModalOpen).toBe(false);

        act(() => {
            result.current.setShowRightSidebar(false);
            result.current.setShowTemplateModal(true);
            result.current.setIsCancelFunnelModalOpen(true);
        });

        expect(result.current.showRightSidebar).toBe(false);
        expect(result.current.showTemplateModal).toBe(true);
        expect(result.current.isCancelFunnelModalOpen).toBe(true);
    });
});
