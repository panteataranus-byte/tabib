import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { phoneText, useI18n } from '../i18n/i18n';
import type { Doctor, Place } from '../data/types';
import { contactPhones, data, doctorAddress, getPlace, placeTone, toneOf } from '../data';
import { Icon, specialtyIcon } from './Icon';

export function useDoctorName() {
  const { t, tx } = useI18n();
  return (d: Doctor) => {
    const title = { dr: t('titleDr'), prof: t('titleProf'), opdr: t('titleOpDr'), od: '' }[d.title];
    return `${title ? title + ' ' : ''}${tx(d.name)}`;
  };
}

export function initial(name: string) {
  return Array.from(name.trim())[0] ?? '';
}

export function TopBar({ title, back = true }: { title: string; back?: boolean }) {
  const { t } = useI18n();
  const nav = useNavigate();
  return (
    <header className="topbar">
      {back && (
        <button type="button" className="icon-btn" aria-label={t('back')} onClick={() => (history.length > 1 ? nav(-1) : nav('/'))}>
          <Icon name="back" className="flip-rtl" />
        </button>
      )}
      <h1>{title}</h1>
    </header>
  );
}

export function BottomNav() {
  const { t } = useI18n();
  const items = [
    { to: '/', icon: 'home', label: t('navHome'), end: true },
    { to: '/search', icon: 'search', label: t('navSearch') },
    { to: '/appointments', icon: 'calendar', label: t('navAppointments') },
    { to: '/record', icon: 'file', label: t('navRecord') },
  ] as const;
  return (
    <nav className="bottom-nav" aria-label={t('mainMenu')}>
      {items.map((i) => (
        <NavLink key={i.to} to={i.to} end={'end' in i}>
          <Icon name={i.icon} />
          {i.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function Notice({ kind = 'warn', children }: { kind?: 'warn' | 'info' | 'danger'; children: ReactNode }) {
  return (
    <p className={`notice ${kind === 'warn' ? '' : 'notice--' + kind}`}>
      <Icon name={kind === 'info' ? 'lock' : 'info'} />
      <span>{children}</span>
    </p>
  );
}

/** Warnings about data quality, in the person's language, so nobody travels on stale details. */
export function DoctorFlags({ d }: { d: Doctor }) {
  const { t } = useI18n();
  const place = getPlace(d.placeId);
  const msgs: string[] = [];
  if (d.flags.includes('stale')) msgs.push(t('staleInfo', { year: place?.stale ?? '' }));
  if (d.flags.includes('cityUnconfirmed')) msgs.push(t('cityUnconfirmed'));
  if (d.flags.includes('specialtyInferred')) msgs.push(t('specialtyInferred'));
  if (d.flags.includes('universityPhone')) msgs.push(t('universityPhone'));
  if (d.flags.includes('noPhone') && !contactPhones(d).phones.length) msgs.push(t('noPhone'));
  return msgs.length ? (
    <>
      {msgs.map((m) => (
        <Notice key={m}>{m}</Notice>
      ))}
    </>
  ) : null;
}

export function DoctorCard({ d, headingLevel = 2 }: { d: Doctor; headingLevel?: 2 | 3 }) {
  const { t, tx } = useI18n();
  const name = useDoctorName()(d);
  const place = getPlace(d.placeId);
  const addr = doctorAddress(d);
  const { phones } = contactPhones(d);
  const H = headingLevel === 2 ? 'h2' : 'h3';
  const where = place ? tx(place.name) : d.privateClinic ? t('privateClinic') : t('workplaceUnknown');
  return (
    <article className="card">
      <div className="row">
        <span className="avatar" data-tone={toneOf(d.specialty)} aria-hidden="true">{initial(tx(d.name))}</span>
        <div className="grow">
          <H className="card__title">
            <Link to={`/doctor/${d.id}`}>{name}</Link>
          </H>
          <p className="meta">{tx(d.detail) || tx(data.specialties[d.specialty])}</p>
        </div>
      </div>
      <p className="meta">
        <Icon name="pin" />
        <span>{addr ? `${where} · ${tx(addr)}` : where}</span>
      </p>
      {d.flags.includes('stale') && <DoctorFlags d={d} />}
      <div className="actions">
        <Link className="btn btn--primary grow" to={`/doctor/${d.id}#book`}>
          {t('book')}
        </Link>
        {phones[0] && (
          <a className="btn btn--outline btn--icon" href={`tel:${phones[0].replace(/\s/g, '')}`} aria-label={`${t('call')} ${name}`}>
            <Icon name="phone" />
          </a>
        )}
      </div>
    </article>
  );
}

export function PlaceCard({ p, headingLevel = 2 }: { p: Place; headingLevel?: 2 | 3 }) {
  const { t, tx } = useI18n();
  const H = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <article className="card">
      <div className="row">
        <span className="tile" data-tone={placeTone(p)} aria-hidden="true">
          <Icon name={p.kind === 'hospital' ? 'hospital' : 'building'} />
        </span>
        <div className="grow">
          <H className="card__title">
            <Link to={`/place/${p.id}`}>{tx(p.name)}</Link>
          </H>
          {p.address && <p className="meta">{tx(p.address)}</p>}
        </div>
        {p.emergency24 ? (
          <span className="badge badge--danger">{t('emergency24')}</span>
        ) : (
          <span className="badge badge--soft">{t(p.sector)}</span>
        )}
      </div>
    </article>
  );
}

export function SpecialtyTile({ k, count }: { k: string; count: number }) {
  const { tx, plural } = useI18n();
  return (
    <Link className="spec" data-tone={toneOf(k)} to={`/search?s=${k}`}>
      <span className="spec__icon">
        <Icon name={specialtyIcon[k] ?? 'steth'} />
      </span>
      <span className="spec__name">{tx(data.specialties[k])}</span>
      <span className="spec__count">{plural('doctors', count)}</span>
    </Link>
  );
}

export function PhoneRow({ phone, label }: { phone: string; label?: string }) {
  const { t, lang } = useI18n();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard refused: the number is visible and selectable */
    }
  };
  return (
    <div className="list-row">
      <Icon name="phone" />
      <div className="grow">
        {label && <div className="label">{label}</div>}
        <span className="ltr num phone">
          {phoneText(phone, lang)}
        </span>
      </div>
      <button type="button" className="btn btn--ghost small" onClick={copy} aria-live="polite">
        {copied ? t('copied') : t('copy')}
      </button>
      <a className="btn btn--soft" href={`tel:${phone.replace(/\s/g, '')}`}>
        {t('call')}
      </a>
    </div>
  );
}

export function ConfirmDialog({
  title,
  body,
  confirm,
  cancel,
  danger,
  onConfirm,
  onClose,
}: {
  title: string;
  body?: string;
  confirm: string;
  cancel: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const id = useId();
  const ref = useRef<HTMLButtonElement>(null);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return onClose();
      if (e.key !== 'Tab' || !box.current) return;
      // Keep keyboard focus inside the dialog while it is open.
      const items = box.current.querySelectorAll<HTMLElement>('button');
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) (e.preventDefault(), last.focus());
      else if (!e.shiftKey && document.activeElement === last) (e.preventDefault(), first.focus());
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus();
    };
  }, [onClose]);
  return (
    <div className="dialog-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={box} className="dialog" role="alertdialog" aria-modal="true" aria-labelledby={`${id}-t`} aria-describedby={body ? `${id}-b` : undefined}>
        <h2 id={`${id}-t`}>{title}</h2>
        {body && <p id={`${id}-b`}>{body}</p>}
        <div className="actions">
          <button ref={ref} type="button" className="btn btn--outline grow" onClick={onClose}>
            {cancel}
          </button>
          <button type="button" className={`btn grow ${danger ? 'btn--danger' : 'btn--primary'}`} onClick={onConfirm}>
            {confirm}
          </button>
        </div>
      </div>
    </div>
  );
}

export function FieldError({ id, msg }: { id: string; msg?: string }) {
  if (!msg) return null;
  return (
    <p className="field__error" id={id}>
      <Icon name="alert" width={18} height={18} />
      {msg}
    </p>
  );
}

export function Loading() {
  return (
    <div className="loading" role="status">
      <span className="spinner" />
    </div>
  );
}
