import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import SettingsModal from './SettingsModal';

// Mock react-icons/fi
vi.mock('react-icons/fi', () => ({
  FiEye: () => <span />,
  FiEyeOff: () => <span />,
  FiUpload: () => <span />,
  FiImage: () => <span />,
  FiTrash2: () => <span />,
  FiPlus: () => <span />,
  FiCopy: () => <span />,
  FiShield: () => <span />,
  FiChevronLeft: () => <span />,
  FiChevronRight: () => <span />,
  FiDatabase: () => <span />,
  FiCpu: () => <span />,
  FiAlertCircle: () => <span />,
}));

// Mock contexts and hooks
vi.mock('../contexts/ClientContext', () => ({
  useClient: () => ({ 
    activeClient: { id: 1, name: 'Test Client' },
    refreshClients: vi.fn()
  }),
}));

vi.mock('../AuthContext', () => ({
  useAuth: () => ({ user: { role: 'super_admin' } }),
  fetchWithAuth: vi.fn(),
}));

vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));

vi.mock('../hooks/useScrollLock', () => ({
  default: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('SettingsModal', () => {
  it('renders correctly when open', () => {
    render(<SettingsModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText('Configurações do Sistema')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<SettingsModal isOpen={false} onClose={() => {}} />);
    expect(screen.queryByText('Configurações do Sistema')).not.toBeInTheDocument();
  });
});
