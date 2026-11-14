# Sagarika Bill

Billing, event booking and reports for Sagarika Events (Sagara and Pakshikere branches).

- **Server:** `server.js` (Node + Express), hosted on Vercel at https://sagarikabill.vercel.app
- **Data:** Google Sheets — one spreadsheet per branch (Bills, NoGSTBills, BillItems, Item List, BookEvent, Users).
  Excel (`data/bills.xlsx`) is only a local fallback and is never committed.
- **Web app:** `public/` — also published to GitHub Pages (only this folder).
- **Android app:** `android-webview/` — a WebView around the Vercel site.
- **Desktop app:** Electron (`electron-main.js`, `npm run dist:win`).

## Try it locally (safe)

```bash
npm install
npm run local
```

Open http://localhost:3000. This mode **never touches the live Google Sheets**: it stores
everything in `local-dev/data/` and creates two test logins (`sagaraadmin`, `pakshikereadmin`)
whose passwords are in `local-dev/test-logins.txt`. Both are git-ignored.

`npm start` runs the real server and uses Google Sheets if credentials are present.

## Settings on Vercel

| Variable | What it is for |
|---|---|
| `SAGARIKA_SESSION_SECRET` | **Required.** Long random text used to sign logins. Changing it logs everyone out. |
| `GOOGLE_SERVICE_ACCOUNT_JSON` (or `GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_PRIVATE_KEY`) | Google Sheets access. |
| `GOOGLE_SHEET_ID`, `PAKSHIKERE_GOOGLE_SHEET_ID` | Optional: override the two spreadsheet IDs. |
| `SAGARIKA_ADMIN_PASSWORD_SAGARA`, `SAGARIKA_ADMIN_PASSWORD_PAKSHIKERE` | First-time passwords for the two branch admins. |
| `ALLOWED_ORIGINS` | Optional: extra websites allowed to call the API, comma-separated. |

## Security notes

- Every data route needs a login. A login ends when the account is disabled, deleted or its
  password is reset.
- 8 wrong passwords in 15 minutes for the same username blocks further tries for a while.
- New and reset passwords must be at least 8 characters.
- Only the app's own sites (Vercel, GitHub Pages, localhost) may call the API from a browser.
- Server errors are logged on the server; the browser only gets a short message.
- Saves run one at a time, and Google Sheets are written before old rows are cleared, so a
  failed save no longer empties a sheet.

## Interface

`public/ui.css` holds the shared look (light and night mode, phone, tablet and desktop).
It only affects the screen; printed bills and reports use their own print styles.
