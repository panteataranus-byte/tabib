import { Link, useLocation } from 'react-router-dom';
import { useI18n } from '../i18n/i18n';
import { Icon } from '../components/Icon';
import { TopBar } from '../components/ui';

export default function SignInPrompt({ title }: { title: string }) {
  const { t } = useI18n();
  const loc = useLocation();
  const next = encodeURIComponent(loc.pathname);
  return (
    <>
      <TopBar title={title} back={false} />
      <main id="main" tabIndex={-1} className="page">
        <div className="empty">
          <Icon name="lock" />
          <p style={{ color: 'var(--ink)', fontWeight: 600 }}>{t('recordLocked')}</p>
          <p>{t('privateNote')}</p>
        </div>
        <Link className="btn btn--primary btn--block" to={`/signup?next=${next}`}>
          {t('signUp')}
        </Link>
        <Link className="btn btn--outline btn--block" to={`/login?next=${next}`}>
          {t('signIn')}
        </Link>
      </main>
    </>
  );
}
