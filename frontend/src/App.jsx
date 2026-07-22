import React from 'react';
import AppContent from './AppContent';
import { AuthProvider } from './AuthContext';
import { ClientProvider } from './contexts/ClientContext';
import ProtectedRoute from './ProtectedRoute';
import { ThemeProvider } from './contexts/ThemeContext';
import InviteRegister from './pages/InviteRegister';
import PublicTutorial from './pages/PublicTutorial';
import PublicCheckoutPage from './pages/PublicCheckoutPage';
import { Toaster } from 'react-hot-toast';

/**
 * Componente principal App.
 * Atua como o ponto de entrada da aplicação React, configurando todos os 
 * provedores de contexto necessários (Tema, Autenticação, Cliente)
 * e protegendo o conteúdo principal via ProtectedRoute.
 * Também intercepta a rota de convites públicos e checkout presell.
 */
function App() {
  const [currentPath, setCurrentPath] = React.useState(window.location.pathname);
  const [currentHash, setCurrentHash] = React.useState(window.location.hash);

  React.useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
      setCurrentHash(window.location.hash);
    };

    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  const isInvite = currentPath.startsWith('/invite/');
  const isHelp = currentPath.startsWith('/help/');
  const isCheckout = currentPath.startsWith('/c/');
  const isCapturePath = currentPath.startsWith('/p/');
  const isCaptureHash = currentHash.startsWith('#/p/');

  if (isInvite) {
    const token = currentPath.replace('/invite/', '').split('/')[0];
    return (
      <ThemeProvider>
        <Toaster position="top-right" reverseOrder={false} containerStyle={{ zIndex: 999999 }} />
        <InviteRegister token={token} />
      </ThemeProvider>
    );
  }

  if (isHelp) {
    const slug = currentPath.replace('/help/', '').split('/')[0];
    return (
      <ThemeProvider>
        <Toaster position="top-right" reverseOrder={false} containerStyle={{ zIndex: 999999 }} />
        <PublicTutorial slug={slug} />
      </ThemeProvider>
    );
  }

  if (isCheckout) {
    const slug = currentPath.replace('/c/', '').split('/')[0].split('?')[0];
    const cachedTitle = typeof window !== 'undefined' ? sessionStorage.getItem(`checkout_title_${slug}`) : null;
    document.title = cachedTitle || 'Aplicação Mentoria';

    return (
      <ThemeProvider>
        <PublicCheckoutPage slug={slug} />
      </ThemeProvider>
    );
  }

  if (isCapturePath || isCaptureHash) {
    let slug = '';
    if (isCapturePath) {
      slug = currentPath.replace('/p/', '').split('/')[0].split('?')[0];
    } else {
      slug = currentHash.replace('#/p/', '').split('/')[0].split('?')[0];
    }

    return (
      <ThemeProvider>
        <PublicCapturePage slugOverride={slug} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <ClientProvider>
          <ProtectedRoute>
            <AppContent />
          </ProtectedRoute>
        </ClientProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
