import { LanguageProvider } from './contexts/LanguageProvider';
import { LanguageSelectionPopup } from './components/common/LanguageSelectionPopup';
import { ErrorBoundary, NotificationProvider } from './components/common';
import { GlobalErrorHandlerProvider } from './hooks/useGlobalErrorHandler';
import { AppRouter } from './config/router';
import './App.css';
import { supabase } from './lib/supabase';
import { useAuth } from './contexts/AuthContext';
import { AuthPage } from './pages/AuthPage';


function App() {
const { user, loading } = useAuth();

if (loading) return null;

if (!user) {
return (
  <><ErrorBoundary>
    <NotificationProvider>
      <GlobalErrorHandlerProvider>
        <LanguageProvider>
          <AuthPage />
        </LanguageProvider>
      </GlobalErrorHandlerProvider>
    </NotificationProvider>
  </ErrorBoundary></>    
);
}

return (
<ErrorBoundary>
<NotificationProvider>
<GlobalErrorHandlerProvider>
<LanguageProvider>
<div style={{ padding: '10px', background: '#eee', textAlign: 'right' }}>
<span>Prijavljen: <strong>{user?.email}</strong></span>
<button onClick={() => supabase.auth.signOut()} style={{ marginLeft: '10px' }}>Odjava</button>
</div>
<LanguageSelectionPopup />
<AppRouter />
</LanguageProvider>
</GlobalErrorHandlerProvider>
</NotificationProvider>
</ErrorBoundary>
);
}

export default App;