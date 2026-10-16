import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import '@fontsource/ibm-plex-sans-arabic/arabic-400.css';
import '@fontsource/ibm-plex-sans-arabic/arabic-600.css';
import '@fontsource/ibm-plex-sans-arabic/latin-400.css';
import '@fontsource/ibm-plex-sans-arabic/latin-600.css';
import './styles.css';
import App from './App';
import { I18nProvider } from './i18n/i18n';
import { AppStateProvider } from './store/AppState';

const app = (
  <StrictMode>
    <I18nProvider>
      <AppStateProvider>
        <App />
      </AppStateProvider>
    </I18nProvider>
  </StrictMode>
);
// The built page already holds the Arabic home screen (scripts/prerender.mjs), so it shows before this code arrives.
// React takes it over when it matches; otherwise (another language or a deep link) it draws the right screen instead.
const root = document.getElementById('root')!;
if (root.firstElementChild && !document.documentElement.classList.contains('pre-hide')) hydrateRoot(root, app);
else createRoot(root).render(app);

// Offline support once installed. Registered only in production builds, so development stays uncached.
if (import.meta.env.PROD && import.meta.env.MODE !== 'artifact' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
