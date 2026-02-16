import { LanguageProvider } from './contexts/LanguageContext';
import { LanguageSelectionPopup } from './components/common/LanguageSelectionPopup';
import { ErrorBoundary, NotificationProvider } from './components/common';
import { GlobalErrorHandlerProvider } from './hooks/useGlobalErrorHandler';
import { AppRouter } from './config/router';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <NotificationProvider>
        <GlobalErrorHandlerProvider>
          <LanguageProvider>
            <LanguageSelectionPopup />
            <AppRouter />
          </LanguageProvider>
        </GlobalErrorHandlerProvider>
      </NotificationProvider>
    </ErrorBoundary>
  );
}

export default App;
