// Build-time entry: renders the Arabic home screen to HTML so the published page shows it before the app code loads.
import { renderToString } from 'react-dom/server';
import { createPath, Router, type Navigator } from 'react-router-dom';
import { Shell } from './App';
import { I18nProvider } from './i18n/i18n';
import { AppStateProvider } from './store/AppState';

// Links must come out exactly as the live HashRouter writes them ("#/search?s=eyes"), so a tap before the
// app code arrives still opens the right screen and React finds nothing to correct when it takes over.
const noop = () => {};
const hashLinks: Navigator = { createHref: (to) => '#' + (typeof to === 'string' ? to : createPath(to)), go: noop, push: noop, replace: noop };

export function render() {
  return renderToString(
    <I18nProvider>
      <AppStateProvider>
        <Router location="/" navigator={hashLinks}>
          <Shell />
        </Router>
      </AppStateProvider>
    </I18nProvider>,
  );
}
