import { useEffect } from 'react';
import { HashRouter, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { useI18n } from './i18n/i18n';
import { useApp } from './store/AppState';
import { BottomNav, Loading } from './components/ui';
import Home from './screens/Home';
import Search from './screens/Search';
import DoctorPage from './screens/Doctor';
import PlacePage from './screens/Place';
import Book from './screens/Book';
import Appointments from './screens/Appointments';
import Record from './screens/Record';
import Settings from './screens/Settings';
import { SignIn, SignUp } from './screens/Auth';
import NotFound from './screens/NotFound';

const NO_NAV = [/^\/doctor\//, /^\/book\//, /^\/signup/, /^\/login/];

// Screens that need to know who is signed in wait for storage; the directory itself shows at once.
const ACCOUNT_ROUTES = [/^\/book\//, /^\/appointments/, /^\/record/, /^\/settings/, /^\/signup/, /^\/login/];

export function Shell() {
  const { t } = useI18n();
  const { ready } = useApp();
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  // index.html hides the prebuilt home screen when it is not the screen to show; this reveals what React drew.
  useEffect(() => document.documentElement.classList.remove('pre-hide'), []);
  const showNav = !NO_NAV.some((r) => r.test(pathname));
  const waiting = !ready && ACCOUNT_ROUTES.some((r) => r.test(pathname));
  return (
    <div className="shell">
      <a className="skip-link" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>
        {t('skipToContent')}
      </a>
      {waiting ? (
        <Loading />
      ) : (
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/doctor/:id" element={<DoctorPage />} />
          <Route path="/place/:id" element={<PlacePage />} />
          <Route path="/book/:id" element={<Book />} />
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/record" element={<Record />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<SignIn />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      )}
      {showNav && <BottomNav />}
    </div>
  );
}

// The hosted preview runs inside a sandboxed frame that does not keep URL fragments, so it keeps routes in memory.
const Router = import.meta.env.MODE === 'artifact' ? MemoryRouter : HashRouter;

export default function App() {
  return (
    // Screens are small, so drawing each one in a single pass is quicker than React's sliced transitions.
    <Router useTransitions={false}>
      <Shell />
    </Router>
  );
}
