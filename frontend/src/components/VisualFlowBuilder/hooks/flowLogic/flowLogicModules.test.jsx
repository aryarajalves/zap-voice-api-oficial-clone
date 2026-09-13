import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createNodeDefaultData } from './nodeDefaults';
import { useFlowMetadata } from './useFlowMetadata';
import { useFlowStorage } from './useFlowStorage';

vi.mock('../../../../AuthContext', () => ({
    fetchWithAuth: vi.fn()
}));

vi.mock('../../../../config', () => ({
    API_URL: 'http://localhost:8000/api'
}));

vi.mock('react-hot-toast', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        loading: vi.fn(),
        promise: vi.fn((p) => p)
    }
}));

import { fetchWithAuth } from '../../../../AuthContext';
import { toast } from 'react-hot-toast';

describe('flowLogic Modular Units', () => {
    describe('createNodeDefaultData', () => {
        it('deve gerar defaults corretos para delayNode', () => {
            const defaults = createNodeDefaultData('delayNode');
            expect(defaults.time).toBe(10);
            expect(defaults.unit).toBe('seconds');
            expect(defaults.useRandom).toBe(false);
        });

        it('deve gerar defaults corretos para httpRequestNode', () => {
            const defaults = createNodeDefaultData('httpRequestNode');
            expect(defaults.method).toBe('POST');
            expect(defaults.payloadType).toBe('fields');
            expect(defaults.payloadFields).toEqual([{ key: '', value: '' }]);
        });

        it('deve gerar defaults corretos para businessHoursNode com cronograma semanal', () => {
            const defaults = createNodeDefaultData('businessHoursNode');
            expect(defaults.schedule['0'].open).toBe(true);
            expect(defaults.schedule['6'].open).toBe(false);
        });
    });

    describe('useFlowMetadata hook', () => {
        it('deve inicializar com valores default corretos', () => {
            const { result } = renderHook(() => useFlowMetadata());

            expect(result.current.funnelName).toBe('');
            expect(result.current.triggerMatchType).toBe('contains');
            expect(result.current.isTriggerActive).toBe(true);
            expect(result.current.businessHoursStart).toBe('08:00');
            expect(result.current.businessHoursEnd).toBe('18:00');
        });

        it('deve atualizar metadados de horário e gatilho', () => {
            const { result } = renderHook(() => useFlowMetadata());

            act(() => {
                result.current.setFunnelName('Meu Funil de Vendas');
                result.current.setTriggerPhrase('QUERO COMPRAR');
                result.current.setBusinessHoursStart('09:00');
            });

            expect(result.current.funnelName).toBe('Meu Funil de Vendas');
            expect(result.current.triggerPhrase).toBe('QUERO COMPRAR');
            expect(result.current.businessHoursStart).toBe('09:00');
        });
    });

    describe('useFlowStorage hook', () => {
        beforeEach(() => {
            vi.clearAllMocks();
            fetchWithAuth.mockResolvedValue({
                ok: true,
                json: async () => []
            });
        });

        it('deve alertar erro ao tentar salvar sem funnelId', async () => {
            const metadata = {
                funnelName: 'Teste',
                setFunnelName: vi.fn(),
                allowedPhones: '',
                blockedPhones: '',
                triggerPhrase: '',
                triggerMatchType: 'contains',
                triggerLimitType: 'none',
                isTriggerActive: true,
                businessHoursStart: '08:00',
                businessHoursEnd: '18:00',
                businessHoursDays: [0, 1, 2]
            };

            const { result } = renderHook(() => useFlowStorage({
                funnelId: null,
                onSave: vi.fn(),
                activeClient: { id: 1 },
                nodes: [],
                setNodes: vi.fn(),
                edges: [],
                setEdges: vi.fn(),
                metadata,
                nodeCallbacks: {}
            }));

            await act(async () => {
                await result.current.handleSave();
            });

            expect(toast.error).toHaveBeenCalledWith('Erro: Nenhum funil selecionado para salvar.');
        });

        it('deve alertar erro ao tentar salvar com nome vazio', async () => {
            const metadata = {
                funnelName: '   ',
                setFunnelName: vi.fn(),
                allowedPhones: '',
                blockedPhones: '',
                triggerPhrase: '',
                triggerMatchType: 'contains',
                triggerLimitType: 'none',
                isTriggerActive: true,
                businessHoursStart: '08:00',
                businessHoursEnd: '18:00',
                businessHoursDays: [0, 1, 2]
            };

            const { result } = renderHook(() => useFlowStorage({
                funnelId: 10,
                onSave: vi.fn(),
                activeClient: { id: 1 },
                nodes: [],
                setNodes: vi.fn(),
                edges: [],
                setEdges: vi.fn(),
                metadata,
                nodeCallbacks: {}
            }));

            await act(async () => {
                await result.current.handleSave();
            });

            expect(toast.error).toHaveBeenCalledWith('Por favor, dê um nome para o funil.');
        });
    });
});
