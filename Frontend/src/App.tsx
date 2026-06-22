import { useEffect } from 'react';
import { LanguageProvider } from './contexts/LanguageProvider';
import { LanguageSelectionPopup } from './components/common/LanguageSelectionPopup';
import { ErrorBoundary, NotificationProvider } from './components/common';
import { GlobalErrorHandlerProvider } from './hooks/useGlobalErrorHandler';
import { AppRouter } from './config/router';
import { useAppTheme } from './stores/appStore';
import { useAuth } from './hooks/useAuth';
import { useCartStore } from './stores/cartStore';
import './App.css';

function App() {
  const theme = useAppTheme();
  const { session } = useAuth();
  const loadCart = useCartStore((state) => state.loadCart);

  // 1. Theme Bootstrapping & Switching logic
  useEffect(() => {
    const root = window.document.documentElement;
    
    // Reset existing classes and attributes
    root.classList.remove('dark');
    root.removeAttribute('data-theme');
    
    if (theme === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
    } else if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      if (systemTheme === 'dark') {
        root.classList.add('dark');
      }
      root.setAttribute('data-theme', systemTheme);
    } else {
      // Custom theme presets (emerald, amber, ocean)
      root.setAttribute('data-theme', theme);
    }
  }, [theme]);

  // 2. Listen to system preference changes when theme is set to 'system'
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const root = window.document.documentElement;
      root.classList.remove('dark');
      if (e.matches) {
        root.classList.add('dark');
        root.setAttribute('data-theme', 'dark');
      } else {
        root.setAttribute('data-theme', 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // 3. Preload cart items when session is available
  useEffect(() => {
    if (session) {
      void loadCart();
    }
  }, [session, loadCart]);

  return (
    <LanguageProvider>
      <ErrorBoundary>
        <NotificationProvider>
          <GlobalErrorHandlerProvider>
            <LanguageSelectionPopup />
            <AppRouter />
          </GlobalErrorHandlerProvider>
        </NotificationProvider>
      </ErrorBoundary>
    </LanguageProvider>
  );
}

export default App;