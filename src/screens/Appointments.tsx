import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/i18n';
import { useApp } from '../store/AppState';
import { getDoctor, getPlace } from '../data';
import { Icon } from '../components/Icon';
import { ConfirmDialog, TopBar, useDoctorName } from '../components/ui';
import { parseIso } from '../schedule';
import type { Appointment } from '../store/types';
import SignInPrompt from './SignInPrompt';

const at = (a: Appointment) => parseIso(a.date).getTime() + Number(a.time.slice(0, 2)) * 3_600_000 + Number(a.time.slice(3)) * 60_000;

export default function Appointments() {
  const { t, tx, n, time, list } = useI18n();
  const { account, vault, cancelAppointment } = useApp();
  const name = useDoctorName();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [cancelling, setCancelling] = useState<Appointment | null>(null);

  if (!account || !vault) return <SignInPrompt title={t('navAppointments')} />;

  const now = Date.now();
  const all = [...vault.appointments].sort((a, b) => at(a) - at(b));
  const upcoming = all.filter((a) => a.status === 'booked' && at(a) >= now);
  const past = all.filter((a) => !(a.status === 'booked' && at(a) >= now)).reverse();
  const shown = tab === 'upcoming' ? upcoming : past;

  return (
    <>
      <TopBar title={t('navAppointments')} back={false} />
      <main id="main" tabIndex={-1} className="page">
        <div className="tabs" role="tablist">
          <button type="button" role="tab" className="tab" aria-selected={tab === 'upcoming'} onClick={() => setTab('upcoming')}>
            {t('upcoming')} · {n(upcoming.length)}
          </button>
          <button type="button" role="tab" className="tab" aria-selected={tab === 'past'} onClick={() => setTab('past')}>
            {t('past')} · {n(past.length)}
          </button>
        </div>

        {shown.length === 0 ? (
          <div className="empty">
            <Icon name="calendar" />
            <p>{t('noAppointments')}</p>
            <Link className="btn btn--primary" to="/search">
              {t('findDoctor')}
            </Link>
          </div>
        ) : (
          shown.map((a) => {
            const d = getDoctor(a.doctorId);
            const place = getPlace(d?.placeId);
            const when = parseIso(a.date);
            return (
              <article key={a.id} className="card">
                <div className="row">
                  <div className="datebox datebox--soft">
                    <div className="datebox__small">{list('monthsShort')[when.getMonth()]}</div>
                    <div className="datebox__num">{n(when.getDate())}</div>
                  </div>
                  <div className="grow">
                    <h2 className="card__title">{d ? <Link to={`/doctor/${d.id}`}>{name(d)}</Link> : '—'}</h2>
                    <p className="meta">
                      {list('weekdays')[when.getDay()]} · {time(a.time)}
                    </p>
                    {place && <p className="meta">{tx(place.name)}</p>}
                    {!a.forSelf && (
                      <p className="meta">
                        <Icon name="user" />
                        {a.patientName}
                      </p>
                    )}
                  </div>
                  {a.status === 'cancelled' && <span className="badge badge--danger">{t('cancelled')}</span>}
                </div>
                {tab === 'upcoming' && (
                  <button type="button" className="btn btn--outline" onClick={() => setCancelling(a)}>
                    {t('cancelAppointment')}
                  </button>
                )}
              </article>
            );
          })
        )}
      </main>
      {cancelling && (
        <ConfirmDialog
          title={t('cancelConfirm')}
          confirm={t('yesCancel')}
          cancel={t('keep')}
          danger
          onClose={() => setCancelling(null)}
          onConfirm={async () => {
            await cancelAppointment(cancelling.id);
            setCancelling(null);
          }}
        />
      )}
    </>
  );
}
