# Authentication Setup

This app uses Google Sign-In plus a signed, httpOnly session cookie. Public users can view inventory. Only authorized staff can add, edit, delete, manage categories/locations, or check items in and out.

## Google OAuth Client

1. Open Google Cloud Console.
2. Use the same project that has Google Sheets API enabled, or create a new one.
3. Go to APIs & Services > Credentials.
4. Create an OAuth Client ID.
5. Choose Web application.
6. Add authorized JavaScript origins:
   - `http://localhost:5173`
   - Your Vercel production URL, for example `https://your-app.vercel.app`
   - Any Vercel preview URL you want to test directly
7. Copy the web client ID.

## Local Environment

Create `.env` or `.env.local` from `.env.example` and set:

```env
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
GOOGLE_SHEET_ID=your-test-sheet-id
VITE_DEMO_MODE=false

AUTH_SECRET=generate-a-long-random-secret-at-least-32-chars
GOOGLE_OAUTH_CLIENT_ID=your-google-oauth-web-client-id.apps.googleusercontent.com
VITE_GOOGLE_OAUTH_CLIENT_ID=your-google-oauth-web-client-id.apps.googleusercontent.com
AUTH_ALLOWED_EMAILS=authorized.user@example.org
AUTH_ALLOWED_DOMAIN=
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
GOOGLE_SERVICE_ACCOUNT_JSON
GOOGLE_SHEET_ID
AUTH_SECRET
GOOGLE_OAUTH_CLIENT_ID
VITE_GOOGLE_OAUTH_CLIENT_ID
AUTH_ALLOWED_EMAILS
AUTH_ALLOWED_DOMAIN
```

Do not set `AUTH_COOKIE_SECURE=false` on Vercel. The app automatically marks cookies secure when running on Vercel.

Use separate `GOOGLE_SHEET_ID` values for Preview and Production if you want preview deployments to avoid production data.

## Authorization Rules

Set `AUTH_ALLOWED_EMAILS` to a comma-separated list for explicit staff access:

```env
AUTH_ALLOWED_EMAILS=alice@example.org,bob@example.org
```

Optionally set `AUTH_ALLOWED_DOMAIN` to allow all verified Google accounts from one domain:

```env
AUTH_ALLOWED_DOMAIN=wheretoturn.org
```

At least one of `AUTH_ALLOWED_EMAILS` or `AUTH_ALLOWED_DOMAIN` must be set.

## Testing Checklist

1. Open `/inventory` while logged out. Inventory should be visible.
2. Try going to `/add` while logged out. You should be sent to staff login.
3. Open an item while logged out. Edit, delete, and check in/out controls should not be available.
4. Call a mutating API without cookies. It should return `401`.
5. Log in with an allowed Google account.
6. Add, edit, delete, and check in/out should now work.
7. Log out. Management access should be removed.
