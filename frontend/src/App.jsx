import React from 'react';
import AppContent from './AppContent';
import { AuthProvider } from './AuthContext';
import { ClientProvider } from './contexts/ClientContext';
import ProtectedRoute from './ProtectedRoute';
import { ThemeProvider } from './contexts/ThemeContext';

/**
 * Componente principal App.
 * Atua como o ponto de entrada da aplicação React, configurando todos os 
 * provedores de contexto necessários (Tema, Autenticação, Cliente)
 * e protegendo o conteúdo principal via ProtectedRoute.
 */
function App() {
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
