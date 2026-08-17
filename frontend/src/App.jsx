import React from 'react';
import AppContent from './AppContent';
import { AuthProvider } from './AuthContext';
import { ClientProvider } from './contexts/ClientContext';
import ProtectedRoute from './ProtectedRoute';
import { ThemeProvider } from './contexts/ThemeContext';
import InviteRegister from './pages/InviteRegister';
import PublicTutorial from './pages/PublicTutorial';
import PublicCheckoutPage from './pages/PublicCheckoutPage';
import PublicCapturePage from './pages/PublicCapturePage';
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
  const isCaptureHash = currentHash.startsWith('#/p/') || (currentHash.startsWith('#/') && !currentHash.startsWith('#/login') && !currentHash.startsWith('#/dashboard') && !currentHash.startsWith('#/funnels') && !currentHash.startsWith('#/bulk') && !currentHash.startsWith('#/schedules') && !currentHash.startsWith('#/integrations') && !currentHash.startsWith('#/settings') && !currentHash.startsWith('#/users') && !currentHash.startsWith('#/logs') && !currentHash.startsWith('#/financial') && !currentHash.startsWith('#/checkout-presell') && !currentHash.startsWith('#/capture-page') && !currentHash.startsWith('#/blocked') && !currentHash.startsWith('#/hot-leads') && !currentHash.startsWith('#/chat-conversations') && !currentHash.startsWith('#/atendimento') && !currentHash.startsWith('#/human-agents'));

  // Rota limpa via Pathname (ex: /masterclass ou /masterclass/obrigado)
  const isReservedPath = ['/', '/login', '/dashboard', '/funnels', '/bulk', '/schedules', '/integrations', '/settings', '/users', '/logs', '/financial', '/checkout-presell', '/capture-page', '/blocked', '/hot-leads', '/chat-conversations', '/atendimento', '/human-agents'].includes(currentPath);
  const isCleanPathCapture = !isReservedPath && !isInvite && !isHelp && !isCheckout && !isCapturePath && currentPath.length > 1;

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

  if (isCapturePath || isCaptureHash || isCleanPathCapture) {
    let slug = '';
    if (isCleanPathCapture) {
      slug = currentPath.replace('/', '').split('/')[0].split('?')[0];
    } else if (isCapturePath) {
      slug = currentPath.replace('/p/', '').split('/')[0].split('?')[0];
    } else if (currentHash.startsWith('#/p/')) {
      slug = currentHash.replace('#/p/', '').split('/')[0].split('?')[0];
    } else {
      slug = currentHash.replace('#/', '').split('/')[0].split('?')[0];
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
