import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFlowLogic } from './useFlowLogic';

// Mocks
vi.mock('reactflow', () => ({
    applyNodeChanges: vi.fn(),
    applyEdgeChanges: vi.fn(),
    addEdge: vi.fn((params, eds) => [...eds, params]),
    useReactFlow: () => ({
        project: vi.fn((pos) => pos)
    })
}));

vi.mock('../../../AuthContext', () => ({
    fetchWithAuth: vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }))
}));

vi.mock('../../../config', () => ({
    API_URL: 'http://localhost:8000/api'
}));

vi.mock('../../../contexts/ClientContext', () => ({
    useClient: () => ({ activeClient: { id: 1 } })
}));

vi.mock('react-hot-toast', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        loading: vi.fn(),
        promise: vi.fn((p) => p)
    }
}));

describe('useFlowLogic', () => {
    it('deve marcar o primeiro nó de mensagem como INÍCIO automaticamente', async () => {
        const { result } = renderHook(() => useFlowLogic(null, vi.fn()));

        // Simular menu aberto para permitir addNode
        act(() => {
            result.current.setMenu({ top: 100, left: 100 });
        });

        act(() => {
            result.current.handleAddNode('messageNode');
        });

        expect(result.current.nodes).toHaveLength(1);
        expect(result.current.nodes[0].data.isStart).toBe(true);
    });

    it('NÃO deve marcar o segundo nó de mensagem como INÍCIO', async () => {
        const { result } = renderHook(() => useFlowLogic(null, vi.fn()));

        // Primeiro nó
        act(() => {
            result.current.setMenu({ top: 100, left: 100 });
        });
        act(() => {
            result.current.handleAddNode('messageNode');
        });

        // Segundo nó
        act(() => {
            result.current.setMenu({ top: 200, left: 200 });
        });
        act(() => {
            result.current.handleAddNode('messageNode');
        });

        expect(result.current.nodes).toHaveLength(2);
        expect(result.current.nodes[0].data.isStart).toBe(true);
        expect(result.current.nodes[1].data.isStart).toBeFalsy();
    });

    it.skip('deve usar toast.promise ao salvar', async () => {
        const { toast } = await import('react-hot-toast');
        const { result } = renderHook(() => useFlowLogic(1, vi.fn()));

        act(() => {
            result.current.setFunnelName('Teste');
        });

        await act(async () => {
            await result.current.handleSave();
        });

        expect(toast.promise).toHaveBeenCalled();
    });
});
