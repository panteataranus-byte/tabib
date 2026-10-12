import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Lang, Text } from '../data/types';
import { strings, type StringKey } from './strings';
import { prefs } from '../store/prefs';

export type TextSize = 'normal' | 'large' | 'xl';

type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };
const PLURALS: Record<string, Record<Lang, PluralForms>> = {
  doctors: {
    ar: { one: 'طبيب واحد', two: 'طبيبان', few: '{n} أطباء', many: '{n} طبيباً', other: '{n} طبيب' },
    ku: { other: '{n} پزیشک' },
    en: { one: '1 doctor', other: '{n} doctors' },
  },
  places: {
    ar: { one: 'مكان واحد', two: 'مكانان', few: '{n} أماكن', many: '{n} مكاناً', other: '{n} مكان' },
    ku: { other: '{n} شوێن' },
    en: { one: '1 place', other: '{n} places' },
  },
  specialties: {
    ar: { one: 'تخصص واحد', two: 'تخصصان', few: '{n} تخصصات', many: '{n} تخصصاً', other: '{n} تخصص' },
    ku: { other: '{n} پسپۆڕی' },
    en: { one: '1 specialty', other: '{n} specialties' },
  },
  results: {
    ar: { one: 'نتيجة واحدة', two: 'نتيجتان', few: '{n} نتائج', many: '{n} نتيجة', other: '{n} نتيجة' },
    ku: { other: '{n} ئەنجام' },
    en: { one: '1 result', other: '{n} results' },
  },
  years: {
    ar: { one: 'سنة واحدة', two: 'سنتان', few: '{n} سنوات', many: '{n} سنة', other: '{n} سنة' },
    ku: { other: '{n} ساڵ' },
    en: { one: '1 year', other: '{n} years' },
  },
};
export type PluralKey = keyof typeof PLURALS;

const EASTERN = '٠١٢٣٤٥٦٧٨٩';
/** Arabic and Kurdish show Eastern Arabic digits (١٢٣); English shows 123. */
export const localDigits = (s: string, lang: Lang) => (lang === 'en' ? s : s.replace(/[0-9]/g, (d) => EASTERN[+d]));
/**
 * Phone numbers stay left-to-right in every language. Eastern Arabic digits are bidi "Arabic numbers",
 * so groups separated by spaces would otherwise be laid out right-to-left; a left-to-right mark
 * around each space keeps "+964 750 …" in order.
 */
export const phoneText = (phone: string, lang: Lang) => '\u200E' + localDigits(phone, lang).split(' ').join('\u200E \u200E') + '\u200E';
/** Anything a person types is stored with Western digits, whichever keyboard they used. */
export const westernDigits = (s: string) =>
  s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));

const pluralRules: Record<Lang, Intl.PluralRules> = {
  ar: new Intl.PluralRules('ar'),
  ku: new Intl.PluralRules('en'),
  en: new Intl.PluralRules('en'),
};

interface I18n {
  lang: Lang;
  dir: 'rtl' | 'ltr';
  setLang: (l: Lang) => void;
  textSize: TextSize;
  setTextSize: (s: TextSize) => void;
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
  /** Pick this language's version of a translated data field. */
  tx: (text: Text | null | undefined) => string;
  n: (value: number | string) => string;
  plural: (key: PluralKey, count: number) => string;
  list: (key: 'months' | 'monthsShort' | 'weekdays' | 'weekdaysShort') => string[];
  date: (d: Date, style?: 'long' | 'short') => string;
  time: (hhmm: string) => string;
}

const Ctx = createContext<I18n | null>(null);

const oneOf = <T extends string>(v: string, allowed: readonly T[], fallback: T): T => ((allowed as readonly string[]).includes(v) ? (v as T) : fallback);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => oneOf(prefs.get('lang', ''), ['ar', 'ku', 'en'] as const, 'ar'));
  const [textSize, setTextSizeState] = useState<TextSize>(() => oneOf(prefs.get('textSize', ''), ['normal', 'large', 'xl'] as const, 'normal'));
  const dir = lang === 'en' ? 'ltr' : 'rtl';

  useEffect(() => {
    const html = document.documentElement;
    html.lang = lang === 'ku' ? 'ckb' : lang;
    html.dir = dir;
    html.dataset.textSize = textSize;
    document.title = `${strings[lang].appName} · ${strings[lang].tagline}`;
  }, [lang, dir, textSize]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    prefs.set('lang', l);
  }, []);
  const setTextSize = useCallback((s: TextSize) => {
    setTextSizeState(s);
    prefs.set('textSize', s);
  }, []);

  const value = useMemo<I18n>(() => {
    const dict = strings[lang];
    const fill = (s: string, vars?: Record<string, string | number>) =>
      vars ? s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`)) : s;
    const t: I18n['t'] = (key, vars) => localDigits(fill(dict[key], vars), lang);
    const list: I18n['list'] = (key) => dict[key].split(',');
    const n: I18n['n'] = (v) => localDigits(String(v), lang);
    return {
      lang,
      dir,
      setLang,
      textSize,
      setTextSize,
      t,
      tx: (text) => (text ? localDigits(text[lang] || text.en, lang) : ''),
      n,
      plural: (key, count) => {
        const forms = PLURALS[key][lang];
        const form = forms[pluralRules[lang].select(count)] ?? forms.other;
        return localDigits(form.replace('{n}', String(count)), lang);
      },
      list,
      date: (d, style = 'long') =>
        localDigits(
          style === 'long'
            ? `${list('weekdays')[d.getDay()]} ${d.getDate()} ${list('months')[d.getMonth()]} ${d.getFullYear()}`
            : `${list('weekdays')[d.getDay()]} ${d.getDate()}`,
          lang,
        ),
      time: (hhmm) => {
        const [h, m] = hhmm.split(':').map(Number);
        const h12 = ((h + 11) % 12) + 1;
        return localDigits(`${h12}:${String(m).padStart(2, '0')} ${h < 12 ? dict.am : dict.pm}`, lang);
      },
    };
  }, [lang, dir, setLang, textSize, setTextSize]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const v = useContext(Ctx);
  if (!v) throw new Error('useI18n outside I18nProvider');
  return v;
}
