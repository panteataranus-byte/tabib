/**
 * Demo appointment times. The real clinics' schedules are not public, so the demo offers the same
 * working hours for everyone and says clearly that bookings are not sent to the clinic.
 */
export const TIMES = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '16:00', '16:30', '17:00', '17:30', '18:00'];
const CLOSED_DAYS = [5]; // Friday

export const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const parseIso = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export function nextOpenDays(count: number, from = new Date()): Date[] {
  const out: Date[] = [];
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  while (out.length < count) {
    // Skip closed days, and today once its last bookable time has passed.
    if (!CLOSED_DAYS.includes(d.getDay()) && openTimes(isoDate(d), [], from).some((t) => t.available)) out.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

/** Times still possible on that day: not in the past (with 1 hour notice) and not already booked by this person. */
export function openTimes(date: string, taken: string[], now = new Date()) {
  return TIMES.map((time) => ({ time, available: startsAt(date, time) - now.getTime() > 3_600_000 && !taken.includes(time) }));
}

/** The moment an appointment starts, on this device's clock (set with setHours, so clock changes are handled). */
export function startsAt(date: string, time: string) {
  const [h, m] = time.split(':').map(Number);
  const at = parseIso(date);
  at.setHours(h, m);
  return at.getTime();
}

/** How many days ahead the booking screens offer. */
export const BOOKING_DAYS = 6;

/** Whether a day and time can still be booked: one of the offered days, open, and not taken. */
export function isBookable(date: string, time: string, taken: string[], now = new Date()) {
  return (
    nextOpenDays(BOOKING_DAYS, now).some((d) => isoDate(d) === date) &&
    openTimes(date, taken, now).some((t) => t.time === time && t.available)
  );
}

export const isValidDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && isoDate(parseIso(s)) === s;
export const isValidTime = (s: string) => TIMES.includes(s);
