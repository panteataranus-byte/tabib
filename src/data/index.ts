import raw from './erbil-health.json';
import type { Dataset, Doctor, Lang, Place } from './types';

export const data = raw as Dataset;

const placeById = new Map(data.places.map((p) => [p.id, p]));
const doctorById = new Map(data.doctors.map((d) => [d.id, d]));

export const getPlace = (id: string | null | undefined): Place | undefined => (id ? placeById.get(id) : undefined);
export const getDoctor = (id: string | undefined): Doctor | undefined => (id ? doctorById.get(id) : undefined);
export const doctorsAt = (placeId: string): Doctor[] => data.doctors.filter((d) => d.placeId === placeId);

/** Phone numbers a person can actually call for this doctor: their own, else their workplace's. */
export function contactPhones(d: Doctor): { phones: string[]; viaPlace: boolean } {
  if (d.phones.length) return { phones: d.phones, viaPlace: false };
  const p = getPlace(d.placeId);
  return { phones: p?.phones ?? [], viaPlace: true };
}

export function doctorAddress(d: Doctor) {
  return d.address ?? getPlace(d.placeId)?.address ?? null;
}

/** Specialties ordered by how many doctors they have, with counts. Optometry is folded into eyes for browsing. */
export const browseGroups: { key: string; members: string[] }[] = [
  { key: 'eyes', members: ['eyes', 'optometry'] },
  { key: 'obgyn', members: ['obgyn'] },
  { key: 'dental', members: ['dental', 'ortho'] },
  { key: 'neuro', members: ['neuro'] },
  { key: 'ent', members: ['ent'] },
  { key: 'psych', members: ['psych'] },
  { key: 'cardio', members: ['cardio'] },
  { key: 'derm', members: ['derm'] },
  { key: 'surgery', members: ['surgery'] },
  { key: 'urology', members: ['urology'] },
  { key: 'gastro', members: ['gastro'] },
  { key: 'radiology', members: ['radiology'] },
  { key: 'hemonc', members: ['hemonc'] },
  { key: 'occup', members: ['occup'] },
  { key: 'general', members: ['general'] },
];

export function countIn(members: string[]) {
  return data.doctors.filter((d) => members.includes(d.specialty)).length;
}

/** Arabic-script search normalisation: folds alef/ya/ta-marbuta/kaf variants and Kurdish letters so
 *  "احمد", "أحمد" and "ئەحمەد" all match, and strips titles and diacritics. */
export function normalise(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[ً-ٰٟ̀-ͯ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ئ/g, 'ا')
    .replace(/[ىيێ]/g, 'ی')
    .replace(/[ةە]/g, 'ه')
    .replace(/ك/g, 'ک')
    .replace(/[ڕر]/g, 'ر')
    .replace(/[ڵل]/g, 'ل')
    .replace(/[ۆو]/g, 'و')
    .replace(/[ـ\-'’.,()]/g, ' ')
    .replace(/\b(dr|prof|op)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function searchText(d: Doctor): string {
  const p = getPlace(d.placeId);
  const langs: Lang[] = ['ar', 'ku', 'en'];
  return normalise(
    [
      ...langs.map((l) => d.name[l]),
      ...langs.map((l) => data.specialties[d.specialty]?.[l] ?? ''),
      ...(d.detail ? langs.map((l) => d.detail![l]) : []),
      ...(p ? langs.map((l) => p.name[l]) : []),
    ].join(' '),
  );
}

export function placeSearchText(p: Place): string {
  const langs: Lang[] = ['ar', 'ku', 'en'];
  return normalise(
    [...langs.map((l) => p.name[l]), ...(p.departments ? langs.map((l) => p.departments![l]) : []), ...(p.address ? langs.map((l) => p.address![l]) : [])].join(' '),
  );
}
