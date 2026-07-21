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
  const pathname = window.location.pathname;
  const isInvite = pathname.startsWith('/invite/');
  const isHelp = pathname.startsWith('/help/');
  const isCheckout = pathname.startsWith('/c/');

  if (isInvite) {
    const token = pathname.replace('/invite/', '').split('/')[0];
    return (
      <ThemeProvider>
        <Toaster position="top-right" reverseOrder={false} containerStyle={{ zIndex: 999999 }} />
        <InviteRegister token={token} />
      </ThemeProvider>
    );
  }

  if (isHelp) {
    const slug = pathname.replace('/help/', '').split('/')[0];
    return (
      <ThemeProvider>
        <Toaster position="top-right" reverseOrder={false} containerStyle={{ zIndex: 999999 }} />
        <PublicTutorial slug={slug} />
      </ThemeProvider>
    );
  }

  if (isCheckout) {
    const slug = pathname.replace('/c/', '').split('/')[0].split('?')[0];
    const cachedTitle = typeof window !== 'undefined' ? sessionStorage.getItem(`checkout_title_${slug}`) : null;
    document.title = cachedTitle || 'Aplicação Mentoria';

    return (
      <ThemeProvider>
        <PublicCheckoutPage slug={slug} />
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
