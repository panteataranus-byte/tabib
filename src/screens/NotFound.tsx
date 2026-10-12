import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/i18n';
import { Icon } from '../components/Icon';
import { TopBar } from '../components/ui';

export default function NotFound() {
  const { t } = useI18n();
  return (
    <>
      <TopBar title={t('notFound')} />
      <main id="main" tabIndex={-1} className="page">
        <div className="empty">
          <Icon name="search" />
          <p style={{ color: 'var(--ink)', fontWeight: 600 }}>{t('notFound')}</p>
          <Link className="btn btn--primary" to="/">
            {t('goHome')}
          </Link>
        </div>
      </main>
    </>
  );
}
