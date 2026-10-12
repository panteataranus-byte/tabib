import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useI18n } from '../i18n/i18n';
import { browseGroups, countIn, data, normalise, placeSearchText, searchText } from '../data';
import { Icon } from '../components/Icon';
import { DoctorCard, PlaceCard, TopBar } from '../components/ui';

// Doctors with current, complete details come first; stale or unconfirmed entries sink to the end.
const caution = (flags: string[]) => (flags.includes('stale') ? 2 : 0) + (flags.includes('cityUnconfirmed') || flags.includes('noPhone') ? 1 : 0);
const doctorIndex = data.doctors
  .map((d) => ({ d, text: searchText(d) }))
  .sort((a, b) => caution(a.d.flags) - caution(b.d.flags));
const placeIndex = data.places.map((p) => ({ p, text: placeSearchText(p) }));

export default function Search() {
  const { t, tx, n, plural } = useI18n();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const spec = params.get('s') ?? '';
  const type = params.get('type') === 'places' ? 'places' : 'doctors';
  const group = browseGroups.find((g) => g.key === spec);

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) v ? next.set(k, v) : next.delete(k);
    setParams(next, { replace: true });
  };

  const terms = normalise(q).split(' ').filter(Boolean);
  const matches = (text: string) => terms.every((term) => text.includes(term));

  const doctors = useMemo(
    () => doctorIndex.filter(({ d, text }) => (!group || group.members.includes(d.specialty)) && matches(text)).map((x) => x.d),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q, spec],
  );
  const places = useMemo(
    () => placeIndex.filter(({ text }) => matches(text)).map((x) => x.p),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q],
  );
  const list = type === 'doctors' ? doctors : places;
  const title = group && type === 'doctors' ? tx(data.specialties[group.key]) : t('navSearch');

  return (
    <>
      <TopBar title={title} />
      <main id="main" tabIndex={-1} className="page">
        <form role="search" onSubmit={(e) => e.preventDefault()}>
          <label className="searchbox searchbox--flat">
            <Icon name="search" />
            <span className="sr-only">{t('searchLabel')}</span>
            <input type="search" value={q} onChange={(e) => update({ q: e.target.value })} placeholder={t('searchPlaceholder')} enterKeyHint="search" />
            {q && (
              <button type="button" className="icon-btn" style={{ background: 'transparent' }} aria-label={t('clearSearch')} onClick={() => update({ q: '' })}>
                <Icon name="close" />
              </button>
            )}
          </label>
        </form>

        <div className="tabs" role="tablist" aria-label={t('navSearch')}>
          <button type="button" role="tab" className="tab" aria-selected={type === 'doctors'} onClick={() => update({ type: '' })}>
            <span>{t('doctors')}</span>
            <span className="tab-count">{n(doctors.length)}</span>
          </button>
          <button type="button" role="tab" className="tab" aria-selected={type === 'places'} onClick={() => update({ type: 'places' })}>
            <span>{t('places')}</span>
            <span className="tab-count">{n(places.length)}</span>
          </button>
        </div>

        {type === 'doctors' && (
          <div className="chips" role="group" aria-label={t('filterBySpecialty')}>
            <button type="button" className="chip" aria-pressed={!group} onClick={() => update({ s: '' })}>
              {t('all')}
            </button>
            {browseGroups.map((g) => (
              <button key={g.key} type="button" className="chip" aria-pressed={group?.key === g.key} onClick={() => update({ s: g.key })}>
                {tx(data.specialties[g.key])} · {n(countIn(g.members))}
              </button>
            ))}
          </div>
        )}

        <p className="muted small" role="status" aria-live="polite">
          {plural('results', list.length)}
        </p>

        {list.length === 0 ? (
          <div className="empty">
            <Icon name="search" />
            <p style={{ fontWeight: 600, color: 'var(--ink)' }}>{t('noResults', { q })}</p>
            <p>{t('noResultsHint')}</p>
          </div>
        ) : type === 'doctors' ? (
          doctors.map((d) => <DoctorCard key={d.id} d={d} />)
        ) : (
          places.map((p) => <PlaceCard key={p.id} p={p} />)
        )}
      </main>
    </>
  );
}
