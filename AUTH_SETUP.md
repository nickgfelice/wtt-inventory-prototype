# Authentication Setup

This app uses a shared admin password plus a signed, httpOnly session cookie. Public users can view inventory. Only logged-in admins can add, edit, delete, manage categories/locations, or check items in and out.

## Login Environment Variables

Set these variables for local development, Vercel Preview, and Vercel Production:

```env
AUTH_SECRET=generate-a-long-random-secret-at-least-32-chars
ADMIN_PASSWORD=choose-a-strong-shared-admin-password
```

`AUTH_SECRET` signs the session cookie. Use a long random value and keep it private.

`ADMIN_PASSWORD` is checked only on the server. Do not expose it as a `VITE_` variable and do not put it in frontend code.

## Data Environment Variables

The app still uses Google Sheets for inventory data storage. These credentials are for backend data access only; they are not used for user login.

```env
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
GOOGLE_SHEET_ID=your-sheet-id
```

Share the spreadsheet with the service account email as an Editor. Use separate `GOOGLE_SHEET_ID` values for Preview and Production if you want preview deployments to avoid production data.

## Local Environment

Create `.env` or `.env.local` from `.env.example` and set:

```env
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
GOOGLE_SHEET_ID=your-test-sheet-id
VITE_DEMO_MODE=false

AUTH_SECRET=generate-a-long-random-secret-at-least-32-chars
ADMIN_PASSWORD=choose-a-strong-shared-admin-password
AUTH_COOKIE_SECURE=false
```

Use a test Google Sheet locally so test edits do not touch production inventory.

Run local API and frontend in two terminals:

```bash
pip install flask python-dotenv google-api-python-client google-auth
python dev_server.py
```

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Vercel Environment

Set these Vercel environment variables for Production and Preview:

```env
AUTH_SECRET
ADMIN_PASSWORD
GOOGLE_SERVICE_ACCOUNT_JSON
GOOGLE_SHEET_ID
```

Do not set `AUTH_COOKIE_SECURE=false` on Vercel. The app automatically marks cookies secure when running on Vercel.

Do not set login-related Google OAuth variables. Google service account credentials are only for Sheets data storage.

## Testing Checklist

1. Open `/inventory` while logged out. Inventory should be visible.
2. Try going to `/add` while logged out. You should be sent to staff login.
3. Open an item while logged out. Edit, delete, and check in/out controls should not be available.
4. Call a mutating API without cookies. It should return `401`.
5. Log in at `/login` with the admin password.
6. Add, edit, delete, and check in/out should now work.
7. Log out. Management access should be removed.
