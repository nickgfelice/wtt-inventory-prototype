# WTT Inventory Prototype

A simple inventory management app for tracking physical items (typewriters, cameras, props, costumes, etc.) with photo capture, category/location management, and check-in/check-out tracking.

**Frontend:** React + TypeScript + Vite
**Backend:** Python serverless functions on Vercel
**Storage:** Google Sheets (inventory data + compressed photos stored as base64)
**Auth:** Shared admin password with server-side signed httpOnly session cookies

## Quick Start (Demo Mode)

Demo mode runs entirely in the browser with mock data — no Google account needed.

```bash
npm install
VITE_DEMO_MODE=true npm run dev
```

## Google Sheets Setup

To connect the app to a real Google Sheets backend, follow these steps.

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** at the top, then **New Project**
3. Name it something like `wtt-inventory` and click **Create**
4. Make sure the new project is selected in the top dropdown

### Step 2: Enable the Sheets API

1. Go to **APIs & Services > Library** (or search "API Library" in the console search bar)
2. Search for **Google Sheets API** and click **Enable**

### Step 3: Create a Service Account

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > Service account**
3. Name it something like `wtt-inventory-bot` and click **Create and Continue**
4. Skip the optional role/access steps — click **Done**
5. Click on the service account you just created
6. Go to the **Keys** tab
7. Click **Add Key > Create new key > JSON**
8. A `.json` file will download — this contains your credentials. Keep it safe and do not commit it to git.

Note the **service account email** (looks like `wtt-inventory-bot@your-project.iam.gserviceaccount.com`). You'll need it in the next step.

### Step 4: Create the Google Sheet

1. Go to [Google Sheets](https://sheets.google.com/) and create a new spreadsheet
2. Name it something like `WTT Inventory`
3. Create three worksheets (tabs at the bottom):
   - **Items** (rename the default "Sheet1")
   - **Categories** (click the `+` to add a new tab)
   - **Locations** (click the `+` to add a new tab)
4. You don't need to add headers — the app creates them automatically on first use
5. Click **Share**, paste the service account email from Step 3, and give it **Editor** access
6. Copy the **spreadsheet ID** from the URL: `https://docs.google.com/spreadsheets/d/{THIS_PART}/edit`

### Step 5: Configure Environment Variables

For **local development**, create a `.env` file in the project root (it's gitignored):

```bash
cp .env.example .env
```

Edit `.env` and fill in:

```
GOOGLE_SERVICE_ACCOUNT_JSON=<paste the ENTIRE contents of the downloaded JSON key file>
GOOGLE_SHEET_ID=<your spreadsheet ID from Step 4>
VITE_DEMO_MODE=false
```

For the `GOOGLE_SERVICE_ACCOUNT_JSON` value, open the downloaded JSON file and paste its entire contents as a single line.

### Step 6: Run Locally

Start the Python API server and Vite frontend in two terminals:

**Terminal 1 — API server:**
```bash
pip install flask python-dotenv google-api-python-client google-auth
python dev_server.py
```

**Terminal 2 — Frontend:**
```bash
npm install
npm run dev
```

Open `http://localhost:5173` and the app will connect to your Google Sheet.

## Staff Login Setup

Inventory viewing is public, but staff must log in with the shared admin password to add, edit, delete, manage categories/locations, or check items in and out.

See [`AUTH_SETUP.md`](./AUTH_SETUP.md) for required auth environment variables, local testing, and Vercel deployment notes.

## Deploy to Vercel

### Step 1: Push to GitHub

Push this repository to GitHub (or GitLab/Bitbucket).

### Step 2: Import to Vercel

1. Go to [vercel.com](https://vercel.com/) and sign in
2. Click **Add New > Project**
3. Import your repository
4. Vercel will auto-detect the Vite framework

### Step 3: Set Environment Variables

In the Vercel project settings, go to **Settings > Environment Variables** and add:

| Variable | Value |
|----------|-------|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Full JSON content of the service account key |
| `GOOGLE_SHEET_ID` | Your spreadsheet ID |
| `AUTH_SECRET` | Long random string used to sign staff session cookies |
| `ADMIN_PASSWORD` | Shared password required to manage inventory |

Do **not** set `VITE_DEMO_MODE` (or set it to `false`).

### Step 4: Deploy

Click **Deploy**. Vercel will build the React frontend and deploy the Python API functions automatically.

## Project Structure

```
├── api/                    # Python serverless functions (Vercel)
│   ├── _shared/            # Shared auth and helper modules
│   │   ├── google_auth.py  # Service account credential loading
│   │   └── sheets_helpers.py # Row serialization, ID generation
│   ├── items.py            # Items CRUD endpoint
│   ├── categories.py       # Categories CRUD endpoint
│   ├── locations.py        # Locations CRUD endpoint
│   └── requirements.txt    # Python dependencies
├── src/
│   ├── components/         # React components
│   │   ├── AddItem.tsx
│   │   ├── FieldWithManage.tsx
│   │   ├── InventoryList.tsx
│   │   ├── ItemDetail.tsx
│   │   ├── OptionManagerModal.tsx
│   │   ├── Scan.tsx
│   │   ├── TopNav.tsx
│   │   └── TrackingField.tsx
│   ├── lib/
│   │   ├── api.ts          # API client (production — calls Python endpoints)
│   │   ├── demo.ts         # Demo client (in-memory, no API calls)
│   │   ├── types.ts        # Shared TypeScript types
│   │   └── utils.ts        # Formatting, file, and image compression utilities
│   ├── App.tsx             # Routing shell
│   ├── main.tsx            # Entry point
│   └── styles.css          # Consolidated stylesheet
├── tests/                  # Python API tests
├── dev_server.py           # Local Flask dev server
├── .env.example            # Environment variable template
├── vercel.json             # Vercel routing config
└── package.json
```

## Google Sheets Structure

The app auto-creates headers on first use. The spreadsheet will have:

**Items** worksheet:

| ID | Name | Category | Location | PhotoUrl | RequiresTracking | CheckedOut | CheckedOutAt | EstimatedReturnDate | UpdatedAt |
|----|------|----------|----------|----------|------------------|------------|--------------|---------------------|-----------|

Photos are stored as compressed base64 JPEG data URLs in the PhotoUrl column (resized to 800px wide, 70% quality).

**Categories** worksheet:

| Name |
|------|

**Locations** worksheet:

| Name |
|------|

Non-technical users can open the spreadsheet directly to view inventory data. Edits made in the spreadsheet will be reflected in the app on next load.

## Troubleshooting

**"Server configuration error"** — One or more environment variables are missing. Check that `GOOGLE_SERVICE_ACCOUNT_JSON` and `GOOGLE_SHEET_ID` are set.

**"Unable to reach Google Sheets"** — The Google Sheets API returned an error. Check that:
- The Sheets API is enabled in your Google Cloud project
- The service account has Editor access to the spreadsheet
- The spreadsheet ID is correct

**Demo mode not working** — Make sure you're running with `VITE_DEMO_MODE=true` as an environment variable, not just in `.env` (Vite env vars need the `VITE_` prefix and are baked in at build time).
