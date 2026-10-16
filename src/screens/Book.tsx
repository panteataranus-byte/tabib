import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useI18n, phoneText } from '../i18n/i18n';
import { useApp } from '../store/AppState';
import { getDoctor, getPlace } from '../data';
import { Icon } from '../components/Icon';
import { FieldError, Notice, TopBar, useDoctorName } from '../components/ui';
import { isBookable, isValidDate, isValidTime, parseIso } from '../schedule';
import { cleanText, formatPhone, normalisePhone, validName } from '../validate';
import NotFound from './NotFound';

export default function Book() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const loc = useLocation();
  const { t, tx, n, time, list, lang } = useI18n();
  const { account, vault, book } = useApp();
  const name = useDoctorName();
  const d = getDoctor(id);
  const day = params.get('date') ?? '';
  const slot = params.get('time') ?? '';

  const [forSelf, setForSelf] = useState(true);
  const [other, setOther] = useState({ name: '', phone: '' });
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<{ name?: string; phone?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (!d || !isValidDate(day) || !isValidTime(slot)) return <NotFound />;
  if (!account) return <Navigate to={`/signup?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  // The link only carries a day and time; check they are still on offer, whatever the address says.
  const taken = (vault?.appointments ?? []).filter((a) => a.status === 'booked' && a.doctorId === d.id && a.date === day).map((a) => a.time);
  const bookable = isBookable(day, slot, taken);
  const place = getPlace(d.placeId);
  const when = parseIso(day);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    const phone = forSelf ? account.phone : normalisePhone(other.phone);
    if (!forSelf && !validName(other.name)) errs.name = t('errName');
    if (!phone) errs.phone = t('errPhone');
    setErrors(errs);
    if (Object.keys(errs).length) {
      document.getElementById(errs.name ? 'bk-name' : 'bk-phone')?.focus();
      return;
    }
    if (!isBookable(day, slot, taken)) {
      setErrors({ form: t('errSlotGone') });
      return;
    }
    setBusy(true);
    try {
      await book({
        doctorId: d.id,
        date: day,
        time: slot,
        forSelf,
        patientName: forSelf ? account.name : cleanText(other.name, 80),
        patientPhone: phone!,
        reason: cleanText(reason, 300),
      });
      setDone(true);
    } catch {
      setErrors({ form: t('errStorage') });
    } finally {
      setBusy(false);
    }
  };

  const summary = (
    <section className="summary" aria-label={t('stepTime')}>
      <div className="datebox">
        <div className="datebox__small">{list('months')[when.getMonth()]}</div>
        <div className="datebox__num">{n(when.getDate())}</div>
        <div className="datebox__small">{list('weekdays')[when.getDay()]}</div>
      </div>
      <div className="grow">
        <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>{name(d)}</div>
        <div className="small">{time(slot)}</div>
        {place && <div className="small">{tx(place.name)}</div>}
      </div>
    </section>
  );

  if (done) {
    return (
      <>
        <TopBar title={t('booked')} back={false} />
        <main id="main" tabIndex={-1} className="page">
          <ol className="steps" aria-label={t('bookingSteps')}>
            <li data-done="true">{t('stepTime')}</li>
            <li data-done="true">{t('stepDetails')}</li>
            <li data-done="true" aria-current="step">{t('stepConfirm')}</li>
          </ol>
          <div className="empty" role="status">
            <Icon name="check" />
            <h2 style={{ color: 'var(--ink)' }}>{t('booked')}</h2>
            <p>{t('bookedBody')}</p>
          </div>
          {summary}
          <Notice>{t('demoNoticeLong')}</Notice>
          <Link className="btn btn--primary btn--block" to="/appointments">
            {t('viewAppointments')}
          </Link>
        </main>
      </>
    );
  }

  if (!bookable) {
    return (
      <>
        <TopBar title={t('confirmBooking')} />
        <main id="main" tabIndex={-1} className="page">
          {summary}
          <Notice kind="danger">{t('errSlotGone')}</Notice>
          <Link className="btn btn--primary btn--block" to={`/doctor/${d.id}#book`} replace>
            {t('chooseTime')}
          </Link>
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar title={t('confirmBooking')} />
      <main id="main" tabIndex={-1} className="page">
        <ol className="steps" aria-label={t('bookingSteps')}>
          <li data-done="true">{t('stepTime')}</li>
          <li aria-current="step">{t('stepDetails')}</li>
          <li>{t('stepConfirm')}</li>
        </ol>
        {summary}

        <form id="book-form" className="form" onSubmit={submit} noValidate>
          {errors.form && <Notice kind="danger">{errors.form}</Notice>}
          <fieldset className="field" style={{ border: 0, margin: 0, padding: 0 }}>
            <legend className="legend" style={{ marginBottom: 8 }}>{t('bookingFor')}</legend>
            <div className="choice-grid">
              <label className="choice">
                <input type="radio" name="who" checked={forSelf} onChange={() => setForSelf(true)} />
                {t('me')}
              </label>
              <label className="choice">
                <input type="radio" name="who" checked={!forSelf} onChange={() => setForSelf(false)} />
                {t('someoneElse')}
              </label>
            </div>
          </fieldset>

          {forSelf ? (
            <div className="list-card">
              <div className="list-row">
                <Icon name="user" />
                <div className="grow">
                  <div className="label">{t('fullName')}</div>
                  <div style={{ fontWeight: 600 }}>{account.name}</div>
                </div>
              </div>
              <div className="list-row">
                <Icon name="phone" />
                <div className="grow">
                  <div className="label">{t('phone')}</div>
                  <div className="ltr num" style={{ fontWeight: 600 }}>{phoneText(formatPhone(account.phone), lang)}</div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="field">
                <label htmlFor="bk-name">{t('fullName')}</label>
                <input
                  id="bk-name"
                  className="input"
                  autoComplete="off"
                  maxLength={80}
                  value={other.name}
                  onChange={(e) => setOther({ ...other, name: e.target.value })}
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? 'bk-name-err' : undefined}
                />
                <FieldError id="bk-name-err" msg={errors.name} />
              </div>
              <div className="field">
                <label htmlFor="bk-phone">{t('phone')}</label>
                <div className="input-group ltr" data-invalid={!!errors.phone}>
                  <span className="input-group__addon">+964</span>
                  <input
                    id="bk-phone"
                    className="input"
                    type="tel"
                    inputMode="tel"
                    autoComplete="off"
                    maxLength={16}
                    placeholder="750 123 4567"
                    value={other.phone}
                    onChange={(e) => setOther({ ...other, phone: e.target.value })}
                    aria-invalid={!!errors.phone}
                    aria-describedby={errors.phone ? 'bk-phone-err' : undefined}
                  />
                </div>
                <FieldError id="bk-phone-err" msg={errors.phone} />
              </div>
            </>
          )}

          <div className="field">
            <label htmlFor="bk-reason">
              {t('reason')} <span className="muted" style={{ fontWeight: 400 }}>{t('optional')}</span>
            </label>
            <textarea autoComplete="off" id="bk-reason" className="input" rows={2} maxLength={300} placeholder={t('reasonPlaceholder')} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </form>
      </main>
      <div className="footer-bar" role="region" aria-label={t('confirmBooking')}>
        <Notice>{t('demoNoticeLong')}</Notice>
        <button type="submit" form="book-form" className="btn btn--primary btn--block" disabled={busy}>
          {t('confirmBooking')}
        </button>
      </div>
    </>
  );
}

