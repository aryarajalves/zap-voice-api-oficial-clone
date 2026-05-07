import { renderHook, act } from '@testing-library/react-hooks';
import { useTriggerHistory } from './useTriggerHistory';
import * as AuthContext from '../../../AuthContext';
import * as ClientContext from '../../../contexts/ClientContext';

// Mock contexts
jest.mock('../../../AuthContext');
jest.mock('../../../contexts/ClientContext');

describe('useTriggerHistory', () => {
    const mockActiveClient = { id: 1 };
    const mockUser = { role: 'super_admin' };

    beforeEach(() => {
        AuthContext.useAuth.mockReturnValue({ user: mockUser });
        ClientContext.useClient.mockReturnValue({ activeClient: mockActiveClient });
        AuthContext.fetchWithAuth.mockResolvedValue({
            ok: true,
            json: async () => ({ items: [], total: 0 })
        });
    });

    it('deve inicializar com estados padrão', async () => {
        const { result, waitForNextUpdate } = renderHook(() => useTriggerHistory());
        
        expect(result.current.loading).toBe(true);
        expect(result.current.triggers).toEqual([]);
        
        await waitForNextUpdate();
        
        expect(result.current.loading).toBe(false);
    });

    it('deve atualizar filtros corretamente', async () => {
        const { result, waitForNextUpdate } = renderHook(() => useTriggerHistory());
        await waitForNextUpdate();

        act(() => {
            result.current.setFilterName('Teste');
        });

        expect(result.current.filterName).toBe('Teste');
    });

    it('deve gerenciar a seleção em massa', async () => {
        const { result, waitForNextUpdate } = renderHook(() => useTriggerHistory());
        await waitForNextUpdate();

        act(() => {
            result.current.handleSelectOne(1);
        });

        expect(result.current.selectedIds).toContain(1);

        act(() => {
            result.current.handleSelectOne(1);
        });

        expect(result.current.selectedIds).not.toContain(1);
    });
});
