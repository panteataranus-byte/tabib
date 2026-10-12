import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useI18n } from '../i18n/i18n';
import { useApp } from '../store/AppState';
import { browseGroups, countIn, data } from '../data';
import { Icon, Logo } from '../components/Icon';
import { PlaceCard, SpecialtyTile } from '../components/ui';
import { LanguageButton } from './Settings';

const FEATURED_PLACES = ['par', 'rizgary', 'zheen', 'cmc'];

export default function Home() {
  const { t, plural } = useI18n();
  const { account } = useApp();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const groups = browseGroups.slice(0, 5);
  const firstName = account?.name.split(' ')[0];

  return (
    <>
      <header className="hero">
        <div className="hero__row">
          <Link to="/" className="brand" aria-label={t('appName')}>
            <Logo inverted />
            <span aria-hidden="true">{t('appName')}</span>
          </Link>
          <div className="row" style={{ gap: 8 }}>
            <LanguageButton />
            <Link to="/settings" className="icon-btn" aria-label={t('settings')}>
              <Icon name="settings" />
            </Link>
          </div>
        </div>
        <div>
          <p className="hero__sub">{firstName ? t('welcomeName', { name: firstName }) : t('welcome')}</p>
          <h1 className="hero__title">{t('tagline')}</h1>
        </div>
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            nav(`/search?q=${encodeURIComponent(q.trim())}`);
          }}
        >
          <label className="searchbox">
            <Icon name="search" />
            <span className="sr-only">{t('searchLabel')}</span>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('searchPlaceholder')} enterKeyHint="search" />
          </label>
        </form>
      </header>

      <main id="main" tabIndex={-1} className="page">
        <section className="section" aria-labelledby="h-spec">
          <div className="section__head">
            <h2 id="h-spec">{t('specialties')}</h2>
            <Link to="/search">{t('seeAll')}</Link>
          </div>
          <div className="spec-grid">
            {groups.map((g) => (
              <SpecialtyTile key={g.key} k={g.key} count={countIn(g.members)} />
            ))}
            <Link className="spec spec--all" to="/search">
              <span className="spec__icon">
                <Icon name="grid" />
              </span>
              <span className="spec__name">{t('allSpecialties')}</span>
              <span className="spec__count">{plural('specialties', Object.keys(data.specialties).length - 1)}</span>
            </Link>
          </div>
        </section>

        <section className="section" aria-labelledby="h-places">
          <div className="section__head">
            <h2 id="h-places">{t('hospitalsInErbil')}</h2>
            <Link to="/search?type=places">{plural('places', data.places.length)}</Link>
          </div>
          {FEATURED_PLACES.map((id) => {
            const p = data.places.find((x) => x.id === id)!;
            return <PlaceCard key={id} p={p} headingLevel={3} />;
          })}
        </section>
      </main>
    </>
  );
}
