# Callcraft CRM API

Express API for the Callcraft Android and web CRM, adapted from the EventManagementApi boilerplate. It uses the boilerplate's routes/controllers/middleware/utilities layout. Leads and approval values are read from Google Sheets; call activity is saved in a `CallActivity` worksheet so it persists across Vercel serverless executions.

This project is intended for **GitHub + Vercel**. Push the API to a private GitHub repository and connect that repository to Vercel. Vercel will deploy pushes automatically. The Android app uses the Vercel HTTPS URL, so the computer can be off.

## Google Sheet

- Google Cloud project: `scrapedataforcoldcall`
- Service-account email: `coldcallsheet@scrapedataforcoldcall.iam.gserviceaccount.com`
- Spreadsheet ID: `17EE42CkxDpM9p6m6-pXZ3mlUwVqLJsMPbTqX4XJndlw`
- Leads worksheet: `Leads`

Grant the service account Editor access and enable Google Sheets API. The complete service-account JSON is secret; never commit it.

## GitHub and Vercel setup

1. Create a private GitHub repository and push the contents of this folder. `.gitignore` excludes local credentials and environment files.
2. In Vercel, import that GitHub repository. Keep the project root at the repository root; `vercel.json` configures the Express serverless function.
3. Add the environment variables below in Vercel Project Settings. Set `GOOGLE_SERVICE_ACCOUNT_JSON` to the full JSON value as a sensitive Vercel variable. Do not put the JSON file in GitHub.
4. Enable Firebase Authentication in the Google Cloud/Firebase project and configure Google Sign-In in the Android client.
5. Deploy. Check `/health`, then set the Android app's API URL to the deployed Vercel HTTPS domain.
6. Pushes to the connected GitHub branch deploy automatically.

### Required Vercel environment variables

- `NODE_ENV=production`
- `AUTH_REQUIRED=true`
- `FIREBASE_PROJECT_ID=scrapedataforcoldcall`
- `ALLOWED_USER_EMAIL`: the single Google account permitted to use the CRM
- `GOOGLE_SERVICE_ACCOUNT_JSON`: full service-account JSON, set in Vercel only
- `SHEET_ID=17EE42CkxDpM9p6m6-pXZ3mlUwVqLJsMPbTqX4XJndlw`
- `SHEET_TAB=Leads`
- `CALLS_TAB=CallActivity`
- `ALLOWED_ORIGINS`: deployed web CRM origin(s), comma-separated; native Android does not use browser CORS

Optional server-only secrets: `PLACES_API_KEY` and `PAGESPEED_KEY`. Never put them in Android or GitHub. For local development, copy `.env.example` to `.env` and keep `AUTH_REQUIRED=false`; never use that setting in Vercel production.

## Local development

1. Copy `.env.example` to `.env`. The local ignored `.env` in this folder points at the existing service-account file in the web CRM folder.
2. Run `npm install`, then `npm run dev`.
3. Check `http://localhost:3000/health`.
4. Android emulator development URL: `http://10.0.2.2:3000/`. A phone on the same Wi-Fi may use the computer's LAN address. Local addresses stop working when the computer is off.

The API creates the `CallActivity` tab and headers when call logs are first used.

## Authentication

All `/api/*` routes require Firebase ID tokens in `Authorization: Bearer <id-token>` by default. The API verifies the token and allows only `ALLOWED_USER_EMAIL`. Configure Firebase Google Sign-In in Android before production. `/health` is public. Keep `AUTH_REQUIRED=false` only for local development.

## API routes

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Public health check |
| GET | `/api/leads` | Ordered sheet headers and lead rows |
| POST | `/api/lead-approval` | Update `Approved by Me` for a physical `sheetRow` |
| GET | `/api/call-logs` | Read saved call activity as `{ logs }` |
| POST | `/api/call-logs` | Save outcome, follow-up date, and notes |
| GET | `/api/config` | Read non-secret lead-discovery settings |

Approval body: `{ "sheetRow": 2, "value": "Yes" }`. Values are `Yes`, `No`, `Check till here`, or empty to clear.

Call-log body: `{ "leadId": "0", "outcome": "Interested", "followUpAt": "YYYY-MM-DD", "notes": "Asked for a follow-up" }`.

## Structure

- `src/app.js`: Express setup, security middleware, and error handling.
- `src/index.js`: local server entry and Vercel handler export.
- `src/routes/`: endpoint declarations.
- `src/controllers/`: request validation and responses.
- `src/services/sheets.service.js`: Sheets auth and persistence.
- `src/middleware/requireUser.js`: Firebase token verification and owner-only access.
- `src/utils/`: shared API helpers.
- `.gitignore` and `.vercelignore`: exclude local secrets, credentials, and build files.
