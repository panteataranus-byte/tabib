import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n, type TextSize } from '../i18n/i18n';
import { useApp } from '../store/AppState';
import { strings } from '../i18n/strings';
import type { Lang } from '../data/types';
import { Icon } from '../components/Icon';
import { ConfirmDialog, TopBar } from '../components/ui';

const LANGS: Lang[] = ['ar', 'ku', 'en'];

/** Language switcher for the header. Each language is written in its own script so anyone can find theirs. */
export function LanguageButton() {
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" className="pill-btn" aria-expanded={open} aria-controls={id} aria-label={`${t('language')}: ${strings[lang].langName}`} onClick={() => setOpen(!open)}>
        <Icon name="globe" />
        {strings[lang].langName}
      </button>
      {open && (
        <ul id={id} className="card" style={{ position: 'absolute', insetInlineEnd: 0, top: 'calc(100% + 6px)', zIndex: 20, listStyle: 'none', margin: 0, padding: 6, gap: 2, minInlineSize: 160, boxShadow: 'var(--shadow)' }}>
          {LANGS.map((l) => (
            <li key={l}>
              <button
                type="button"
                lang={l === 'ku' ? 'ckb' : l}
                className="btn btn--ghost"
                style={{ inlineSize: '100%', justifyContent: 'flex-start', color: 'var(--ink)', fontWeight: l === lang ? 600 : 400 }}
                aria-current={l === lang}
                onClick={() => {
                  setLang(l);
                  setOpen(false);
                }}
              >
                {l === lang && <Icon name="check" />}
                {strings[l].langName}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Settings() {
  const { t, lang, setLang, textSize, setTextSize } = useI18n();
  const { account, signOut, deleteAccount } = useApp();
  const nav = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const sizes: [TextSize, 'textNormal' | 'textLarge' | 'textXL'][] = [
    ['normal', 'textNormal'],
    ['large', 'textLarge'],
    ['xl', 'textXL'],
  ];
  return (
    <>
      <TopBar title={t('settings')} />
      <main id="main" tabIndex={-1} className="page">
        <section className="settings-group" aria-labelledby="h-lang">
          <h2 id="h-lang" style={{ fontSize: '1.05rem' }}>{t('language')}</h2>
          <div className="seg" role="group" aria-labelledby="h-lang">
            {LANGS.map((l) => (
              <button key={l} type="button" lang={l === 'ku' ? 'ckb' : l} aria-pressed={l === lang} onClick={() => setLang(l)}>
                {strings[l].langName}
              </button>
            ))}
          </div>
        </section>
        <section className="settings-group" aria-labelledby="h-size">
          <h2 id="h-size" style={{ fontSize: '1.05rem' }}>{t('textSize')}</h2>
          <div className="seg" role="group" aria-labelledby="h-size">
            {sizes.map(([s, label], i) => (
              <button key={s} type="button" aria-pressed={s === textSize} onClick={() => setTextSize(s)} style={{ fontSize: `${1 + i * 0.15}rem` }}>
                {t(label)}
              </button>
            ))}
          </div>
        </section>
        <section className="card" aria-labelledby="h-about">
          <h2 id="h-about" style={{ fontSize: '1.05rem' }}>{t('about')}</h2>
          <p className="prose">{t('aboutBody')}</p>
        </section>
        <section className="card" aria-labelledby="h-privacy">
          <h2 id="h-privacy" style={{ fontSize: '1.05rem' }}>
            <Icon name="lock" width={20} height={20} style={{ verticalAlign: '-3px', marginInlineEnd: 6 }} />
            {t('privacy')}
          </h2>
          <p className="prose">{t('privacyBody')}</p>
        </section>
        {account && (
          <>
            <button type="button" className="btn btn--outline" onClick={signOut}>
              <Icon name="logout" className="flip-rtl" />
              {t('signOut')}
            </button>
            <button type="button" className="btn btn--ghost" style={{ color: 'var(--danger-ink)' }} onClick={() => setConfirmDelete(true)}>
              <Icon name="trash" />
              {t('deleteAccount')}
            </button>
          </>
        )}
      </main>
      {confirmDelete && (
        <ConfirmDialog
          title={t('deleteAccount')}
          body={t('deleteConfirm')}
          confirm={t('yesDelete')}
          cancel={t('cancel')}
          danger
          onClose={() => setConfirmDelete(false)}
          onConfirm={async () => {
            await deleteAccount();
            setConfirmDelete(false);
            nav('/', { replace: true });
          }}
        />
      )}
    </>
  );
}
