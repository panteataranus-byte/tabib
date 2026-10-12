import { useParams } from 'react-router-dom';
import { useI18n } from '../i18n/i18n';
import { doctorsAt, getPlace } from '../data';
import { Icon } from '../components/Icon';
import { DoctorCard, Notice, PhoneRow, TopBar } from '../components/ui';
import NotFound from './NotFound';

export default function PlacePage() {
  const { id } = useParams();
  const p = getPlace(id);
  const { t, tx, plural } = useI18n();
  if (!p) return <NotFound />;
  const doctors = doctorsAt(p.id);

  return (
    <>
      <TopBar title={t('placeProfile')} />
      <main id="main" tabIndex={-1} className="page">
        <section className="row" style={{ gap: 14 }}>
          <span className="tile" style={{ inlineSize: 64, blockSize: 64, borderRadius: 18 }} aria-hidden="true">
            <Icon name={p.kind === 'hospital' ? 'hospital' : 'building'} />
          </span>
          <div className="grow" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <h2 style={{ fontSize: '1.35rem' }}>{tx(p.name)}</h2>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              <span className="badge badge--soft">{t(p.sector)}</span>
              {p.emergency24 && <span className="badge badge--danger">{t('emergency24')}</span>}
            </div>
          </div>
        </section>

        {p.stale && <Notice>{t('staleInfo', { year: p.stale })}</Notice>}
        {p.confidence === 'low' && !p.stale && <Notice>{t('lowConfidence')}</Notice>}
        {p.phoneNote === 'university' && <Notice>{t('universityPhone')}</Notice>}

        <section className="list-card">
          {p.address && (
            <div className="list-row">
              <Icon name="pin" />
              <div className="grow">
                <div className="label">{t('address')}</div>
                {tx(p.address)}
              </div>
            </div>
          )}
          {p.hours && (
            <div className="list-row">
              <Icon name="clock" />
              <div className="grow">
                <div className="label">{t('hours')}</div>
                {tx(p.hours)}
              </div>
            </div>
          )}
          {p.departments && (
            <div className="list-row">
              <Icon name="grid" />
              <div className="grow">
                <div className="label">{t('departments')}</div>
                {tx(p.departments)}
              </div>
            </div>
          )}
          {p.phones.map((ph) => (
            <PhoneRow key={ph} phone={ph} />
          ))}
          {p.email && (
            <div className="list-row">
              <Icon name="mail" />
              <div className="grow">
                <div className="label">{t('email')}</div>
                <span className="ltr" style={{ overflowWrap: 'anywhere' }}>{p.email}</span>
              </div>
            </div>
          )}
          {!p.phones.length && (
            <div className="list-row">
              <Icon name="phone" />
              <span className="muted">{t('noPhone')}</span>
            </div>
          )}
        </section>

        {doctors.length > 0 && (
          <section className="section" aria-labelledby="h-docs">
            <div className="section__head">
              <h2 id="h-docs">{t('doctorsHere')}</h2>
              <span className="muted small">{plural('doctors', doctors.length)}</span>
            </div>
            {doctors.map((d) => (
              <DoctorCard key={d.id} d={d} headingLevel={3} />
            ))}
          </section>
        )}

        <p className="muted small">
          {t('source')}: <span className="ltr">{p.source}</span>
        </p>
      </main>
    </>
  );
}
