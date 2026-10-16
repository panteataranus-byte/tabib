# Tabib · طبيب · تەبیب

Find a doctor or hospital in Erbil, book an appointment, and keep your own medical file. Arabic first, with Kurdish (Sorani) and English, built for people of every age.

**Live demo:** https://panteataranus-byte.github.io/tabib/

> Demo version. Bookings are not sent to any clinic, and everything you enter stays encrypted in your own browser.

## What it does

- **Browse and search** 50 doctors and 31 hospitals and clinics in Erbil by name, specialty or place. Search understands Arabic and Kurdish spelling variants (أ/إ/ا, ى/ي/ی, ك/ک, ة/ه).
- **Doctor and place pages** with address, phone numbers (copy button), working hours and a note on where the information came from.
- **Book an appointment** for yourself or someone else: pick a day and an open time, confirm, then see it under *My appointments* where it can be cancelled.
- **Medical file**: blood type, allergies, conditions, medications, and documents (PDF or photo) such as lab results.
- **Honest data**: entries that are old, unconfirmed or missing a phone number carry a visible warning and are listed after verified ones.

## Languages and layout

- Arabic (default), Kurdish Sorani and English, switchable on every screen.
- Right-to-left and left-to-right layouts from the same CSS (logical properties only).
- Numbers follow the language: ١٢٣ in Arabic and Kurdish, 123 in English. Phone numbers stay in the right digit order inside RTL text.
- Arabic plural rules (طبيب / طبيبان / أطباء) through `Intl.PluralRules`.
- One self-hosted typeface, IBM Plex Sans Arabic, which covers the Kurdish letters ڕ ڵ ێ ۆ ە.

## Accessibility

- Checked with axe-core 4.13 on every screen in all three languages: no violations.
- Text size setting (normal, large, extra large) that scales the whole interface.
- Touch targets of 44 px or more; primary buttons are 56 px tall.
- Colour contrast meets WCAG AA in light and dark themes; the theme follows the device.
- Skip link, landmarks, labelled form fields, errors announced and linked to their field, focus moved to the first error, dialogs that trap and return focus and close with Escape.
- Day and time pickers are real buttons with `aria-pressed`, usable by keyboard and screen reader.

## Security and privacy

The demo has no server, so it protects data the way a real client should before any backend exists:

| Area | What the app does |
| --- | --- |
| Passwords | Never stored. PBKDF2-SHA-256 with 600,000 iterations and a random salt (Web Crypto); compared in constant time. |
| Medical data | Record, appointments and uploaded files are encrypted with AES-256-GCM. The key is derived from the password with its own salt and kept as a non-extractable `CryptoKey`. |
| Sessions | The non-extractable key is kept in IndexedDB for 7 days from sign-in (reopening the app does not extend it); signing out or deleting the account removes it. Browsers keep that key's bytes in their profile files, so on a shared device people should sign out. |
| Sign-in abuse | After 5 wrong passwords for a phone number, waiting time grows exponentially. Unknown numbers take the same time as known ones. |
| Uploads | Type checked from the file's first bytes (PDF, JPEG, PNG only), 5 MB limit, file names cleaned. |
| Redirects | The `next` parameter after sign-in only accepts in-app paths made of plain characters (no tabs, newlines or backslashes). |
| Browser policy | Strict Content Security Policy (`script-src 'self'` plus the hash of one tiny inline script), no third-party requests (fonts are bundled), `no-referrer`. The page hides itself inside another site's frame. `public/_headers` adds HSTS, `frame-ancestors 'none'`, `nosniff` and a locked-down Permissions-Policy on hosts that support it. |
| Account control | Delete account removes the user, the encrypted vault, the files, the sign-in attempts and the session in one transaction. |
| Saving | Changes are saved one after another on top of the latest stored copy, and open tabs tell each other, so quick edits or two tabs never undo each other. |
| Bookings | A booking link's day and time are checked against what is really on offer before anything is saved. |
| Hosting | GitHub Pages serves all of one account's sites from the same address, which share browser storage. Tabib should get its own address (a custom domain) before real people use it. |

All storage goes through one `Backend` interface (`src/store/types.ts`). The next step is a Supabase implementation of that interface: phone sign-in, row-level security so each person can read only their own rows, and storage buckets for documents.

## Data

`src/data/erbil-health.json` is generated from the owner's Excel list (31 places, 50 doctors, 16 specialties) with names and addresses in all three languages. Each entry keeps its source, and flags mark what needs care: `stale`, `cityUnconfirmed`, `noPhone`, `universityPhone`, `specialtyInferred`.

## Run it

```bash
npm install
npm run dev          # local development
npm run build        # production build in dist/ (installable PWA, home screen prebuilt into the page)
npm run build:demo   # single-file demo page in dist-artifact/tabib.html
```

`dist/` can be served from any static host. On Netlify or Cloudflare Pages the `_headers` file is applied automatically.

## Stack

React 19, React Router 7, TypeScript, Vite 8. No UI framework: about 3,200 lines of hand-written components and CSS with design tokens.
