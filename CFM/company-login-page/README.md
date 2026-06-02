# DDO Company Login Page

This folder is a standalone company login module for your DDO project. It includes a static frontend, Express backend, MongoDB model, JWT auth middleware, and setup files in one place.

## Folder Structure

```text
company-login-page/
│
├── frontend/
│   ├── company-login.html
│   ├── company-login.css
│   └── company-login.js
│
├── backend/
│   ├── server.js
│   ├── config/
│   │   └── db.js
│   ├── models/
│   │   └── CompanyUser.js
│   ├── routes/
│   │   └── companyAuthRoutes.js
│   ├── middleware/
│   │   └── authMiddleware.js
│   └── utils/
│       └── generateToken.js
│
├── .env.example
├── package.json
└── README.md
```

## Features

- Company login form with `Company ID`, `Company Key`, and `Company Password`
- Black and white glassmorphism design
- Responsive layout for desktop and mobile
- Show and hide password button
- Frontend validation for empty fields
- Backend validation for invalid login data
- JWT token generation and protected profile route
- Secure password hashing with `bcryptjs`

## Installation Steps

1. Open a terminal inside `company-login-page`.
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in `company-login-page` and copy values from `.env.example`.
4. Add your real MongoDB connection string and JWT secret in `.env`.

## How to Run Backend

Development mode:

```bash
npm run dev
```

Production mode:

```bash
npm start
```

The backend runs by default at:

```text
http://localhost:5000
```

## How to Open Frontend

You have two simple options:

1. Open `frontend/company-login.html` directly in the browser.
2. Or serve the folder with a simple local server if you prefer.

The frontend sends login requests to:

```text
http://localhost:5000/api/company/login
```

If your backend uses a different URL, update `companyApiBaseUrl` in browser localStorage or edit `frontend/company-login.js`.

## API Details

### POST `/api/company/login`

Request body:

```json
{
  "companyId": "string",
  "companyKey": "string",
  "companyPassword": "string"
}
```

Success response:

```json
{
  "success": true,
  "message": "Company login successful",
  "token": "jwt_token_here",
  "company": {
    "id": "company_user_id",
    "companyId": "CMP001",
    "companyName": "Example Company",
    "companyEmail": "company@example.com"
  }
}
```

Error response:

```json
{
  "success": false,
  "message": "Invalid company ID, key, or password"
}
```

### GET `/api/company/profile`

This is a protected route. Send the JWT token in the `Authorization` header:

```text
Authorization: Bearer your_jwt_token
```

## MongoDB Setup

Create company user documents in your MongoDB collection with these fields:

```json
{
  "companyName": "Example Company",
  "companyEmail": "company@example.com",
  "companyId": "CMP001",
  "companyKey": "CMP-KEY-001",
  "companyPassword": "plain_password_before_first_save",
  "isApproved": true
}
```

Important:

- The model hashes `companyPassword` automatically before saving.
- Login only works when `isApproved` is `true`.

## Login Flow Explanation

1. User opens `company-login.html`
2. User enters company login details
3. Frontend sends data to backend with `fetch()`
4. Backend finds the company user by `companyId` and `companyKey`
5. Backend compares password using `bcryptjs`
6. Backend returns a JWT token and company details
7. Frontend stores token in `localStorage`
8. Frontend redirects user to `/cfm-dashboard.html`

## Notes

- This module is fully separate from the rest of your DDO app files.
- No MongoDB URI or JWT secret is hardcoded.
- You can later connect this login module to your CFM Code File Manager flow.
