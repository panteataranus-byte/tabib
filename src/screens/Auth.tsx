import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useI18n, westernDigits } from '../i18n/i18n';
import { useApp } from '../store/AppState';
import { AuthError } from '../store/types';
import { Icon, Logo } from '../components/Icon';
import { FieldError, Notice } from '../components/ui';
import { cleanText, normalisePhone, validBirthDate, validName } from '../validate';

/** Only same-app paths are allowed after sign-in, so a crafted link cannot send people to another site. */
export function safeNext(raw: string | null) {
  return raw && raw.startsWith('/') && !raw.startsWith('//') && !raw.includes('\\') ? raw : '/record';
}

type Errors = Partial<Record<'name' | 'phone' | 'birth' | 'password' | 'agree' | 'form', string>>;

function PasswordField({ value, onChange, error, autoComplete }: { value: string; onChange: (v: string) => void; error?: string; autoComplete: string }) {
  const { t } = useI18n();
  const [show, setShow] = useState(false);
  return (
    <div className="field">
      <label htmlFor="au-pass">{t('password')}</label>
      <div className="input-group" data-invalid={!!error}>
        <input
          id="au-pass"
          className="input"
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          maxLength={128}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={`au-pass-hint${error ? ' au-pass-err' : ''}`}
        />
        <button type="button" className="icon-btn" aria-label={show ? t('hidePassword') : t('showPassword')} aria-pressed={show} onClick={() => setShow(!show)}>
          <Icon name={show ? 'eyeOff' : 'eye'} />
        </button>
      </div>
      <p id="au-pass-hint" className="field__hint">{t('passwordHint')}</p>
      <FieldError id="au-pass-err" msg={error} />
    </div>
  );
}

function PhoneField({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  const { t } = useI18n();
  return (
    <div className="field">
      <label htmlFor="au-phone">{t('phone')}</label>
      <div className="input-group ltr" data-invalid={!!error}>
        <span className="input-group__addon">+964</span>
        <input
          id="au-phone"
          className="input"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="750 123 4567"
          maxLength={16}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? 'au-phone-err' : undefined}
        />
      </div>
      <FieldError id="au-phone-err" msg={error} />
    </div>
  );
}

function AuthHeader({ title, sub }: { title: string; sub?: string }) {
  const { t } = useI18n();
  return (
    <header className="hero">
      <div className="hero__row">
        <Link to="/" className="icon-btn" aria-label={t('navHome')}>
          <Icon name="back" className="flip-rtl" />
        </Link>
        <span style={{ inlineSize: 44, blockSize: 44 }}>
          <Logo inverted />
        </span>
      </div>
      <div>
        <h1 className="hero__title">{title}</h1>
        {sub && <p className="hero__sub">{sub}</p>}
      </div>
    </header>
  );
}

const focusFirst = (errs: Errors, order: (keyof Errors)[], ids: Record<string, string>) => {
  const first = order.find((k) => errs[k]);
  if (first) document.getElementById(ids[first])?.focus();
};

const authMessage = (e: unknown, t: ReturnType<typeof useI18n>['t']) => {
  if (e instanceof AuthError) {
    if (e.code === 'exists') return t('errExists');
    if (e.code === 'login') return t('errLogin');
    if (e.code === 'locked') return t('errLocked', { n: e.retryAfter });
  }
  return t('errStorage');
};

export function SignUp() {
  const { t, list } = useI18n();
  const { account, signUp } = useApp();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const next = safeNext(params.get('next'));
  const [f, setF] = useState({ name: '', phone: '', day: '', month: '', year: '', password: '', agree: false });
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  if (account && !busy) return <Navigate to={next} replace />;

  const set = (k: keyof typeof f) => (v: string | boolean) => setF((p) => ({ ...p, [k]: v }));
  const birth = () => {
    const y = westernDigits(f.year).trim();
    const d = westernDigits(f.day).trim();
    return `${y.padStart(4, '0')}-${f.month.padStart(2, '0')}-${d.padStart(2, '0')}`;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Errors = {};
    const phone = normalisePhone(f.phone);
    if (!validName(f.name)) errs.name = t('errName');
    if (!phone) errs.phone = t('errPhone');
    if (!validBirthDate(birth())) errs.birth = t('errBirth');
    if (f.password.length < 8) errs.password = t('errPassword');
    if (!f.agree) errs.agree = t('errAgree');
    setErrors(errs);
    if (Object.keys(errs).length) {
      focusFirst(errs, ['name', 'phone', 'birth', 'password', 'agree'], { name: 'au-name', phone: 'au-phone', birth: 'au-day', password: 'au-pass', agree: 'au-agree' });
      return;
    }
    setBusy(true);
    try {
      await signUp({ name: cleanText(f.name, 80), phone: phone!, birthDate: birth(), password: f.password });
      nav(next, { replace: true });
    } catch (err) {
      setErrors({ form: authMessage(err, t) });
      setBusy(false);
    }
  };

  return (
    <>
      <AuthHeader title={t('signUpTitle')} sub={t('signUpSub')} />
      <main id="main" tabIndex={-1} className="page">
        <form className="form" onSubmit={submit} noValidate>
          {errors.form && (
            <div role="alert">
              <Notice kind="danger">{errors.form}</Notice>
            </div>
          )}
          <div className="field">
            <label htmlFor="au-name">{t('fullName')}</label>
            <input
              id="au-name"
              className="input"
              autoComplete="name"
              placeholder={t('fullNameHint')}
              maxLength={80}
              value={f.name}
              onChange={(e) => set('name')(e.target.value)}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'au-name-err' : undefined}
            />
            <FieldError id="au-name-err" msg={errors.name} />
          </div>
          <PhoneField value={f.phone} onChange={set('phone')} error={errors.phone} />
          <fieldset className="field" style={{ border: 0, margin: 0, padding: 0 }} aria-describedby={errors.birth ? 'au-birth-err' : undefined}>
            <legend className="legend" style={{ marginBottom: 6 }}>{t('birthDate')}</legend>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1.3fr', gap: 8 }}>
              <input id="au-day" className="input num" inputMode="numeric" maxLength={2} placeholder={t('dayLabel')} aria-label={t('dayLabel')} value={f.day} onChange={(e) => set('day')(e.target.value)} aria-invalid={!!errors.birth} autoComplete="bday-day" />
              <select className="input" aria-label={t('monthLabel')} value={f.month} onChange={(e) => set('month')(e.target.value)} aria-invalid={!!errors.birth} autoComplete="bday-month">
                <option value="">—</option>
                {list('months').map((m, i) => (
                  <option key={m} value={String(i + 1)}>
                    {m}
                  </option>
                ))}
              </select>
              <input className="input num" inputMode="numeric" maxLength={4} placeholder={t('yearLabel')} aria-label={t('yearLabel')} value={f.year} onChange={(e) => set('year')(e.target.value)} aria-invalid={!!errors.birth} autoComplete="bday-year" />
            </div>
            <FieldError id="au-birth-err" msg={errors.birth} />
          </fieldset>
          <PasswordField value={f.password} onChange={set('password')} error={errors.password} autoComplete="new-password" />
          <div className="field">
            <label className="check">
              <input id="au-agree" type="checkbox" checked={f.agree} onChange={(e) => set('agree')(e.target.checked)} aria-invalid={!!errors.agree} aria-describedby={errors.agree ? 'au-agree-err' : undefined} />
              <span>{t('agree')}</span>
            </label>
            <FieldError id="au-agree-err" msg={errors.agree} />
          </div>
          <Notice kind="info">{t('privateNote')}</Notice>
          <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
            {busy ? <span className="spinner" style={{ inlineSize: 22, blockSize: 22 }} /> : t('signUp')}
          </button>
          <p style={{ textAlign: 'center' }}>
            {t('haveAccount')} <Link to={`/login?next=${encodeURIComponent(next)}`} style={{ fontWeight: 600 }}>{t('signIn')}</Link>
          </p>
          <p className="prose small" id="privacy">{t('privacyBody')}</p>
        </form>
      </main>
    </>
  );
}

export function SignIn() {
  const { t } = useI18n();
  const { account, signIn } = useApp();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const next = safeNext(params.get('next'));
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  if (account && !busy) return <Navigate to={next} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const p = normalisePhone(phone);
    const errs: Errors = {};
    if (!p) errs.phone = t('errPhone');
    if (!password) errs.password = t('errRequired');
    setErrors(errs);
    if (Object.keys(errs).length) {
      focusFirst(errs, ['phone', 'password'], { phone: 'au-phone', password: 'au-pass' });
      return;
    }
    setBusy(true);
    try {
      await signIn(p!, password);
      nav(next, { replace: true });
    } catch (err) {
      setErrors({ form: authMessage(err, t) });
      setBusy(false);
    }
  };

  return (
    <>
      <AuthHeader title={t('signInTitle')} />
      <main id="main" tabIndex={-1} className="page">
        <form className="form" onSubmit={submit} noValidate>
          {errors.form && (
            <div role="alert">
              <Notice kind="danger">{errors.form}</Notice>
            </div>
          )}
          <PhoneField value={phone} onChange={setPhone} error={errors.phone} />
          <PasswordField value={password} onChange={setPassword} error={errors.password} autoComplete="current-password" />
          <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
            {busy ? <span className="spinner" style={{ inlineSize: 22, blockSize: 22 }} /> : t('signIn')}
          </button>
          <p style={{ textAlign: 'center' }}>
            {t('noAccount')} <Link to={`/signup?next=${encodeURIComponent(next)}`} style={{ fontWeight: 600 }}>{t('signUp')}</Link>
          </p>
        </form>
      </main>
    </>
  );
}
