/** Per-device conveniences (language, text size). Storage can be blocked, so every access is guarded. */
const PREFIX = 'tabib.pref.';
export const prefs = {
  get(key: string, fallback: string): string {
    try {
      return localStorage.getItem(PREFIX + key) ?? fallback;
    } catch {
      return fallback;
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem(PREFIX + key, value);
    } catch {
      /* private mode: the choice lasts for this visit only */
    }
  },
};
