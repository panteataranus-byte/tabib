export type Lang = 'ar' | 'ku' | 'en';
export type Text = Record<Lang, string>;

export type Confidence = 'high' | 'medium' | 'low';

export interface Place {
  id: string;
  kind: 'hospital' | 'center' | 'clinic' | 'university';
  sector: 'public' | 'private' | 'charity';
  name: Text;
  address: Text | null;
  phones: string[];
  phoneNote: string | null;
  email: string | null;
  departments: Text | null;
  source: string;
  confidence: Confidence;
  emergency24?: boolean;
  hours?: Text;
  stale?: string;
}

export type DoctorFlag = 'noPhone' | 'universityPhone' | 'cityUnconfirmed' | 'stale' | 'specialtyInferred';

export interface Doctor {
  id: string;
  title: 'dr' | 'prof' | 'opdr' | 'od';
  name: Text;
  arabicFromSource: boolean;
  specialty: string;
  detail: Text | null;
  placeId: string | null;
  privateClinic: boolean;
  address: Text | null;
  phones: string[];
  phoneNote: string | null;
  source: string;
  flags: DoctorFlag[];
}

export interface Dataset {
  generated: string;
  specialties: Record<string, Text>;
  places: Place[];
  doctors: Doctor[];
}
