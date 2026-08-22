# Dayflow — Human Resource Management System

A full-stack HRMS built to match the problem statement:
- **Real, dynamic data** — a live SQLite database + REST API (no static JSON), so every action (check-in, leave request, salary edit) is actually persisted and re-fetched.
- **Responsive, consistent UI** — one design system (colors, type, spacing) applied across every screen, built with Tailwind CSS.
- **Robust input validation** — every form validates on the client (inline errors) *and* the server (rejects bad data even if the client is bypassed).
- **Intuitive navigation** — a fixed sidebar with role-aware menu items, consistent spacing, and a mobile-friendly slide-out menu.

Two pieces run together:
- `backend/` — Node.js + Express + SQLite API (port 5000)
- `frontend/` — React + Vite UI (port 5173)

This runs as a normal local dev server via the terminal (`npm run dev`) — **not** the VS Code "Live Server" extension. Live Server only serves static HTML/CSS/JS; it can't run this app because the frontend needs Vite's dev server (for React/JSX and the API proxy) and the backend needs Node.

## 1. Prerequisites

- [Node.js](https://nodejs.org) v18 or later (includes npm). Check with:
  ```
  node -v
  npm -v
  ```

## 2. Setup (run once)

Open the project folder in VS Code, then open a terminal (`` Ctrl+` `` / `` Cmd+` ``) and run:

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

## 3. Run the app (every time)

You need **two terminals** open at the same time in VS Code (use the `+` icon in the terminal panel to split).

**Terminal 1 — start the API:**
```bash
cd backend
npm run dev
```
You should see:
```
Seeded default admin -> email: admin@dayflow.io  password: Admin@123
Dayflow API running at http://localhost:5000
```

**Terminal 2 — start the UI:**
```bash
cd frontend
npm run dev
```
Vite will print a local URL and auto-open your browser:
```
Local:   http://localhost:5173/
```
If it doesn't open automatically, ctrl/cmd-click the link in the terminal, or paste `http://localhost:5173` into your browser.

That's it — everything runs on **localhost**, started from the VS Code terminal, no Live Server required.

## 4. Logging in

A default HR/admin account is created automatically the first time the backend starts:

| Email              | Password   |
|---------------------|-----------|
| admin@dayflow.io    | Admin@123 |

You can also click **Create one** on the login screen to sign up as a new Employee or HR user.

## 5. What's implemented (mapped to the requirements doc)

| Requirement | Where |
|---|---|
| Sign up / sign in, role-based access | `frontend/src/pages/Login.jsx`, `Signup.jsx` + `backend/routes/auth.js` |
| Employee vs Admin dashboards | `frontend/src/pages/Dashboard.jsx` |
| Profile view/edit | `Profile.jsx` + `backend/routes/employees.js` |
| Attendance check-in/out, daily & weekly view | `Attendance.jsx`, `DayStrip.jsx` + `backend/routes/attendance.js` |
| Apply for leave, approve/reject workflow | `Leave.jsx` + `backend/routes/leave.js` |
| Payroll (read-only for employees, editable by admin) | `Payroll.jsx` + `backend/routes/payroll.js` |
| Employee list / switch between employees (admin) | `Employees.jsx` |

## 6. Why this satisfies "real/dynamic data, not static JSON"

- All data lives in `backend/db/dayflow.db`, a real SQLite database file created and updated at runtime (`backend/db/init.js`).
- The frontend never hardcodes data — every page fetches from the Express API (`frontend/src/api.js`) using `axios`, and writes (check-in, leave requests, salary edits) go straight back to the database.
- Restarting the frontend or backend does not reset your data — only deleting `backend/db/dayflow.db` does.

## 7. Notes / troubleshooting

- If port 5000 or 5173 is already in use, stop whatever is using it, or change `PORT` in `backend/.env` (backend) / the `server.port` in `frontend/vite.config.js` (frontend).
- If you see "Network Error" in the browser console, make sure **both** terminals (backend and frontend) are running.
- To fully reset all data, stop the backend and delete `backend/db/dayflow.db` (and any `-wal`/`-shm` files next to it), then restart it — a fresh database with the default admin will be recreated.
