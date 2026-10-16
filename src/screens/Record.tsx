import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/i18n';
import { FileError, MAX_FILE_MB, useApp } from '../store/AppState';
import type { ListSection } from '../store/types';
import { getDoctor, getPlace } from '../data';
import { Icon, type IconName } from '../components/Icon';
import { ConfirmDialog, Notice, initial, useDoctorName } from '../components/ui';
import { parseIso, startsAt } from '../schedule';
import { ageFrom, cleanText } from '../validate';
import SignInPrompt from './SignInPrompt';

const BLOOD = ['', 'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
const SECTIONS: { key: ListSection; icon: IconName; label: 'allergies' | 'conditions' | 'medications'; danger?: boolean }[] = [
  { key: 'allergies', icon: 'alert', label: 'allergies', danger: true },
  { key: 'conditions', icon: 'pulse', label: 'conditions' },
  { key: 'medications', icon: 'pill', label: 'medications' },
];

/** Example entries so a portfolio visitor can see a filled-in file in one tap. Clearly labelled as examples. */
const SAMPLE = {
  ar: { allergies: ['البنسلين'], conditions: ['ارتفاع ضغط الدم'], medications: ['أملوديبين ٥ ملغ، مرة يومياً'] },
  ku: { allergies: ['پەنسلین'], conditions: ['بەرزیی پەستانی خوێن'], medications: ['ئەملۆدیپین ٥ ملگم، ڕۆژانە جارێک'] },
  en: { allergies: ['Penicillin'], conditions: ['High blood pressure'], medications: ['Amlodipine 5 mg, once a day'] },
};

/** Removes one entry by its text, so it is still the right one if the list changed meanwhile. */
const removeFirst = (list: string[], item: string, key: ListSection) => {
  const at = list.indexOf(item);
  return { [key]: at < 0 ? list : list.filter((_, j) => j !== at) };
};

function ListBlock({ s }: { s: (typeof SECTIONS)[number] }) {
  const { t } = useI18n();
  const { vault, updateRecord } = useApp();
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState('');
  const items = vault!.record[s.key];
  const inputId = `add-${s.key}`;
  const add = async (e: FormEvent) => {
    e.preventDefault();
    const v = cleanText(value, 120);
    if (!v) return;
    await updateRecord((r) => ({ [s.key]: [...r[s.key], v] }));
    setValue('');
    setAdding(false);
  };
  return (
    <div className="list-row" style={{ alignItems: 'flex-start' }}>
      <span className="tile" style={{ inlineSize: 40, blockSize: 40, borderRadius: 12, background: s.danger ? 'var(--danger-bg)' : undefined, color: s.danger ? 'var(--danger-ink)' : undefined }} aria-hidden="true">
        <Icon name={s.icon} width={22} height={22} />
      </span>
      <div className="grow" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <h3 className="label" style={{ fontWeight: 400 }}>{t(s.label)}</h3>
        {items.length === 0 && !adding && <span className="muted small">{t('none')}</span>}
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {items.map((it, i) => (
            <li key={i} className="row" style={{ gap: 6 }}>
              <span className="grow" style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{it}</span>
              <button type="button" className="icon-btn" style={{ inlineSize: 40, blockSize: 40, background: 'transparent' }} aria-label={`${t('remove')}: ${it}`} onClick={() => updateRecord((r) => removeFirst(r[s.key], it, s.key))}>
                <Icon name="close" width={18} height={18} />
              </button>
            </li>
          ))}
        </ul>
        {adding && (
          <form onSubmit={add} className="row" style={{ gap: 6 }}>
            <label htmlFor={inputId} className="sr-only">{t('addItem', { section: t(s.label) })}</label>
            <input id={inputId} className="input grow" autoFocus autoComplete="off" maxLength={120} value={value} onChange={(e) => setValue(e.target.value)} />
            <button type="submit" className="btn btn--primary">{t('save')}</button>
          </form>
        )}
      </div>
      {!adding && (
        <button type="button" className="icon-btn" style={{ border: '1.5px solid var(--line)', background: 'var(--surface)', color: 'var(--brand-strong)' }} aria-label={t('addItem', { section: t(s.label) })} onClick={() => setAdding(true)}>
          <Icon name="plus" />
        </button>
      )}
    </div>
  );
}

export default function Record() {
  const { t, tx, n, plural, time, list, lang, date } = useI18n();
  const { account, vault, updateRecord, addDocument, readDocument, removeDocument, signOut } = useApp();
  const name = useDoctorName();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState('');
  const [removing, setRemoving] = useState<string | null>(null);

  if (!account || !vault) return <SignInPrompt title={t('myFile')} />;
  const r = vault.record;
  const next = vault.appointments
    .filter((a) => a.status === 'booked' && startsAt(a.date, a.time) >= Date.now())
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];
  const nd = next && getDoctor(next.doctorId);
  const isEmpty = !r.allergies.length && !r.conditions.length && !r.medications.length && !r.bloodType;

  const upload = async (file: File | undefined) => {
    setFileError('');
    if (!file) return;
    try {
      await addDocument(file);
    } catch (e) {
      setFileError(e instanceof FileError ? (e.code === 'size' ? t('fileTooBig', { n: MAX_FILE_MB }) : t('fileType')) : t('errStorage'));
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };
  const openDoc = async (id: string) => {
    setFileError('');
    const blob = await readDocument(id).catch(() => null);
    if (!blob) return setFileError(t('errOpenFile'));
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  return (
    <>
      <header className="hero" style={{ flexDirection: 'row', alignItems: 'center' }}>
        <span className="avatar" style={{ inlineSize: 64, blockSize: 64, background: 'var(--surface)', color: 'var(--soft-ink)', fontSize: '1.6rem' }} aria-hidden="true">
          {initial(account.name)}
        </span>
        <div className="grow">
          <h1 style={{ fontSize: '1.2rem' }}>{account.name}</h1>
          <p className="hero__sub">
            {plural('years', ageFrom(account.birthDate))} · {t('bloodType')} <span className="ltr">{r.bloodType || t('unknown')}</span>
          </p>
        </div>
        <Link to="/settings" className="icon-btn" aria-label={t('settings')}>
          <Icon name="settings" />
        </Link>
      </header>

      <main id="main" tabIndex={-1} className="page">
        {next && nd && (
          <section className="card" aria-labelledby="h-next">
            <h2 id="h-next" style={{ fontSize: '1rem', color: 'var(--soft-ink)' }}>{t('nextAppointment')}</h2>
            <div className="row">
              <div className="datebox datebox--soft">
                <div className="datebox__small">{list('monthsShort')[parseIso(next.date).getMonth()]}</div>
                <div className="datebox__num">{n(parseIso(next.date).getDate())}</div>
              </div>
              <div className="grow">
                <Link to="/appointments" style={{ fontWeight: 600, color: 'var(--ink)' }}>{name(nd)}</Link>
                <p className="meta">
                  {date(parseIso(next.date), 'short')} · {time(next.time)}
                  {getPlace(nd.placeId) ? ` · ${tx(getPlace(nd.placeId)!.name)}` : ''}
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="list-card" aria-labelledby="h-health">
          <h2 id="h-health" className="sr-only">{t('myFile')}</h2>
          <div className="list-row">
            <span className="tile" style={{ inlineSize: 40, blockSize: 40, borderRadius: 12 }} aria-hidden="true">
              <Icon name="drop" width={22} height={22} />
            </span>
            <label htmlFor="blood" className="grow label">{t('bloodType')}</label>
            <select id="blood" className="input ltr" style={{ inlineSize: 'auto', minInlineSize: 110 }} value={r.bloodType} onChange={(e) => updateRecord({ bloodType: e.target.value })}>
              {BLOOD.map((b) => (
                <option key={b} value={b}>
                  {b || t('unknown')}
                </option>
              ))}
            </select>
          </div>
          {SECTIONS.map((s) => (
            <ListBlock key={s.key} s={s} />
          ))}
        </section>

        {isEmpty && (
          <button type="button" className="btn btn--ghost" onClick={() => updateRecord({ ...SAMPLE[lang], bloodType: 'O+' })}>
            {t('sampleData')}
          </button>
        )}

        <section className="card" aria-labelledby="h-docs">
          <div className="section__head" style={{ alignItems: 'center' }}>
            <h2 id="h-docs" style={{ fontSize: '1.05rem' }}>{t('documents')}</h2>
            <button type="button" className="btn btn--soft" onClick={() => fileRef.current?.click()}>
              <Icon name="upload" />
              {t('uploadFile')}
            </button>
            <input ref={fileRef} type="file" accept="application/pdf,image/jpeg,image/png" hidden onChange={(e) => upload(e.target.files?.[0])} aria-label={t('uploadFile')} />
          </div>
          {fileError && <Notice kind="danger">{fileError}</Notice>}
          {r.documents.length === 0 && <p className="muted small">{t('none')}</p>}
          {r.documents.map((d) => (
            <div key={d.id} className="row">
              <span className="tile" style={{ inlineSize: 40, blockSize: 48, borderRadius: 8, fontSize: '0.7rem', fontWeight: 600 }} aria-hidden="true">
                {d.type === 'application/pdf' ? 'PDF' : d.type === 'image/png' ? 'PNG' : 'JPG'}
              </span>
              <div className="grow">
                <button type="button" className="btn btn--ghost" style={{ padding: 0, minBlockSize: 0, fontWeight: 600, color: 'var(--ink)', textAlign: 'start' }} onClick={() => openDoc(d.id)}>
                  <span style={{ overflowWrap: 'anywhere' }}>{d.name}</span>
                </button>
                <div className="meta">{date(new Date(d.addedAt), 'short')} · {n(Math.max(1, Math.round(d.size / 1024)))} KB</div>
              </div>
              <button type="button" className="icon-btn" style={{ background: 'transparent' }} aria-label={`${t('remove')}: ${d.name}`} onClick={() => setRemoving(d.id)}>
                <Icon name="trash" />
              </button>
            </div>
          ))}
        </section>

        <Notice kind="info">{t('privateNote')}</Notice>
        <button type="button" className="btn btn--outline" onClick={signOut}>
          <Icon name="logout" className="flip-rtl" />
          {t('signOut')}
        </button>
      </main>
      {removing && (
        <ConfirmDialog
          title={`${t('remove')}?`}
          confirm={t('remove')}
          cancel={t('cancel')}
          danger
          onClose={() => setRemoving(null)}
          onConfirm={async () => {
            await removeDocument(removing);
            setRemoving(null);
          }}
        />
      )}
    </>
  );
}
