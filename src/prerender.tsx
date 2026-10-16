// Build-time entry: renders the Arabic home screen to HTML so the published page shows it before the app code loads.
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { Shell } from './App';
import { I18nProvider } from './i18n/i18n';
import { AppStateProvider } from './store/AppState';

export function render() {
  return renderToString(
    <I18nProvider>
      <AppStateProvider>
        <MemoryRouter>
          <Shell />
        </MemoryRouter>
      </AppStateProvider>
    </I18nProvider>,
  );
}
