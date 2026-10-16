export interface Account {
  id: string;
  name: string;
  phone: string; // national number, Western digits, no spaces: 7501234567
  birthDate: string; // YYYY-MM-DD
}

export interface Appointment {
  id: string;
  doctorId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM, 24h
  forSelf: boolean;
  patientName: string;
  patientPhone: string;
  reason: string;
  status: 'booked' | 'cancelled';
  createdAt: string;
}

export interface DocumentMeta {
  id: string;
  name: string;
  type: 'application/pdf' | 'image/jpeg' | 'image/png';
  size: number;
  addedAt: string;
}

export type ListSection = 'allergies' | 'conditions' | 'medications';

export interface MedicalRecord {
  bloodType: string; // '' = unknown
  allergies: string[];
  conditions: string[];
  medications: string[];
  documents: DocumentMeta[];
}

/** Everything private to one person, stored encrypted as one unit. */
export interface Vault {
  record: MedicalRecord;
  appointments: Appointment[];
}

export const emptyVault = (): Vault => ({
  record: { bloodType: '', allergies: [], conditions: [], medications: [], documents: [] },
  appointments: [],
});

export class AuthError extends Error {
  constructor(
    public code: 'exists' | 'login' | 'locked' | 'storage',
    public retryAfter = 0,
  ) {
    super(code);
  }
}

/**
 * What the app needs from a backend. The demo uses LocalBackend (this browser only);
 * the server version will implement the same interface on top of Supabase.
 */
export interface Backend {
  restore(): Promise<{ account: Account; vault: Vault } | null>;
  signUp(input: { name: string; phone: string; birthDate: string; password: string }): Promise<{ account: Account; vault: Vault }>;
  signIn(phone: string, password: string): Promise<{ account: Account; vault: Vault }>;
  signOut(): Promise<void>;
  loadVault(): Promise<Vault>;
  saveVault(vault: Vault): Promise<void>;
  putFile(id: string, bytes: ArrayBuffer): Promise<void>;
  getFile(id: string): Promise<ArrayBuffer | null>;
  deleteFile(id: string): Promise<void>;
  deleteAccount(): Promise<void>;
}
