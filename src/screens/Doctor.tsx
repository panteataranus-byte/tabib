import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useI18n } from '../i18n/i18n';
import { useApp } from '../store/AppState';
import { contactPhones, data, doctorAddress, getDoctor, getPlace, toneOf } from '../data';
import { Icon } from '../components/Icon';
import { DoctorFlags, PhoneRow, TopBar, initial, useDoctorName } from '../components/ui';
import { isoDate, nextOpenDays, openTimes, parseIso } from '../schedule';
import NotFound from './NotFound';

export default function DoctorPage() {
  const { id } = useParams();
  const d = getDoctor(id);
  const { t, tx, n, date, time, list } = useI18n();
  const { vault } = useApp();
  const nav = useNavigate();
  const loc = useLocation();
  const name = useDoctorName();
  const days = useMemo(() => nextOpenDays(6), []);
  const [day, setDay] = useState(isoDate(days[0]));
  const [slot, setSlot] = useState<string | null>(null);

  useEffect(() => {
    if (loc.hash === '#book') document.getElementById('book')?.scrollIntoView({ block: 'start' });
  }, [loc.hash]);

  if (!d) return <NotFound />;
  const place = getPlace(d.placeId);
  const addr = doctorAddress(d);
  const { phones, viaPlace } = contactPhones(d);
  const taken = (vault?.appointments ?? []).filter((a) => a.status === 'booked' && a.doctorId === d.id && a.date === day).map((a) => a.time);
  const times = openTimes(day, taken);
  const fromSourceSite = d.source.includes('own site') || d.source.includes("centre's");
  const monthsShort = list('monthsShort');

  const goBook = () => slot && nav(`/book/${d.id}?date=${day}&time=${slot}`);

  return (
    <>
      <TopBar title={t('doctorProfile')} />
      <main id="main" tabIndex={-1} className="page">
        <section className="row" style={{ gap: 14 }}>
          <span className="avatar avatar--lg" data-tone={toneOf(d.specialty)} aria-hidden="true">{initial(tx(d.name))}</span>
          <div className="grow" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <h2 className="profile__name">{name(d)}</h2>
            <p className="muted">{tx(data.specialties[d.specialty])}</p>
            {fromSourceSite && (
              <span className="badge badge--accent">
                <Icon name="check" />
                {t('officialSite')}
              </span>
            )}
          </div>
        </section>

        {d.detail && <p>{tx(d.detail)}</p>}
        <DoctorFlags d={d} />

        <section className="list-card" aria-label={t('address')}>
          <div className="list-row">
            <Icon name={place ? 'building' : 'user'} />
            <div className="grow">
              {place ? (
                <Link to={`/place/${place.id}`} style={{ fontWeight: 600 }}>
                  {tx(place.name)}
                </Link>
              ) : (
                <span style={{ fontWeight: 600 }}>{d.privateClinic ? t('privateClinic') : t('workplaceUnknown')}</span>
              )}
              {addr && <div className="meta">{tx(addr)}</div>}
            </div>
          </div>
          {phones.map((p) => (
            <PhoneRow key={p} phone={p} label={viaPlace && place ? t('phoneViaPlace', { place: tx(place.name) }) : undefined} />
          ))}
        </section>

        <section id="book" className="section" aria-labelledby="h-day" style={{ scrollMarginTop: 80 }}>
          <div className="section__head">
            <h2 id="h-day" style={{ fontSize: '1.02rem' }}>{t('chooseDay')}</h2>
            <span className="muted small">{n(`${list('months')[days[0].getMonth()]} ${days[0].getFullYear()}`)}</span>
          </div>
          <div className="days" role="group" aria-labelledby="h-day">
            {days.slice(0, 4).map((dt) => {
              const iso = isoDate(dt);
              return (
                <button
                  key={iso}
                  type="button"
                  className="day"
                  aria-pressed={iso === day}
                  aria-label={date(dt)}
                  onClick={() => {
                    setDay(iso);
                    setSlot(null);
                  }}
                >
                  <span className="day__dow">{list('weekdaysShort')[dt.getDay()]}</span>
                  <span className="day__num">{n(dt.getDate())}</span>
                  {dt.getMonth() !== days[0].getMonth() && <span className="day__mon">{monthsShort[dt.getMonth()]}</span>}
                </button>
              );
            })}
          </div>
          <h2 id="h-time" style={{ fontSize: '1.02rem' }}>{t('chooseTime')}</h2>
          <div className="slots" role="group" aria-labelledby="h-time">
            {times.map(({ time: tm, available }) => (
              <button key={tm} type="button" className="slot" aria-pressed={slot === tm} disabled={!available} onClick={() => setSlot(tm)}>
                {time(tm)}
              </button>
            ))}
          </div>
        </section>
        <p className="muted small">
          {t('source')}: <span className="ltr">{d.source}</span>
        </p>
      </main>

      <div className="footer-bar" role="region" aria-label={t('book')}>
        <button type="button" className="btn btn--primary btn--block" aria-disabled={!slot} onClick={goBook}>
          <Icon name="calendar" />
          {slot ? t('bookAt', { when: `${date(parseIso(day), 'short')} · ${time(slot)}` }) : t('chooseTime')}
        </button>
        <small>{t('demoNotice')}</small>
      </div>
    </>
  );
}
