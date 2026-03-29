import { LanguageProvider } from './contexts/LanguageProvider';
import { LanguageSelectionPopup } from './components/common/LanguageSelectionPopup';
import { ErrorBoundary, NotificationProvider } from './components/common';
import { GlobalErrorHandlerProvider } from './hooks/useGlobalErrorHandler';
import { AppRouter } from './config/router';
import './App.css';


function App() {
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