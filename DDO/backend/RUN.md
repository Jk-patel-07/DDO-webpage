# Run DDO backend on localhost

## Quick start (Windows)

1. Double-click **`start-backend.bat`** in the project root (`DDO webpage` folder).
2. Wait for: `DDO backend running on http://localhost:8080`
3. Open CFM: http://localhost:8080/CFM/company-login.html

Keep that terminal window open while you use CFM.

## From terminal

```bash
cd DDO/backend
npm install
npm start
```

Or from project root:

```bash
npm run backend:install
npm run backend
```

## Required `.env`

File: `DDO/backend/.env`

Minimum:

- `PORT=8080`
- `MONGO_URI=` your MongoDB connection string
- `JWT_SECRET=` a long secret string

Copy from `.env.example` if `.env` is missing.

## If localhost does not work

- Do **not** open `cfm-dashboard.html` as a `file://` link from Explorer.
- Always use **http://localhost:8080/CFM/...** after the backend is running.
- Check http://localhost:8080/api/health — should return `{"status":"ok"}`.
